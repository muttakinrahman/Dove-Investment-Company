import express from 'express';
import crypto from 'crypto';
import Deposit from '../models/Deposit.js';
import User from '../models/User.js';
import { authMiddleware } from '../middleware/auth.js';
import SystemSettings from '../models/SystemSettings.js';
import { createNotification } from '../utils/notifications.js';
import { sendDepositApprovedEmail, sendDepositReceivedEmail } from '../services/emailService.js';
import {
    createPayment,
    getPaymentStatus,
    verifyIpnSignature,
    CONFIRMED_STATUSES,
    checkApiStatus
} from '../services/nowpaymentsService.js';
import { distributeCommissions } from '../utils/teamCommissions.js';

const router = express.Router();

/* ══════════════════════════════════════════════
   SHARED HELPER — credit user balance on approval
══════════════════════════════════════════════ */
async function creditUserBalance(deposit) {
    const user = await User.findById(deposit.userId);
    if (!user) throw new Error('User not found');

    user.balance += deposit.amount;
    user.isTeamMember = true;
    if (user.withdrawalBlockMessage) user.withdrawalBlockMessage = null;
    await user.save();

    // Unblock referrer too
    if (user.referredBy) {
        const referrer = await User.findOne({ invitationCode: user.referredBy });
        if (referrer && referrer.withdrawalBlockMessage) {
            referrer.withdrawalBlockMessage = null;
            await referrer.save();
        }
    }

    // Distribute team commissions
    try {
        await distributeCommissions(user, deposit.amount);
    } catch (e) {
        console.error('[Credit] Commission error:', e.message);
    }

    // Notification
    await createNotification({
        userId: deposit.userId,
        title: 'Deposit Approved ✓',
        message: `Your deposit of $${deposit.amount} USDT has been confirmed and added to your balance.`,
        type: 'deposit',
        amount: deposit.amount,
        relatedId: deposit._id
    });

    // Email
    if (user.email) {
        try { await sendDepositApprovedEmail(user, deposit); } catch { }
    }

    console.log(`[Credit] $${deposit.amount} credited to user ${user._id}`);
    return user;
}

/* ══════════════════════════════════════════════
   GET /api/recharge/history
   User's own deposit history
══════════════════════════════════════════════ */
router.get('/history', authMiddleware, async (req, res) => {
    try {
        const deposits = await Deposit.find({ userId: req.userId })
            .sort({ createdAt: -1 })
            .limit(20)
            .select('amount network status paymentMethod transactionHash nowpaymentsId payAddress payCurrency payAmount createdAt approvedAt packageName');
        res.json({ deposits });
    } catch (error) {
        console.error('Deposit history error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/* ══════════════════════════════════════════════
   GET /api/recharge/wallets
   Static wallet addresses (manual fallback)
══════════════════════════════════════════════ */
router.get('/wallets', async (req, res) => {
    try {
        let settings = await SystemSettings.findOne();
        if (!settings) {
            settings = new SystemSettings();
            await settings.save();
        }
        res.json({
            wallets: {
                TRC20: settings.walletTRC20,
                BSC: settings.walletBSC,
                BTC: settings.walletBTC,
                ETH: settings.walletETH,
            },
            minDepositAmount: settings.minDepositAmount
        });
    } catch (error) {
        console.error('Get wallets error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/* ══════════════════════════════════════════════
   GET /api/recharge/nowpayments/status
   Check if NowPayments API is live
══════════════════════════════════════════════ */
router.get('/nowpayments/status', async (req, res) => {
    try {
        const isAlive = await checkApiStatus();
        res.json({ available: isAlive });
    } catch {
        res.json({ available: false });
    }
});

/* ══════════════════════════════════════════════
   POST /api/recharge/create-payment   (AUTO)
   Creates a NowPayments payment — user gets
   a dedicated crypto address to send to.
══════════════════════════════════════════════ */
router.post('/create-payment', authMiddleware, async (req, res) => {
    try {
        const { amount, network, packageId, packageName } = req.body;

        if (!amount || !network) {
            return res.status(400).json({ message: 'Amount and network are required' });
        }

        const settings = await SystemSettings.findOne();
        const minDeposit = settings?.minDepositAmount || 50;
        if (parseFloat(amount) < minDeposit) {
            return res.status(400).json({ message: `Minimum deposit is $${minDeposit} USDT` });
        }

        // Create placeholder deposit record first (we need _id as orderId)
        const deposit = new Deposit({
            userId: req.userId,
            amount: parseFloat(amount),
            network,
            paymentMethod: 'auto',
            status: 'waiting',
            packageId: packageId || null,
            packageName: packageName || null,
        });
        await deposit.save();

        // Call NowPayments API
        const npResult = await createPayment({
            amount: parseFloat(amount),
            network,
            orderId: deposit._id.toString(),
            orderDescription: packageName ? `Deposit for ${packageName}` : `Deposit ${amount} USDT`,
        });

        // Store NowPayments details
        deposit.nowpaymentsId = npResult.payment_id;
        deposit.nowpaymentsStatus = npResult.payment_status;
        deposit.payAddress = npResult.pay_address;
        deposit.payCurrency = npResult.pay_currency;
        deposit.payAmount = npResult.pay_amount;
        await deposit.save();

        // Notify user
        await createNotification({
            userId: req.userId,
            title: 'Payment Address Created',
            message: `Send ${npResult.pay_amount} ${npResult.pay_currency?.toUpperCase()} to complete your $${amount} deposit.`,
            type: 'deposit',
            amount: parseFloat(amount),
            relatedId: deposit._id
        });

        res.status(201).json({
            depositId: deposit._id,
            paymentId: npResult.payment_id,
            payAddress: npResult.pay_address,
            payCurrency: npResult.pay_currency,
            payAmount: npResult.pay_amount,
            status: npResult.payment_status,
            expiresAt: npResult.expiration_estimate_date,
        });

    } catch (error) {
        console.error('[AutoPay] Create payment error:', error.message);
        res.status(500).json({ message: error.message || 'Failed to create payment. Try again.' });
    }
});

/* ══════════════════════════════════════════════
   GET /api/recharge/payment-status/:depositId  (AUTO)
   Poll payment status for a specific deposit
══════════════════════════════════════════════ */
router.get('/payment-status/:depositId', authMiddleware, async (req, res) => {
    try {
        const deposit = await Deposit.findOne({
            _id: req.params.depositId,
            userId: req.userId
        });
        if (!deposit) return res.status(404).json({ message: 'Deposit not found' });

        // Already finalised
        if (deposit.status === 'approved') {
            return res.json({ status: 'approved', deposit });
        }

        // Poll NowPayments if we have an ID
        if (deposit.nowpaymentsId) {
            const npStatus = await getPaymentStatus(deposit.nowpaymentsId);
            deposit.nowpaymentsStatus = npStatus.payment_status;

            if (CONFIRMED_STATUSES.includes(npStatus.payment_status)) {
                // Auto-approve
                deposit.status = 'approved';
                deposit.approvedAt = new Date();
                deposit.transactionHash = npStatus.outcome_amount
                    ? `np_${deposit.nowpaymentsId}` : null;
                await deposit.save();
                await creditUserBalance(deposit);
            } else if (npStatus.payment_status === 'expired') {
                deposit.status = 'expired';
                await deposit.save();
            } else {
                await deposit.save();
            }

            return res.json({
                status: deposit.status,
                nowpaymentsStatus: npStatus.payment_status,
                deposit
            });
        }

        res.json({ status: deposit.status, deposit });
    } catch (error) {
        console.error('[AutoPay] Status poll error:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
});

/* ══════════════════════════════════════════════
   POST /api/recharge/nowpayments/webhook   (IPN)
   NowPayments calls this automatically when
   a payment is received & confirmed on-chain.
   ⚠ Must be PUBLIC (no authMiddleware)
══════════════════════════════════════════════ */
router.post('/nowpayments/webhook', async (req, res) => {
    try {
        const sig = req.headers['x-nowpayments-sig'];
        if (!sig) {
            console.warn('[IPN] Missing signature header');
            return res.status(400).json({ message: 'Missing signature' });
        }

        // Body may be raw Buffer (from express.raw) or already-parsed object
        let body = req.body;
        if (Buffer.isBuffer(body)) {
            body = JSON.parse(body.toString('utf8'));
        }

        // Verify HMAC-SHA512 signature
        const isValid = verifyIpnSignature(body, sig);
        if (!isValid) {
            console.error('[IPN] Invalid signature — possible forgery');
            return res.status(403).json({ message: 'Invalid signature' });
        }

        const {
            payment_id,
            payment_status,
            order_id,
        } = body;

        console.log(`[IPN] Payment ${payment_id} → status: ${payment_status}`);

        const deposit = await Deposit.findById(order_id);
        if (!deposit) {
            console.error(`[IPN] Deposit not found for order_id: ${order_id}`);
            return res.status(404).json({ message: 'Deposit not found' });
        }

        if (deposit.status === 'approved') {
            return res.json({ message: 'Already processed' });
        }

        deposit.nowpaymentsStatus = payment_status;

        if (CONFIRMED_STATUSES.includes(payment_status)) {
            deposit.status = 'approved';
            deposit.approvedAt = new Date();
            deposit.transactionHash = `np_${payment_id}`;
            await deposit.save();
            await creditUserBalance(deposit);
            console.log(`[IPN] ✅ Auto-approved deposit ${deposit._id} — $${deposit.amount} credited`);
        } else if (payment_status === 'expired' || payment_status === 'failed') {
            deposit.status = payment_status === 'expired' ? 'expired' : 'rejected';
            await deposit.save();
            await createNotification({
                userId: deposit.userId,
                title: payment_status === 'expired' ? 'Deposit Expired' : 'Deposit Failed',
                message: `Your $${deposit.amount} USDT deposit could not be processed. Please try again.`,
                type: 'deposit',
                amount: deposit.amount,
                relatedId: deposit._id
            });
        } else {
            if (payment_status === 'confirming') deposit.status = 'confirming';
            await deposit.save();
        }

        res.json({ message: 'IPN received' });

    } catch (error) {
        console.error('[IPN] Webhook error:', error.message);
        res.status(500).json({ message: 'Internal error' });
    }
});


/* ══════════════════════════════════════════════
   POST /api/recharge/submit   (MANUAL fallback)
   User submits TxHash manually
══════════════════════════════════════════════ */
router.post('/submit', authMiddleware, async (req, res) => {
    try {
        const { amount, transactionHash, network, packageId, packageName } = req.body;

        if (!amount || !transactionHash || !network) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const settings = await SystemSettings.findOne();
        const minDeposit = settings?.minDepositAmount || 50;
        if (amount < minDeposit) {
            return res.status(400).json({ message: `Minimum deposit is $${minDeposit} USDT` });
        }

        const existing = await Deposit.findOne({ transactionHash });
        if (existing) {
            return res.status(400).json({ message: 'Transaction hash already submitted' });
        }

        const deposit = new Deposit({
            userId: req.userId,
            amount: parseFloat(amount),
            transactionHash,
            network,
            paymentMethod: 'manual',
            packageId: packageId || null,
            packageName: packageName || null,
        });
        await deposit.save();

        await createNotification({
            userId: req.userId,
            title: 'Deposit Submitted',
            message: `Your $${amount} USDT deposit is pending admin review.`,
            type: 'deposit',
            amount,
            relatedId: deposit._id
        });

        const user = await User.findById(req.userId);
        if (user?.email) {
            try { await sendDepositReceivedEmail(user, deposit); } catch { }
        }

        res.status(201).json({ message: 'Deposit submitted successfully', deposit });

    } catch (error) {
        console.error('Manual deposit error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/* ══════════════════════════════════════════════
   POST /api/recharge/approve/:id
   Legacy internal route (kept for compatibility)
══════════════════════════════════════════════ */
router.post('/approve/:id', async (req, res) => {
    try {
        const deposit = await Deposit.findById(req.params.id);
        if (!deposit) return res.status(404).json({ message: 'Deposit not found' });
        if (deposit.status === 'approved') return res.status(400).json({ message: 'Already approved' });

        deposit.status = 'approved';
        deposit.approvedAt = new Date();
        await deposit.save();
        await creditUserBalance(deposit);

        res.json({ message: 'Deposit approved and processed' });
    } catch (error) {
        console.error('Approve deposit error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;

import express from 'express';
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
    checkApiStatus,
} from '../services/nowpaymentsService.js';
import { distributeCommissions } from '../utils/teamCommissions.js';

const router = express.Router();

/* ═══════════════════════════════════════════
   HELPER: Credit user balance after approval
═══════════════════════════════════════════ */
async function creditUserBalance(deposit) {
    const user = await User.findById(deposit.userId);
    if (!user) throw new Error('User not found');

    user.balance += deposit.amount;
    user.isTeamMember = true;
    if (user.withdrawalBlockMessage) user.withdrawalBlockMessage = null;
    await user.save();

    // Unblock referrer
    if (user.referredBy) {
        try {
            const referrer = await User.findOne({ invitationCode: user.referredBy });
            if (referrer?.withdrawalBlockMessage) {
                referrer.withdrawalBlockMessage = null;
                await referrer.save();
            }
        } catch { /* non-critical */ }
    }

    // Distribute commissions
    try { await distributeCommissions(user, deposit.amount); } catch (e) {
        console.error('[Credit] Commission error:', e.message);
    }

    // In-app notification
    try {
        await createNotification({
            userId: deposit.userId,
            title: 'Deposit Approved ✓',
            message: `Your deposit of $${deposit.amount} USDT has been confirmed and credited.`,
            type: 'deposit',
            amount: deposit.amount,
            relatedId: deposit._id,
        });
    } catch { /* non-critical */ }

    // Email
    if (user.email) {
        try { await sendDepositApprovedEmail(user, deposit); } catch { }
    }

    console.log(`[Credit] $${deposit.amount} credited → user ${user._id}`);
    return user;
}

/* ═══════════════════════════════════════════
   GET /api/recharge/history
═══════════════════════════════════════════ */
router.get('/history', authMiddleware, async (req, res) => {
    try {
        const deposits = await Deposit.find({ userId: req.userId })
            .sort({ createdAt: -1 })
            .limit(20)
            .select('amount network status paymentMethod transactionHash nowpaymentsId payAddress payCurrency payAmount createdAt approvedAt packageName');
        res.json({ deposits });
    } catch (err) {
        console.error('[History]', err.message);
        res.status(500).json({ message: 'Server error' });
    }
});

/* ═══════════════════════════════════════════
   GET /api/recharge/wallets
═══════════════════════════════════════════ */
router.get('/wallets', async (req, res) => {
    try {
        let settings = await SystemSettings.findOne();
        if (!settings) { settings = new SystemSettings(); await settings.save(); }
        res.json({
            wallets: {
                TRC20: settings.walletTRC20,
                BSC:   settings.walletBSC,
                BTC:   settings.walletBTC,
                ETH:   settings.walletETH,
            },
            minDepositAmount: 10,
        });
    } catch (err) {
        console.error('[Wallets]', err.message);
        res.status(500).json({ message: 'Server error' });
    }
});

/* ═══════════════════════════════════════════
   GET /api/recharge/nowpayments/status
═══════════════════════════════════════════ */
router.get('/nowpayments/status', async (req, res) => {
    const available = await checkApiStatus();
    res.json({ available });
});

/* ═══════════════════════════════════════════
   POST /api/recharge/create-payment   (AUTO)
   Step 1 of API docs flow:
   Create payment → get pay_address
═══════════════════════════════════════════ */
router.post('/create-payment', authMiddleware, async (req, res) => {
    try {
        const { amount, network, packageId, packageName } = req.body;

        // --- Validate ---
        if (!amount || !network) {
            return res.status(400).json({ message: 'Amount and network are required' });
        }
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            return res.status(400).json({ message: 'Invalid amount' });
        }

        // Min deposit check — hardcoded to 10 USDT
        const MIN_DEPOSIT = 10;
        if (numAmount < MIN_DEPOSIT) {
            return res.status(400).json({ message: `Minimum deposit is $${MIN_DEPOSIT} USDT` });
        }

        // --- Create DB record first (we need _id as order_id) ---
        const deposit = new Deposit({
            userId:        req.userId,
            amount:        numAmount,
            network,
            paymentMethod: 'auto',
            status:        'waiting',
            packageId:     packageId || null,
            packageName:   packageName || null,
        });
        await deposit.save();
        console.log('[AutoPay] Deposit record created:', deposit._id);

        // --- Call NowPayments API ---
        let npResult;
        try {
            npResult = await createPayment({
                amount:           numAmount,
                network,
                orderId:          deposit._id.toString(),
                orderDescription: packageName ? `Deposit for ${packageName}` : `Deposit ${numAmount} USDT`,
            });
        } catch (apiErr) {
            // Clean up the DB record if API fails
            await Deposit.findByIdAndDelete(deposit._id);
            console.error('[AutoPay] NowPayments API error:', apiErr.response?.data || apiErr.message);
            return res.status(500).json({
                message: apiErr.response?.data?.message || 'Payment gateway error. Try Manual mode.',
            });
        }

        // --- Update deposit with NowPayments details ---
        deposit.nowpaymentsId    = String(npResult.payment_id);
        deposit.nowpaymentsStatus = npResult.payment_status;
        deposit.payAddress       = npResult.pay_address;
        deposit.payCurrency      = npResult.pay_currency;
        deposit.payAmount        = npResult.pay_amount;
        await deposit.save();

        // --- Notify user ---
        try {
            await createNotification({
                userId:    req.userId,
                title:     'Payment Address Ready',
                message:   `Send ${npResult.pay_amount} ${npResult.pay_currency?.toUpperCase()} to complete your $${numAmount} deposit.`,
                type:      'deposit',
                amount:    numAmount,
                relatedId: deposit._id,
            });
        } catch { /* non-critical */ }

        res.status(201).json({
            depositId:  deposit._id,
            paymentId:  npResult.payment_id,
            payAddress: npResult.pay_address,
            payCurrency: npResult.pay_currency,
            payAmount:  npResult.pay_amount,
            status:     npResult.payment_status,
            expiresAt:  npResult.expiration_estimate_date,
        });

    } catch (err) {
        console.error('[AutoPay] Unexpected error:', err.message);
        res.status(500).json({ message: 'Server error: ' + err.message });
    }
});

/* ═══════════════════════════════════════════
   GET /api/recharge/payment-status/:depositId
   Poll payment status manually
═══════════════════════════════════════════ */
router.get('/payment-status/:depositId', authMiddleware, async (req, res) => {
    try {
        const deposit = await Deposit.findOne({ _id: req.params.depositId, userId: req.userId });
        if (!deposit) return res.status(404).json({ message: 'Deposit not found' });

        if (deposit.status === 'approved') return res.json({ status: 'approved', deposit });

        if (deposit.nowpaymentsId) {
            const np = await getPaymentStatus(deposit.nowpaymentsId);
            deposit.nowpaymentsStatus = np.payment_status;

            if (CONFIRMED_STATUSES.includes(np.payment_status)) {
                deposit.status      = 'approved';
                deposit.approvedAt  = new Date();
                deposit.transactionHash = `np_${deposit.nowpaymentsId}`;
                await deposit.save();
                await creditUserBalance(deposit);
            } else if (np.payment_status === 'expired') {
                deposit.status = 'expired';
                await deposit.save();
            } else if (np.payment_status === 'confirming') {
                deposit.status = 'confirming';
                await deposit.save();
            } else {
                await deposit.save();
            }

            return res.json({ status: deposit.status, nowpaymentsStatus: np.payment_status, deposit });
        }

        res.json({ status: deposit.status, deposit });
    } catch (err) {
        console.error('[PollStatus]', err.message);
        res.status(500).json({ message: 'Server error' });
    }
});

/* ═══════════════════════════════════════════
   POST /api/recharge/nowpayments/webhook  (IPN)
   NowPayments calls this on status change.
   ⚠ No authMiddleware — must be public
   ⚠ Must handle raw body (set in server.js)
═══════════════════════════════════════════ */
router.post('/nowpayments/webhook', async (req, res) => {
    try {
        const sig = req.headers['x-nowpayments-sig'];

        // Parse body (may be raw Buffer or already parsed)
        let params = req.body;
        if (Buffer.isBuffer(params)) {
            params = JSON.parse(params.toString('utf8'));
        }

        console.log('[IPN] Received webhook, payment_id:', params?.payment_id, 'status:', params?.payment_status);

        // Verify signature per API docs
        if (sig) {
            const valid = verifyIpnSignature(params, sig);
            if (!valid) {
                console.error('[IPN] Invalid signature!');
                return res.status(403).json({ message: 'Invalid signature' });
            }
        } else {
            console.warn('[IPN] No signature header — proceeding (dev mode)');
        }

        const { payment_id, payment_status, order_id } = params;

        if (!order_id) {
            console.error('[IPN] Missing order_id');
            return res.status(400).json({ message: 'Missing order_id' });
        }

        const deposit = await Deposit.findById(order_id);
        if (!deposit) {
            console.error('[IPN] Deposit not found for order_id:', order_id);
            return res.status(200).json({ message: 'OK' }); // return 200 so NowPayments stops retrying
        }

        // Idempotent — skip if already approved
        if (deposit.status === 'approved') {
            return res.status(200).json({ message: 'Already processed' });
        }

        deposit.nowpaymentsStatus = payment_status;

        if (CONFIRMED_STATUSES.includes(payment_status)) {
            deposit.status      = 'approved';
            deposit.approvedAt  = new Date();
            deposit.transactionHash = `np_${payment_id}`;
            await deposit.save();
            await creditUserBalance(deposit);
            console.log(`[IPN] ✅ Auto-approved deposit ${deposit._id} — $${deposit.amount}`);
        } else if (payment_status === 'expired' || payment_status === 'failed') {
            deposit.status = payment_status === 'expired' ? 'expired' : 'rejected';
            await deposit.save();
            try {
                await createNotification({
                    userId:    deposit.userId,
                    title:     payment_status === 'expired' ? 'Deposit Expired' : 'Deposit Failed',
                    message:   `Your $${deposit.amount} USDT deposit could not be processed. Please try again.`,
                    type:      'deposit',
                    amount:    deposit.amount,
                    relatedId: deposit._id,
                });
            } catch { }
        } else if (payment_status === 'confirming') {
            deposit.status = 'confirming';
            await deposit.save();
        } else {
            await deposit.save();
        }

        res.status(200).json({ message: 'IPN received' });

    } catch (err) {
        console.error('[IPN] Error:', err.message);
        res.status(500).json({ message: 'Internal error' });
    }
});

/* ═══════════════════════════════════════════
   POST /api/recharge/submit   (MANUAL)
═══════════════════════════════════════════ */
router.post('/submit', authMiddleware, async (req, res) => {
    try {
        const { amount, transactionHash, network, packageId, packageName } = req.body;

        if (!amount || !transactionHash || !network) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const MIN_DEPOSIT = 10;
        if (parseFloat(amount) < MIN_DEPOSIT) {
            return res.status(400).json({ message: `Minimum deposit is $${MIN_DEPOSIT} USDT` });
        }

        const existing = await Deposit.findOne({ transactionHash });
        if (existing) {
            return res.status(400).json({ message: 'Transaction hash already submitted' });
        }

        const deposit = new Deposit({
            userId:        req.userId,
            amount:        parseFloat(amount),
            transactionHash,
            network,
            paymentMethod: 'manual',
            packageId:     packageId || null,
            packageName:   packageName || null,
        });
        await deposit.save();

        try {
            await createNotification({
                userId:    req.userId,
                title:     'Deposit Submitted',
                message:   `Your $${amount} USDT deposit is pending admin review.`,
                type:      'deposit',
                amount:    parseFloat(amount),
                relatedId: deposit._id,
            });
        } catch { }

        const user = await User.findById(req.userId);
        if (user?.email) {
            try { await sendDepositReceivedEmail(user, deposit); } catch { }
        }

        res.status(201).json({ message: 'Deposit submitted successfully', deposit });

    } catch (err) {
        console.error('[Manual]', err.message);
        res.status(500).json({ message: 'Server error' });
    }
});

/* ═══════════════════════════════════════════
   POST /api/recharge/approve/:id  (Admin)
═══════════════════════════════════════════ */
router.post('/approve/:id', async (req, res) => {
    try {
        const deposit = await Deposit.findById(req.params.id);
        if (!deposit) return res.status(404).json({ message: 'Deposit not found' });
        if (deposit.status === 'approved') return res.status(400).json({ message: 'Already approved' });

        deposit.status     = 'approved';
        deposit.approvedAt = new Date();
        await deposit.save();
        await creditUserBalance(deposit);

        res.json({ message: 'Deposit approved' });
    } catch (err) {
        console.error('[Approve]', err.message);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;

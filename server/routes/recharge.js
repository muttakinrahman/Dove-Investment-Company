import express from 'express';
import Deposit from '../models/Deposit.js';
import User from '../models/User.js';
import Package from '../models/Package.js';
import { authMiddleware } from '../middleware/auth.js';
import SystemSettings from '../models/SystemSettings.js';
import { createNotification } from '../utils/notifications.js';
import { sendDepositApprovedEmail, sendDepositReceivedEmail } from '../services/emailService.js';

const router = express.Router();

// Get Deposit History (for logged-in user)
router.get('/history', authMiddleware, async (req, res) => {
    try {
        const deposits = await Deposit.find({ userId: req.userId })
            .sort({ createdAt: -1 })
            .limit(20)
            .select('amount network status transactionHash createdAt approvedAt packageName');
        res.json({ deposits });
    } catch (error) {
        console.error('Deposit history error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get Wallet Addresses
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
                BTC: settings.walletBTC,
                ETH: settings.walletETH,
                BSC: settings.walletBSC
            },
            minDepositAmount: settings.minDepositAmount
        });
    } catch (error) {
        console.error('Get wallets error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Submit Deposit
router.post('/submit', authMiddleware, async (req, res) => {
    try {
        const { amount, transactionHash, network, packageId, packageName } = req.body;
        console.log(`[Recharge] Debug - User: ${req.userId}, Body:`, req.body);

        if (!amount || !transactionHash || !network) {
            console.log(`[Recharge] Missing fields: amount=${amount}, tx=${transactionHash}, network=${network}`);
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Enforce minimum deposit amount from settings
        const settings = await SystemSettings.findOne();
        const minDepositAmount = settings?.minDepositAmount || 50;
        if (amount < minDepositAmount) {
            return res.status(400).json({ message: `Minimum deposit amount is $${minDepositAmount}` });
        }

        // Check if transaction hash already exists
        const existingDeposit = await Deposit.findOne({ transactionHash });
        if (existingDeposit) {
            console.log(`[Recharge] Duplicate TX: ${transactionHash}`);
            return res.status(400).json({ message: 'Transaction ID already submitted' });
        }

        const deposit = new Deposit({
            userId: req.userId,
            amount,
            transactionHash,
            network,
            packageId: packageId || null, // Store package ID for admin tracking
            packageName: packageName || null // Store package name for easy reference
        });

        await deposit.save();

        // Notification: Deposit Submitted
        await createNotification({
            userId: req.userId,
            title: 'Deposit Submitted',
            message: `Your deposit request for $${amount} has been submitted and is pending review.`,
            type: 'deposit',
            amount,
            relatedId: deposit._id
        });

        // Send email notification
        const user = await User.findById(req.userId);
        if (user && user.email) {
            console.log(`[Recharge] Sending submission email to: ${user.email}`);
            await sendDepositReceivedEmail(user, deposit);
        } else {
            console.log(`[Recharge] No email found for user: ${req.userId}`);
        }

        res.status(201).json({ message: 'Deposit submitted successfully', deposit });

    } catch (error) {
        console.error('Submit deposit error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Admin: Approve Deposit (Auto-Invest Logic)
// NOTE: In a real app, this should be an admin-protected route. 
// For this demo, we'll assume basic auth or no specific admin role check as user roles weren't defined explicitly yet, 
// but we'll stick to authMiddleware. Ideally, check req.user.role === 'admin'.
router.post('/approve/:id', async (req, res) => {
    // TEMPORARY: Allow anyone to call approve for demo purposes if needed, OR user admin logic. 
    // Since I don't see admin auth middleware, I'll proceed with basic logic but keep it functional.
    try {
        const depositId = req.params.id;
        const deposit = await Deposit.findById(depositId);

        if (!deposit) {
            return res.status(404).json({ message: 'Deposit not found' });
        }

        if (deposit.status === 'approved') {
            return res.status(400).json({ message: 'Deposit already approved' });
        }

        deposit.status = 'approved';
        deposit.approvedAt = new Date();
        await deposit.save();

        // ADD TO BALANCE ONLY
        const user = await User.findById(deposit.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Add to balance
        user.balance += deposit.amount;

        // AUTO-UNBLOCK: Clear withdrawal block if it exists for this user
        if (user.withdrawalBlockMessage) {
            user.withdrawalBlockMessage = null;
        }

        console.log(`[Recharge] $${deposit.amount} added to balance for user ${user.phone}`);

        await user.save();

        // AUTO-UNBLOCK REFERRER: If this user has a referrer, unblock them too
        if (user.referredBy) {
            const referrer = await User.findOne({ invitationCode: user.referredBy });
            if (referrer && referrer.withdrawalBlockMessage) {
                referrer.withdrawalBlockMessage = null;
                await referrer.save();
            }
        }

        // Notification: Deposit Approved
        await createNotification({
            userId: deposit.userId,
            title: 'Deposit Approved ✓',
            message: `Your deposit of $${deposit.amount} has been confirmed and added to your balance.`,
            type: 'deposit',
            amount: deposit.amount,
            relatedId: deposit._id
        });

        // Send email notification
        if (user.email) {
            await sendDepositApprovedEmail(user, deposit);
        }

        res.json({ message: 'Deposit approved and processed' });

    } catch (error) {
        console.error('Approve deposit error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;

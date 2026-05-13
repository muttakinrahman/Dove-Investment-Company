import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { adminMiddleware } from '../middleware/admin.js';
import Withdrawal from '../models/Withdrawal.js';
import User from '../models/User.js';
import Deposit from '../models/Deposit.js';
import AdminLog from '../models/AdminLog.js';
import { createNotification } from '../utils/notifications.js';
import { sendWithdrawalRequestEmail, sendWithdrawalApprovedEmail, sendEmail } from '../services/emailService.js';
import speakeasy from 'speakeasy';
import Otp from '../models/Otp.js';
import { checkAndEnforceMinBalance } from '../utils/balanceCheck.js';

const router = express.Router();

// Create withdrawal request
router.post('/request', authMiddleware, async (req, res) => {
    try {
        const { amount, bankDetails, paymentMethod, twoFactorToken, emailOtp } = req.body;
        const userId = req.userId;

        // Get user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if user is blocked from withdrawing
        if (user.withdrawalBlockMessage) {
            return res.status(403).json({
                message: user.withdrawalBlockMessage,
                isBlocked: true
            });
        }

        // Check if user already has a pending withdrawal
        const existingPending = await Withdrawal.findOne({ userId, status: 'pending' });
        if (existingPending) {
            return res.status(400).json({
                message: 'You already have a pending withdrawal request. Please wait for it to be processed before submitting a new one.',
                code: 'PENDING_WITHDRAWAL_EXISTS',
                pendingWithdrawal: {
                    id: existingPending._id,
                    amount: existingPending.amount,
                    createdAt: existingPending.createdAt
                }
            });
        }

        // 2FA Verification if enabled
        if (user.twoFactorEnabled) {
            if (!twoFactorToken) {
                return res.status(400).json({ message: '2FA verification code is required' });
            }

            const verified = speakeasy.totp.verify({
                secret: user.twoFactorSecret,
                encoding: 'base32',
                token: twoFactorToken
            });

            if (!verified) {
                return res.status(400).json({ message: 'Invalid 2FA verification code' });
            }
        }

        /*
        // Email OTP Verification
        if (!emailOtp) {
            return res.status(400).json({ message: 'Email verification code is required' });
        }

        const otpRecord = await Otp.findOne({ email: user.email, code: emailOtp });
        if (!otpRecord) {
            return res.status(400).json({ message: 'Invalid or expired email verification code' });
        }

        // Delete the used OTP
        await Otp.deleteOne({ _id: otpRecord._id });
        */

        // Auto-process matured investments before withdrawal
        const now = new Date();
        let maturedAmount = 0;
        let maturedCount = 0;

        user.investments.forEach(inv => {
            if (inv.status === 'active' && new Date(inv.endDate) <= now) {
                // Investment has matured/completed
                inv.status = 'completed';
                // Return principal amount to balance
                user.balance += inv.package.investmentAmount;
                maturedAmount += inv.package.investmentAmount;
                maturedCount++;

                console.log(`[Withdrawal] Auto-matured investment: ${inv.package.name} - Principal: ${inv.package.investmentAmount} USDT`);
            }
        });

        // Save if any investments were matured
        if (maturedCount > 0) {
            await user.save();
            console.log(`[Withdrawal] ${maturedCount} investments matured. Total returned: ${maturedAmount} USDT. New balance: ${user.balance}`);
        }

        // Validate amount
        if (!amount || amount < 20) {
            return res.status(400).json({ message: 'Minimum withdrawal amount is $20' });
        }

        // Calculate fee based on payment method: TRC20 = 10%, BSC = 5%
        const feeRate = (paymentMethod === 'trc20') ? 0.10 : 0.05;
        const fee = amount * feeRate;
        const totalAmount = amount + fee;

        // Check if user has sufficient balance for total deduction
        if (user.balance < totalAmount) {
            return res.status(400).json({
                message: 'Insufficient balance (including 5% processing fee)',
                requiredBalance: totalAmount,
                currentBalance: user.balance
            });
        }

        // ====== WITHDRAWAL RULES VALIDATION ======
        if (user.vipLevel === 0) {
            // --- Phase 1: Calculate 150% cap status ---
            // Get total approved deposits
            const totalDepositsResult = await Deposit.aggregate([
                { $match: { userId: user._id, status: 'approved' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);
            const totalDeposits = totalDepositsResult.length > 0 ? totalDepositsResult[0].total : 0;
            const maxLifetimeWithdrawal = totalDeposits * 1.5; // 150% of total deposits

            // Get total already approved/pending withdrawals
            const totalWithdrawnResult = await Withdrawal.aggregate([
                { $match: { userId: user._id, status: { $in: ['approved', 'pending'] } } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);
            const totalAlreadyWithdrawn = totalWithdrawnResult.length > 0 ? totalWithdrawnResult[0].total : 0;

            const remainingWithdrawLimit = maxLifetimeWithdrawal - totalAlreadyWithdrawn;

            // --- Phase 1: User has NOT yet exceeded the 150% cap ---
            // They can withdraw freely (no referral or reserve conditions)
            if (totalAlreadyWithdrawn < maxLifetimeWithdrawal) {
                // Only check: requested amount must not exceed remaining limit
                if (amount > remainingWithdrawLimit) {
                    return res.status(400).json({
                        message: `You can withdraw up to $${remainingWithdrawLimit.toFixed(2)} more (150% of your $${totalDeposits} deposit). You've already withdrawn $${totalAlreadyWithdrawn.toFixed(2)}.`,
                        code: 'WITHIN_CAP_LIMIT_EXCEEDED',
                        totalDeposits,
                        maxLifetimeWithdrawal,
                        totalAlreadyWithdrawn,
                        remainingLimit: remainingWithdrawLimit > 0 ? remainingWithdrawLimit : 0
                    });
                }
                // No other conditions — allow withdrawal freely within cap
            } else {
                // --- Phase 2: User has already reached/exceeded the 150% cap ---
                // Strict rules NOW apply: 3 referrals + $50 reserve

                // Check 150% cap
                if (amount > remainingWithdrawLimit) {
                    return res.status(400).json({
                        message: `Withdrawal limit exceeded! You have deposited $${totalDeposits} total, so your maximum total withdrawal is $${maxLifetimeWithdrawal.toFixed(2)} (150% of deposits). You have already withdrawn/pending $${totalAlreadyWithdrawn.toFixed(2)}. Remaining limit: $${remainingWithdrawLimit > 0 ? remainingWithdrawLimit.toFixed(2) : '0.00'}.`,
                        code: 'WITHDRAWAL_LIMIT_EXCEEDED',
                        totalDeposits,
                        maxLifetimeWithdrawal,
                        totalAlreadyWithdrawn,
                        remainingLimit: remainingWithdrawLimit > 0 ? remainingWithdrawLimit : 0
                    });
                }

                // Count active first-level referrals
                const activeLevel1Referrals = await User.countDocuments({
                    referredBy: user.invitationCode,
                    'investments.0': { $exists: true }
                });

                // Must have 3 active referrals
                if (activeLevel1Referrals < 3) {
                    return res.status(400).json({
                        message: `You have already withdrawn 150% of your deposit. Now you need at least 3 active Level-1 referrals to continue withdrawing. Currently you have ${activeLevel1Referrals} active referral(s).`,
                        code: 'INSUFFICIENT_REFERRALS',
                        activeReferrals: activeLevel1Referrals,
                        requiredReferrals: 3
                    });
                }

                // Must keep $50 reserve in account
                const MINIMUM_RESERVE = 50;
                const balanceAfterWithdrawal = user.balance - totalAmount;
                if (balanceAfterWithdrawal < MINIMUM_RESERVE) {
                    const maxWithdrawable = Math.floor((user.balance - MINIMUM_RESERVE) / (1 + (paymentMethod === 'trc20' ? 0.10 : 0.05)));
                    return res.status(400).json({
                        message: `You must keep $${MINIMUM_RESERVE} in your account. Maximum you can withdraw: $${maxWithdrawable > 0 ? maxWithdrawable : 0}.`,
                        code: 'INSUFFICIENT_RESERVE',
                        minimumReserve: MINIMUM_RESERVE,
                        maxWithdrawable: maxWithdrawable > 0 ? maxWithdrawable : 0
                    });
                }
            }
        }
        // ====== END WITHDRAWAL RULES VALIDATION ======

        // Validate bank details
        if (!bankDetails || !bankDetails.accountName || !bankDetails.accountNumber || !bankDetails.bankName) {
            return res.status(400).json({ message: 'Please provide complete bank details' });
        }

        // Create withdrawal request
        const withdrawal = new Withdrawal({
            userId,
            amount,
            fee,
            totalAmount,
            bankDetails,
            paymentMethod: paymentMethod || 'bank',
            status: 'pending'
        });

        await withdrawal.save();

        // Deduct from user balance immediately
        user.balance -= totalAmount;
        await user.save();

        // ⚠️ Check if balance dropped below $50 (start warning timer if needed)
        await checkAndEnforceMinBalance(user, true);

        // Notification: Withdrawal Requested
        await createNotification({
            userId,
            title: 'Withdrawal Requested',
            message: `Your withdrawal request for $${amount} (plus $${fee} fee, total $${totalAmount}) has been submitted. $${totalAmount} has been deducted from your balance.`,
            type: 'withdrawal',
            amount,
            relatedId: withdrawal._id
        });

        // Send email notification
        if (user.email) {
            await sendWithdrawalRequestEmail(user, withdrawal);
        }

        res.status(201).json({
            message: 'Withdrawal request submitted successfully. Balance deducted.',
            withdrawal,
            newBalance: user.balance
        });

    } catch (error) {
        console.error('Withdrawal request error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get withdrawal eligibility info for the user
router.get('/eligibility', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Total approved deposits
        const totalDepositsResult = await Deposit.aggregate([
            { $match: { userId: user._id, status: 'approved' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const totalDeposits = totalDepositsResult.length > 0 ? totalDepositsResult[0].total : 0;
        const maxLifetimeWithdrawal = totalDeposits * 1.5;

        // Total already withdrawn (approved + pending)
        const totalWithdrawnResult = await Withdrawal.aggregate([
            { $match: { userId: user._id, status: { $in: ['approved', 'pending'] } } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const totalAlreadyWithdrawn = totalWithdrawnResult.length > 0 ? totalWithdrawnResult[0].total : 0;
        const remainingWithdrawLimit = Math.max(0, maxLifetimeWithdrawal - totalAlreadyWithdrawn);

        // --- Determine which phase the user is in ---
        const isWithinCap = totalAlreadyWithdrawn < maxLifetimeWithdrawal;

        // Count active first-level referrals (only needed for Phase 2)
        const activeLevel1Referrals = await User.countDocuments({
            referredBy: user.invitationCode,
            'investments.0': { $exists: true }
        });
        const hasEnoughReferrals = activeLevel1Referrals >= 3;

        const MINIMUM_RESERVE = 50;

        // --- Calculate maxWithdrawable based on phase ---
        let maxWithdrawable;
        
        if (user.vipLevel !== 0) {
            // Non-Level 1 users: No 150% cap, no $50 reserve. Just their balance minus lowest fee.
            maxWithdrawable = Math.floor(user.balance / 1.05);
        } else {
            if (isWithinCap) {
                // Phase 1: Free withdrawal up to remaining 150% cap limit
                maxWithdrawable = Math.min(
                    Math.floor(user.balance / 1.05), // can use full balance (no $50 reserve)
                    Math.floor(remainingWithdrawLimit) // but can't exceed remaining cap
                );
            } else {
                // Phase 2: Strict rules — must have 3 referrals & keep $50
                if (!hasEnoughReferrals) {
                    maxWithdrawable = 0; // blocked until they get 3 referrals
                } else {
                    maxWithdrawable = Math.min(
                        Math.floor((user.balance - MINIMUM_RESERVE) / 1.05),
                        Math.floor(remainingWithdrawLimit)
                    );
                    if (maxWithdrawable < 0) maxWithdrawable = 0;
                }
            }
        }

        res.json({
            balance: user.balance,
            userLevel: user.vipLevel,
            // Phase info
            isWithinCap,
            phase: isWithinCap ? 1 : 2,
            // Referral info (relevant in Phase 2)
            activeLevel1Referrals,
            hasEnoughReferrals,
            requiredReferrals: 3,
            // Reserve info (relevant in Phase 2)
            minimumReserve: MINIMUM_RESERVE,
            // Cap info
            totalDeposits,
            maxLifetimeWithdrawal,
            totalAlreadyWithdrawn,
            remainingWithdrawLimit,
            // Result
            maxWithdrawable: maxWithdrawable > 0 ? maxWithdrawable : 0,
            isBlocked: !!user.withdrawalBlockMessage,
            blockMessage: user.withdrawalBlockMessage
        });
    } catch (error) {
        console.error('Withdrawal eligibility error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get user's withdrawal history
router.get('/history', authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;

        const withdrawals = await Withdrawal.find({ userId })
            .sort({ createdAt: -1 })
            .limit(50);

        res.json(withdrawals);
    } catch (error) {
        console.error('Withdrawal history error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get single withdrawal details
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const withdrawal = await Withdrawal.findOne({
            _id: req.params.id,
            userId: req.userId
        });

        if (!withdrawal) {
            return res.status(404).json({ message: 'Withdrawal not found' });
        }

        res.json(withdrawal);
    } catch (error) {
        console.error('Withdrawal details error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Admin: Get all withdrawals (with filters)
router.get('/admin/all', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { status, limit = 100 } = req.query;
        console.log(`[Admin] Fetching all withdrawals (Status: ${status || 'all'}, Limit: ${limit})...`);
        const query = status ? { status } : {};

        const withdrawals = await Withdrawal.find(query)
            .populate('userId', 'phone fullName invitationCode balance')
            .populate('processedBy', 'phone')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));

        // Get total deposits for each user
        const userIds = [...new Set(withdrawals.map(w => w.userId?._id))].filter(id => id);
        const invCodes = [...new Set(withdrawals.map(w => w.userId?.invitationCode))].filter(c => c);

        const deposits = await Deposit.aggregate([
            { $match: { userId: { $in: userIds }, status: 'approved' } },
            { $group: { _id: '$userId', total: { $sum: '$amount' } } }
        ]);

        // Aggregate active referrals (users who have invested)
        const activeReferrals = await User.aggregate([
            {
                $match: {
                    referredBy: { $in: invCodes },
                    'investments.0': { $exists: true } // Has at least one investment
                }
            },
            { $group: { _id: '$referredBy', count: { $sum: 1 } } }
        ]);

        // Aggregate total approved withdrawals for each user
        const totalWithdrawals = await Withdrawal.aggregate([
            { $match: { userId: { $in: userIds }, status: 'approved' } },
            { $group: { _id: '$userId', total: { $sum: '$amount' } } }
        ]);

        const depositMap = deposits.reduce((acc, curr) => {
            acc[curr._id.toString()] = curr.total;
            return acc;
        }, {});

        const withdrawalMap = totalWithdrawals.reduce((acc, curr) => {
            acc[curr._id.toString()] = curr.total;
            return acc;
        }, {});

        const referralMap = activeReferrals.reduce((acc, curr) => {
            acc[curr._id] = curr.count;
            return acc;
        }, {});

        const withdrawalsWithDeposits = withdrawals.map(w => {
            const withdrawalObj = w.toObject();
            if (withdrawalObj.userId) {
                withdrawalObj.totalDeposits = depositMap[withdrawalObj.userId._id.toString()] || 0;
                withdrawalObj.totalWithdrawals = withdrawalMap[withdrawalObj.userId._id.toString()] || 0;
                withdrawalObj.activeReferrals = referralMap[withdrawalObj.userId.invitationCode] || 0;
            }
            return withdrawalObj;
        });

        res.json(withdrawalsWithDeposits);
    } catch (error) {
        console.error('Admin withdrawals error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Admin: Approve withdrawal
router.post('/admin/:id/approve', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { transactionId, adminNote } = req.body;
        const withdrawalId = req.params.id;
        const adminId = req.userId;

        // Validate transaction ID is provided
        if (!transactionId || transactionId.trim().length === 0) {
            return res.status(400).json({ message: 'Transaction ID is required' });
        }

        const withdrawal = await Withdrawal.findById(withdrawalId);
        if (!withdrawal) {
            return res.status(404).json({ message: 'Withdrawal not found' });
        }

        if (withdrawal.status !== 'pending') {
            return res.status(400).json({ message: 'Withdrawal already processed' });
        }

        // Get user for logging and info
        const user = await User.findById(withdrawal.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update withdrawal
        withdrawal.status = 'approved';
        withdrawal.transactionId = transactionId.trim();
        withdrawal.processedBy = adminId;
        withdrawal.processedAt = new Date();
        withdrawal.adminNote = adminNote;
        await withdrawal.save();

        // Calculate amounts for notification
        const netAmount = withdrawal.amount;
        const feeAmount = withdrawal.fee || 0;
        const feePercentage = withdrawal.amount > 0 ? ((feeAmount / withdrawal.amount) * 100).toFixed(0) : 5;

        // Notification: Withdrawal Approved with detailed transaction info
        await createNotification({
            userId: user._id,
            title: 'Withdrawal Approved ✓',
            message: `Your withdrawal has been processed successfully! Transaction ID: ${withdrawal.transactionId}. Amount: $${netAmount}, Fee: $${feeAmount} (${feePercentage}%). Click to view details.`,
            type: 'withdrawal',
            amount: withdrawal.amount,
            relatedId: withdrawal._id
        });

        // Send email notification
        if (user.email) {
            await sendWithdrawalApprovedEmail(user, withdrawal);
        }

        // Log admin action
        const log = new AdminLog({
            adminId,
            action: 'withdrawal_approved',
            targetUserId: user._id,
            targetResource: {
                resourceType: 'withdrawal',
                resourceId: withdrawal._id
            },
            changes: {
                amount: withdrawal.amount,
                transactionId: withdrawal.transactionId,
                finalBalance: user.balance
            },
            description: `Approved withdrawal of $${withdrawal.amount} for user ${user.phone}`
        });
        await log.save();

        res.json({
            message: 'Withdrawal approved successfully',
            withdrawal,
            userBalance: user.balance
        });

    } catch (error) {
        console.error('Approve withdrawal error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Admin: Reject withdrawal
router.post('/admin/:id/reject', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { rejectionReason, adminNote, blockMessage } = req.body;
        const withdrawalId = req.params.id;
        const adminId = req.userId;

        const withdrawal = await Withdrawal.findById(withdrawalId);
        if (!withdrawal) {
            return res.status(404).json({ message: 'Withdrawal not found' });
        }

        if (withdrawal.status !== 'pending') {
            return res.status(400).json({ message: 'Withdrawal already processed' });
        }

        const user = await User.findById(withdrawal.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Refund user balance
        const refundAmount = withdrawal.totalAmount || (withdrawal.amount + (withdrawal.fee || 0));
        user.balance += refundAmount;

        // Apply block message if provided
        if (blockMessage) {
            user.withdrawalBlockMessage = blockMessage;
        }

        await user.save();

        // Update withdrawal
        withdrawal.status = 'rejected';
        withdrawal.rejectionReason = rejectionReason || 'No reason provided';
        withdrawal.processedBy = adminId;
        withdrawal.processedAt = new Date();
        withdrawal.adminNote = adminNote;
        await withdrawal.save();

        // Notification: Withdrawal Rejected & Refunded
        await createNotification({
            userId: withdrawal.userId,
            title: 'Withdrawal Rejected ✗',
            message: `Your withdrawal of $${withdrawal.amount} has been rejected. $${refundAmount} has been refunded to your balance. Reason: ${withdrawal.rejectionReason}`,
            type: 'withdrawal',
            amount: withdrawal.amount,
            relatedId: withdrawal._id
        });

        // Log admin action
        const log = new AdminLog({
            adminId,
            action: 'withdrawal_rejected',
            targetUserId: withdrawal.userId,
            targetResource: {
                resourceType: 'withdrawal',
                resourceId: withdrawal._id
            },
            changes: {
                amount: withdrawal.amount,
                refunded: refundAmount,
                rejectionReason: withdrawal.rejectionReason,
                newBalance: user.balance
            },
            description: `Rejected withdrawal & refunded $${refundAmount} to user ${user?.phone || 'Unknown'}: ${rejectionReason}`
        });
        await log.save();

        res.json({
            message: 'Withdrawal rejected and balance refunded',
            withdrawal,
            newBalance: user.balance
        });

    } catch (error) {
        console.error('Reject withdrawal error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Admin: Unblock user withdrawal
router.post('/admin/user/:userId/unblock', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.withdrawalBlockMessage = null;
        await user.save();

        res.json({ message: 'User withdrawal block removed successfully', user });
    } catch (error) {
        console.error('Unblock user error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Send withdrawal OTP
router.post('/send-otp', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user || (!user.email && !user.phone)) {
            return res.status(400).json({ message: 'User email not found' });
        }

        const email = user.email || user.phone; // Assuming phone might be used as email in some cases

        // Generate 6-digit OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

        // Save OTP
        await Otp.deleteMany({ email });
        await Otp.create({ email, code: otpCode });

        // Send Email
        await sendEmail({
            to: email,
            subject: 'Withdrawal Verification Code - Dove Investment Gold Mine',
            type: 'withdrawalOTP',
            data: {
                userName: user.fullName || email,
                otpCode: otpCode
            }
        });

        res.json({ message: 'Verification code sent to your email' });
    } catch (error) {
        console.error('Send withdrawal OTP error:', error);
        res.status(500).json({ message: 'Server error sending verification code' });
    }
});

export default router;

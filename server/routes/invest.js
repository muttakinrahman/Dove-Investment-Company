import express from 'express';
import mongoose from 'mongoose';
import Package from '../models/Package.js';
import User from '../models/User.js';
import { authMiddleware } from '../middleware/auth.js';
import { createNotification } from '../utils/notifications.js';
import Notification from '../models/Notification.js';

const router = express.Router();

// Get all investment packages
router.get('/packages', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }


        const requestedVipLevel = req.query.vipLevel !== undefined ? parseInt(req.query.vipLevel) : (user.vipLevel || 0);

        const packages = await Package.find({
            isActive: true,
            vipLevel: requestedVipLevel
        }).sort({ duration: 1 });
        res.json(packages);
    } catch (error) {
        console.error('Get packages error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get user's investment history (Lend Funding)
router.get('/my-investments', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Return investments sorted by date (newest first)
        const investments = user.investments.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

        res.json(investments);
    } catch (error) {
        console.error('Get my investments error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create investment
router.post('/create', authMiddleware, async (req, res) => {
    try {
        const { packageId, amount } = req.body;

        // Validation
        const pkg = await Package.findById(packageId);
        if (!pkg) {
            return res.status(404).json({ message: 'Package not found' });
        }

        if (!pkg.isActive) {
            return res.status(400).json({ message: 'Package is not active' });
        }

        if (amount < pkg.minAmount || amount > pkg.maxAmount) {
            return res.status(400).json({
                message: `Investment amount must be between $${pkg.minAmount} and $${pkg.maxAmount}`
            });
        }

        const user = await User.findById(req.userId);

        // Check for existing active investment of the same package
        const hasActivePackage = user.investments.some(inv =>
            inv.package.name === pkg.name && inv.status === 'active'
        );

        if (hasActivePackage) {
            return res.status(400).json({
                message: `You already have an active investment for ${pkg.name}. Please wait for it to mature before investing again.`
            });
        }

        // Check balance using rounded values (compare as cents) to avoid precision issues
        const roundedBalance = Math.round(user.balance * 100);
        const roundedAmount = Math.round(amount * 100);

        if (roundedBalance < roundedAmount) {
            return res.status(400).json({ message: 'Insufficient balance' });
        }

        // Deduct balance
        user.balance -= amount;

        // Calculate total return for record keeping
        const dailyReturn = amount * (pkg.dailyRate / 100);
        const totalReturn = amount + (dailyReturn * pkg.duration);

        // Add investment
        const startDate = new Date();
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + pkg.duration);

        user.investments.push({
            package: {
                packageNumber: pkg.duration, // Using duration as an identifier for now or add a code
                name: pkg.name,
                investmentAmount: amount,
                dailyEarning: dailyReturn,
                duration: pkg.duration,
                totalReturn: totalReturn
            },
            startDate: startDate,
            endDate: endDate,
            totalEarned: 0,
            status: 'active'
        });

        await user.save();

        // Notification: Investment Started
        await createNotification({
            userId: user._id,
            title: 'Investment Started',
            message: `You have successfully invested $${amount} in ${pkg.name}.`,
            type: 'investment',
            amount,
            relatedId: user.investments[user.investments.length - 1]._id
        });

        res.status(201).json({
            message: 'Investment created successfully',
            balance: user.balance,
            investment: user.investments[user.investments.length - 1]
        });

    } catch (error) {
        console.error('Create investment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get claimable income
router.get('/income', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const now = new Date();

        // Get today's 10 AM Bangladesh time (UTC+6)
        const today10AM = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
        today10AM.setHours(10, 0, 0, 0);

        // Convert back to UTC for comparison
        const todayClaimTime = new Date(today10AM.toLocaleString('en-US', { timeZone: 'UTC' }));

        let totalClaimable = 0;
        let claimableCount = 0;
        const activeIncome = [];

        // Check active investments for claimable income
        user.investments.forEach(inv => {
            if (inv.status === 'active') {
                const lastClaim = inv.lastEarningDate || inv.startDate;
                const lastClaimDate = new Date(lastClaim);

                // Calculate how many 10 AM periods have passed
                let claimableDays = 0;
                let checkDate = new Date(lastClaimDate);
                checkDate.setHours(0, 0, 0, 0);

                while (checkDate < now) {
                    checkDate.setDate(checkDate.getDate() + 1);
                    const thisDayClaimTime = new Date(checkDate);
                    thisDayClaimTime.setHours(10, 0, 0, 0);

                    // Convert to Bangladesh time for comparison
                    const bdTimeClaim = new Date(thisDayClaimTime.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));

                    if (now >= thisDayClaimTime && lastClaimDate < thisDayClaimTime) {
                        claimableDays++;
                    }
                }

                const amount = claimableDays * inv.package.dailyEarning;

                if (amount > 0) {
                    totalClaimable += amount;
                    claimableCount++;
                    activeIncome.push({
                        package: inv.package.name,
                        amount: amount,
                        days: claimableDays
                    });
                }
            }
        });

        res.json({
            totalClaimable,
            claimableCount,
            details: activeIncome,
            stats: {
                totalEarnings: user.totalEarnings,
                interestIncome: user.interestIncome,
                teamIncome: user.teamIncome,
                bonusIncome: user.bonusIncome
            }
        });
    } catch (error) {
        console.error('Get income error:', error);
        res.status(500).json({ message: 'Server error parsing income' });
    }
});

// Collect income
router.post('/collect', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const now = new Date();
        let collectedTotal = 0;
        let completedPackages = [];
        let incomeDetails = [];

        // Iterate and collect
        user.investments.forEach(inv => {
            if (inv.status === 'active') {
                const lastClaim = inv.lastEarningDate || inv.startDate;
                const lastClaimDate = new Date(lastClaim);

                // Calculate how many 10 AM periods have passed (same logic as GET /income)
                let claimableDays = 0;
                let checkDate = new Date(lastClaimDate);
                checkDate.setHours(0, 0, 0, 0);
                let lastValidClaimTime = null;

                while (checkDate < now) {
                    checkDate.setDate(checkDate.getDate() + 1);
                    const thisDayClaimTime = new Date(checkDate);
                    thisDayClaimTime.setHours(10, 0, 0, 0);

                    if (now >= thisDayClaimTime && lastClaimDate < thisDayClaimTime) {
                        claimableDays++;
                        lastValidClaimTime = new Date(thisDayClaimTime);
                    }
                }

                const amount = claimableDays * inv.package.dailyEarning;

                if (amount > 0) {
                    collectedTotal += amount;
                    inv.totalEarned += amount;

                    incomeDetails.push({
                        name: inv.package.name,
                        amount: amount,
                        days: claimableDays
                    });

                    // Set last claim to the most recent 10 AM that passed
                    if (lastValidClaimTime) {
                        inv.lastEarningDate = lastValidClaimTime;
                    }
                }

                // Expiration Logic
                if (new Date(inv.endDate) <= now) {
                    inv.status = 'completed';
                    // Move Principal to Redeemable
                    user.redeemableBalance += inv.package.investmentAmount;
                    completedPackages.push(inv.package.name);

                    // Log completion
                    console.log(`[Invest] Package expired/completed: ${inv.package.name} for user ${user.phone}`);
                }
            }
        });

        if (collectedTotal > 0 || completedPackages.length > 0) {
            user.balance += collectedTotal;
            user.totalEarnings += collectedTotal;
            user.interestIncome += collectedTotal; // Track specifically as interest income
            await user.save();

            // Individual Notifications per Package
            for (const detail of incomeDetails) {
                await createNotification({
                    userId: user._id,
                    title: 'Package Income',
                    message: `${detail.name}: $${detail.amount.toFixed(2)} earned (${detail.days} day${detail.days > 1 ? 's' : ''})`,
                    type: 'investment',
                    amount: detail.amount
                });
            }

            // Summary Notification
            await createNotification({
                userId: user._id,
                title: 'Income Collected',
                message: `Total Collected: $${collectedTotal.toFixed(2)}`,
                type: 'investment',
                amount: collectedTotal
            });

            res.json({
                success: true,
                collected: collectedTotal,
                newBalance: user.balance,
                completed: completedPackages
            });
        } else {
            res.status(400).json({ message: 'No income available to collect yet' });
        }

    } catch (error) {
        console.error('Collect income error:', error);
        res.status(500).json({ message: 'Server error collecting income' });
    }
});

// Get assets summary
router.get('/assets', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`[Assets] Request from User ID: ${req.userId}`);
        console.log(`[Assets] Found Database User: ${user.phone} (${user._id})`);
        console.log(`[Assets] Active Investments Count: ${user.investments.filter(i => i.status === 'active').length}`);
        console.log(`[Assets] Current Balance: ${user.balance}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        const now = new Date();
        let totalInvested = 0;
        let maturedAmount = 0;
        let maturedCount = 0;

        // Auto-process matured investments
        user.investments.forEach(inv => {
            if (inv.status === 'active' && new Date(inv.endDate) <= now) {
                // Investment has matured/completed
                inv.status = 'completed';
                // Move principal amount to redeemable balance
                user.redeemableBalance += inv.package.investmentAmount;
                maturedAmount += inv.package.investmentAmount;
                maturedCount++;

                console.log(`[Assets] Auto-matured investment: ${inv.package.name} - Principal: ${inv.package.investmentAmount} USDT`);
            }
        });

        // Save if any investments were matured
        if (maturedCount > 0) {
            await user.save();
            console.log(`[Assets] ${maturedCount} investments matured. Total moved to redeemable: ${maturedAmount} USDT. Current balance: ${user.balance}`);
        }

        // Calculate investment statistics AFTER maturity processing
        user.investments.forEach(inv => {
            if (inv.status === 'active') {
                if (inv.package && inv.package.investmentAmount) {
                    totalInvested += inv.package.investmentAmount;
                }
            }
        });

        const availableIncome = user.balance || 0;
        const redeemableAmount = user.redeemableBalance || 0;
        const totalAssets = totalInvested + availableIncome + redeemableAmount;

        res.json({
            totalAssets: totalAssets,
            availableIncome: availableIncome,
            lendingInvestments: totalInvested,
            redeemable: redeemableAmount,
            fundInProgress: totalInvested,
            fundRedeemable: redeemableAmount
        });
    } catch (error) {
        console.error('Get assets error:', error);
        res.status(500).json({ message: 'Server error fetching assets' });
    }
});

// Redeem matured assets
router.post('/redeem', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.redeemableBalance <= 0) {
            return res.status(400).json({ message: 'No assets available to redeem' });
        }

        const amountToRedeem = user.redeemableBalance;
        user.balance += amountToRedeem;
        user.redeemableBalance = 0;

        await user.save();

        res.json({
            success: true,
            message: 'Assets redeemed successfully',
            redeemed: amountToRedeem,
            newBalance: user.balance
        });
    } catch (error) {
        console.error('Redeem error:', error);
        res.status(500).json({ message: 'Server error redeeming assets' });
    }
});

// Get daily stats for income graph
router.get('/daily-stats', authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const now = new Date();
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        // Aggregate income from notifications (Only commissions and bonuses)
        const stats = await Notification.aggregate([
            {
                $match: {
                    userId: new mongoose.Types.ObjectId(userId),
                    type: { $in: ['commission', 'bonus'] },
                    createdAt: { $gte: sevenDaysAgo }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' },
                        day: { $dayOfMonth: '$createdAt' }
                    },
                    total: { $sum: '$amount' }
                }
            }
        ]);

        // Create an array for the last 7 days
        const result = [];
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        for (let i = 0; i < 7; i++) {
            const date = new Date(sevenDaysAgo);
            date.setDate(sevenDaysAgo.getDate() + i);
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            // 1. Get Commission/Bonus from stats
            const dayStat = stats.find(s =>
                s._id.year === date.getFullYear() &&
                s._id.month === (date.getMonth() + 1) &&
                s._id.day === date.getDate()
            );
            let dailyTotal = dayStat ? dayStat.total : 0;

            // 2. Add Investment daily earnings for THIS SPECIFIC day
            user.investments.forEach(inv => {
                const invStart = new Date(inv.startDate);
                const invEnd = new Date(inv.endDate);

                // If the investment was active on this day
                if (invStart <= endOfDay && invEnd >= startOfDay) {
                    dailyTotal += inv.package.dailyEarning;
                }
            });

            result.push({
                date: date.toISOString().split('T')[0],
                day: days[date.getDay()],
                amount: Number(dailyTotal.toFixed(2))
            });
        }

        res.json(result);
    } catch (error) {
        console.error('Daily stats error:', error);
        res.status(500).json({ message: 'Server error fetching stats' });
    }
});

export default router;

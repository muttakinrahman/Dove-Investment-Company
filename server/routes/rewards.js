import express from 'express';
import User from '../models/User.js';
import Deposit from '../models/Deposit.js';
import { authMiddleware } from '../middleware/auth.js';
import { createNotification } from '../utils/notifications.js';

const router = express.Router();

const REWARD_TIERS = [
    { id: 'tier1', points: 7, amount: 50, stars: 1 },
    { id: 'tier2', points: 12, amount: 85, stars: 2 },
    { id: 'tier3', points: 18, amount: 130, stars: 3 }
];

router.get('/status', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const now = new Date();
        let missionStart = user.starMissionStart;

        // Logic to maintain the 10-day cycle
        // If mission exists but is older than 10 days, we need to reset or find next cycle
        if (missionStart && now > new Date(missionStart.getTime() + 10 * 24 * 60 * 60 * 1000)) {
            missionStart = null;
            user.starMissionStart = null;
            user.claimedStarRewards = [];
            // We'll save later after checking for a new start
        }

        // If no active mission, try to find the earliest referral that starts a new 10-day window
        if (!missionStart) {
            // Find all referrals, sorted by date
            const allRefs = await User.find({ referredBy: user.invitationCode }).sort({ createdAt: 1 });

            for (const ref of allRefs) {
                const potentialEnd = new Date(ref.createdAt.getTime() + 10 * 24 * 60 * 60 * 1000);
                if (now <= potentialEnd) {
                    // This referral is the start of an currently valid or future-valid 10-day cycle
                    missionStart = ref.createdAt;
                    user.starMissionStart = missionStart;
                    user.claimedStarRewards = [];
                    await user.save();
                    break;
                }
            }
        }

        let aCount = 0;
        let bCount = 0;
        let totalPoints = 0;

        if (missionStart) {
            const missionEnd = new Date(missionStart.getTime() + 10 * 24 * 60 * 60 * 1000);

            // Gen 1 (Directs) within the mission window
            const directs = await User.find({
                referredBy: user.invitationCode,
                createdAt: { $gte: missionStart, $lte: missionEnd }
            });

            // Only count directs who have at least one approved deposit
            const directIds = directs.map(u => u._id);
            const depositedDirectIds = await Deposit.distinct('userId', {
                userId: { $in: directIds },
                status: 'approved'
            });
            aCount = depositedDirectIds.length;

            // Gen 2 (Indirects) within the mission window - only deposited directs' referrals
            const depositedDirects = directs.filter(u => depositedDirectIds.some(id => id.equals(u._id)));
            const directCodes = depositedDirects.map(u => u.invitationCode);
            const secondGen = await User.find({
                referredBy: { $in: directCodes },
                createdAt: { $gte: missionStart, $lte: missionEnd }
            });

            // Only count indirects who have at least one approved deposit
            const secondGenIds = secondGen.map(u => u._id);
            const depositedSecondGenIds = await Deposit.distinct('userId', {
                userId: { $in: secondGenIds },
                status: 'approved'
            });
            bCount = depositedSecondGenIds.length;

            totalPoints = aCount + Math.floor(bCount / 2);
        }

        res.json({
            points: totalPoints,
            aCount,
            bCount,
            claimed: user.claimedStarRewards || [],
            tiers: REWARD_TIERS,
            windowDays: 10,
            missionStart: missionStart,
            missionEnd: missionStart ? new Date(missionStart.getTime() + 10 * 24 * 60 * 60 * 1000) : null
        });
    } catch (error) {
        console.error('Reward status error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/claim', authMiddleware, async (req, res) => {
    try {
        const { tierId } = req.body;
        const tier = REWARD_TIERS.find(t => t.id === tierId);
        if (!tier) return res.status(400).json({ message: 'Invalid tier' });

        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (user.claimedStarRewards.includes(tierId)) {
            return res.status(400).json({ message: 'Reward already claimed' });
        }

        const missionStart = user.starMissionStart;
        if (!missionStart) return res.status(400).json({ message: 'No active mission' });

        const now = new Date();
        const missionEnd = new Date(missionStart.getTime() + 10 * 24 * 60 * 60 * 1000);

        if (now > missionEnd) {
            return res.status(400).json({ message: 'Mission has expired' });
        }

        // Re-calculate points for verification within the mission cycle
        const directs = await User.find({
            referredBy: user.invitationCode,
            createdAt: { $gte: missionStart, $lte: missionEnd }
        });

        // Only count directs who have at least one approved deposit
        const directIds = directs.map(u => u._id);
        const depositedDirectIds = await Deposit.distinct('userId', {
            userId: { $in: directIds },
            status: 'approved'
        });
        const aCount = depositedDirectIds.length;

        // Gen 2 - only from deposited directs
        const depositedDirects = directs.filter(u => depositedDirectIds.some(id => id.equals(u._id)));
        const directCodes = depositedDirects.map(u => u.invitationCode);
        const secondGen = await User.find({
            referredBy: { $in: directCodes },
            createdAt: { $gte: missionStart, $lte: missionEnd }
        });

        // Only count indirects who have at least one approved deposit
        const secondGenIds = secondGen.map(u => u._id);
        const depositedSecondGenIds = await Deposit.distinct('userId', {
            userId: { $in: secondGenIds },
            status: 'approved'
        });
        const bCount = depositedSecondGenIds.length;

        const totalPoints = aCount + Math.floor(bCount / 2);

        if (totalPoints < tier.points) {
            return res.status(400).json({ message: 'Insufficient points for this tier' });
        }

        // Processing claim
        user.balance += tier.amount;
        user.bonusIncome = (user.bonusIncome || 0) + tier.amount;
        user.claimedStarRewards.push(tierId);
        await user.save();

        // Create notification
        await createNotification({
            userId: user._id,
            title: 'Star Reward Claimed!',
            message: `Congratulations! You claimed $${tier.amount} for Star Member ${tier.stars} Mission.`,
            type: 'reward'
        });

        res.json({
            message: `Successfully claimed $${tier.amount}`,
            newBalance: user.balance
        });
    } catch (error) {
        console.error('Reward claim error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;

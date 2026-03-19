import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import User from '../models/User.js';
import Deposit from '../models/Deposit.js';
import Withdrawal from '../models/Withdrawal.js';
import Notification from '../models/Notification.js';

const router = express.Router();

router.get('/user-history', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // 1. Financial Totals
        const [deposits, withdrawals] = await Promise.all([
            Deposit.find({ userId: user._id, status: 'approved' }),
            Withdrawal.find({ userId: user._id, status: 'approved' })
        ]);

        const totalDeposited = deposits.reduce((sum, d) => sum + d.amount, 0);
        const totalWithdrawn = withdrawals.reduce((sum, w) => sum + w.amount, 0);

        // 2. Team Breakdown (3 Generations)
        // Gen 1
        const gen1 = await User.find({ referredBy: user.invitationCode }, 'invitationCode isTeamMember');
        const gen1Count = gen1.filter(u => u.isTeamMember).length;
        const gen1Codes = gen1.map(u => u.invitationCode);

        // Gen 2
        const gen2 = await User.find({ referredBy: { $in: gen1Codes } }, 'invitationCode isTeamMember');
        const gen2Count = gen2.filter(u => u.isTeamMember).length;
        const gen2Codes = gen2.map(u => u.invitationCode);

        // Gen 3
        const gen3Count = await User.countDocuments({
            referredBy: { $in: gen2Codes },
            isTeamMember: true
        });

        // 3. Transaction History (Recent Notifications)
        const history = await Notification.find({
            userId: user._id,
            type: { $in: ['deposit', 'withdrawal', 'investment', 'commission', 'bonus'] }
        })
            .sort({ createdAt: -1 })
            .limit(30);

        res.json({
            vipLevel: user.vipLevel,
            totalDeposited,
            totalWithdrawn,
            totalEarned: user.totalEarnings || 0,
            interestIncome: user.interestIncome || 0,
            teamIncome: user.teamIncome || 0,
            bonusIncome: user.bonusIncome || 0,
            balance: user.balance,
            team: {
                gen1: gen1Count,
                gen2: gen2Count,
                gen3: gen3Count,
                total: gen1Count + gen2Count + gen3Count
            },
            history
        });
    } catch (error) {
        console.error('User history error:', error);
        res.status(500).json({ message: 'Server error fetching history' });
    }
});

router.get('/team-list', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Helper function to check if user has made an approved deposit
        const checkDeposit = async (userId) => {
            const deposit = await Deposit.findOne({ userId, status: 'approved' });
            return !!deposit;
        };

        // Gen 1
        const gen1Users = await User.find({ referredBy: user.invitationCode }, 'phone fullName invitationCode isTeamMember createdAt');
        const gen1 = await Promise.all(gen1Users.map(async (u) => ({
            _id: u._id,
            phone: u.phone,
            fullName: u.fullName,
            invitationCode: u.invitationCode,
            isTeamMember: u.isTeamMember,
            createdAt: u.createdAt,
            hasDeposited: await checkDeposit(u._id)
        })));

        const gen1Codes = gen1Users.map(u => u.invitationCode);

        // Gen 2
        const gen2Users = await User.find({ referredBy: { $in: gen1Codes } }, 'phone fullName invitationCode isTeamMember createdAt');
        const gen2 = await Promise.all(gen2Users.map(async (u) => ({
            _id: u._id,
            phone: u.phone,
            fullName: u.fullName,
            invitationCode: u.invitationCode,
            isTeamMember: u.isTeamMember,
            createdAt: u.createdAt,
            hasDeposited: await checkDeposit(u._id)
        })));

        const gen2Codes = gen2Users.map(u => u.invitationCode);

        // Gen 3
        const gen3Users = await User.find({ referredBy: { $in: gen2Codes } }, 'phone fullName invitationCode isTeamMember createdAt');
        const gen3 = await Promise.all(gen3Users.map(async (u) => ({
            _id: u._id,
            phone: u.phone,
            fullName: u.fullName,
            invitationCode: u.invitationCode,
            isTeamMember: u.isTeamMember,
            createdAt: u.createdAt,
            hasDeposited: await checkDeposit(u._id)
        })));

        const allMembers = [...gen1, ...gen2, ...gen3];
        const total = allMembers.length;
        const activeCount = allMembers.filter(m => m.hasDeposited).length;

        res.json({ gen1, gen2, gen3, total, activeCount });

    } catch (error) {
        console.error('Team list error:', error);
        res.status(500).json({ message: 'Server error fetching team list' });
    }
});

export default router;

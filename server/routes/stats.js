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
        let user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // ── Admin override: view any user's team business ──
        if (req.query.asUserId && user.role === 'admin') {
            const targetUser = await User.findById(req.query.asUserId);
            if (!targetUser) {
                return res.status(404).json({ message: 'Target user not found' });
            }
            // For admin viewing, always enable teamBusiness view
            targetUser.canViewTeamBusiness = true;
            user = targetUser;
        }

        // Helper: check if user has an approved deposit
        const checkDeposit = async (userId) => {
            const deposit = await Deposit.findOne({ userId, status: 'approved' });
            return !!deposit;
        };

        // Helper: compute total balance = available balance + active lend locked amount
        // If total balance >= $50 → isActiveMember = true; below $50 → pending
        const computeTotalBalance = (u) => {
            const activeInvTotal = (u.investments || [])
                .filter(inv => inv.status === 'active')
                .reduce((sum, inv) => sum + (inv.package?.investmentAmount || 0), 0);
            return (u.balance || 0) + activeInvTotal;
        };

        // Gen 1
        const gen1Users = await User.find(
            { referredBy: user.invitationCode },
            'phone email fullName invitationCode isTeamMember createdAt balance investments'
        );
        const gen1 = await Promise.all(gen1Users.map(async (u) => {
            const hasDeposited = await checkDeposit(u._id);
            const totalBalance = computeTotalBalance(u);
            const isActiveMember = hasDeposited && totalBalance >= 50;
            return {
                _id: u._id,
                phone: u.phone,
                email: u.email,
                fullName: u.fullName,
                invitationCode: u.invitationCode,
                isTeamMember: u.isTeamMember,
                createdAt: u.createdAt,
                hasDeposited,
                totalBalance,
                isActiveMember  // true = Deposited badge; false = Pending badge
            };
        }));

        const gen1Codes = gen1Users.map(u => u.invitationCode);

        // Gen 2
        const gen2Users = await User.find(
            { referredBy: { $in: gen1Codes } },
            'phone email fullName invitationCode isTeamMember createdAt balance investments'
        );
        const gen2 = await Promise.all(gen2Users.map(async (u) => {
            const hasDeposited = await checkDeposit(u._id);
            const totalBalance = computeTotalBalance(u);
            const isActiveMember = hasDeposited && totalBalance >= 50;
            return {
                _id: u._id,
                phone: u.phone,
                email: u.email,
                fullName: u.fullName,
                invitationCode: u.invitationCode,
                isTeamMember: u.isTeamMember,
                createdAt: u.createdAt,
                hasDeposited,
                totalBalance,
                isActiveMember
            };
        }));

        const gen2Codes = gen2Users.map(u => u.invitationCode);

        // Gen 3
        const gen3Users = await User.find(
            { referredBy: { $in: gen2Codes } },
            'phone email fullName invitationCode isTeamMember createdAt balance investments'
        );
        const gen3 = await Promise.all(gen3Users.map(async (u) => {
            const hasDeposited = await checkDeposit(u._id);
            const totalBalance = computeTotalBalance(u);
            const isActiveMember = hasDeposited && totalBalance >= 50;
            return {
                _id: u._id,
                phone: u.phone,
                email: u.email,
                fullName: u.fullName,
                invitationCode: u.invitationCode,
                isTeamMember: u.isTeamMember,
                createdAt: u.createdAt,
                hasDeposited,
                totalBalance,
                isActiveMember
            };
        }));

        const allMembers = [...gen1, ...gen2, ...gen3];
        const total = allMembers.length;
        // Active count: only members with deposit AND total balance >= $50
        const activeCount = allMembers.filter(m => m.isActiveMember).length;

        // ==========================================
        // 💼 TEAM BUSINESS VIEW — only for privileged users
        // ==========================================
        let teamBusinessEnabled = false;
        let teamTotalDeposit = 0;
        let teamTotalWithdraw = 0;
        let partnerBreakdown = [];

        if (user.canViewTeamBusiness) {
            teamBusinessEnabled = true;

            // Collect all IDs: the logged-in user themselves + Gen 1 + 2 + 3
            const allMemberIds = [
                user._id,                              // ✅ include the user themselves
                ...gen1Users.map(u => u._id),
                ...gen2Users.map(u => u._id),
                ...gen3Users.map(u => u._id)
            ];

            // Sum all approved deposits: user + entire team (Gen 1+2+3) — consistent with withdrawal
            const depositAgg = await Deposit.aggregate([
                { $match: { userId: { $in: allMemberIds }, status: 'approved' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);
            teamTotalDeposit = depositAgg[0]?.total || 0;

            // Sum all approved withdrawals: user + entire team (Gen 1+2+3)
            const withdrawAgg = await Withdrawal.aggregate([
                { $match: { userId: { $in: allMemberIds }, status: 'approved' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);
            teamTotalWithdraw = withdrawAgg[0]?.total || 0;

            // ── Per-partner breakdown ──
            // For each Gen1 partner, calculate deposit of:
            //   partner themselves + all their Gen2 + all their Gen3
            // Also calculate withdrawal for Gen1 partner + their sub-team
            partnerBreakdown = await Promise.all(gen1Users.map(async (partner) => {
                // Find Gen2 under this partner
                const partnerGen2 = await User.find(
                    { referredBy: partner.invitationCode },
                    '_id invitationCode fullName email phone'
                );
                const partnerGen2Codes = partnerGen2.map(u => u.invitationCode);

                // Find Gen3 under this partner's Gen2
                const partnerGen3 = await User.find(
                    { referredBy: { $in: partnerGen2Codes } },
                    '_id'
                );

                const partnerSubIds = [
                    partner._id,
                    ...partnerGen2.map(u => u._id),
                    ...partnerGen3.map(u => u._id)
                ];

                // Total deposits for this partner's sub-tree
                const partnerDepAgg = await Deposit.aggregate([
                    { $match: { userId: { $in: partnerSubIds }, status: 'approved' } },
                    { $group: { _id: null, total: { $sum: '$amount' } } }
                ]);

                // ── Withdrawal data: Gen1 partner + their direct sub-members ──
                // Total withdraw for partner themselves + Gen2 + Gen3
                const partnerWithdrawAgg = await Withdrawal.aggregate([
                    { $match: { userId: { $in: partnerSubIds }, status: 'approved' } },
                    { $group: { _id: '$userId', total: { $sum: '$amount' } } }
                ]);

                // Build a map: userId → withdrawAmount
                const withdrawByUser = {};
                partnerWithdrawAgg.forEach(w => {
                    withdrawByUser[w._id.toString()] = w.total;
                });

                // Gen1 partner's own withdrawal
                const partnerOwnWithdraw = withdrawByUser[partner._id.toString()] || 0;

                // Gen2 members withdraw details (direct sub-members of this Gen1 partner)
                const gen2WithdrawDetails = partnerGen2.map(g2 => ({
                    _id: g2._id,
                    fullName: g2.fullName,
                    email: g2.email,
                    phone: g2.phone,
                    withdraw: withdrawByUser[g2._id.toString()] || 0
                })).filter(m => m.withdraw > 0);

                // Total withdraw for entire sub-tree (partner + gen2 + gen3)
                const teamWithdraw = partnerWithdrawAgg.reduce((sum, w) => sum + w.total, 0);

                return {
                    _id: partner._id,
                    fullName: partner.fullName,
                    email: partner.email,
                    phone: partner.phone,
                    teamDeposit: partnerDepAgg[0]?.total || 0,
                    teamWithdraw,                        // total withdraw of entire sub-tree
                    partnerOwnWithdraw,                  // this Gen1 partner's own withdraw
                    gen2WithdrawDetails,                 // Gen2 member-wise withdraw
                    subTeamSize: partnerSubIds.length - 1  // exclude partner themselves
                };
            }));

            // Sort by teamDeposit descending (highest contributor first)
            partnerBreakdown.sort((a, b) => b.teamDeposit - a.teamDeposit);
        }

        res.json({ gen1, gen2, gen3, total, activeCount, teamBusinessEnabled, teamTotalDeposit, teamTotalWithdraw, partnerBreakdown });

    } catch (error) {
        console.error('Team list error:', error);
        res.status(500).json({ message: 'Server error fetching team list' });
    }
});

export default router;


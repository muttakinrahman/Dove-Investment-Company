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
        // Helper to compute total balance for active checks
        const getMemberTotalBalance = (u) => {
            const activeInvTotal = (u.investments || [])
                .filter(inv => inv.status === 'active')
                .reduce((sum, inv) => sum + (inv.package?.investmentAmount || 0), 0);
            return (u.balance || 0) + activeInvTotal;
        };

        // Gen 1
        const gen1 = await User.find({ referredBy: user.invitationCode }, 'invitationCode isTeamMember balance investments');
        const gen1Count = gen1.filter(u => u.isTeamMember && getMemberTotalBalance(u) >= 30).length;
        const gen1Codes = gen1.map(u => u.invitationCode);

        // Gen 2
        const gen2 = await User.find({ referredBy: { $in: gen1Codes } }, 'invitationCode isTeamMember balance investments');
        const gen2Count = gen2.filter(u => u.isTeamMember && getMemberTotalBalance(u) >= 30).length;
        const gen2Codes = gen2.map(u => u.invitationCode);

        // Gen 3
        const gen3Users = await User.find({ referredBy: { $in: gen2Codes } }, 'invitationCode isTeamMember balance investments');
        const gen3Count = gen3Users.filter(u => u.isTeamMember && getMemberTotalBalance(u) >= 30).length;

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

// Helper to recursively get all downline users (unlimited depth)
async function getAllDownline(invitationCode) {
    let currentCodes = [invitationCode];
    let allIds = [];
    let allCodes = [];
    let allUsers = [];
    
    while (currentCodes.length > 0) {
        const nextUsers = await User.find(
            { referredBy: { $in: currentCodes } },
            '_id invitationCode fullName email phone balance investments isTeamMember'
        );
        if (nextUsers.length === 0) break;
        
        currentCodes = nextUsers.map(u => u.invitationCode);
        allIds.push(...nextUsers.map(u => u._id));
        allCodes.push(...currentCodes);
        allUsers.push(...nextUsers);
    }
    return { ids: allIds, codes: allCodes, users: allUsers };
}

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
            const isActiveMember = hasDeposited && u.isTeamMember && totalBalance >= 30;
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
            const isActiveMember = hasDeposited && u.isTeamMember && totalBalance >= 30;
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
            const isActiveMember = hasDeposited && u.isTeamMember && totalBalance >= 30;
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
        let total = allMembers.length;
        // Active count: only members with deposit AND total balance >= $50
        let activeCount = allMembers.filter(m => m.isActiveMember).length;

        // ==========================================
        // 💼 TEAM BUSINESS VIEW — only for privileged users
        // ==========================================
        let teamBusinessEnabled = false;
        let teamTotalDeposit = 0;
        let teamTotalWithdraw = 0;
        let partnerBreakdown = [];

        if (user.canViewTeamBusiness) {
            teamBusinessEnabled = true;

            // Fetch ALL downline users recursively (unlimited depth)
            const userDownline = await getAllDownline(user.invitationCode);

            // Overwrite total and activeCount with recursive downline metrics
            total = userDownline.ids.length;

            // Fast optimized active count calculation over all downline members
            const depositedUserIds = await Deposit.distinct('userId', {
                userId: { $in: userDownline.ids },
                status: 'approved'
            });
            const depositedSet = new Set(depositedUserIds.map(id => id.toString()));

            let activeCountTemp = 0;
            for (const u of userDownline.users) {
                const hasDeposited = depositedSet.has(u._id.toString());
                const totalBalance = computeTotalBalance(u);
                const isActive = hasDeposited && u.isTeamMember && totalBalance >= 30;
                if (isActive) activeCountTemp++;
            }
            activeCount = activeCountTemp;

            // Collect all IDs: the logged-in user themselves + all recursive downline members
            const allMemberIds = [
                user._id,                              // ✅ include the user themselves
                ...userDownline.ids
            ];

            // Sum all approved deposits: user + entire team (unlimited depth)
            const depositAgg = await Deposit.aggregate([
                { $match: { userId: { $in: allMemberIds }, status: 'approved' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);
            teamTotalDeposit = depositAgg[0]?.total || 0;

            // Sum all approved withdrawals: user + entire team (unlimited depth)
            const withdrawAgg = await Withdrawal.aggregate([
                { $match: { userId: { $in: allMemberIds }, status: 'approved' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);
            teamTotalWithdraw = withdrawAgg[0]?.total || 0;

            // ── Per-partner breakdown ──
            // For each Gen1 partner, calculate deposit of:
            //   partner themselves + all their recursive downline
            // Also calculate withdrawal for Gen1 partner + their recursive sub-team
            partnerBreakdown = await Promise.all(gen1Users.map(async (partner) => {
                // Get all recursive downline members under this partner
                const partnerDownline = await getAllDownline(partner.invitationCode);

                const partnerSubIds = [
                    partner._id,
                    ...partnerDownline.ids
                ];

                // Total deposits for this partner's sub-tree
                const partnerDepAgg = await Deposit.aggregate([
                    { $match: { userId: { $in: partnerSubIds }, status: 'approved' } },
                    { $group: { _id: null, total: { $sum: '$amount' } } }
                ]);

                // ── Withdrawal data: Gen1 partner + their recursive sub-members ──
                // Total withdraw for partner themselves + recursive downline
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

                // Sub-members withdraw details (all recursive downline members of this partner)
                const gen2WithdrawDetails = partnerDownline.users.map(u => ({
                    _id: u._id,
                    fullName: u.fullName,
                    email: u.email,
                    phone: u.phone,
                    withdraw: withdrawByUser[u._id.toString()] || 0
                })).filter(m => m.withdraw > 0);

                // Total withdraw for entire sub-tree (partner + recursive downline)
                const teamWithdraw = partnerWithdrawAgg.reduce((sum, w) => sum + w.total, 0);

                return {
                    _id: partner._id,
                    fullName: partner.fullName,
                    email: partner.email,
                    phone: partner.phone,
                    teamDeposit: partnerDepAgg[0]?.total || 0,
                    teamWithdraw,                        // total withdraw of entire sub-tree
                    partnerOwnWithdraw,                  // this Gen1 partner's own withdraw
                    gen2WithdrawDetails,                 // recursive downline member-wise withdraw
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


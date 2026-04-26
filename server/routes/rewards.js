import express from 'express';
import User from '../models/User.js';
import Deposit from '../models/Deposit.js';
import { authMiddleware } from '../middleware/auth.js';
import { createNotification } from '../utils/notifications.js';

const router = express.Router();

// 💎 DOVE INVESTMENT GOLD MINE — DIAMOND SALARY LEVELS
const DIAMOND_SALARY_LEVELS = [
    { id: 'diamond1', level: 1, aRequired: 20, bcRequired: 70,  monthlyUSD: 150,  gift: 'Smart Phone',     giftEmoji: '📱', giftType: 'phone'  },
    { id: 'diamond2', level: 2, aRequired: 30, bcRequired: 150, monthlyUSD: 250,  gift: 'Laptop',          giftEmoji: '💻', giftType: 'laptop' },
    { id: 'diamond3', level: 3, aRequired: 35, bcRequired: 510, monthlyUSD: 350,  gift: 'iPhone 17 Pro Max',giftEmoji:'📱', giftType: 'iphone' },
    { id: 'diamond4', level: 4, aRequired: 55, bcRequired: 1010,monthlyUSD: 450,  gift: '2 Wheeler Scooty',giftEmoji: '🛵', giftType: 'scooty' },
    { id: 'diamond5', level: 5, aRequired: 65, bcRequired: 1510,monthlyUSD: 1000, gift: 'Super Bike',      giftEmoji: '🏍️',giftType: 'bike'   },
    { id: 'diamond6', level: 6, aRequired: 85, bcRequired: 2510,monthlyUSD: 2000, gift: '4 Wheeler Car',   giftEmoji: '🚗', giftType: 'car'    }
];

// ─── Helper: get all team member IDs with approved deposits ──────────────────
async function getTeamData(user) {
    // Gen A — direct referrals with approved deposit
    const directs = await User.find({ referredBy: user.invitationCode });
    const directIds = directs.map(u => u._id);
    const depositedDirectIds = await Deposit.distinct('userId', {
        userId: { $in: directIds }, status: 'approved'
    });
    const aCount = depositedDirectIds.length;

    // Gen B — referrals of active Gen A
    const activeDirects = directs.filter(u => depositedDirectIds.some(id => id.equals(u._id)));
    const genACodes = activeDirects.map(u => u.invitationCode);
    const genBUsers = await User.find({ referredBy: { $in: genACodes } });
    const genBIds = genBUsers.map(u => u._id);
    const depositedGenBIds = await Deposit.distinct('userId', {
        userId: { $in: genBIds }, status: 'approved'
    });
    const bCount = depositedGenBIds.length;

    // Gen C — referrals of active Gen B
    const activeGenB = genBUsers.filter(u => depositedGenBIds.some(id => id.equals(u._id)));
    const genBCodes = activeGenB.map(u => u.invitationCode);
    let cCount = 0;
    let genCUserIds = [];
    if (genBCodes.length > 0) {
        const genCUsers = await User.find({ referredBy: { $in: genBCodes } });
        genCUserIds = genCUsers.map(u => u._id);
        const depositedGenCIds = await Deposit.distinct('userId', {
            userId: { $in: genCUserIds }, status: 'approved'
        });
        cCount = depositedGenCIds.length;
    }

    // All team member IDs (with active deposit) — for mission progress tracking
    const allTeamMemberIds = [
        ...depositedDirectIds,
        ...depositedGenBIds,
        ...(genCUserIds.length > 0
            ? await Deposit.distinct('userId', { userId: { $in: genCUserIds }, status: 'approved' })
            : [])
    ];

    return { aCount, bCount, cCount, bcCount: bCount + cCount, allTeamMemberIds };
}

// ─── Helper: calculate mission progress for a claimed level ─────────────────
async function getMissionProgress(user, levelId, allTeamMemberIds) {
    const mission = (user.salaryMissions || []).find(m => m.levelId === levelId);
    if (!mission) return null;

    const lvl = DIAMOND_SALARY_LEVELS.find(l => l.id === levelId);
    if (!lvl) return null;

    const now = new Date();
    const missionEnd = new Date(mission.missionEnd);
    const missionStart = new Date(mission.missionStart);
    const daysRemaining = Math.max(0, Math.ceil((missionEnd - now) / (1000 * 60 * 60 * 24)));
    const isExpired = now > missionEnd;

    // Count how many team members got their FIRST approved deposit AFTER mission started
    const newActiveInPeriod = await Deposit.distinct('userId', {
        userId: { $in: allTeamMemberIds },
        status: 'approved',
        createdAt: { $gte: missionStart, $lte: missionEnd }
    });

    const totalRequired = lvl.aRequired + lvl.bcRequired;
    const targetMin = Math.ceil(totalRequired * 0.28); // 28%
    const targetMax = Math.ceil(totalRequired * 0.30); // 30%
    const newCount = newActiveInPeriod.length;
    const progressPercent = Math.min(Math.round((newCount / targetMin) * 100), 100);
    const missionCompleted = newCount >= targetMin;

    return {
        levelId,
        missionStart: mission.missionStart,
        missionEnd: mission.missionEnd,
        daysRemaining,
        isExpired,
        newMembersCount: newCount,
        targetMin,
        targetMax,
        totalRequired,
        progressPercent,
        missionCompleted,
        status: isExpired
            ? (missionCompleted ? 'completed' : 'failed')
            : (missionCompleted ? 'completed' : 'in_progress')
    };
}

// GET /api/rewards/salary-status
router.get('/salary-status', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const { aCount, bCount, cCount, bcCount, allTeamMemberIds } = await getTeamData(user);

        // Determine achieved salary level
        let achievedLevel = 0;
        for (const lvl of DIAMOND_SALARY_LEVELS) {
            if (aCount >= lvl.aRequired && bcCount >= lvl.bcRequired) achievedLevel = lvl.level;
        }

        // Calculate mission progress for each claimed level
        const claimedLevels = user.claimedSalaryLevels || [];
        const missionProgressMap = {};
        for (const levelId of claimedLevels) {
            missionProgressMap[levelId] = await getMissionProgress(user, levelId, allTeamMemberIds);
        }

        res.json({
            aCount, bCount, cCount, bcCount,
            achievedLevel,
            claimedSalaryLevels: claimedLevels,
            missionProgress: missionProgressMap,
            levels: DIAMOND_SALARY_LEVELS,
            maintenanceRatioMin: 28,
            maintenanceRatioMax: 30
        });
    } catch (error) {
        console.error('Diamond salary status error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/rewards/claim-salary — claim one-time gift + start mission
router.post('/claim-salary', authMiddleware, async (req, res) => {
    try {
        const { levelId } = req.body;
        const salaryLevel = DIAMOND_SALARY_LEVELS.find(l => l.id === levelId);
        if (!salaryLevel) return res.status(400).json({ message: 'Invalid salary level' });

        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const claimed = user.claimedSalaryLevels || [];
        if (claimed.includes(levelId)) {
            return res.status(400).json({ message: 'Gift for this level already claimed' });
        }

        // Verify qualification
        const { aCount, bcCount } = await getTeamData(user);
        if (aCount < salaryLevel.aRequired || bcCount < salaryLevel.bcRequired) {
            return res.status(400).json({ message: 'You do not meet the requirements for this salary level' });
        }

        // Record claim
        user.claimedSalaryLevels = [...claimed, levelId];

        // Start the 30-day monthly mission
        const missionStart = new Date();
        const missionEnd = new Date(missionStart);
        missionEnd.setDate(missionEnd.getDate() + 30);

        const missions = user.salaryMissions || [];
        // Remove any old mission for this level (shouldn't exist but safety)
        const filtered = missions.filter(m => m.levelId !== levelId);
        filtered.push({ levelId, missionStart, missionEnd });
        user.salaryMissions = filtered;

        await user.save();

        await createNotification({
            userId: user._id,
            title: `💎 Diamond ${salaryLevel.level} Gift Claimed!`,
            message: `Congratulations! You have claimed your ${salaryLevel.gift} (One Time Gift) for Diamond ${salaryLevel.level}. Your 30-day monthly mission has started! Bring ${Math.ceil((salaryLevel.aRequired + salaryLevel.bcRequired) * 0.28)}–${Math.ceil((salaryLevel.aRequired + salaryLevel.bcRequired) * 0.30)} new active members to qualify for next month's salary of $${salaryLevel.monthlyUSD}.`,
            type: 'reward'
        });

        res.json({
            message: `Successfully claimed Diamond ${salaryLevel.level} gift: ${salaryLevel.gift}! Your monthly mission has started.`,
            level: salaryLevel.level,
            missionStart,
            missionEnd
        });
    } catch (error) {
        console.error('Diamond salary claim error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ─── Legacy star routes (backward compat) ────────────────────────────────────
router.get('/status', authMiddleware, async (req, res) => {
    res.json({ points: 0, aCount: 0, bCount: 0, claimed: [], tiers: [], missionStart: null, missionEnd: null });
});

router.post('/claim', authMiddleware, async (req, res) => {
    res.status(410).json({ message: 'Star rewards system has been replaced with Diamond Salary system.' });
});

export default router;

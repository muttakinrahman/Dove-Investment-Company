import User from '../models/User.js';
import Commission from '../models/Commission.js';
import { createNotification } from './notifications.js';

// Referral bonus: Only Gen 1 (direct referrer) gets 10%
// Gen 2 and Gen 3 get nothing
const REFERRAL_BONUS_RATE = 0.10; // 10% for direct referrer only

/**
 * Get upline users (referrers) up to specified levels
 * @param {String} invitationCode - Starting user's invitation code
 * @param {Number} levels - How many levels to go up (default 3)
 * @returns {Array} Array of upline users with their level
 */
export async function getUplineUsers(invitationCode, levels = 3) {
    const upline = [];
    let currentCode = invitationCode;

    for (let level = 1; level <= levels; level++) {
        const user = await User.findOne({ invitationCode: currentCode });
        if (!user || !user.referredBy) break;

        const referrer = await User.findOne({ invitationCode: user.referredBy });
        if (!referrer) break;

        upline.push({
            user: referrer,
            level: level
        });

        currentCode = referrer.invitationCode;
    }

    return upline;
}

/**
 * Distribute referral bonus - ONLY to direct referrer (Gen 1), auto-credited to balance
 * @param {Object} investor - User who made the investment
 * @param {Number} investmentAmount - Investment amount
 * @returns {Array} Array of commission records
 */
export async function distributeCommissions(investor, investmentAmount) {
    const commissions = [];

    // Only get Gen 1 (direct referrer) — level 1 only
    const upline = await getUplineUsers(investor.invitationCode, 1);

    for (const { user: referrer, level } of upline) {
        // Only Gen 1 gets the bonus
        if (level !== 1) continue;

        const commissionAmount = investmentAmount * REFERRAL_BONUS_RATE;

        if (commissionAmount > 0) {
            // Auto-credit directly to referrer's balance
            referrer.balance = (referrer.balance || 0) + commissionAmount;
            referrer.teamIncome = (referrer.teamIncome || 0) + commissionAmount;
            referrer.teamEarnings = (referrer.teamEarnings || 0) + commissionAmount;
            referrer.bonusIncome = (referrer.bonusIncome || 0) + commissionAmount;
            await referrer.save();

            // Save commission record as already claimed (auto-credited)
            const commissionRecord = await Commission.create({
                fromUser: investor._id,
                toUser: referrer._id,
                amount: commissionAmount,
                level: level,
                investmentAmount: investmentAmount,
                percentage: REFERRAL_BONUS_RATE * 100,
                vipLevel: referrer.vipLevel,
                claimed: true,
                claimedAt: new Date()
            });

            // Notify the referrer
            await createNotification({
                userId: referrer._id,
                title: 'Referral Bonus Received!',
                message: `You earned $${commissionAmount.toFixed(2)} referral bonus from your direct member's $${investmentAmount} investment.`,
                type: 'commission',
                amount: commissionAmount
            });

            commissions.push(commissionRecord);
        }
    }

    return commissions;
}

// Keep for backward compatibility (not actively used for rates anymore)
export function calculateCommission(vipLevel, teamLevel, investmentAmount) {
    if (teamLevel === 1) return investmentAmount * REFERRAL_BONUS_RATE;
    return 0;
}

// Daily Team Income Rates (When a member collects their daily loan income)
const DAILY_TEAM_INCOME_RATES = {
    1: 0.10, // 1st Gen gets 10%
    2: 0.07, // 2nd Gen gets 7%
    3: 0.04  // 3rd Gen gets 4%
};

/**
 * Distribute daily team income when a user collects their daily earnings
 * @param {Object} collector - User who collected the daily income
 * @param {Number} collectedAmount - The total amount collected today
 * @returns {Array} Array of commission records
 */
export async function distributeDailyTeamIncome(collector, collectedAmount) {
    const commissions = [];

    // Get up to 3 generations of upline users
    const upline = await getUplineUsers(collector.invitationCode, 3);

    for (const { user: referrer, level } of upline) {
        const rate = DAILY_TEAM_INCOME_RATES[level];
        if (!rate) continue;

        // Only Level 2+ (vipLevel >= 1) can receive daily team income
        if (referrer.vipLevel < 1) continue;

        const commissionAmount = collectedAmount * rate;

        if (commissionAmount > 0) {
            // Save commission record as UNCLAIMED — user collects via Team Benefits
            const commissionRecord = await Commission.create({
                fromUser: collector._id,
                toUser: referrer._id,
                amount: commissionAmount,
                level: level,
                investmentAmount: collectedAmount,
                percentage: rate * 100,
                vipLevel: referrer.vipLevel,
                claimed: false
            });

            // Notify the referrer
            await createNotification({
                userId: referrer._id,
                title: 'Team Income Received!',
                message: `You earned $${commissionAmount.toFixed(2)} team income from your Gen ${level} member's daily earnings.`,
                type: 'commission',
                amount: commissionAmount
            });

            commissions.push(commissionRecord);
        }
    }

    return commissions;
}

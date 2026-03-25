import User from '../models/User.js';
import Commission from '../models/Commission.js';

// Commission rates by VIP level [1st, 2nd, 3rd]
// Level 1 (vipLevel 0) = No team bonus
// Level 2-6 (vipLevel 1-5) = Fixed 10%/7%/4%
const COMMISSION_RATES = {
    0: [0, 0, 0],
    1: [0.10, 0.07, 0.04],
    2: [0.10, 0.07, 0.04],
    3: [0.10, 0.07, 0.04],
    4: [0.10, 0.07, 0.04],
    5: [0.10, 0.07, 0.04]
};

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
 * Calculate commission amount based on VIP level and investment
 * @param {Number} vipLevel - VIP level of the receiver
 * @param {Number} teamLevel - Level (1, 2, or 3)
 * @param {Number} investmentAmount - Investment amount
 * @returns {Number} Commission amount
 */
export function calculateCommission(vipLevel, teamLevel, investmentAmount) {
    const rates = COMMISSION_RATES[vipLevel] || COMMISSION_RATES[0];
    const rate = rates[teamLevel - 1] || 0;
    return investmentAmount * rate;
}

/**
 * Distribute commissions to upline users
 * @param {Object} investor - User who made the investment
 * @param {Number} investmentAmount - Investment amount
 * @returns {Array} Array of commission records
 */
export async function distributeCommissions(investor, investmentAmount) {
    const commissions = [];

    // Get upline users (up to 3 levels)
    const upline = await getUplineUsers(investor.invitationCode, 3);

    for (const { user: referrer, level } of upline) {
        // Calculate commission based on referrer's VIP level
        const commissionAmount = calculateCommission(
            referrer.vipLevel,
            level,
            investmentAmount
        );

        if (commissionAmount > 0) {
            // Create CLAIMABLE commission record (not added to balance yet)
            const commissionRecord = await Commission.create({
                fromUser: investor._id,
                toUser: referrer._id,
                amount: commissionAmount,
                level: level,
                investmentAmount: investmentAmount,
                percentage: COMMISSION_RATES[referrer.vipLevel][level - 1] * 100,
                vipLevel: referrer.vipLevel,
                claimed: false
            });

            commissions.push(commissionRecord);
        }
    }

    return commissions;
}

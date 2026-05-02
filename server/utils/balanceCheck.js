/**
 * ⚠️ Balance Warning & Auto-Block Utility
 *
 * Rules:
 * - ONLY applies to users who have at least 1 approved deposit.
 *   (New users with only the $5 welcome bonus are EXEMPT.)
 * - If user's total balance (available + active lend principal) < $50:
 *     → Set balanceWarningDate (if not already set)
 *     → After 3 days still < $50 → isTeamMember = false (user becomes inactive)
 * - If user's total balance >= $50:
 *     → Clear balanceWarningDate (user recovered)
 *
 * Also handles:
 * - Level-down investment release: if user's vipLevel is downgraded,
 *   all active lend investments are cancelled and principal returned to balance.
 */

import User from '../models/User.js';
import Deposit from '../models/Deposit.js';

const MINIMUM_BALANCE = 50;
const WARNING_HOURS = 72; // 3 days

/**
 * Calculate user's total balance (available + active investment principal)
 */
export const getUserTotalBalance = (user) => {
    const activeLendPrincipal = (user.investments || [])
        .filter(inv => inv.status === 'active')
        .reduce((sum, inv) => sum + (inv.package?.investmentAmount || 0), 0);
    return (user.balance || 0) + activeLendPrincipal;
};

/**
 * Release all active lend investments back to user's available balance.
 * Called when a user's level goes down.
 * Returns the total amount released.
 */
export const releaseLendInvestments = (user) => {
    let released = 0;
    user.investments.forEach(inv => {
        if (inv.status === 'active') {
            inv.status = 'cancelled';
            user.balance += inv.package.investmentAmount;
            released += inv.package.investmentAmount;
        }
    });
    console.log(`[BalanceCheck] Released ${released} USDT lend investments for user ${user.email || user.phone}`);
    return released;
};

/**
 * Check user's balance and enforce the $50 minimum rule.
 * Must be called AFTER user is fetched from DB but BEFORE saving.
 *
 * IMPORTANT: This rule ONLY applies to users who have made at least 1 approved deposit.
 * New users (only $5 welcome bonus, no real deposit) are completely exempt.
 *
 * @param {Object} user - Mongoose User document
 * @param {boolean} saveUser - Whether to save the user document (default: true)
 * @returns {Object} { hasWarning, hoursLeft, totalBalance, justBlocked, exempt }
 */
export const checkAndEnforceMinBalance = async (user, saveUser = true) => {
    const totalBalance = getUserTotalBalance(user);
    const now = new Date();
    let dirty = false;
    let justBlocked = false;

    // ── EXEMPT CHECK ──
    // Only apply this rule to users who have at least 1 approved deposit.
    // New members with only the $5 welcome bonus are NOT subject to this rule.
    const approvedDepositCount = await Deposit.countDocuments({
        userId: user._id,
        status: 'approved'
    });

    if (approvedDepositCount === 0) {
        // User has never made a real deposit — clear any stale warning and skip
        if (user.balanceWarningDate) {
            user.balanceWarningDate = null;
            if (saveUser) await user.save();
        }
        console.log(`[BalanceCheck] EXEMPT (no approved deposits) for ${user.email || user.phone}`);
        return {
            hasWarning: false,
            warningDate: null,
            hoursLeft: null,
            deadline: null,
            totalBalance,
            justBlocked: false,
            exempt: true
        };
    }

    // ── BALANCE CHECK (only for depositors) ──
    if (totalBalance < MINIMUM_BALANCE) {
        if (!user.balanceWarningDate) {
            // First time dropping below $50 — start the warning clock
            user.balanceWarningDate = now;
            dirty = true;
            console.log(`[BalanceCheck] WARNING STARTED for ${user.email || user.phone}. Balance: $${totalBalance.toFixed(2)}`);
        } else {
            // Check if 3 days have passed
            const hoursPassed = (now - new Date(user.balanceWarningDate)) / (1000 * 60 * 60);
            if (hoursPassed >= WARNING_HOURS) {
                // Auto-deactivate: make inactive
                if (user.isTeamMember) {
                    user.isTeamMember = false;
                    dirty = true;
                    justBlocked = true;
                    console.log(`[BalanceCheck] AUTO-DEACTIVATED ${user.email || user.phone}. Balance: $${totalBalance.toFixed(2)}, hours passed: ${hoursPassed.toFixed(1)}`);
                }
            }
        }

        if (dirty && saveUser) {
            await user.save();
        }

        // Calculate hours left
        const warningDate = new Date(user.balanceWarningDate);
        const deadlineDate = new Date(warningDate.getTime() + WARNING_HOURS * 60 * 60 * 1000);
        const hoursLeft = Math.max(0, (deadlineDate - now) / (1000 * 60 * 60));

        return {
            hasWarning: true,
            warningDate: user.balanceWarningDate,
            hoursLeft: Math.round(hoursLeft * 10) / 10,
            deadline: deadlineDate,
            totalBalance,
            justBlocked,
            exempt: false
        };

    } else {
        // Balance is >= $50 — user has recovered
        if (user.balanceWarningDate) {
            user.balanceWarningDate = null;
            dirty = true;
            console.log(`[BalanceCheck] RECOVERED ${user.email || user.phone}. Balance: $${totalBalance.toFixed(2)}`);
        }

        if (dirty && saveUser) {
            await user.save();
        }

        return {
            hasWarning: false,
            warningDate: null,
            hoursLeft: null,
            deadline: null,
            totalBalance,
            justBlocked: false,
            exempt: false
        };
    }
};

export default checkAndEnforceMinBalance;

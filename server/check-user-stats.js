import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Deposit from './models/Deposit.js';
import Withdrawal from './models/Withdrawal.js';

dotenv.config();

// Command line থেকে নেবে: node check-user-stats.js email robiulislam7573@gmail.com
// অথবা:                   node check-user-stats.js code 2GHEZJ
const SEARCH_BY = process.argv[2] || 'email';       // 'email' বা 'code'
const SEARCH_VALUE = process.argv[3] || 'robiulislam7573@gmail.com';

async function checkUser() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Database connected\n');

        // ইউজার খোঁজো
        const query = SEARCH_BY === 'code'
            ? { invitationCode: SEARCH_VALUE.toUpperCase() }
            : { email: SEARCH_VALUE };

        const user = await User.findOne(query);

        if (!user) {
            console.log(`❌ ইউজার পাওয়া যায়নি: [${SEARCH_BY}] = ${SEARCH_VALUE}`);
            console.log('\nUsage: node check-user-stats.js email robiulislam7573@gmail.com');
            console.log('       node check-user-stats.js code 2GHEZJ');
            process.exit(1);
        }

        // ── ইউজার তথ্য ──
        console.log('═══════════════════════════════════════════════════');
        console.log('👤 ইউজার তথ্য');
        console.log('═══════════════════════════════════════════════════');
        console.log(`  নাম             : ${user.fullName || 'N/A'}`);
        console.log(`  Email           : ${user.email || 'N/A'}`);
        console.log(`  Phone           : ${user.phone || 'N/A'}`);
        console.log(`  Invitation Code : ${user.invitationCode}`);
        console.log(`  VIP Level       : ${user.vipLevel}`);
        console.log(`  Joined          : ${user.createdAt?.toISOString().split('T')[0]}`);
        console.log(`  Withdrawal Block: ${user.withdrawalBlockMessage || 'নেই'}`);

        // ── Deposits ──
        const deposits = await Deposit.find({ userId: user._id }).sort({ createdAt: 1 });
        const approvedDeposits = deposits.filter(d => d.status === 'approved');
        const pendingDeposits  = deposits.filter(d => d.status === 'pending');
        const totalApprovedDep = approvedDeposits.reduce((s, d) => s + d.amount, 0);
        const totalPendingDep  = pendingDeposits.reduce((s, d) => s + d.amount, 0);

        console.log('\n═══════════════════════════════════════════════════');
        console.log('💰 Deposit ইতিহাস');
        console.log('═══════════════════════════════════════════════════');
        if (deposits.length === 0) {
            console.log('  কোনো deposit নেই।');
        } else {
            deposits.forEach((d, i) => {
                const date = d.createdAt?.toISOString().split('T')[0];
                const icon = d.status === 'approved' ? '✅' : d.status === 'pending' ? '⏳' : '❌';
                console.log(`  ${i+1}. ${icon} $${d.amount.toFixed(2)} — ${d.status.toUpperCase()} — ${date}`);
            });
        }
        console.log(`\n  ✅ Approved মোট : $${totalApprovedDep.toFixed(2)}`);
        console.log(`  ⏳ Pending মোট  : $${totalPendingDep.toFixed(2)}`);

        // ── Withdrawals ──
        const withdrawals = await Withdrawal.find({ userId: user._id }).sort({ createdAt: 1 });
        const approvedW  = withdrawals.filter(w => w.status === 'approved');
        const pendingW   = withdrawals.filter(w => w.status === 'pending');
        const rejectedW  = withdrawals.filter(w => w.status === 'rejected');
        const totalApprovedW = approvedW.reduce((s, w) => s + w.amount, 0);
        const totalPendingW  = pendingW.reduce((s, w) => s + w.amount, 0);
        const totalRejectedW = rejectedW.reduce((s, w) => s + w.amount, 0);
        const totalCountedW  = totalApprovedW + totalPendingW; // সিস্টেম এটা ধরে

        console.log('\n═══════════════════════════════════════════════════');
        console.log('💸 Withdrawal ইতিহাস');
        console.log('═══════════════════════════════════════════════════');
        if (withdrawals.length === 0) {
            console.log('  কোনো withdrawal নেই।');
        } else {
            withdrawals.forEach((w, i) => {
                const date = w.createdAt?.toISOString().split('T')[0];
                const icon = w.status === 'approved' ? '✅' : w.status === 'pending' ? '⏳' : '❌';
                console.log(`  ${i+1}. ${icon} $${w.amount.toFixed(2)} — ${w.status.toUpperCase()} — ${date}`);
            });
        }
        console.log(`\n  ✅ Approved মোট                      : $${totalApprovedW.toFixed(2)}`);
        console.log(`  ⏳ Pending মোট                       : $${totalPendingW.toFixed(2)}`);
        console.log(`  ❌ Rejected মোট (গণনায় আসে না)      : $${totalRejectedW.toFixed(2)}`);
        console.log(`  📊 System গণনায় (approved + pending) : $${totalCountedW.toFixed(2)}`);

        // ── 150% Cap বিশ্লেষণ ──
        const maxLifetime    = totalApprovedDep * 1.5;
        const remainingCap   = maxLifetime - totalCountedW;
        const capUsedPercent = totalApprovedDep > 0 ? ((totalCountedW / maxLifetime) * 100).toFixed(1) : '0';
        const isPhase2       = totalCountedW >= maxLifetime;

        console.log('\n═══════════════════════════════════════════════════');
        console.log('📊 150% Cap বিশ্লেষণ');
        console.log('═══════════════════════════════════════════════════');
        console.log(`  মোট Approved Deposit     : $${totalApprovedDep.toFixed(2)}`);
        console.log(`  সর্বোচ্চ তোলা যাবে (150%): $${maxLifetime.toFixed(2)}`);
        console.log(`  ইতিমধ্যে তোলা হয়েছে     : $${totalCountedW.toFixed(2)} (${capUsedPercent}% ব্যবহার)`);
        console.log(`  এখনো তোলা যাবে           : $${remainingCap > 0 ? remainingCap.toFixed(2) : '0.00'}`);
        console.log(`  বর্তমান Phase             : ${isPhase2 ? '🔴 Phase 2 (cap পার হয়েছে)' : '🟢 Phase 1 (cap এর মধ্যে)'}`);

        // ── Balance ──
        const activeLend     = user.investments
            .filter(inv => inv.status === 'active')
            .reduce((s, inv) => s + inv.package.investmentAmount, 0);
        const combinedBal    = (user.balance || 0) + activeLend;
        const reserveOk      = combinedBal >= 30;

        console.log('\n═══════════════════════════════════════════════════');
        console.log('💼 Balance তথ্য');
        console.log('═══════════════════════════════════════════════════');
        console.log(`  Available Balance     : $${(user.balance || 0).toFixed(2)}`);
        console.log(`  Active Lend (locked)  : $${activeLend.toFixed(2)}`);
        console.log(`  Combined Total        : $${combinedBal.toFixed(2)}`);
        console.log(`  $30 Reserve চেক       : ${reserveOk ? `✅ পাস ($${combinedBal.toFixed(2)} >= $30)` : `❌ ফেল ($${combinedBal.toFixed(2)} < $30)`}`);

        // ── Max Withdrawable ──
        let maxW = 0;
        if (!isPhase2) {
            // Phase 1: balance দিয়ে, remaining cap পর্যন্ত
            maxW = Math.min(
                Math.floor((user.balance || 0) / 1.05),
                Math.floor(remainingCap > 0 ? remainingCap : 0)
            );
        } else {
            // Phase 2: combined balance থেকে $50 বাদ দিয়ে, remaining cap পর্যন্ত
            const free = combinedBal - 30;
            maxW = Math.min(
                Math.floor(free / 1.05),
                Math.floor(remainingCap > 0 ? remainingCap : 0)
            );
        }
        if (maxW < 0) maxW = 0;

        console.log('\n═══════════════════════════════════════════════════');
        console.log('🎯 সর্বোচ্চ Withdraw করতে পারবে');
        console.log('═══════════════════════════════════════════════════');
        console.log(`  Max Withdrawable : $${maxW}`);
        if (maxW < 10) {
            console.log(`  ⚠️  Minimum $10 দরকার — এখন withdraw করতে পারবে না!`);
            if (remainingCap <= 0) {
                console.log(`  📌 কারণ: 150% cap শেষ হয়ে গেছে। আরো deposit করতে হবে।`);
            } else if (!reserveOk) {
                console.log(`  📌 কারণ: $30 reserve নেই। Balance বাড়াতে হবে।`);
            }
        } else {
            console.log(`  ✅ Withdraw করতে পারবে (BSC 5% fee সহ)`);
        }
        console.log('═══════════════════════════════════════════════════\n');

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

checkUser();

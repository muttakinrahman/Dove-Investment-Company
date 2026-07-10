import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Deposit from './models/Deposit.js';

dotenv.config();

const getMemberTotalBalance = (u) => {
    const activeInvTotal = (u.investments || [])
        .filter(inv => inv.status === 'active')
        .reduce((sum, inv) => sum + (inv.package?.investmentAmount || 0), 0);
    return (u.balance || 0) + activeInvTotal;
};

async function main() {
    try {
        const dbName = 'novaearn';
        const uri = process.env.MONGODB_URI.replace('?', `${dbName}?`);
        const conn = await mongoose.createConnection(uri).asPromise();
        
        const UserModel = conn.model('User', User.schema);
        const DepositModel = conn.model('Deposit', Deposit.schema);

        const targetEmail = 'sksopon506@gmail.com';
        const user = await UserModel.findOne({ email: targetEmail });

        if (!user) {
            console.log(`❌ User ${targetEmail} not found!`);
            process.exit(1);
        }

        console.log(`==================================================`);
        console.log(`👤 Checking Gen 1 Referrals for: ${user.fullName} (${user.email})`);
        console.log(`🔑 Invitation Code: ${user.invitationCode}`);
        console.log(`==================================================\n`);

        const gen1Users = await UserModel.find({ referredBy: user.invitationCode });
        console.log(`Total Gen 1 Referrals in DB: ${gen1Users.length}`);

        let countHasDeposited = 0;
        let countIsTeamMember = 0;
        let countBalanceGe50 = 0;
        let countFullyActiveForLevel = 0;

        console.log(`\nDetailed breakdown of Gen 1 Referrals:`);
        console.log(`---------------------------------------------------------------------------------`);
        console.log(`No. | Phone/Email | Deposited? | isTeamMember? | Total Balance | Active for Level?`);
        console.log(`---------------------------------------------------------------------------------`);

        for (let i = 0; i < gen1Users.length; i++) {
            const u = gen1Users[i];
            const deposit = await DepositModel.findOne({ userId: u._id, status: 'approved' });
            const hasDeposited = !!deposit;
            const totalBalance = getMemberTotalBalance(u);
            const isTeamMember = u.isTeamMember;
            const isFullyActive = isTeamMember && totalBalance >= 30;

            if (hasDeposited) countHasDeposited++;
            if (isTeamMember) countIsTeamMember++;
            if (totalBalance >= 30) countBalanceGe50++;
            if (isFullyActive) countFullyActiveForLevel++;

            const contact = u.phone || u.email || 'N/A';
            console.log(
                `${String(i + 1).padStart(3)} | ` +
                `${contact.padEnd(20)} | ` +
                `${(hasDeposited ? '✅ Yes' : '❌ No').padEnd(10)} | ` +
                `${(isTeamMember ? '✅ True' : '❌ False').padEnd(13)} | ` +
                `$${totalBalance.toFixed(2).padEnd(12)} | ` +
                `${isFullyActive ? '✅ YES' : '❌ NO'}`
            );
        }

        console.log(`---------------------------------------------------------------------------------`);
        console.log(`\n📊 SUMMARY OF GEN 1:`);
        console.log(`- Total registered Gen 1: ${gen1Users.length}`);
        console.log(`- Has at least 1 approved deposit: ${countHasDeposited}`);
        console.log(`- Has isTeamMember === true: ${countIsTeamMember}`);
        console.log(`- Has total balance >= $30: ${countBalanceGe50}`);
        console.log(`- Fully Active for Level Up (isTeamMember && balance >= $30): ${countFullyActiveForLevel}`);
        
        await conn.close();
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

main();

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const getMemberTotalBalance = (u) => {
    const activeInvTotal = (u.investments || [])
        .filter(inv => inv.status === 'active')
        .reduce((sum, inv) => sum + (inv.package?.investmentAmount || 0), 0);
    return (u.balance || 0) + activeInvTotal;
};

async function runCheckForDb(dbName, searchVal) {
    try {
        const baseUri = process.env.MONGODB_URI;
        let uri = baseUri;
        
        // Inject database name if not present
        if (dbName && baseUri.includes('.net/')) {
            const parts = baseUri.split('.net/');
            // parts[0] is mongodb+srv://...cluster0.tln3zag
            // parts[1] contains ?appName=...
            const queryPart = parts[1].includes('?') ? parts[1].slice(parts[1].indexOf('?')) : '';
            uri = `${parts[0]}.net/${dbName}${queryPart}`;
        }

        const conn = await mongoose.createConnection(uri).asPromise();
        const UserModel = conn.model('User', User.schema);

        // Case insensitive regex search
        const cleanSearch = searchVal.trim();
        const searchRegex = new RegExp(`^${cleanSearch}$`, 'i');

        const query = {
            $or: [
                { email: searchRegex },
                { phone: cleanSearch },
                { invitationCode: cleanSearch.toUpperCase() }
            ]
        };

        const user = await UserModel.findOne(query);
        if (!user) {
            await conn.close();
            return false;
        }

        console.log(`\n===============================================`);
        console.log(`✅ FOUND User in database "${dbName}":`);
        console.log(`===============================================`);
        console.log(`👤 Name: ${user.fullName || 'N/A'}`);
        console.log(`📧 Email: ${user.email || 'N/A'}`);
        console.log(`📞 Phone: ${user.phone || 'N/A'}`);
        console.log(`🔑 Invitation Code: ${user.invitationCode}`);
        console.log(`🏆 Current VIP Level in DB: ${user.vipLevel} (UI shows: Level ${user.vipLevel + 1})`);
        console.log(`-----------------------------------------------`);
        console.log(`📊 Level 5 (UI) Requirements Check:`);
        
        // VIP Level 5 in UI is vipLevel 4 in DB
        const reqGen1 = 30;
        const reqGen23 = 50;
        const reqTotal = 80;
        const reqAssets = 2000;

        // Calculate team active members
        const gen1Users = await UserModel.find({ referredBy: user.invitationCode }, 'invitationCode isTeamMember balance investments');
        const gen1ActiveCount = gen1Users.filter(u => u.isTeamMember && getMemberTotalBalance(u) >= 50).length;
        const gen1Codes = gen1Users.map(u => u.invitationCode);

        const gen2Users = gen1Codes.length > 0
            ? await UserModel.find({ referredBy: { $in: gen1Codes } }, 'invitationCode isTeamMember balance investments')
            : [];
        const gen2ActiveCount = gen2Users.filter(u => u.isTeamMember && getMemberTotalBalance(u) >= 50).length;
        const gen2Codes = gen2Users.map(u => u.invitationCode);

        const gen3Users = gen2Codes.length > 0
            ? await UserModel.find({ referredBy: { $in: gen2Codes } }, 'invitationCode isTeamMember balance investments')
            : [];
        const gen3ActiveCount = gen3Users.filter(u => u.isTeamMember && getMemberTotalBalance(u) >= 50).length;

        const gen23ActiveCount = gen2ActiveCount + gen3ActiveCount;
        const totalActiveCount = gen1ActiveCount + gen23ActiveCount;

        // Calculate user assets
        const activeInvestmentTotal = user.investments
            .filter(inv => inv.status === 'active')
            .reduce((sum, inv) => sum + (inv.package?.investmentAmount || 0), 0);
        const totalAssets = (user.balance || 0) + activeInvestmentTotal + (user.redeemableBalance || 0);

        const g1Ok = gen1ActiveCount >= reqGen1;
        const g23Ok = gen23ActiveCount >= reqGen23;
        const totOk = totalActiveCount >= reqTotal;
        const assetsOk = totalAssets >= reqAssets;

        console.log(`  1. Gen 1 Active Members : ${gen1ActiveCount} / ${reqGen1} ${g1Ok ? '✅' : '❌'}`);
        console.log(`  2. Gen 2+3 Active Members: ${gen23ActiveCount} / ${reqGen23} ${g23Ok ? '✅' : '❌'}`);
        console.log(`  3. Total Active Members : ${totalActiveCount} / ${reqTotal} ${totOk ? '✅' : '❌'}`);
        console.log(`  4. User's Total Assets  : $${totalAssets.toFixed(2)} / $${reqAssets.toFixed(2)} ${assetsOk ? '✅' : '❌'}`);
        
        console.log(`-----------------------------------------------`);
        if (g1Ok && g23Ok && totOk && assetsOk) {
            console.log(`🎉 STATUS: ALL conditions for Level 5 are fully met!`);
            if (user.vipLevel < 4) {
                console.log(`⚠️ Note: The user's level in DB is ${user.vipLevel}, it will upgrade to 4 when they refresh/visit their dashboard (/me).`);
            }
        } else {
            const missing = [];
            if (!g1Ok) missing.push(`Gen 1 Active (${gen1ActiveCount} < ${reqGen1})`);
            if (!g23Ok) missing.push(`Gen 2+3 Active (${gen23ActiveCount} < ${reqGen23})`);
            if (!totOk) missing.push(`Total Active (${totalActiveCount} < ${reqTotal})`);
            if (!assetsOk) missing.push(`Total Assets ($${totalAssets.toFixed(2)} < $${reqAssets})`);
            console.log(`❌ STATUS: Stuck from Level 5 because:`);
            missing.forEach(m => console.log(`   - ${m}`));
        }
        console.log(`===============================================\n`);

        await conn.close();
        return true;
    } catch (e) {
        console.error(`❌ Error connecting to DB "${dbName}":`, e.message);
        return false;
    }
}

async function main() {
    const target = process.argv[2];
    if (!target) {
        console.log('⚠️ Please provide an email, phone, or invitation code as an argument.');
        console.log('Usage: node check-level-stuck.js sksopon506@gmail.com');
        process.exit(1);
    }

    console.log(`Searching for user: "${target}"...`);

    // Try 'novaearn' first since it is the custom database
    let found = await runCheckForDb('novaearn', target);
    
    // Fallback to 'test' database if not found
    if (!found) {
        found = await runCheckForDb('test', target);
    }

    if (!found) {
        console.log(`❌ Could not find user "${target}" in either "novaearn" or "test" database on this cluster.`);
    }
    process.exit(0);
}

main();

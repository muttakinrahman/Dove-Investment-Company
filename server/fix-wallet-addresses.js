import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SystemSettings from './models/SystemSettings.js';

dotenv.config();

const fixWalletAddresses = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Correct wallet addresses to lock in
        const correctTRC20 = 'TCAJGepLgaShMuUWixJKykPAEAL4zzGgim';
        const correctBSC = '0xc3eFceBDA558E2f60efBd6950A4B3b2d32dfF651';

        let settings = await SystemSettings.findOne();

        if (!settings) {
            console.log('⚠️  No settings found. Creating new settings document...');
            settings = new SystemSettings();
        }

        // Force update wallet addresses
        settings.walletTRC20 = correctTRC20;
        settings.walletBSC = correctBSC;
        settings.walletBTC = '';
        settings.walletETH = '';

        await settings.save();

        console.log('✅ Wallet addresses updated successfully!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('💰 TRC20:', settings.walletTRC20);
        console.log('💰 BSC:  ', settings.walletBSC);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

fixWalletAddresses();

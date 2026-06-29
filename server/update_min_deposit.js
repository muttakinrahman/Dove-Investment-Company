import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SystemSettings from './models/SystemSettings.js';

dotenv.config();

const updateMinDeposit = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Update or create SystemSettings with new minimum deposit
        const result = await SystemSettings.findOneAndUpdate(
            {}, // Find any SystemSettings document
            { minDepositAmount: 30 }, // Update minDepositAmount to 30
            { upsert: true, new: true } // Create if doesn't exist, return updated doc
        );

        console.log('✅ Updated minimum deposit amount to 30 USDT');
        console.log('Current settings:', result);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

updateMinDeposit();

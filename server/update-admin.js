import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const updateAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // New strong admin credentials
        const newPhone = 'NovaAdmin_2025';
        const newPassword = 'N0v@Earn#Secure!2025';

        const existingAdmin = await User.findOne({ role: 'admin' });

        if (!existingAdmin) {
            console.log('❌ No admin account found in the database!');
            process.exit(1);
        }

        console.log('🔍 Found admin account:', existingAdmin.phone);

        const hashedPassword = await bcrypt.hash(newPassword, 12);

        existingAdmin.phone = newPhone;
        existingAdmin.password = hashedPassword;

        await existingAdmin.save();

        console.log('\n🎉 Admin credentials updated successfully!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📱 New Username (Phone): NovaAdmin_2025');
        console.log('🔐 New Password:         N0v@Earn#Secure!2025');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('⚠️  Save these credentials securely!');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error updating admin:', error.message);
        process.exit(1);
    }
};

updateAdmin();

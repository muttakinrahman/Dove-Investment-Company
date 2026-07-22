import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Package from './models/Package.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const packages = [
    // === LEVEL 0 PACKAGES ===
    {
        name: '7 Days Plan (L0)',
        duration: 7,
        minAmount: 10,
        maxAmount: 49,
        dailyRate: 0.90,
        color: 'from-blue-500 to-cyan-400',
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/20',
        vipLevel: 0
    },
    {
        name: '30 Days Plan (L0)',
        duration: 30,
        minAmount: 40,
        maxAmount: 99,
        dailyRate: 1.20,
        color: 'from-purple-500 to-pink-400',
        bg: 'bg-purple-500/10',
        border: 'border-purple-500/20',
        vipLevel: 0
    },
    {
        name: '60 Days Plan (L0)',
        duration: 60,
        minAmount: 100,
        maxAmount: 800,
        dailyRate: 1.50,
        color: 'from-amber-500 to-orange-400',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/20',
        vipLevel: 0
    },
    {
        name: '90 Days Plan (L0)',
        duration: 90,
        minAmount: 500,
        maxAmount: 2000,
        dailyRate: 1.80,
        color: 'from-emerald-500 to-teal-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20',
        vipLevel: 0
    },

    // === LEVEL 1 PACKAGES ===
    {
        name: '7 Days Plan (L1)',
        duration: 7,
        minAmount: 50,
        maxAmount: 200,
        dailyRate: 1.10,
        color: 'from-indigo-500 to-blue-400',
        bg: 'bg-indigo-500/10',
        border: 'border-indigo-500/20',
        vipLevel: 1
    },
    {
        name: '30 Days Plan (L1)',
        duration: 30,
        minAmount: 200,
        maxAmount: 500,
        dailyRate: 1.80,
        color: 'from-pink-500 to-rose-400',
        bg: 'bg-pink-500/10',
        border: 'border-pink-500/20',
        vipLevel: 1
    },
    {
        name: '60 Days Plan (L1)',
        duration: 60,
        minAmount: 500,
        maxAmount: 2000,
        dailyRate: 1.70,
        color: 'from-orange-500 to-red-400',
        bg: 'bg-orange-500/10',
        border: 'border-orange-500/20',
        vipLevel: 1
    },
    {
        name: '90 Days Plan (L1)',
        duration: 90,
        minAmount: 800,
        maxAmount: 3000,
        dailyRate: 2.00,
        color: 'from-teal-500 to-green-400',
        bg: 'bg-teal-500/10',
        border: 'border-teal-500/20',
        vipLevel: 1
    },

    // === LEVEL 2 PACKAGES ===
    {
        name: '7 Days Plan (L2)',
        duration: 7,
        minAmount: 500,
        maxAmount: 800,
        dailyRate: 1.40,
        color: 'from-cyan-500 to-blue-400',
        bg: 'bg-cyan-500/10',
        border: 'border-cyan-500/20',
        vipLevel: 2
    },
    {
        name: '30 Days Plan (L2)',
        duration: 30,
        minAmount: 800,
        maxAmount: 1300,
        dailyRate: 1.70,
        color: 'from-violet-500 to-purple-400',
        bg: 'bg-violet-500/10',
        border: 'border-violet-500/20',
        vipLevel: 2
    },
    {
        name: '60 Days Plan (L2)',
        duration: 60,
        minAmount: 1300,
        maxAmount: 1800,
        dailyRate: 2.00,
        color: 'from-fuchsia-500 to-pink-400',
        bg: 'bg-fuchsia-500/10',
        border: 'border-fuchsia-500/20',
        vipLevel: 2
    },
    {
        name: '90 Days Plan (L2)',
        duration: 90,
        minAmount: 1800,
        maxAmount: 4000,
        dailyRate: 2.40,
        color: 'from-lime-500 to-green-400',
        bg: 'bg-lime-500/10',
        border: 'border-lime-500/20',
        vipLevel: 2
    },

    // === LEVEL 3 PACKAGES ===
    {
        name: '7 Days Plan (L3)',
        duration: 7,
        minAmount: 400,
        maxAmount: 1300,
        dailyRate: 1.80,
        color: 'from-rose-500 to-red-400',
        bg: 'bg-rose-500/10',
        border: 'border-rose-500/20',
        vipLevel: 3
    },
    {
        name: '30 Days Plan (L3)',
        duration: 30,
        minAmount: 1300,
        maxAmount: 2000,
        dailyRate: 2.20,
        color: 'from-purple-600 to-pink-500',
        bg: 'bg-purple-600/10',
        border: 'border-purple-600/20',
        vipLevel: 3
    },
    {
        name: '60 Days Plan (L3)',
        duration: 60,
        minAmount: 2000,
        maxAmount: 5000,
        dailyRate: 2.70,
        color: 'from-indigo-600 to-blue-500',
        bg: 'bg-indigo-600/10',
        border: 'border-indigo-600/20',
        vipLevel: 3
    },
    {
        name: '90 Days Plan (L3)',
        duration: 90,
        minAmount: 2000,
        maxAmount: 5000,
        dailyRate: 3.20,
        color: 'from-emerald-600 to-teal-500',
        bg: 'bg-emerald-600/10',
        border: 'border-emerald-600/20',
        vipLevel: 3
    },

    // === LEVEL 4 PACKAGES ===
    {
        name: '7 Days Plan (L4)',
        duration: 7,
        minAmount: 2000,
        maxAmount: 3500,
        dailyRate: 2.20,
        color: 'from-amber-600 to-orange-500',
        bg: 'bg-amber-600/10',
        border: 'border-amber-600/20',
        vipLevel: 4
    },
    {
        name: '30 Days Plan (L4)',
        duration: 30,
        minAmount: 3000,
        maxAmount: 5000,
        dailyRate: 2.60,
        color: 'from-pink-600 to-rose-500',
        bg: 'bg-pink-600/10',
        border: 'border-pink-600/20',
        vipLevel: 4
    },
    {
        name: '60 Days Plan (L4)',
        duration: 60,
        minAmount: 3500,
        maxAmount: 6000,
        dailyRate: 3.10,
        color: 'from-violet-600 to-purple-500',
        bg: 'bg-violet-600/10',
        border: 'border-violet-600/20',
        vipLevel: 4
    },
    {
        name: '90 Days Plan (L4)',
        duration: 90,
        minAmount: 3500,
        maxAmount: 6000,
        dailyRate: 3.70,
        color: 'from-cyan-600 to-blue-500',
        bg: 'bg-cyan-600/10',
        border: 'border-cyan-600/20',
        vipLevel: 4
    },

    // === LEVEL 5 PACKAGES ===
    {
        name: '7 Days Plan (L5)',
        duration: 7,
        minAmount: 3000,
        maxAmount: 4500,
        dailyRate: 2.70,
        color: 'from-yellow-500 via-amber-500 to-orange-500',
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-500/30',
        vipLevel: 5
    },
    {
        name: '30 Days Plan (L5)',
        duration: 30,
        minAmount: 3500,
        maxAmount: 5000,
        dailyRate: 3.30,
        color: 'from-pink-600 via-rose-500 to-red-500',
        bg: 'bg-pink-600/10',
        border: 'border-pink-600/30',
        vipLevel: 5
    },
    {
        name: '60 Days Plan (L5)',
        duration: 60,
        minAmount: 4000,
        maxAmount: 7000,
        dailyRate: 4.00,
        color: 'from-purple-600 via-violet-500 to-indigo-500',
        bg: 'bg-purple-600/10',
        border: 'border-purple-600/30',
        vipLevel: 5
    },
    {
        name: '90 Days Plan (L5)',
        duration: 90,
        minAmount: 4000,
        maxAmount: 7000,
        dailyRate: 4.70,
        color: 'from-emerald-600 via-teal-500 to-cyan-500',
        bg: 'bg-emerald-600/10',
        border: 'border-emerald-600/30',
        vipLevel: 5
    }
];

const seedPackages = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB for seeding');

        // Clear existing packages
        await Package.deleteMany({});
        console.log('🗑️  Cleared existing packages');

        // Insert new packages
        await Package.insertMany(packages);
        console.log(`✨ Seeded ${packages.length} investment packages for Levels 0-5 successfully`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding error:', error);
        process.exit(1);
    }
};

seedPackages();

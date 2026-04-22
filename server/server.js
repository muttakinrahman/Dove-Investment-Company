import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.js';
import investRoutes from './routes/invest.js';
import rechargeRoutes from './routes/recharge.js';
import adminRoutes from './routes/admin.js';
import withdrawalRoutes from './routes/withdrawal.js';
import homeRoutes from './routes/home.js';
import commissionRoutes from './routes/commission.js';
import notificationRoutes from './routes/notification.js';
import profileRoutes from './routes/profile.js';
import twoFactorRoutes from './routes/2fa.js';
import supportRoutes from './routes/support.js';
import statsRoutes from './routes/stats.js';
import rewardsRoutes from './routes/rewards.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads/packages');
const profileDir = path.join(__dirname, 'uploads/profile');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(profileDir)) {
    fs.mkdirSync(profileDir, { recursive: true });
}

// Middleware
app.use(cors());

// ⚡ NowPayments IPN webhook needs raw body for HMAC verification
app.use('/api/recharge/nowpayments/webhook', express.raw({ type: 'application/json' }));

// All other routes use JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/invest', investRoutes);
app.use('/api/recharge', rechargeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/withdrawal', withdrawalRoutes);
app.use('/api/home', homeRoutes);
app.use('/api/commission', commissionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/2fa', twoFactorRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/rewards', rewardsRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Dove Investment Gold Mine API is running',
        company: 'Dove Investment Gold Mine',
        website: 'https://doveinvestment.cloud',
        country: 'US'
    });
});

// SEO: Serve robots.txt at root level
app.get('/robots.txt', (req, res) => {
    const robotsPath = path.join(__dirname, '../client/public/robots.txt');
    if (fs.existsSync(robotsPath)) {
        res.type('text/plain');
        res.sendFile(robotsPath);
    } else {
        res.type('text/plain');
        res.send(`User-agent: *\nAllow: /\nSitemap: https://doveinvestment.cloud/sitemap.xml`);
    }
});

// SEO: Serve sitemap.xml at root level
app.get('/sitemap.xml', (req, res) => {
    const sitemapPath = path.join(__dirname, '../client/public/sitemap.xml');
    if (fs.existsSync(sitemapPath)) {
        res.type('application/xml');
        res.sendFile(sitemapPath);
    } else {
        res.status(404).send('Sitemap not found');
    }
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('✅ Connected to MongoDB');
        console.log('📊 Database:', mongoose.connection.name);

        // Auto-fix sparse indexes for live server deployment
        try {
            const collection = mongoose.connection.collection('users');
            // Drop existing indexes to ensure sparse flag is applied
            await collection.dropIndex('phone_1').catch(() => { });
            await collection.dropIndex('email_1').catch(() => { });
            await collection.dropIndex('memberId_1').catch(() => { });

            // Create them with sparse: true
            await collection.createIndex({ phone: 1 }, { unique: true, sparse: true });
            await collection.createIndex({ email: 1 }, { unique: true, sparse: true });
            await collection.createIndex({ memberId: 1 }, { unique: true, sparse: true });
            console.log('🚀 Database Indexes Synchronized (Sparse Mode Active)');
        } catch (err) {
            console.log('ℹ️ Index Sync Note:', err.message);
        }
    })
    .catch((error) => {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    });

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Dove Investment Server running on port ${PORT}`);
    console.log(`🌐 API URL: http://localhost:${PORT}/api`);
});

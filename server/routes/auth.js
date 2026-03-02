import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Deposit from '../models/Deposit.js';
import { authMiddleware } from '../middleware/auth.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logFile = path.join(__dirname, '../reg_debug.log');

const log = (msg) => {
    try {
        const time = new Date().toISOString();
        fs.appendFileSync(logFile, `${time} - ${msg}\n`);
    } catch (e) {
        console.error('Logger failed:', e.message);
    }
};

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
    try {
        log(`Registration attempt: ${JSON.stringify(req.body)}`);
        const { password, invitationCode, fullName } = req.body;
        const phone = req.body.phone ? String(req.body.phone).trim() : '';

        if (!phone) {
            log('Error: Phone/Email missing');
            return res.status(400).json({ message: 'Email or Phone Number is required' });
        }

        if (!password) {
            log('Error: Password missing');
            return res.status(400).json({ message: 'Password is required' });
        }

        // NEW USERS MUST REGISTER WITH EMAIL ONLY
        const isEmail = phone.includes('@');
        log(`isEmail: ${isEmail}, Identifier: ${phone}`);

        if (!isEmail) {
            log('Error: Registration requires email address');
            return res.status(400).json({ message: 'New registrations must use a Gmail address. Please provide an email instead of a phone number.' });
        }

        // Check if user already exists
        const query = { email: phone.toLowerCase() };
        const existingUser = await User.findOne(query);
        if (existingUser) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        // Verify invitation code if provided (optional)
        let referredBy = null;
        if (invitationCode && invitationCode.trim() !== '') {
            const referrer = await User.findOne({ invitationCode: invitationCode.trim() });
            if (!referrer) {
                return res.status(400).json({ message: 'Invalid invitation code' });
            }
            referredBy = referrer.invitationCode;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate unique invitation code for new user
        const newInvitationCode = await User.generateInvitationCode();

        // Get max memberId to avoid collisions
        const lastUser = await User.findOne({}, 'memberId').sort({ memberId: -1 });
        const nextMemberId = (lastUser?.memberId || 0) + 1;

        // Create user (email-only for new registrations)
        const userData = {
            fullName,
            email: phone.toLowerCase(),
            password: hashedPassword,
            invitationCode: newInvitationCode,
            referredBy,
            memberId: nextMemberId,
            balance: 8,
            bonusIncome: 8
        };

        const user = new User(userData);

        await user.save();

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: user._id,
                phone: user.phone || '',
                email: user.email || '',
                fullName: user.fullName,
                invitationCode: user.invitationCode,
                memberId: user.memberId,
                balance: user.balance,
                totalEarnings: user.totalEarnings
            }
        });
    } catch (error) {
        const errInfo = `FAILED: ${error.message}\nStack: ${error.stack}`;
        log(errInfo);
        console.error('Registration error:', error);
        res.status(500).json({
            message: 'Server error during registration',
            error: error.message,
            stack: error.stack,
            details: error.name === 'ValidationError' ? error.errors : null,
            backend_version: 'V2.4-STABILITY-FIX'
        });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { phone, password } = req.body;

        if (!phone) {
            return res.status(400).json({ message: 'Phone or Email is required' });
        }

        const isEmail = phone.includes('@');
        console.log(`[Auth] Login attempt for ${isEmail ? 'email' : 'phone'}: ${phone}`);

        // Find user
        const query = isEmail ? { email: phone.toLowerCase() } : { phone };
        const user = await User.findOne(query);
        if (!user) {
            console.log(`[Auth] User not found: ${phone}`);
            return res.status(400).json({ message: `Invalid ${isEmail ? 'email' : 'phone number'} or password` });
        }

        // Check password
        console.log(`[Auth] Verifying password for user: ${user._id}`);
        // DEBUG: Log the stored hash (first few chars) to ensure it looks like a bcrypt hash
        console.log(`[Auth] Stored hash prefix: ${user.password.substring(0, 10)}...`);

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log(`[Auth] Password mismatch for user: ${user._id}`);
            return res.status(400).json({ message: 'Invalid phone number or password' });
        }

        console.log(`[Auth] Password verified. Updating last login...`);
        // Update last login
        user.lastLogin = new Date();
        await user.save();

        console.log(`[Auth] Generating token...`);
        // Generate JWT token
        if (!process.env.JWT_SECRET) {
            console.error('[Auth] CRITICAL: JWT_SECRET is not defined!');
        }

        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        console.log(`[Auth] Token generated. Sending response...`);
        console.log(`[Auth] User Role: ${user.role}`);

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                phone: user.phone || '',
                email: user.email || '',
                fullName: user.fullName,
                invitationCode: user.invitationCode,
                memberId: user.memberId,
                balance: user.balance,
                totalEarnings: user.totalEarnings,
                investments: user.investments,
                hasTransactionPin: !!user.transactionPin,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error details:', error);
        res.status(500).json({ message: 'Server error during login', error: error.message });
    }
});

// Set Transaction PIN
router.post('/set-pin', authMiddleware, async (req, res) => {
    try {
        const { pin } = req.body;
        if (!pin || pin.length !== 6) {
            return res.status(400).json({ message: 'PIN must be 6 digits' });
        }

        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const hashedPin = await bcrypt.hash(pin, 10);
        user.transactionPin = hashedPin;
        await user.save();

        res.json({ success: true, message: 'Transaction PIN set successfully' });
    } catch (error) {
        console.error('Set PIN error:', error);
        res.status(500).json({ message: 'Server error setting PIN' });
    }
});

// Verify Transaction PIN
router.post('/verify-pin', authMiddleware, async (req, res) => {
    try {
        const { pin } = req.body;
        const user = await User.findById(req.userId);

        if (!user || !user.transactionPin) {
            return res.status(400).json({ message: 'PIN not set' });
        }

        const isMatch = await bcrypt.compare(pin, user.transactionPin);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Invalid PIN' });
        }

        res.json({ success: true, message: 'PIN verified' });
    } catch (error) {
        console.error('Verify PIN error:', error);
        res.status(500).json({ message: 'Server error verifying PIN' });
    }
});

// Update Profile (Name, Email/Phone)
router.put('/profile', authMiddleware, async (req, res) => {
    try {
        const { fullName, phone, email } = req.body;
        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (fullName) {
            user.fullName = fullName;
        }

        // Handle Phone/Email update with uniqueness check
        const newIdentifier = phone || email;
        const isEmail = newIdentifier && newIdentifier.includes('@');

        if (newIdentifier) {
            // Check uniqueness across both phone and email fields
            const existingUser = await User.findOne(
                isEmail
                    ? { email: newIdentifier.toLowerCase(), _id: { $ne: user._id } }
                    : { phone: newIdentifier, _id: { $ne: user._id } }
            );
            if (existingUser) {
                return res.status(400).json({ message: `This ${isEmail ? 'email' : 'phone number'} is already used by another account` });
            }

            if (isEmail) {
                user.email = newIdentifier.toLowerCase();
                // Clear old phone so the new email becomes the primary identifier
                user.phone = undefined;
            } else {
                user.phone = newIdentifier;
                // Clear old email so the new phone becomes the primary identifier
                user.email = undefined;
            }
        }

        await user.save();

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                id: user._id,
                phone: user.phone || '',
                email: user.email || '',
                fullName: user.fullName,
                memberId: user.memberId,
                invitationCode: user.invitationCode,
                balance: user.balance,
                totalEarnings: user.totalEarnings,
                investments: user.investments,
                profileImage: user.profileImage,
                vipLevel: user.vipLevel,
                hasTransactionPin: !!user.transactionPin,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Server error updating profile' });
    }
});

// Change Password
router.put('/password', authMiddleware, async (req, res) => {
    try {
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters' });
        }

        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ message: 'Server error updating password' });
    }
});

// Change/Set Transaction PIN (Secure)
router.put('/pin', authMiddleware, async (req, res) => {
    try {
        const { newPin } = req.body;

        if (!newPin || newPin.length !== 6) {
            return res.status(400).json({ message: 'New PIN must be 6 digits' });
        }

        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Hash new PIN
        const hashedPin = await bcrypt.hash(newPin, 10);
        user.transactionPin = hashedPin;
        await user.save();

        res.json({ success: true, message: 'Transaction PIN updated successfully' });
    } catch (error) {
        console.error('Change PIN error:', error);
        res.status(500).json({ message: 'Server error updating PIN' });
    }
});

// Get current user
// Get current user with stats and auto-upgrade logic
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        console.log(`[Auth] /me called for ${user.phone || user.email}. memberId: ${user.memberId}`);

        // Calculate Referral Stats (Gen 1 + Gen 2)
        // 1. Direct Referrals (Gen 1)
        const directReferrals = await User.find({ referredBy: user.invitationCode });
        const directCount = directReferrals.length;

        // 2. Second Generation (Gen 2) - Referrals of Directs
        const directCodes = directReferrals.map(u => u.invitationCode);
        const secondGenReferrals = await User.find({ referredBy: { $in: directCodes } });
        const teamCount = directCount + secondGenReferrals.length;

        // Auto-Upgrade Logic (Check from highest level down)
        let newLevel = user.vipLevel;

        if (directCount >= 120) {
            newLevel = 6;
        } else if (directCount >= 90) {
            newLevel = 5;
        } else if (directCount >= 72) {
            newLevel = 4;
        } else if (directCount >= 48) {
            newLevel = 3;
        } else if (directCount >= 24) {
            newLevel = 2;
        } else if (directCount >= 12) {
            newLevel = 1;
        }

        // Apply Upgrade if level increased
        if (newLevel > user.vipLevel) {
            user.vipLevel = newLevel;
            await user.save();
        }

        // Star Reward Logic (A + B/2) - Dynamic 10-Day Cycle
        let currentStarPoints = 0;
        let starACount = 0;
        let starBCount = 0;
        const now = new Date();
        let missionStart = user.starMissionStart;

        // Auto-handle expiration check (basic)
        if (missionStart && now > new Date(missionStart.getTime() + 10 * 24 * 60 * 60 * 1000)) {
            missionStart = null;
        }

        if (missionStart) {
            const missionEnd = new Date(missionStart.getTime() + 10 * 24 * 60 * 60 * 1000);
            const starDirects = await User.find({
                referredBy: user.invitationCode,
                createdAt: { $gte: missionStart, $lte: missionEnd }
            });

            // Only count directs who have at least one approved deposit
            const directIds = starDirects.map(u => u._id);
            const depositedDirectIds = await Deposit.distinct('userId', {
                userId: { $in: directIds },
                status: 'approved'
            });
            starACount = depositedDirectIds.length;

            // Gen 2 - only from deposited directs
            const depositedDirects = starDirects.filter(u => depositedDirectIds.some(id => id.equals(u._id)));
            const starDirectCodes = depositedDirects.map(u => u.invitationCode);
            const starSecondGen = await User.find({
                referredBy: { $in: starDirectCodes },
                createdAt: { $gte: missionStart, $lte: missionEnd }
            });

            // Only count indirects who have at least one approved deposit
            const secondGenIds = starSecondGen.map(u => u._id);
            const depositedSecondGenIds = await Deposit.distinct('userId', {
                userId: { $in: secondGenIds },
                status: 'approved'
            });
            starBCount = depositedSecondGenIds.length;
            currentStarPoints = starACount + Math.floor(starBCount / 2);
        }

        res.json({
            id: user._id,
            phone: user.phone || '',
            email: user.email || '',
            fullName: user.fullName,
            memberId: user.memberId,
            invitationCode: user.invitationCode,
            balance: user.balance,
            totalEarnings: user.totalEarnings,
            investments: user.investments,
            profileImage: user.profileImage,
            createdAt: user.createdAt,
            vipLevel: user.vipLevel,
            referredBy: user.referredBy,
            hasTransactionPin: !!user.transactionPin,
            role: user.role,
            teamEarnings: user.teamEarnings || 0,
            claimedStarRewards: user.claimedStarRewards || [],
            starPoints: currentStarPoints,
            starACount,
            starBCount,
            stats: {
                directResults: directCount,
                teamMembers: teamCount,
                activeInvestments: user.investments?.filter(i => i.status === 'active').length || 0,
                totalInvested: user.investments?.reduce((sum, i) => sum + i.package.investmentAmount, 0) || 0
            }
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;

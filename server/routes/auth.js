import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Deposit from '../models/Deposit.js';
import Otp from '../models/Otp.js';
import { sendVerificationEmail } from '../services/emailService.js';
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

// Generate a random 6-digit OTP
const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP for registration
router.post('/register/send-otp', async (req, res) => {
    try {
        const email = req.body.email ? String(req.body.email).trim().toLowerCase() : '';
        
        if (!email) {
            return res.status(400).json({ message: 'Email address is required' });
        }

        if (!email.includes('@')) {
            return res.status(400).json({ message: 'Please enter a valid email address' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email is already registered' });
        }

        // Generate and save OTP
        const otpCode = generateOtp();
        
        // Remove any existing OTP for this email
        await Otp.deleteMany({ email });
        
        // Save new OTP
        await Otp.create({ email, code: otpCode });

        // Send Email
        const sent = await sendVerificationEmail(email, otpCode);
        
        if (!sent) {
            return res.status(500).json({ message: 'Failed to send verification email. Please try again.' });
        }

        res.json({ message: 'Verification code sent to your email' });
    } catch (error) {
        console.error('Send OTP error:', error);
        res.status(500).json({ message: 'Server error while sending verification code' });
    }
});

// Register
router.post('/register', async (req, res) => {
    try {
        log(`Registration attempt: ${JSON.stringify({ ...req.body, password: '[HIDDEN]' })}`);
        const { password, invitationCode, fullName, email: reqEmail, phone: reqPhone, otp } = req.body;
        
        // We now cleanly separate email and phone
        const email = reqEmail ? String(reqEmail).trim().toLowerCase() : '';
        const phone = reqPhone ? String(reqPhone).trim() : '';

        if (!email) {
            log('Error: Email missing');
            return res.status(400).json({ message: 'Email is required' });
        }

        if (!password) {
            log('Error: Password missing');
            return res.status(400).json({ message: 'Password is required' });
        }

        if (!otp) {
            log('Error: OTP missing');
            return res.status(400).json({ message: 'Verification code is required' });
        }

        // NEW USERS MUST REGISTER WITH EMAIL ONLY
        const isEmail = email.includes('@');
        log(`isEmail: ${isEmail}, Email: ${email}`);

        if (!isEmail) {
            log('Error: Registration requires email address');
            return res.status(400).json({ message: 'New registrations must use a Gmail address. Please provide a valid email.' });
        }

        // Verify OTP
        const validOtp = await Otp.findOne({ email: email, code: otp });
        if (!validOtp) {
            return res.status(400).json({ message: 'Invalid or expired verification code' });
        }

        // Check if user already exists with this email
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already registered' });
        }
        
        // Check if user already exists with this phone (optional, but good practice since phone is unique)
        if (phone) {
            const existingPhone = await User.findOne({ phone });
            if (existingPhone) {
                return res.status(400).json({ message: 'Phone number already registered' });
            }
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

        // OTP is valid and user doesn't exist, remove OTP
        await Otp.deleteOne({ _id: validOtp._id });

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate unique invitation code for new user
        const newInvitationCode = await User.generateInvitationCode();

        // Get max memberId to avoid collisions
        const lastUser = await User.findOne({}, 'memberId').sort({ memberId: -1 });
        const nextMemberId = (lastUser?.memberId || 0) + 1;

        // Create user
        const userData = {
            fullName,
            phone,
            email,
            password: hashedPassword,
            invitationCode: newInvitationCode,
            referredBy,
            memberId: nextMemberId,
            balance: 5,
            bonusIncome: 5
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
                totalEarnings: user.totalEarnings,
                twoFactorEnabled: user.twoFactorEnabled
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

        // Check if user is blocked
        if (user.isBlocked) {
            console.log(`[Auth] Blocked user attempted login: ${phone}`);
            return res.status(403).json({ message: 'Your account has been blocked by an administrator. Please contact support.' });
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
                memberId: user.memberId,
                invitationCode: user.invitationCode,
                balance: user.balance,
                totalEarnings: user.totalEarnings,
                investments: user.investments,
                hasTransactionPin: !!user.transactionPin,
                role: user.role,
                twoFactorEnabled: user.twoFactorEnabled
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

        // Handle Phone/Email update
        if (email) {
            const existingEmail = await User.findOne({ email: email.toLowerCase(), _id: { $ne: user._id } });
            if (existingEmail) {
                return res.status(400).json({ message: 'This email is already used by another account' });
            }
            user.email = email.toLowerCase();
        }

        if (phone) {
            const existingPhone = await User.findOne({ phone: phone, _id: { $ne: user._id } });
            if (existingPhone) {
                return res.status(400).json({ message: 'This phone number is already used by another account' });
            }
            user.phone = phone;
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
                role: user.role,
                twoFactorEnabled: user.twoFactorEnabled
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

        // Instant block check
        if (user.isBlocked) {
            return res.status(403).json({ 
                message: 'Your account has been blocked. Please contact support.', 
                code: 'ACCOUNT_BLOCKED' 
            });
        }

        console.log(`[Auth] /me called for ${user.phone || user.email}. memberId: ${user.memberId}`);

        // ─── Calculate Active Referral Stats (Gen 1 + Gen 2 + Gen 3) ───
        // Active member = isTeamMember: true AND total balance (available + active lend) >= $50
        // If total balance < $50, the member is treated as pending (not counted as active)

        // Helper: total balance = available balance + active lend locked principal
        const getMemberTotalBalance = (u) => {
            const activeInvTotal = (u.investments || [])
                .filter(inv => inv.status === 'active')
                .reduce((sum, inv) => sum + (inv.package?.investmentAmount || 0), 0);
            return (u.balance || 0) + activeInvTotal;
        };

        // Gen 1 — Direct referrals
        const gen1Users = await User.find({ referredBy: user.invitationCode }, 'invitationCode isTeamMember balance investments');
        const gen1ActiveCount = gen1Users.filter(u => u.isTeamMember && getMemberTotalBalance(u) >= 50).length;
        const gen1Codes = gen1Users.map(u => u.invitationCode);

        // Gen 2 — Referrals of Gen 1
        const gen2Users = gen1Codes.length > 0
            ? await User.find({ referredBy: { $in: gen1Codes } }, 'invitationCode isTeamMember balance investments')
            : [];
        const gen2ActiveCount = gen2Users.filter(u => u.isTeamMember && getMemberTotalBalance(u) >= 50).length;
        const gen2Codes = gen2Users.map(u => u.invitationCode);

        // Gen 3 — Referrals of Gen 2
        const gen3Users = gen2Codes.length > 0
            ? await User.find({ referredBy: { $in: gen2Codes } }, 'invitationCode isTeamMember balance investments')
            : [];
        const gen3ActiveCount = gen3Users.filter(u => u.isTeamMember && getMemberTotalBalance(u) >= 50).length;

        // Combined counts for level check
        const gen23ActiveCount = gen2ActiveCount + gen3ActiveCount;  // Gen 2 + Gen 3 combined
        const totalActiveCount = gen1ActiveCount + gen23ActiveCount; // All active members

        // For /me stats (total team including non-active, used for display)
        const directCount = gen1Users.length;
        const teamCount = directCount + gen2Users.length + gen3Users.length;

        // Calculate user's Total Assets (balance + active investments + redeemable)
        // This matches the "Total assets (Converted)" shown in the Wallet page
        const activeInvestmentTotal = user.investments
            .filter(inv => inv.status === 'active')
            .reduce((sum, inv) => sum + (inv.package?.investmentAmount || 0), 0);
        const totalAssets = (user.balance || 0) + activeInvestmentTotal + (user.redeemableBalance || 0);

        // ─── Auto-Upgrade Logic ───
        // Rules:
        //   - Gen 1 MUST have the minimum required active members
        //   - Gen 2+3 combined must fill the rest
        //   - Total active members must meet the total requirement
        //   - User's own deposit must meet the minimum
        //
        // Level 2: Gen1 >= 3,  Gen2+3 >= 4,  Total >= 7,   minDeposit $300
        // Level 3: Gen1 >= 8,  Gen2+3 >= 10, Total >= 18,  minDeposit $800
        // Level 4: Gen1 >= 15, Gen2+3 >= 35, Total >= 50,  minDeposit $1300
        // Level 5: Gen1 >= 30, Gen2+3 >= 50, Total >= 80,  minDeposit $2000
        // Level 6: Gen1 >= 45, Gen2+3 >= 95, Total >= 140, minDeposit $3000
        const levelUpRequirements = [
            { level: 5, gen1Min: 45, gen23Min: 95, totalMin: 140, minDeposit: 3000 },
            { level: 4, gen1Min: 30, gen23Min: 50, totalMin: 80,  minDeposit: 2000 },
            { level: 3, gen1Min: 15, gen23Min: 35, totalMin: 50,  minDeposit: 1300 },
            { level: 2, gen1Min: 8,  gen23Min: 10, totalMin: 18,  minDeposit: 800  },
            { level: 1, gen1Min: 3,  gen23Min: 4,  totalMin: 7,   minDeposit: 300  }
        ];

        console.log(`[LevelCheck] User: ${user.email || user.phone} | vipLevel: ${user.vipLevel}`);
        console.log(`[LevelCheck] gen1Active: ${gen1ActiveCount}, gen23Active: ${gen23ActiveCount}, totalActive: ${totalActiveCount}, totalAssets: $${totalAssets.toFixed(2)}`);

        let newLevel = user.vipLevel;
        for (const req of levelUpRequirements) {
            const g1ok = gen1ActiveCount >= req.gen1Min;
            const g23ok = gen23ActiveCount >= req.gen23Min;
            const totok = totalActiveCount >= req.totalMin;
            const depok = totalAssets >= req.minDeposit;
            console.log(`[LevelCheck] → Level ${req.level}: gen1(${gen1ActiveCount}>=${req.gen1Min}=${g1ok}), gen23(${gen23ActiveCount}>=${req.gen23Min}=${g23ok}), total(${totalActiveCount}>=${req.totalMin}=${totok}), assets($${totalAssets.toFixed(2)}>=$${req.minDeposit}=${depok})`);
            if (g1ok && g23ok && totok && depok) {
                newLevel = req.level;
                break;
            }
        }
        console.log(`[LevelCheck] Result: newLevel=${newLevel} (was ${user.vipLevel})`);

        // Apply correct level (upgrade OR fix incorrect level from DB)
        if (newLevel !== user.vipLevel) {
            console.log(`[LevelCheck] Updating vipLevel: ${user.vipLevel} → ${newLevel}`);
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
            currentStarPoints = (starACount * 100) + (starBCount * 50);
        }

        // ─── Calculate lifetime total approved deposits ───
        const depositAgg = await Deposit.aggregate([
            { $match: { userId: user._id, status: 'approved' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const totalLifetimeDeposits = depositAgg.length > 0 ? depositAgg[0].total : 0;

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
            twoFactorEnabled: user.twoFactorEnabled,
            teamEarnings: user.teamEarnings || 0,
            claimedStarRewards: user.claimedStarRewards || [],
            starPoints: currentStarPoints,
            starACount,
            starBCount,
            totalLifetimeDeposits,
            stats: {
                directResults: directCount,
                teamMembers: teamCount,
                activeTeamMembers: totalActiveCount,
                gen1ActiveCount: gen1ActiveCount,
                gen23ActiveCount: gen23ActiveCount,
                activeInvestments: user.investments?.filter(i => i.status === 'active').length || 0,
                totalInvested: user.investments?.reduce((sum, i) => sum + i.package.investmentAmount, 0) || 0,
                totalDeposited: totalAssets
            }
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ✅ INSTANT BLOCK CHECK: Lightweight endpoint for frontend polling
// Returns 200 if user is active, 403 if blocked
// Used by AuthContext every 15 seconds to detect real-time blocks
router.get('/check-block', authMiddleware, async (req, res) => {
    // authMiddleware already checks isBlocked — if we reach here, user is not blocked
    res.json({ status: 'ok', blocked: false });
});

export default router;

import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { adminMiddleware } from '../middleware/admin.js';
import User from '../models/User.js';
import Deposit from '../models/Deposit.js';
import Package from '../models/Package.js';
import Withdrawal from '../models/Withdrawal.js';
import SystemSettings from '../models/SystemSettings.js';
import Banner from '../models/Banner.js';
import multer from 'multer';
import path from 'path';
import AdminLog from '../models/AdminLog.js';
import { createNotification } from '../utils/notifications.js';
import { distributeCommissions } from '../utils/teamCommissions.js';
import Commission from '../models/Commission.js';

const router = express.Router();

// Multer Config for Package Images
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/packages/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'pkg-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|webp|svg/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Only images are allowed (jpg, png, webp, svg)'));
    }
});

// Upload Package Image
router.post('/upload-image', authMiddleware, adminMiddleware, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Please upload a file' });
        }
        const filePath = `/uploads/packages/${req.file.filename}`;
        res.json({ url: filePath });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ message: 'Upload failed' });
    }
});

// Get Dashboard Stats
router.get('/stats', authMiddleware, adminMiddleware, async (req, res) => {
    console.log('[Admin] Fetching dashboard stats...');
    try {
        const totalUsers = await User.countDocuments({ role: { $ne: 'admin' } });

        const totalDeposits = await Deposit.aggregate([
            { $match: { status: 'approved' } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);

        const totalWithdrawals = await Withdrawal.aggregate([
            { $match: { status: 'approved' } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);

        const pendingDeposits = await Deposit.countDocuments({ status: 'pending' });
        const pendingWithdrawals = await Withdrawal.countDocuments({ status: 'pending' });

        // Calculate total user balances
        const userBalances = await User.aggregate([
            { $group: { _id: null, total: { $sum: "$balance" } } }
        ]);

        res.json({
            totalUsers,
            totalDepositsAmount: totalDeposits[0]?.total || 0,
            totalWithdrawalsAmount: totalWithdrawals[0]?.total || 0,
            pendingDepositsCount: pendingDeposits,
            pendingWithdrawalsCount: pendingWithdrawals,
            totalUserBalance: userBalances[0]?.total || 0
        });
    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ================= USER MANAGEMENT =================

// Get All Users
router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { search, sortBy = 'createdAt', order = 'desc', limit = 100 } = req.query;
        console.log(`[Admin] Fetching users (Search: "${search || ''}", Limit: ${limit})...`);

        const query = { role: { $ne: 'admin' } };
        if (search) {
            query.$or = [
                { phone: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { fullName: { $regex: search, $options: 'i' } },
                { invitationCode: { $regex: search, $options: 'i' } }
            ];
        }

        const sortOptions = {};
        sortOptions[sortBy] = order === 'desc' ? -1 : 1;

        const users = await User.find(query)
            .select('-password -transactionPin')
            .sort(sortOptions)
            .limit(parseInt(limit));

        res.json(users);
    } catch (error) {
        console.error('Admin users error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update User (Balance, VIP, etc)
router.patch('/user/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { balance, vipLevel, password } = req.body;
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const changes = {};

        if (balance !== undefined && balance !== user.balance) {
            // Check if balance is being increased to track it as a bonus
            if (balance > user.balance) {
                const bonusAmount = balance - user.balance;
                user.bonusIncome += bonusAmount;

                // Create notification for bonus
                await createNotification({
                    userId: user._id,
                    title: 'Bonus Received!',
                    message: `You have received a bonus of $${bonusAmount.toFixed(2)} from Admin.`,
                    type: 'bonus',
                    amount: bonusAmount
                });
                console.log(`[Admin] Bonus of $${bonusAmount} tracked for user ${user._id}`);
            }

            changes.oldBalance = user.balance;
            changes.newBalance = balance;
            user.balance = balance;
        }

        if (vipLevel !== undefined && vipLevel !== user.vipLevel) {
            changes.oldVip = user.vipLevel;
            changes.newVip = vipLevel;
            user.vipLevel = vipLevel;
        }

        if (password) {
            // Ideally password should be hashed here, but relying on model middleware or pre-save if exists
            // For now assuming plain text update is needed or hashing utility is imported
            // Security Note: In production use bcrypt here
            user.password = password;
            changes.passwordChanged = true;
        }

        await user.save();

        if (Object.keys(changes).length > 0) {
            await AdminLog.create({
                adminId: req.userId,
                action: 'user_updated',
                targetUserId: user._id,
                targetResource: { resourceType: 'user', resourceId: user._id },
                changes,
                description: `Updated user ${user.phone}`
            });
        }

        res.json({ message: 'User updated successfully', user });

    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Toggle User Block Status
router.post('/user/:id/toggle-block', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.isBlocked = !user.isBlocked;
        await user.save();

        await AdminLog.create({
            adminId: req.userId,
            action: user.isBlocked ? 'user_blocked' : 'user_unblocked',
            targetUserId: user._id,
            description: `${user.isBlocked ? 'Blocked' : 'Unblocked'} user ${user.phone || user.email}`
        });

        res.json({ message: `User ${user.isBlocked ? 'blocked' : 'unblocked'} successfully`, isBlocked: user.isBlocked });
    } catch (error) {
        console.error('Toggle block user error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get User Investment History
router.get('/user/:id/investments', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('investments');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user.investments);
    } catch (error) {
        console.error('User investments error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ================= PACKAGE MANAGEMENT =================

// Get all packages (including active/inactive)
router.get('/packages', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const packages = await Package.find({}).sort({ minAmount: 1 });
        res.json(packages);
    } catch (error) {
        console.error('Admin packages error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create Package
router.post('/packages', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const newPackage = new Package(req.body);
        await newPackage.save();

        await AdminLog.create({
            adminId: req.userId,
            action: 'package_created',
            targetResource: { resourceType: 'package', resourceId: newPackage._id },
            changes: req.body,
            description: `Created package ${newPackage.name}`
        });

        res.status(201).json(newPackage);
    } catch (error) {
        console.error('Create package error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update Package
router.put('/packages/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const pkg = await Package.findByIdAndUpdate(req.params.id, req.body, { new: true });

        await AdminLog.create({
            adminId: req.userId,
            action: 'package_updated',
            targetResource: { resourceType: 'package', resourceId: pkg._id },
            changes: req.body,
            description: `Updated package ${pkg.name}`
        });

        res.json(pkg);
    } catch (error) {
        console.error('Update package error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete Package
router.delete('/packages/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const pkg = await Package.findByIdAndDelete(req.params.id);

        await AdminLog.create({
            adminId: req.userId,
            action: 'package_deleted',
            description: `Deleted package ${pkg?.name || req.params.id}`
        });

        res.json({ message: 'Package deleted' });
    } catch (error) {
        console.error('Delete package error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ================= SYSTEM SETTINGS =================

// Get Settings
router.get('/settings', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        let settings = await SystemSettings.findOne();
        if (!settings) {
            settings = new SystemSettings();
            await settings.save();
        }
        res.json(settings);
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update Settings
router.put('/settings', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        let settings = await SystemSettings.findOne();
        if (!settings) {
            settings = new SystemSettings(req.body);
        } else {
            // Only update fields that have actual values
            // This prevents empty form fields from overwriting saved wallet addresses
            const updates = {};
            for (const [key, value] of Object.entries(req.body)) {
                // Skip MongoDB internal fields
                if (key === '_id' || key === '__v' || key === 'createdAt' || key === 'updatedAt') continue;
                
                // Always allow booleans (including false) and numbers (including 0)
                if (typeof value === 'boolean' || typeof value === 'number') {
                    updates[key] = value;
                    continue;
                }
                
                // For strings: only update if non-empty
                if (typeof value === 'string' && value.trim() !== '') {
                    updates[key] = value;
                }
            }
            Object.assign(settings, updates);
        }
        await settings.save();

        await AdminLog.create({
            adminId: req.userId,
            action: 'settings_updated',
            changes: req.body,
            description: 'Updated system settings'
        });

        res.json(settings);
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ================= BANNER MANAGEMENT =================

// Get All Banners
router.get('/banners', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const banners = await Banner.find({}).sort({ displayOrder: 1 });
        res.json(banners);
    } catch (error) {
        console.error('Admin banners error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create Banner
router.post('/banners', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const banner = new Banner(req.body);
        await banner.save();
        res.status(201).json(banner);
    } catch (error) {
        console.error('Create banner error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update Banner
router.put('/banners/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const banner = await Banner.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(banner);
    } catch (error) {
        console.error('Update banner error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete Banner
router.delete('/banners/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        await Banner.findByIdAndDelete(req.params.id);
        res.json({ message: 'Banner deleted' });
    } catch (error) {
        console.error('Delete banner error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ================= DEPOSIT MANAGEMENT =================

// Get Deposits (with filter)
router.get('/deposits', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { status } = req.query;
        console.log(`[Admin] Fetching deposits (Status: ${status || 'all'})...`);
        const query = status ? { status } : {};

        const deposits = await Deposit.find(query)
            .populate('userId', 'phone invitationCode fullName')
            .sort({ createdAt: -1 });

        res.json(deposits);
    } catch (error) {
        console.error('Admin deposits error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Approve Deposit
router.post('/deposit/:id/approve', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const depositId = req.params.id;
        const deposit = await Deposit.findById(depositId);

        if (!deposit) {
            return res.status(404).json({ message: 'Deposit not found' });
        }

        if (deposit.status === 'approved') {
            return res.status(400).json({ message: 'Deposit already approved' });
        }

        deposit.status = 'approved';
        deposit.approvedAt = new Date();
        await deposit.save();

        // ADD TO BALANCE ONLY
        const user = await User.findById(deposit.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Add to balance
        user.balance += deposit.amount;
        user.isTeamMember = true; // Mark as active team member on first deposit

        // AUTO-UNBLOCK: Clear withdrawal block if it exists for this user
        if (user.withdrawalBlockMessage) {
            console.log(`[Admin] Auto-unblocking user ${user._id} due to new deposit`);
            user.withdrawalBlockMessage = null;
        }

        console.log(`[Admin] $${deposit.amount} added to balance and marked as team member for user ${user._id}`);

        await AdminLog.create({
            adminId: req.userId,
            action: 'deposit_approved',
            targetUserId: user._id,
            description: `Approved deposit ${deposit.amount} to balance`
        });

        await user.save();

        // AUTO-UNBLOCK REFERRER: If this user has a referrer, unblock them too
        if (user.referredBy) {
            const referrer = await User.findOne({ invitationCode: user.referredBy });
            if (referrer && referrer.withdrawalBlockMessage) {
                console.log(`[Admin] Auto-unblocking referrer ${referrer._id} due to referral (${user.phone}) deposit`);
                referrer.withdrawalBlockMessage = null;
                await referrer.save();
            }
        }

        // Distribute team commissions for the deposit
        try {
            await distributeCommissions(user, deposit.amount);
            console.log(`✅ Commissions distributed for deposit of $${deposit.amount} for user ${user._id}`);
        } catch (commissionError) {
            console.error('Commission distribution error:', commissionError);
            // Don't fail the approval if commission fails
        }

        // Notification: Deposit Approved
        await createNotification({
            userId: user._id,
            title: 'Deposit Approved',
            message: `Your deposit of $${deposit.amount} has been approved and added to your balance.`,
            type: 'deposit',
            amount: deposit.amount,
            relatedId: deposit._id
        });

        res.json({ message: 'Deposit approved and added to wallet balance', deposit });

    } catch (error) {
        console.error('Approve deposit error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Reject Deposit
router.post('/deposit/:id/reject', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const depositId = req.params.id;
        const deposit = await Deposit.findById(depositId);

        if (!deposit) {
            return res.status(404).json({ message: 'Deposit not found' });
        }

        if (deposit.status !== 'pending') {
            return res.status(400).json({ message: 'Cannot reject processed deposit' });
        }

        deposit.status = 'rejected';
        await deposit.save();

        // Notification: Deposit Rejected
        await createNotification({
            userId: deposit.userId,
            title: 'Deposit Rejected',
            message: `Your deposit of $${deposit.amount} has been rejected. Please contact support for details.`,
            type: 'deposit',
            amount: deposit.amount,
            relatedId: deposit._id
        });

        await AdminLog.create({
            adminId: req.userId,
            action: 'deposit_rejected',
            targetUserId: deposit.userId,
            description: `Rejected deposit ${deposit.amount}`
        });

        res.json({ message: 'Deposit rejected' });
    } catch (error) {
        console.error('Reject deposit error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ================= MANUAL DEPOSIT =================

// Admin adds a deposit directly to a user's account
router.post('/manual-deposit', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { userId, amount, note } = req.body;

        if (!userId || !amount || isNaN(amount) || parseFloat(amount) <= 0) {
            return res.status(400).json({ message: 'Valid userId and positive amount are required.' });
        }

        const parsedAmount = parseFloat(amount);

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Create an approved deposit record
        const deposit = new Deposit({
            userId: user._id,
            amount: parsedAmount,
            network: 'manual-admin',
            status: 'approved',
            paymentMethod: 'manual',
            approvedAt: new Date(),
            transactionHash: `ADMIN-${Date.now()}-${user._id}`
        });
        await deposit.save();

        // Add to user balance and mark as team member
        user.balance += parsedAmount;
        user.isTeamMember = true;

        // Auto-unblock withdrawal if blocked
        if (user.withdrawalBlockMessage) {
            user.withdrawalBlockMessage = null;
            console.log(`[Admin] Auto-unblocking user ${user._id} via manual deposit`);
        }

        await user.save();

        // Auto-unblock referrer too
        if (user.referredBy) {
            const referrer = await User.findOne({ invitationCode: user.referredBy });
            if (referrer && referrer.withdrawalBlockMessage) {
                referrer.withdrawalBlockMessage = null;
                await referrer.save();
            }
        }

        // Distribute team commissions
        try {
            await distributeCommissions(user, parsedAmount);
            console.log(`✅ Commissions distributed for manual deposit of $${parsedAmount} for user ${user._id}`);
        } catch (commissionError) {
            console.error('Commission distribution error (manual deposit):', commissionError);
        }

        // Notify the user
        const notifMessage = note
            ? `Your deposit of $${parsedAmount.toFixed(2)} has been successfully added to your account. Note: ${note}`
            : `Your deposit of $${parsedAmount.toFixed(2)} has been successfully added to your account.`;

        await createNotification({
            userId: user._id,
            title: 'Deposit Successful 🎉',
            message: notifMessage,
            type: 'deposit',
            amount: parsedAmount,
            relatedId: deposit._id
        });

        // Admin log
        await AdminLog.create({
            adminId: req.userId,
            action: 'manual_deposit',
            targetUserId: user._id,
            targetResource: { resourceType: 'deposit', resourceId: deposit._id },
            changes: { amount: parsedAmount, note: note || '' },
            description: `Manual deposit of $${parsedAmount} to user ${user.phone || user.email || user._id}${note ? ` — Note: ${note}` : ''}`
        });

        res.json({
            message: `Deposit of $${parsedAmount.toFixed(2)} successfully added to user's account.`,
            deposit,
            newBalance: user.balance
        });

    } catch (error) {
        console.error('Manual deposit error:', error);
        res.status(500).json({ message: 'Server error. Please try again.' });
    }
});

// ================= ADMIN LOGIN AS USER =================
router.post('/impersonate/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Generate a JWT token for the target user
        const jwt = await import('jsonwebtoken');
        const token = jwt.default.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        // Log this action
        await AdminLog.create({
            adminId: req.userId,
            action: 'impersonate_user',
            targetUserId: user._id,
            description: `Admin logged in as user ${user.fullName || user.email || user.phone}`
        });

        res.json({
            token,
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                phone: user.phone,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Impersonate user error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ================= ADMIN: DISABLE 2FA FOR USER =================

// Admin force-disable Google Authenticator for a user (no code needed)
router.post('/user/:id/disable-2fa', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!user.twoFactorEnabled && !user.twoFactorSecret) {
            return res.status(400).json({ message: '2FA is not enabled for this user' });
        }

        // Force disable 2FA — no code required (admin override)
        user.twoFactorEnabled = false;
        user.twoFactorSecret = null;
        await user.save();

        await AdminLog.create({
            adminId: req.userId,
            action: 'admin_disabled_2fa',
            targetUserId: user._id,
            description: `Admin force-disabled 2FA for user ${user.fullName || user.phone || user.email}`
        });

        res.json({
            success: true,
            message: `Google Authenticator has been disabled for ${user.fullName || user.phone || user.email}. They can now set it up again.`
        });
    } catch (error) {
        console.error('Admin disable 2FA error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ================= ADMIN: TOGGLE TEAM BUSINESS VIEW =================

// Admin can enable/disable "Team Business View" for specific users
// When enabled, the user can see total team members count & total team deposits on My Team page
router.post('/user/:id/toggle-team-business', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.canViewTeamBusiness = !user.canViewTeamBusiness;
        await user.save();

        await AdminLog.create({
            adminId: req.userId,
            action: user.canViewTeamBusiness ? 'team_business_view_enabled' : 'team_business_view_disabled',
            targetUserId: user._id,
            description: `Admin ${user.canViewTeamBusiness ? 'enabled' : 'disabled'} Team Business View for user ${user.fullName || user.phone || user.email}`
        });

        res.json({
            success: true,
            canViewTeamBusiness: user.canViewTeamBusiness,
            message: `Team Business View ${user.canViewTeamBusiness ? 'enabled' : 'disabled'} for ${user.fullName || user.phone || user.email}`
        });
    } catch (error) {
        console.error('Toggle team business view error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ================= REFERRAL TREE =================

// Get referral upline chain for a user (who referred them, who referred that person, etc.)
router.get('/referral-chain/:userId', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { userId } = req.params;

        const targetUser = await User.findById(userId).select('-password -transactionPin');
        if (!targetUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Build upline chain (traverse referredBy codes upward)
        const chain = [];
        let currentCode = targetUser.referredBy;
        let depth = 0;
        const MAX_DEPTH = 20; // safety limit

        while (currentCode && depth < MAX_DEPTH) {
            const uplineUser = await User.findOne({ invitationCode: currentCode })
                .select('-password -transactionPin');
            if (!uplineUser) break;

            chain.push({
                level: depth + 1,
                _id: uplineUser._id,
                fullName: uplineUser.fullName,
                phone: uplineUser.phone,
                email: uplineUser.email,
                invitationCode: uplineUser.invitationCode,
                referredBy: uplineUser.referredBy,
                balance: uplineUser.balance,
                vipLevel: uplineUser.vipLevel,
                isBlocked: uplineUser.isBlocked,
                createdAt: uplineUser.createdAt
            });

            currentCode = uplineUser.referredBy;
            depth++;
        }

        // Get direct referrals (downline level 1) for the target user
        const directReferrals = await User.find({ referredBy: targetUser.invitationCode })
            .select('-password -transactionPin')
            .sort({ createdAt: -1 });

        res.json({
            user: targetUser,
            uplineChain: chain,
            directReferrals
        });
    } catch (error) {
        console.error('Referral chain error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Search users for referral tree (lightweight search)
router.get('/referral-search', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.trim().length < 2) {
            return res.json([]);
        }

        const users = await User.find({
            role: { $ne: 'admin' },
            $or: [
                { phone: { $regex: q.trim(), $options: 'i' } },
                { email: { $regex: q.trim(), $options: 'i' } },
                { fullName: { $regex: q.trim(), $options: 'i' } },
                { invitationCode: { $regex: q.trim(), $options: 'i' } }
            ]
        })
            .select('fullName phone email invitationCode referredBy vipLevel balance')
            .limit(15);

        res.json(users);
    } catch (error) {
        console.error('Referral search error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;


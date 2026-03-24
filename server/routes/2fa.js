 import express from 'express';
import speakeasy from 'speakeasy';
import { authMiddleware } from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

// Setup 2FA: Generate secret and return OTP Auth URL
router.post('/setup', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Generate a new secret
        const secret = speakeasy.generateSecret({
            name: `Dove Investment Gold Mine (${user.phone || user.email})`,
            issuer: 'Dove Investment Gold Mine'
        });

        // Save the temporary secret to the user
        // We only persist it fully once they successfully verify a code
        user.twoFactorSecret = secret.base32;
        user.twoFactorEnabled = false; // Ensure it's not enabled until verified
        await user.save();

        res.json({
            secret: secret.base32,
            otpauth_url: secret.otpauth_url
        });
    } catch (error) {
        console.error('2FA setup error:', error);
        res.status(500).json({ message: 'Server error setting up 2FA' });
    }
});

// Enable 2FA: Verify the code provided by the user
router.post('/enable', authMiddleware, async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ message: 'Verification code is required' });
        }

        const user = await User.findById(req.userId);
        if (!user || !user.twoFactorSecret) {
            return res.status(400).json({ message: '2FA setup not initiated' });
        }

        // Verify the token
        const verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token: token
        });

        if (!verified) {
            return res.status(400).json({ message: 'Invalid verification code' });
        }

        // Enable 2FA
        user.twoFactorEnabled = true;
        await user.save();

        res.json({
            success: true,
            message: 'Google Authenticator enabled successfully'
        });
    } catch (error) {
        console.error('2FA enable error:', error);
        res.status(500).json({ message: 'Server error enabling 2FA' });
    }
});

// Disable 2FA
router.post('/disable', authMiddleware, async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ message: 'Verification code is required' });
        }

        const user = await User.findById(req.userId);
        if (!user || !user.twoFactorEnabled) {
            return res.status(400).json({ message: '2FA is not enabled' });
        }

        // Verify the token
        const verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token: token
        });

        if (!verified) {
            return res.status(400).json({ message: 'Invalid verification code' });
        }

        // Disable 2FA
        user.twoFactorEnabled = false;
        user.twoFactorSecret = null;
        await user.save();

        res.json({
            success: true,
            message: 'Google Authenticator disabled successfully'
        });
    } catch (error) {
        console.error('2FA disable error:', error);
        res.status(500).json({ message: 'Server error disabling 2FA' });
    }
});

export default router;

import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import SupportMessage from '../models/SupportMessage.js';
import User from '../models/User.js';
import { createNotification } from '../utils/notifications.js';

const router = express.Router();

// User: Get chat history
router.get('/messages', authMiddleware, async (req, res) => {
    try {
        const messages = await SupportMessage.find({ userId: req.userId })
            .sort({ createdAt: 1 })
            .limit(100);
        res.json(messages);
    } catch (error) {
        console.error('Fetch support messages error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// User: Send message
router.post('/send', authMiddleware, async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ message: 'Message is required' });

        const newMessage = new SupportMessage({
            userId: req.userId,
            senderId: req.userId,
            message,
            isAdmin: false
        });

        await newMessage.save();
        res.status(201).json(newMessage);
    } catch (error) {
        console.error('Send support message error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Admin: Get all conversations
router.get('/admin/conversations', authMiddleware, async (req, res) => {
    try {
        // Check if admin (assuming user in req has role)
        const adminUser = await User.findById(req.userId);
        if (adminUser?.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Aggregate unique users who have messages
        const conversations = await SupportMessage.aggregate([
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: '$userId',
                    lastMessage: { $first: '$message' },
                    lastMessageAt: { $first: '$createdAt' }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            { $unwind: '$userInfo' },
            {
                $project: {
                    _id: 1,
                    lastMessage: 1,
                    lastMessageAt: 1,
                    'userInfo._id': 1,
                    'userInfo.fullName': 1,
                    'userInfo.phone': 1,
                    'userInfo.profileImage': 1
                }
            },
            { $sort: { lastMessageAt: -1 } }
        ]);

        res.json(conversations);
    } catch (error) {
        console.error('Fetch admin conversations error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Admin: Get specific user messages
router.get('/admin/messages/:userId', authMiddleware, async (req, res) => {
    try {
        const adminUser = await User.findById(req.userId);
        if (adminUser?.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const { userId } = req.params;
        if (!userId || userId === 'undefined' || !userId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ message: 'Invalid User ID' });
        }

        const messages = await SupportMessage.find({ userId })
            .sort({ createdAt: 1 });
        res.json(messages);
    } catch (error) {
        console.error('Fetch admin user messages error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Admin: Reply to user
router.post('/admin/reply', authMiddleware, async (req, res) => {
    try {
        const adminUser = await User.findById(req.userId);
        if (adminUser?.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const { userId, message } = req.body;
        if (!userId || !message) return res.status(400).json({ message: 'User ID and message are required' });

        const newMessage = new SupportMessage({
            userId,
            senderId: req.userId,
            message,
            isAdmin: true
        });

        await newMessage.save();

        // Trigger notification for user
        await createNotification({
            userId,
            title: 'New Support Message',
            message: 'An administrator has replied to your support request.',
            type: 'system'
        });

        res.status(201).json(newMessage);
    } catch (error) {
        console.error('Admin support reply error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Admin: Search users (to start a new conversation)
router.get('/admin/search-users', authMiddleware, async (req, res) => {
    try {
        const adminUser = await User.findById(req.userId);
        if (adminUser?.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }
        const { q } = req.query;
        if (!q || q.trim().length < 2) {
            return res.status(400).json({ message: 'Query must be at least 2 characters' });
        }
        const regex = new RegExp(q.trim(), 'i');
        const users = await User.find({
            $or: [
                { fullName: regex },
                { phone: regex },
                { email: regex }
            ]
        }, '_id fullName phone email profileImage').limit(10);
        res.json(users);
    } catch (error) {
        console.error('Search users error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Admin: Start a new conversation with any user (initiate from admin side)
router.post('/admin/start-conversation', authMiddleware, async (req, res) => {
    try {
        const adminUser = await User.findById(req.userId);
        if (adminUser?.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }
        const { userId, message } = req.body;
        if (!userId || !message) {
            return res.status(400).json({ message: 'User ID and message are required' });
        }
        const targetUser = await User.findById(userId);
        if (!targetUser) {
            return res.status(404).json({ message: 'User not found' });
        }
        const newMessage = new SupportMessage({
            userId,
            senderId: req.userId,
            message,
            isAdmin: true
        });
        await newMessage.save();
        // Notify the user
        await createNotification({
            userId,
            title: '📩 New Message from Admin',
            message: message.length > 80 ? message.substring(0, 80) + '...' : message,
            type: 'system'
        });
        res.status(201).json({ success: true, newMessage });
    } catch (error) {
        console.error('Start conversation error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;

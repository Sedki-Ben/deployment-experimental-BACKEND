const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');

// GET /api/users/profile - Get current user's profile
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/users/:id - Get user by ID (public profile)
router.get('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password -email');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/users/preferences - Update user preferences
router.put('/preferences', authenticateToken, async (req, res) => {
    try {
        const { notifications, newsletter } = req.body;
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { 
                'preferences.notifications': notifications,
                'preferences.newsletter': newsletter
            },
            { new: true }
        ).select('-password');
        res.json(user);
    } catch (error) {
        console.error('Update preferences error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/users/writers - Get all writers
router.get('/writers/list', async (req, res) => {
    try {
        const writers = await User.find({ role: 'writer' })
            .select('name profileImage bio')
            .sort({ name: 1 });
        res.json(writers);
    } catch (error) {
        console.error('Get writers error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router; 
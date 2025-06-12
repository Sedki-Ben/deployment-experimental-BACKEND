const crypto = require('crypto');
const { Newsletter, Subscription } = require('../models/Newsletter');
const EmailService = require('../utils/emailService');
const { validationResult } = require('express-validator');

// Subscribe to newsletter
exports.subscribe = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, preferences } = req.body;

        // Check if already subscribed
        let subscription = await Subscription.findOne({ email });
        if (subscription) {
            return res.status(400).json({ message: 'Email already subscribed' });
        }

        // Generate tokens
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const unsubscribeToken = crypto.randomBytes(32).toString('hex');

        // Create subscription
        subscription = new Subscription({
            email,
            preferences: preferences || undefined,
            verificationToken,
            verificationExpires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
            unsubscribeToken
        });

        await subscription.save();

        // Send verification email
        await EmailService.sendVerificationEmail(subscription, verificationToken);

        res.status(201).json({ message: 'Please check your email to verify your subscription' });
    } catch (error) {
        console.error('Newsletter subscription error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Verify subscription
exports.verifySubscription = async (req, res) => {
    try {
        const { token } = req.params;

        const subscription = await Subscription.findOne({
            verificationToken: token,
            verificationExpires: { $gt: Date.now() }
        });

        if (!subscription) {
            return res.status(400).json({ message: 'Invalid or expired verification token' });
        }

        subscription.isVerified = true;
        subscription.verificationToken = undefined;
        subscription.verificationExpires = undefined;
        await subscription.save();

        res.json({ message: 'Subscription verified successfully' });
    } catch (error) {
        console.error('Verify subscription error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Unsubscribe from newsletter
exports.unsubscribe = async (req, res) => {
    try {
        const { token } = req.params;

        const subscription = await Subscription.findOne({ unsubscribeToken: token });
        if (!subscription) {
            return res.status(400).json({ message: 'Invalid unsubscribe token' });
        }

        await subscription.remove();
        res.json({ message: 'Successfully unsubscribed' });
    } catch (error) {
        console.error('Unsubscribe error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Update subscription preferences
exports.updatePreferences = async (req, res) => {
    try {
        const { token } = req.params;
        const { preferences } = req.body;

        const subscription = await Subscription.findOne({ unsubscribeToken: token });
        if (!subscription) {
            return res.status(400).json({ message: 'Invalid token' });
        }

        subscription.preferences = {
            ...subscription.preferences,
            ...preferences
        };

        await subscription.save();
        res.json(subscription);
    } catch (error) {
        console.error('Update preferences error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Create newsletter (admin only)
exports.createNewsletter = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const newsletter = new Newsletter(req.body);
        await newsletter.save();

        res.status(201).json(newsletter);
    } catch (error) {
        console.error('Create newsletter error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get all subscribers (admin only)
exports.getSubscribers = (req, res) => {
    res.json({ subscribers: [] });
};

// Send newsletter (admin only)
exports.sendNewsletter = (req, res) => {
    res.json({ message: 'Newsletter sent (stub)' });
};

// Get newsletter stats (admin only)
exports.getNewsletterStats = (req, res) => {
    res.json({ stats: {} });
};

// Delete subscriber (admin only)
exports.deleteSubscriber = (req, res) => {
    res.json({ message: 'Subscriber deleted (stub)' });
}; 
 
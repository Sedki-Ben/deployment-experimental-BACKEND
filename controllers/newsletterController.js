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
            if (subscription.isVerified) {
                return res.status(400).json({ message: 'Email already subscribed and verified' });
            } else {
                // Resend verification email for unverified subscription
                await EmailService.sendVerificationEmail(subscription, subscription.verificationToken);
                return res.status(200).json({ message: 'Verification email resent. Please check your email.' });
            }
        }

        // Generate tokens
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const unsubscribeToken = crypto.randomBytes(32).toString('hex');

        // Create subscription with enhanced preferences
        const subscriptionPreferences = {
            weeklyDigest: preferences?.weeklyDigest !== false, // Default true
            breakingNews: preferences?.breakingNews !== false, // Default true
            featureArticles: preferences?.featureArticles !== false, // Default true
            // Category-specific preferences
            etoileDuSahel: preferences?.categories?.includes('etoile-du-sahel') || preferences?.type === 'etoile-du-sahel' || true,
            theBeautifulGame: preferences?.categories?.includes('the-beautiful-game') || preferences?.type === 'the-beautiful-game' || true,
            allSportsHub: preferences?.categories?.includes('all-sports-hub') || preferences?.type === 'all-sports-hub' || true
        };

        subscription = new Subscription({
            email,
            preferences: subscriptionPreferences,
            verificationToken,
            verificationExpires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
            unsubscribeToken
        });

        await subscription.save();

        // Send verification email with beautiful template
        await EmailService.sendVerificationEmail(subscription, verificationToken);

        console.log('New newsletter subscription created:', { email, preferences: subscriptionPreferences });

        res.status(201).json({ 
            message: 'Please check your email to verify your subscription',
            preferences: subscriptionPreferences
        });
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

        // Mark as verified
        subscription.isVerified = true;
        subscription.verificationToken = undefined;
        subscription.verificationExpires = undefined;
        await subscription.save();

        // Add to Brevo contact lists based on preferences
        try {
            await EmailService.addToContactList(subscription.email, null, subscription.preferences);
        } catch (brevoError) {
            console.error('Error adding to Brevo contact list:', brevoError);
            // Don't fail the verification if Brevo fails
        }

        // Send welcome email
        await EmailService.sendWelcomeEmail({ 
            email: subscription.email, 
            name: subscription.email.split('@')[0] // Use email prefix as name fallback
        });

        console.log('Newsletter subscription verified:', subscription.email);

        // Redirect to a success page or return JSON
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            res.json({ message: 'Subscription verified successfully!' });
        } else {
            // Redirect to frontend success page
            res.redirect(`${process.env.FRONTEND_URL}/?verified=true`);
        }
    } catch (error) {
        console.error('Verify subscription error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Unsubscribe from newsletter
exports.unsubscribe = async (req, res) => {
    try {
        const { email, token } = req.body;
        let subscription;

        if (token) {
            // Unsubscribe via token (from email link)
            subscription = await Subscription.findOne({ unsubscribeToken: token });
        } else if (email) {
            // Unsubscribe via email
            subscription = await Subscription.findOne({ email });
        }

        if (!subscription) {
            return res.status(400).json({ message: 'Subscription not found' });
        }

        // Remove from Brevo contact lists
        try {
            await EmailService.removeFromContactList(subscription.email);
        } catch (brevoError) {
            console.error('Error removing from Brevo contact list:', brevoError);
            // Continue with local unsubscribe even if Brevo fails
        }

        // Remove subscription
        await Subscription.deleteOne({ _id: subscription._id });

        console.log('Newsletter unsubscription processed:', subscription.email);

        res.json({ message: 'Successfully unsubscribed from newsletter' });
    } catch (error) {
        console.error('Unsubscribe error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Update subscription preferences
exports.updatePreferences = async (req, res) => {
    try {
        const { email, preferences } = req.body;

        const subscription = await Subscription.findOne({ email, isVerified: true });
        if (!subscription) {
            return res.status(400).json({ message: 'Verified subscription not found' });
        }

        // Update preferences
        subscription.preferences = {
            ...subscription.preferences,
            ...preferences
        };

        await subscription.save();

        // Update Brevo contact lists
        try {
            await EmailService.addToContactList(subscription.email, null, subscription.preferences);
        } catch (brevoError) {
            console.error('Error updating Brevo contact preferences:', brevoError);
        }

        console.log('Newsletter preferences updated:', { email, preferences });

        res.json({ 
            message: 'Preferences updated successfully',
            preferences: subscription.preferences
        });
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
exports.getSubscribers = async (req, res) => {
    try {
        const { page = 1, limit = 50, verified } = req.query;
        
        const query = {};
        if (verified !== undefined) {
            query.isVerified = verified === 'true';
        }

        const subscribers = await Subscription.find(query)
            .select('email isVerified preferences createdAt')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Subscription.countDocuments(query);
        const verifiedCount = await Subscription.countDocuments({ isVerified: true });
        const unverifiedCount = await Subscription.countDocuments({ isVerified: false });

        res.json({ 
            subscribers,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                total,
                limit: parseInt(limit)
            },
            stats: {
                total,
                verified: verifiedCount,
                unverified: unverifiedCount
            }
        });
    } catch (error) {
        console.error('Get subscribers error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Send newsletter (admin only)
exports.sendNewsletter = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { subject, content, recipients } = req.body;

        // Get subscribers based on recipients filter
        let query = { isVerified: true };
        if (recipients && recipients.length > 0) {
            query.email = { $in: recipients };
        }

        const subscribers = await Subscription.find(query);

        if (subscribers.length === 0) {
            return res.status(400).json({ message: 'No verified subscribers found' });
        }

        // Create newsletter record
        const newsletter = new Newsletter({
            subject,
            content,
            recipientCount: subscribers.length,
            status: 'sent',
            category: 'manual' // Manual newsletter
        });

        // Send newsletter via Brevo
        await EmailService.sendNewsletterEmail(subscribers, { subject, content });
        
        // Save newsletter record
        await newsletter.save();

        console.log(`Newsletter sent to ${subscribers.length} subscribers:`, subject);

        res.json({ 
            message: `Newsletter sent successfully to ${subscribers.length} subscribers`,
            newsletter: {
                id: newsletter._id,
                subject,
                recipientCount: subscribers.length,
                sentAt: newsletter.sentAt
            }
        });
    } catch (error) {
        console.error('Send newsletter error:', error);
        res.status(500).json({ message: 'Failed to send newsletter' });
    }
};

// Get newsletter stats (admin only)
exports.getNewsletterStats = async (req, res) => {
    try {
        const totalSubscribers = await Subscription.countDocuments();
        const verifiedSubscribers = await Subscription.countDocuments({ isVerified: true });
        const unverifiedSubscribers = await Subscription.countDocuments({ isVerified: false });
        
        const totalNewsletters = await Newsletter.countDocuments();
        const sentNewsletters = await Newsletter.countDocuments({ status: 'sent' });
        
        // Get recent subscriptions (last 30 days)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const recentSubscriptions = await Subscription.countDocuments({
            createdAt: { $gte: thirtyDaysAgo }
        });

        // Get preference statistics
        const preferenceStats = await Subscription.aggregate([
            { $match: { isVerified: true } },
            {
                $group: {
                    _id: null,
                    weeklyDigest: { $sum: { $cond: ['$preferences.weeklyDigest', 1, 0] } },
                    breakingNews: { $sum: { $cond: ['$preferences.breakingNews', 1, 0] } },
                    featureArticles: { $sum: { $cond: ['$preferences.featureArticles', 1, 0] } },
                    etoileDuSahel: { $sum: { $cond: ['$preferences.etoileDuSahel', 1, 0] } },
                    theBeautifulGame: { $sum: { $cond: ['$preferences.theBeautifulGame', 1, 0] } },
                    allSportsHub: { $sum: { $cond: ['$preferences.allSportsHub', 1, 0] } }
                }
            }
        ]);

        res.json({ 
            subscribers: {
                total: totalSubscribers,
                verified: verifiedSubscribers,
                unverified: unverifiedSubscribers,
                recentSubscriptions
            },
            newsletters: {
                total: totalNewsletters,
                sent: sentNewsletters
            },
            preferences: preferenceStats[0] || {}
        });
    } catch (error) {
        console.error('Get newsletter stats error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Delete subscriber (admin only)
exports.deleteSubscriber = async (req, res) => {
    try {
        const { email } = req.params;

        const subscription = await Subscription.findOne({ email });
        if (!subscription) {
            return res.status(404).json({ message: 'Subscriber not found' });
        }

        // Remove from Brevo
        try {
            await EmailService.removeFromContactList(email);
        } catch (brevoError) {
            console.error('Error removing from Brevo:', brevoError);
        }

        // Remove from database
        await Subscription.deleteOne({ email });

        console.log('Subscriber deleted:', email);

        res.json({ message: 'Subscriber deleted successfully' });
    } catch (error) {
        console.error('Delete subscriber error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}; 
 
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
            return res.status(400).json({ message: req.t('newsletter.alreadySubscribed') });
        }

        // Generate tokens
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const unsubscribeToken = crypto.randomBytes(32).toString('hex');

        // Map frontend preferences to database schema
        let mappedPreferences = {
            weeklyDigest: true,
            breakingNews: true,
            featureArticles: true
        };

        if (preferences && preferences.type) {
            switch (preferences.type) {
                case 'etoile-du-sahel':
                case 'the-beautiful-game':
                case 'all-sports-hub':
                    mappedPreferences = {
                        weeklyDigest: true,
                        breakingNews: true,
                        featureArticles: true
                    };
                    break;
                case 'archive':
                    mappedPreferences = {
                        weeklyDigest: false,
                        breakingNews: false,
                        featureArticles: true
                    };
                    break;
                default:
                    // Keep default values
                    break;
            }
        }

        // Create subscription
        subscription = new Subscription({
            email,
            preferences: mappedPreferences,
            verificationToken,
            verificationExpires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
            unsubscribeToken
        });

        await subscription.save();

        // Send verification email (don't fail if email service is down)
        try {
            await EmailService.sendVerificationEmail(subscription, verificationToken);
            res.status(201).json({ message: req.t('newsletter.subscribeSuccessWithEmail') });
        } catch (emailError) {
            console.error('Failed to send verification email:', emailError);
            // Still return success but with different message
            res.status(201).json({ 
                message: req.t('newsletter.subscribeSuccessNoEmail'),
                warning: req.t('newsletter.subscribeWarning')
            });
        }
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
            return res.status(400).json({ message: req.t('newsletter.invalidToken') });
        }

        subscription.isVerified = true;
        subscription.verificationToken = undefined;
        subscription.verificationExpires = undefined;
        await subscription.save();

        res.json({ message: req.t('newsletter.verificationSuccess') });
    } catch (error) {
        console.error('Verify subscription error:', error);
        res.status(500).json({ message: req.t('errors.general') });
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

        res.json({
            subscribers,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit),
                limit: parseInt(limit)
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

        const { subject, content, category, recipients } = req.body;

        // Get subscribers
        let subscribers;
        if (recipients && recipients.length > 0) {
            // Send to specific recipients
            subscribers = await Subscription.find({
                email: { $in: recipients },
                isVerified: true
            });
        } else {
            // Send to all verified subscribers
            subscribers = await Subscription.find({ isVerified: true });
        }

        if (subscribers.length === 0) {
            return res.status(400).json({ message: 'No verified subscribers found' });
        }

        // Create newsletter record
        const newsletter = new Newsletter({
            subject,
            content,
            category: category || 'weekly-digest',
            recipientCount: subscribers.length,
            status: 'sent'
        });

        // Send newsletter
        const result = await EmailService.sendNewsletterEmail(subscribers, newsletter);
        
        // Update newsletter record with results
        newsletter.recipientCount = result.sent || subscribers.length;
        if (result.failed > 0) {
            newsletter.status = 'failed';
        }
        
        await newsletter.save();

        console.log(`Newsletter sent to ${result.sent} subscribers`);

        res.json({
            message: 'Newsletter sent successfully',
            newsletter,
            stats: {
                sent: result.sent,
                failed: result.failed || 0,
                total: subscribers.length
            }
        });
    } catch (error) {
        console.error('Send newsletter error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get newsletter stats (admin only)
exports.getNewsletterStats = async (req, res) => {
    try {
        const totalSubscribers = await Subscription.countDocuments();
        const verifiedSubscribers = await Subscription.countDocuments({ isVerified: true });
        const unverifiedSubscribers = totalSubscribers - verifiedSubscribers;
        
        const totalNewsletters = await Newsletter.countDocuments();
        const sentNewsletters = await Newsletter.countDocuments({ status: 'sent' });
        const failedNewsletters = await Newsletter.countDocuments({ status: 'failed' });
        
        // Get recent subscription growth (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const recentSubscriptions = await Subscription.countDocuments({
            createdAt: { $gte: thirtyDaysAgo }
        });
        
        // Get newsletter performance
        const newsletterStats = await Newsletter.aggregate([
            {
                $group: {
                    _id: null,
                    totalRecipients: { $sum: '$recipientCount' },
                    avgRecipients: { $avg: '$recipientCount' }
                }
            }
        ]);

        res.json({
            subscribers: {
                total: totalSubscribers,
                verified: verifiedSubscribers,
                unverified: unverifiedSubscribers,
                recentGrowth: recentSubscriptions
            },
            newsletters: {
                total: totalNewsletters,
                sent: sentNewsletters,
                failed: failedNewsletters,
                totalRecipients: newsletterStats[0]?.totalRecipients || 0,
                avgRecipients: Math.round(newsletterStats[0]?.avgRecipients || 0)
            }
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
        
        const subscription = await Subscription.findOneAndDelete({ email });
        
        if (!subscription) {
            return res.status(404).json({ message: 'Subscriber not found' });
        }
        
        res.json({ 
            message: 'Subscriber deleted successfully',
            email: subscription.email
        });
    } catch (error) {
        console.error('Delete subscriber error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Test email service (admin only) - for debugging
exports.testEmailService = async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ message: 'Email is required for testing' });
        }

        console.log('🧪 Testing email service...');
        console.log('Environment check:');
        console.log('- BREVO_API_KEY:', process.env.BREVO_API_KEY ? '✅ Set' : '❌ Not set');
        console.log('- EMAIL_FROM:', process.env.EMAIL_FROM ? '✅ Set' : '❌ Not set');
        console.log('- FRONTEND_URL:', process.env.FRONTEND_URL ? '✅ Set' : '❌ Not set');

        // Check Brevo service configuration
        const brevoService = require('../utils/brevoService');
        if (!brevoService.isConfigured) {
            return res.status(500).json({
                message: 'Brevo service is not properly configured',
                error: brevoService.configError,
                environment: {
                    brevoApiKey: process.env.BREVO_API_KEY ? 'Set' : 'Not set',
                    emailFrom: process.env.EMAIL_FROM || 'Not set',
                    frontendUrl: process.env.FRONTEND_URL || 'Not set'
                },
                troubleshooting: [
                    'Check if BREVO_API_KEY is set in Render environment variables',
                    'Verify EMAIL_FROM is set to a verified sender email in Brevo',
                    'Ensure FRONTEND_URL is set for email links'
                ]
            });
        }

        // Test verification email
        const testSubscription = {
            email: email,
            verificationToken: 'test-token-123'
        };

        await EmailService.sendVerificationEmail(testSubscription, 'test-token-123');
        
        console.log('✅ Test email sent successfully');
        res.json({ 
            message: 'Test email sent successfully',
            recipient: email,
            environment: {
                brevoApiKey: process.env.BREVO_API_KEY ? 'Set' : 'Not set',
                emailFrom: process.env.EMAIL_FROM || 'Not set',
                frontendUrl: process.env.FRONTEND_URL || 'Not set'
            }
        });
    } catch (error) {
        console.error('❌ Test email failed:', error);
        res.status(500).json({ 
            message: 'Test email failed',
            error: error.message,
            environment: {
                brevoApiKey: process.env.BREVO_API_KEY ? 'Set' : 'Not set',
                emailFrom: process.env.EMAIL_FROM || 'Not set',
                frontendUrl: process.env.FRONTEND_URL || 'Not set'
            },
            troubleshooting: [
                'Check if BREVO_API_KEY is set in Render environment variables',
                'Verify EMAIL_FROM is set to a verified sender email in Brevo',
                'Ensure your Brevo account has sufficient credits',
                'Check if the sender email is verified in your Brevo account'
            ]
        });
    }
}; 
 
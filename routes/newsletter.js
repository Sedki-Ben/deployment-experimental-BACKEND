const express = require('express');
const { check } = require('express-validator');
const newsletterController = require('../controllers/newsletterController');
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');

const router = express.Router();

// @route   POST /api/newsletter/subscribe
// @desc    Subscribe to newsletter
// @access  Public
router.post('/subscribe', [
    check('email', 'Please include a valid email').isEmail(),
    check('preferences').optional().isObject()
], newsletterController.subscribe);

// @route   POST /api/newsletter/unsubscribe
// @desc    Unsubscribe from newsletter
// @access  Public
router.post('/unsubscribe', [
    check('email', 'Please include a valid email').isEmail()
], newsletterController.unsubscribe);

// @route   PUT /api/newsletter/preferences
// @desc    Update subscription preferences
// @access  Public
router.put('/preferences', [
    check('email', 'Please include a valid email').isEmail(),
    check('preferences', 'Preferences are required').isObject()
], newsletterController.updatePreferences);

// @route   GET /api/newsletter/verify/:token
// @desc    Verify subscription
// @access  Public
router.get('/verify/:token', newsletterController.verifySubscription);

// @route   POST /api/newsletter/test-subscription
// @desc    Test subscription email in a specified language
// @access  Public
router.post('/test-subscription', newsletterController.testSubscriptionEmail);

// Admin Routes

// @route   GET /api/newsletter/subscribers
// @desc    Get all subscribers (admin only)
// @access  Private/Admin
router.get('/subscribers', [auth, isAdmin], newsletterController.getSubscribers);

// @route   POST /api/newsletter/send
// @desc    Send newsletter (admin only)
// @access  Private/Admin
router.post('/send', [
    auth,
    isAdmin,
    check('subject', 'Subject is required').not().isEmpty(),
    check('content', 'Content is required').not().isEmpty(),
    check('recipients').optional().isArray()
], newsletterController.sendNewsletter);

// @route   GET /api/newsletter/stats
// @desc    Get newsletter stats (admin only)
// @access  Private/Admin
router.get('/stats', [auth, isAdmin], newsletterController.getNewsletterStats);

// @route   DELETE /api/newsletter/subscribers/:email
// @desc    Delete subscriber (admin only)
// @access  Private/Admin
router.delete('/subscribers/:email', [auth, isAdmin], newsletterController.deleteSubscriber);

// @route   POST /api/newsletter/test-email
// @desc    Test email service (admin only)
// @access  Private/Admin
router.post('/test-email', [
    auth,
    isAdmin,
    check('email', 'Please include a valid email').isEmail()
], newsletterController.testEmailService);

module.exports = router; 
 
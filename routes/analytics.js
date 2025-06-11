const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const auth = require('../middleware/auth');
const isWriter = require('../middleware/isWriter');

// Track article view
router.post('/views/:articleId', analyticsController.trackView);

// Track engagement time
router.post('/engagement/:articleId', auth, analyticsController.trackEngagement);

// Track interaction (like, share, comment)
router.post('/interaction/:articleId', auth, analyticsController.trackInteraction);

// Get article analytics (writer only)
router.get('/article/:articleId', [auth, isWriter], analyticsController.getArticleAnalytics);

// Get writer's dashboard analytics
router.get('/writer/dashboard', [auth, isWriter], analyticsController.getWriterAnalytics);

module.exports = router; 
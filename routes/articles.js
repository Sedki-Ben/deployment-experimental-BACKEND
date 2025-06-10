const express = require('express');
const { check } = require('express-validator');
const articlesController = require('../controllers/articleController');
const auth = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');
const isWriter = require('../middleware/isWriter');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Configure multer for memory storage (Render-compatible)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 10 // Maximum 10 files per request
    }
});

// Create uploads directory if it doesn't exist (only for local development)
const uploadDir = path.join(__dirname, '..', 'uploads');
if (process.env.NODE_ENV !== 'production') {
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
}

// @route   GET /api/articles
// @desc    Get all articles with filters
// @access  Public
router.get('/', articlesController.getArticles);

// @route   GET /api/articles/:type
// @desc    Get articles by type (etoile-du-sahel, the-beautiful-game, all-sports-hub)
// @access  Public
router.get('/type/:type', [
    check('type').isIn(['etoile-du-sahel', 'the-beautiful-game', 'all-sports-hub'])
], articlesController.getArticlesByType);

// @route   GET /api/articles/slug/:slug
// @desc    Get article by slug
// @access  Public (with optional auth)
router.get('/slug/:slug', optionalAuth, articlesController.getArticleBySlug);

// @route   GET /api/articles/:id
// @desc    Get article by ID
// @access  Public (with optional auth)
router.get('/:id', optionalAuth, articlesController.getArticle);

// @route   POST /api/articles
// @desc    Create new article
// @access  Private/Writer
router.post('/',
    auth,
    isWriter,
    upload.fields([
        { name: 'image', maxCount: 1 }, // Main article image
        { name: 'contentImages', maxCount: 10 } // Images for content blocks
    ]),
    [
        check('translations')
            .custom((value, { req }) => {
                try {
                    const translations = JSON.parse(value);
                    if (!translations.en || !translations.en.title || !translations.en.content) {
                        throw new Error('English title and content are required');
                    }
                    return true;
                } catch (error) {
                    throw new Error('Invalid translations format');
                }
            }),
        check('category').isIn(['etoile-du-sahel', 'the-beautiful-game', 'all-sports-hub']),
        check('tags').optional().isString(),
        check('status').optional().isIn(['draft', 'published', 'archived'])
    ],
    articlesController.createArticle
);

// @route   PUT /api/articles/:id
// @desc    Update article
// @access  Private/Writer
router.put('/:id',
    auth,
    isWriter,
    upload.fields([
        { name: 'image', maxCount: 1 }, // Main article image
        { name: 'contentImages', maxCount: 10 } // Images for content blocks
    ]),
    [
        check('translations')
            .optional()
            .custom((value, { req }) => {
                if (value) {
                    try {
                        const translations = typeof value === 'string' ? JSON.parse(value) : value;
                        // Allow partial updates - don't require all languages
                        return true;
                    } catch (error) {
                        throw new Error('Invalid translations format');
                    }
                }
                return true;
            }),
        check('category').optional().isIn(['etoile-du-sahel', 'the-beautiful-game', 'all-sports-hub']),
        check('tags').optional().isString(),
        check('status').optional().isIn(['draft', 'published', 'archived'])
    ],
    articlesController.updateArticle
);

// @route   DELETE /api/articles/:id
// @desc    Delete article
// @access  Private/Writer
router.delete('/:id', [auth, isWriter], articlesController.deleteArticle);

// Interaction Routes

// @route   POST /api/articles/:id/like
// @desc    Toggle like on article
// @access  Private
router.post('/:id/like', auth, articlesController.toggleLike);

// @route   POST /api/articles/:id/share
// @desc    Record article share
// @access  Public
router.post('/:id/share', [
    check('platform').isIn(['twitter', 'facebook', 'linkedin'])
], articlesController.recordShare);

// @route   GET /api/articles/:id/likes
// @desc    Get users who liked the article
// @access  Public
router.get('/:id/likes', articlesController.getArticleLikes);

// Writer/Admin Routes

// @route   GET /api/articles/stats/me
// @desc    Get stats for writer's articles
// @access  Private/Writer
router.get('/stats/me', [auth, isWriter], articlesController.getWriterStats);

// @route   GET /api/articles/drafts/me
// @desc    Get writer's draft articles
// @access  Private/Writer
router.get('/drafts/me', [auth, isWriter], articlesController.getWriterDrafts);

// @route   POST /api/articles/:id/publish
// @desc    Publish a draft article
// @access  Private/Writer
router.post('/:id/publish', [auth, isWriter], articlesController.publishArticle);

// @route   POST /api/articles/:id/archive
// @desc    Archive an article
// @access  Private/Writer
router.post('/:id/archive', [auth, isWriter], articlesController.archiveArticle);

// @route   POST /api/articles/:id/unpublish
// @desc    Unpublish an article (change from published to draft)
// @access  Private/Admin
router.post('/:id/unpublish', auth, articlesController.unpublishArticle);

module.exports = router; 
 
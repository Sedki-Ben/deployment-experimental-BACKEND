const express = require('express');
const { check } = require('express-validator');
const articlesController = require('../controllers/articleController');
const auth = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');
const isWriter = require('../middleware/isWriter');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Article = require('../models/Article');

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

// @route   GET /api/articles/search
// @desc    Search articles
// @access  Public
router.get('/search', [
    check('q').notEmpty().withMessage('Search query is required').trim().isLength({ min: 1, max: 100 })
], articlesController.searchArticles);

// Test search functionality (temporary debug route) - must come before parameterized routes
router.get('/debug-search', async (req, res) => {
    try {
        const { q } = req.query;
        
        // Get a sample of articles to see their structure
        const sampleArticles = await Article.find({ status: 'published' })
            .limit(3)
            .lean()
            .exec();
            
        // Test search if query provided
        let searchResults = null;
        if (q) {
            const searchRegex = new RegExp(q, 'i');
            searchResults = await Article.find({
                status: 'published',
                $or: [
                    { 'translations.en.title': searchRegex },
                    { 'translations.fr.title': searchRegex },
                    { 'translations.ar.title': searchRegex }
                ]
            }).limit(5).lean().exec();
        }
        
        res.json({
            message: 'Debug search results',
            sampleStructure: sampleArticles.map(article => ({
                id: article._id,
                title: article.translations?.en?.title || 'No title',
                contentStructure: {
                    en: {
                        hasContent: !!article.translations?.en?.content,
                        contentLength: Array.isArray(article.translations?.en?.content) ? 
                            article.translations.en.content.length : 0,
                        contentTypes: Array.isArray(article.translations?.en?.content) ? 
                            article.translations.en.content.map(block => block.type) : []
                    },
                    fr: {
                        hasContent: !!article.translations?.fr?.content,
                        contentLength: Array.isArray(article.translations?.fr?.content) ? 
                            article.translations.fr.content.length : 0
                    },
                    ar: {
                        hasContent: !!article.translations?.ar?.content,
                        contentLength: Array.isArray(article.translations?.ar?.content) ? 
                            article.translations.ar.content.length : 0
                    }
                },
                tags: article.tags || []
            })),
            searchResults: searchResults ? {
                count: searchResults.length,
                results: searchResults.map(article => ({
                    id: article._id,
                    title: article.translations?.en?.title,
                    excerpt: article.translations?.en?.excerpt
                }))
            } : null,
            query: q || 'No query provided'
        });
    } catch (error) {
        console.error('Debug search error:', error);
        res.status(500).json({ error: error.message });
    }
});

// @route   GET /api/articles/type/:type
// @desc    Get articles by type (etoile-du-sahel, the-beautiful-game, all-sports-hub)
// @access  Public
router.get('/type/:type', [
    check('type').isIn(['etoile-du-sahel', 'the-beautiful-game', 'all-sports-hub'])
], articlesController.getArticlesByType);

// @route   GET /api/articles/slug/:slug
// @desc    Get article by slug
// @access  Public (with optional auth)
router.get('/slug/:slug', optionalAuth, articlesController.getArticleBySlug);

// @route   GET /api/articles/stats/me
// @desc    Get stats for writer's articles
// @access  Private/Writer
router.get('/stats/me', [auth, isWriter], articlesController.getWriterStats);

// @route   GET /api/articles/drafts/me
// @desc    Get writer's draft articles
// @access  Private/Writer
router.get('/drafts/me', [auth, isWriter], articlesController.getWriterDrafts);

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
 
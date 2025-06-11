const Article = require('../models/Article');
const { validationResult } = require('express-validator');
const { Subscription } = require('../models/Newsletter');
const EmailService = require('../utils/emailService');
const User = require('../models/User');
const mongoose = require('mongoose');

// Create article
exports.createArticle = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('Validation errors:', errors.array());
            return res.status(400).json({ errors: errors.array() });
        }

        console.log('Request body:', req.body);
        console.log('User:', req.user);
        console.log('Files:', req.files);

        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'User ID not found in request' });
        }

        // Parse the JSON strings from form data
        let translations = JSON.parse(req.body.translations);
        const tags = req.body.tags ? JSON.parse(req.body.tags) : [];

        // Get user information for author fields
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Default status to published instead of draft
        const status = req.body.status || 'published';

        // Process uploaded images
        const mainImage = req.files?.image?.[0];
        const contentImages = req.files?.contentImages || [];

        // Validate required fields
        if (!mainImage) {
            return res.status(400).json({ 
                message: 'Main article image is required',
                field: 'image'
            });
        }

        // Create a mapping of temporary blob URLs to actual uploaded files
        const imageMapping = {};
        contentImages.forEach((file, index) => {
            // We'll map based on the order they were uploaded
            imageMapping[`contentImage_${index}`] = `/uploads/${file.filename}`;
        });

        // Process content blocks to replace blob URLs with server URLs for ALL languages
        let globalImageIndex = 0;
        const languages = ['en', 'fr', 'ar'];
        
        languages.forEach(lang => {
            if (translations[lang] && translations[lang].content) {
                translations[lang].content = translations[lang].content.map(block => {
                    if (block.type === 'image-group' && block.metadata?.images) {
                        block.metadata.images = block.metadata.images.map(img => {
                            // Replace blob URL with server URL
                            if (img.url && img.url.startsWith('blob:') && globalImageIndex < contentImages.length) {
                                return {
                                    ...img,
                                    url: `/uploads/${contentImages[globalImageIndex++].filename}`
                                };
                            }
                            return img;
                        });
                    }
                    return block;
                });
            }
        });

        // Create article data
        const articleData = {
            translations,
            category: req.body.category,
            status,
            tags,
            author: req.user.id,
            // Use user's profile image if available, otherwise use default
            authorImage: user.profileImage || '/uploads/profile/bild3.jpg',
            image: `/uploads/${mainImage.filename}`,
            // Initialize counters to 0 for dynamic functionality
            likes: { count: 0, users: [] },
            views: 0,
            commentCount: 0,
            shares: { count: 0, platforms: { twitter: 0, facebook: 0, linkedin: 0 } }
        };

        // Set publishedAt if status is published
        if (status === 'published') {
            articleData.publishedAt = new Date();
        }

        console.log('Article data before save:', articleData);

        const article = new Article(articleData);
        
        try {
            await article.save();
        } catch (saveError) {
            // Check if it's a duplicate title error
            if (saveError.message.includes('title already exists')) {
                return res.status(400).json({ 
                    message: saveError.message,
                    field: 'title'
                });
            }
            throw saveError; // Re-throw other errors
        }

        // Populate author info before sending response
        await article.populate('author', 'name email');

        // Notify newsletter subscribers if article is published
        if (article.status === 'published') {
            try {
                const subscribers = await Subscription.find({ isVerified: true });
                if (subscribers.length > 0) {
                    await EmailService.sendArticleNotification(subscribers, {
                        title: article.translations.en.title,
                        summary: article.translations.en.excerpt || '',
                        _id: article._id
                    });
                }
            } catch (notifyErr) {
                console.error('Error sending article notification:', notifyErr);
            }
        }

        res.status(201).json(article);
    } catch (error) {
        console.error('Create article error:', error);
        res.status(500).json({ message: 'Server error', details: error.message });
    }
};

// Get all articles with filters
exports.getArticles = async (req, res) => {
    try {
        const { category, language, status, page = 1, limit = 10 } = req.query;
        const query = {};

        if (category) query.category = category;
        if (status) query.status = status;

        // Only show published articles to non-authenticated users
        if (!req.user || !['admin', 'writer'].includes(req.user.role)) {
            query.status = 'published';
        }

        const articles = await Article.find(query)
            .populate('author', 'name email')
            .populate('commentCount')
            .sort({ publishedAt: -1, createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

        const count = await Article.countDocuments(query);

        res.json({
            articles,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page),
            total: count
        });
    } catch (error) {
        console.error('Get articles error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get single article
exports.getArticle = async (req, res) => {
    try {
        const article = await Article.findById(req.params.id)
            .populate('author', 'name email')
            .populate('commentCount');

        if (!article) {
            return res.status(404).json({ message: 'Article not found' });
        }

        // Check if user can view unpublished articles
        if (article.status !== 'published' && 
            (!req.user || (req.user.id !== article.author._id.toString() && !['admin'].includes(req.user.role)))) {
            return res.status(403).json({ message: 'Not authorized to view this article' });
        }

        // Increment views (async, don't wait for completion)
        article.incrementViews().catch(err => console.error('Error incrementing views:', err));

        // Add current user's like status to the response
        const articleData = article.toObject();
        if (req.user) {
            articleData.isLikedByCurrentUser = article.likes.users.some(userId => 
                userId.toString() === req.user.id.toString()
            );
        } else {
            articleData.isLikedByCurrentUser = false;
        }

        res.json(articleData);
    } catch (error) {
        console.error('Get article error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Update article
exports.updateArticle = async (req, res) => {
    try {
        const article = await Article.findById(req.params.id);

        if (!article) {
            return res.status(404).json({ message: 'Article not found' });
        }

        // Check ownership or admin role
        if (article.author.toString() !== req.user.id && !['admin'].includes(req.user.role)) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const updateData = { ...req.body };
        
        // Handle translations if provided as JSON string
        if (typeof updateData.translations === 'string') {
            updateData.translations = JSON.parse(updateData.translations);
        }

        // Handle tags if provided as JSON string
        if (typeof updateData.tags === 'string') {
            updateData.tags = JSON.parse(updateData.tags);
        }

        // Handle image upload
        if (req.file) {
            updateData.image = `/uploads/${req.file.filename}`;
        } else if (req.body.existingImage) {
            // Keep existing image if no new file uploaded
            updateData.image = req.body.existingImage;
        }

        const updatedArticle = await Article.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).populate('author', 'name email');

        res.json(updatedArticle);
    } catch (error) {
        console.error('Update article error:', error);
        if (error.message.includes('title already exists')) {
            return res.status(400).json({ 
                message: error.message,
                field: 'title'
            });
        }
        res.status(500).json({ message: 'Server error', details: error.message });
    }
};

// Delete article
exports.deleteArticle = async (req, res) => {
    try {
        const article = await Article.findById(req.params.id);

        if (!article) {
            return res.status(404).json({ message: 'Article not found' });
        }

        // Check ownership or admin role
        if (article.author.toString() !== req.user.id && !['admin'].includes(req.user.role)) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        await Article.findByIdAndDelete(req.params.id);
        res.json({ message: 'Article removed' });
    } catch (error) {
        console.error('Delete article error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Like/Unlike article
exports.toggleLike = async (req, res) => {
    try {
        const article = await Article.findById(req.params.id);

        if (!article) {
            return res.status(404).json({ message: 'Article not found' });
        }

        await article.toggleLike(req.user.id);
        
        res.json({ 
            likes: article.likes.count,
            isLiked: article.likes.users.includes(req.user.id)
        });
    } catch (error) {
        console.error('Toggle like error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Search articles
exports.searchArticles = async (req, res) => {
    try {
        const { q, page = 1, limit = 10, category } = req.query;

        if (!q || q.trim().length === 0) {
            return res.status(400).json({ message: 'Search query is required' });
        }

        const query = {
            $text: { $search: q },
            status: 'published' // Only search published articles
        };

        if (category) {
            query.category = category;
        }

        const articles = await Article.find(query, { score: { $meta: 'textScore' } })
            .sort({ score: { $meta: 'textScore' } })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .populate('author', 'name email')
            .exec();

        const count = await Article.countDocuments(query);

        res.json({
            articles,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page),
            total: count,
            query: q
        });
    } catch (error) {
        console.error('Search articles error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get article by slug
exports.getArticleBySlug = async (req, res) => {
    try {
        const article = await Article.findBySlug(req.params.slug)
            .populate('commentCount');

        if (!article) {
            return res.status(404).json({ message: 'Article not found' });
        }

        // Check if user can view unpublished articles
        if (article.status !== 'published' && 
            (!req.user || (req.user.id !== article.author._id.toString() && !['admin'].includes(req.user.role)))) {
            return res.status(403).json({ message: 'Not authorized to view this article' });
        }

        // Increment views (async, don't wait for completion)
        article.incrementViews().catch(err => console.error('Error incrementing views:', err));

        // Add current user's like status to the response
        const articleData = article.toObject();
        if (req.user) {
            articleData.isLikedByCurrentUser = article.likes.users.some(userId => 
                userId.toString() === req.user.id.toString()
            );
        } else {
            articleData.isLikedByCurrentUser = false;
        }

        res.json(articleData);
    } catch (error) {
        console.error('Get article by slug error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Record article share
exports.recordShare = async (req, res) => {
    try {
        const { platform } = req.body;
        const article = await Article.findById(req.params.id);

        if (!article) {
            return res.status(404).json({ message: 'Article not found' });
        }

        await article.incrementShare(platform);
        
        res.json({ 
            message: 'Share recorded',
            shares: article.shares
        });
    } catch (error) {
        console.error('Record share error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get users who liked the article
exports.getArticleLikes = async (req, res) => {
    try {
        const article = await Article.findById(req.params.id)
            .populate('likes.users', 'name email');

        if (!article) {
            return res.status(404).json({ message: 'Article not found' });
        }

        res.json({ 
            likes: article.likes.users,
            count: article.likes.count
        });
    } catch (error) {
        console.error('Get article likes error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get stats for writer's articles
exports.getWriterStats = async (req, res) => {
    try {
        const userId = req.user.id;

        const stats = await Article.aggregate([
            { $match: { author: new mongoose.Types.ObjectId(userId) } },
            {
                $group: {
                    _id: null,
                    totalArticles: { $sum: 1 },
                    publishedArticles: {
                        $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] }
                    },
                    draftArticles: {
                        $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] }
                    },
                    totalViews: { $sum: '$views' },
                    totalLikes: { $sum: '$likes.count' },
                    totalShares: { $sum: '$shares.count' }
                }
            }
        ]);

        res.json({ stats: stats[0] || {} });
    } catch (error) {
        console.error('Get writer stats error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get writer's draft articles
exports.getWriterDrafts = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const userId = req.user.id;

        const drafts = await Article.find({ 
            author: userId, 
            status: 'draft' 
        })
            .sort({ updatedAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .populate('author', 'name email');

        const count = await Article.countDocuments({ 
            author: userId, 
            status: 'draft' 
        });

        res.json({
            drafts,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page),
            total: count
        });
    } catch (error) {
        console.error('Get writer drafts error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Publish a draft article
exports.publishArticle = async (req, res) => {
    try {
        const article = await Article.findById(req.params.id);

        if (!article) {
            return res.status(404).json({ message: 'Article not found' });
        }

        // Check ownership or admin role
        if (article.author.toString() !== req.user.id && !['admin'].includes(req.user.role)) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        article.status = 'published';
        article.publishedAt = new Date();
        await article.save();

        // Notify newsletter subscribers
        try {
            const subscribers = await Subscription.find({ isVerified: true });
            if (subscribers.length > 0) {
                await EmailService.sendArticleNotification(subscribers, {
                    title: article.translations.en.title,
                    summary: article.translations.en.excerpt || '',
                    _id: article._id
                });
            }
        } catch (notifyErr) {
            console.error('Error sending article notification:', notifyErr);
        }

        res.json({ 
            message: 'Article published',
            article: await article.populate('author', 'name email')
        });
    } catch (error) {
        console.error('Publish article error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Archive an article
exports.archiveArticle = async (req, res) => {
    try {
        const article = await Article.findById(req.params.id);

        if (!article) {
            return res.status(404).json({ message: 'Article not found' });
        }

        // Check ownership or admin role
        if (article.author.toString() !== req.user.id && !['admin'].includes(req.user.role)) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        article.status = 'archived';
        await article.save();

        res.json({ 
            message: 'Article archived',
            article: await article.populate('author', 'name email')
        });
    } catch (error) {
        console.error('Archive article error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Unpublish an article (change from published to draft)
exports.unpublishArticle = async (req, res) => {
    try {
        const article = await Article.findById(req.params.id);

        if (!article) {
            return res.status(404).json({ message: 'Article not found' });
        }

        // Check admin role only (as requested by user)
        const User = require('../models/User');
        const user = await User.findById(req.user.id);
        const isAdmin = user && user.role === 'admin';
        
        if (!isAdmin) {
            return res.status(403).json({ message: 'Not authorized. Admin access required.' });
        }

        article.status = 'draft';
        await article.save();

        res.json({ 
            message: 'Article unpublished (moved to draft)',
            article: await article.populate('author', 'name email')
        });
    } catch (error) {
        console.error('Unpublish article error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get articles by type (analysis, story, notable)
exports.getArticlesByType = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const type = req.params.type;  // Get type from route parameter, not query
        
        // Map type to category if needed
        const categoryMap = {
            'analysis': 'etoile-du-sahel',
            'story': 'the-beautiful-game',
            'notable': 'all-sports-hub'
        };
        
        const category = categoryMap[type] || type;
        
        console.log('getArticlesByType called with type:', type, 'mapped to category:', category);
        
        const articles = await Article.find({ 
            category,
            status: 'published'
        })
            .populate('author', 'name email')
            .populate('commentCount')
            .sort({ publishedAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await Article.countDocuments({ 
            category,
            status: 'published'
        });

        console.log('Found', articles.length, 'articles for category:', category);

        res.json({
            articles,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page),
            total: count
        });
    } catch (error) {
        console.error('Get articles by type error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
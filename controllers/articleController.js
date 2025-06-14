const Article = require('../models/Article');
const { validationResult } = require('express-validator');
const { Subscription } = require('../models/Newsletter');
const EmailService = require('../utils/emailService');
const User = require('../models/User');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const { uploadToCloudinary, deleteFromCloudinary, isCloudinaryConfigured } = require('../utils/cloudinaryStorage');

// Helper function to save uploaded file
const saveUploadedFile = async (file, folder = 'articles') => {
    try {
        // Try Cloudinary first
        const cloudinaryUrl = await uploadToCloudinary(file, file.originalname, folder);
        
        if (cloudinaryUrl) {
            console.log('Successfully uploaded to Cloudinary:', cloudinaryUrl);
            return cloudinaryUrl;
        }
        
        // Fallback to local storage
        console.log('Falling back to local storage for file:', file.originalname);
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = uniqueSuffix + '-' + file.originalname;
        
        // Create uploads directory if it doesn't exist
        const uploadDir = path.join(__dirname, '..', 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        const filepath = path.join(uploadDir, filename);
        
        // Write buffer to file
        await fs.promises.writeFile(filepath, file.buffer);
        
        // Log file creation
        console.log(`File saved to: ${filepath}`);
        console.log(`File size: ${file.buffer.length} bytes`);
        
        // Immediate verification that file was saved
        if (fs.existsSync(filepath)) {
            console.log(`File verification successful: ${filename}`);
        } else {
            console.error(`File verification failed: ${filename}`);
        }
        
        return `/uploads/${filename}`;
    } catch (error) {
        console.error('Error saving file:', error);
        throw new Error('Failed to save uploaded file: ' + error.message);
    }
};

// Check if uploaded files still exist (for Render compatibility)
const checkFileExists = async (filename) => {
    try {
        const filepath = path.join(__dirname, '..', 'uploads', filename);
        const exists = fs.existsSync(filepath);
        console.log(`File existence check for ${filename}: ${exists}`);
        return exists;
    } catch (error) {
        console.error(`Error checking file existence for ${filename}:`, error);
        return false;
    }
};

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

        // Save main image
        const mainImageUrl = await saveUploadedFile(mainImage, 'articles');

        // Save content images and create mapping
        const savedContentImages = [];
        for (const file of contentImages) {
            const imageUrl = await saveUploadedFile(file, 'articles');
            savedContentImages.push({ url: imageUrl, originalname: file.originalname });
        }

        // Process content blocks to replace blob URLs with server URLs for ALL languages
        let globalImageIndex = 0;
        const languages = ['en', 'fr', 'ar'];
        
        languages.forEach(lang => {
            if (translations[lang] && translations[lang].content) {
                translations[lang].content = translations[lang].content.map(block => {
                    if (block.type === 'image-group' && block.metadata?.images) {
                        block.metadata.images = block.metadata.images.map(img => {
                            // Replace blob URL with server URL
                            if (img.url && img.url.startsWith('blob:') && globalImageIndex < savedContentImages.length) {
                                return {
                                    ...img,
                                    url: savedContentImages[globalImageIndex++].url
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
            image: mainImageUrl,
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
        await article.save();

        res.json(article);
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
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('Validation errors:', errors.array());
            return res.status(400).json({ errors: errors.array() });
        }

        const article = await Article.findById(req.params.id);

        if (!article) {
            return res.status(404).json({ message: 'Article not found' });
        }

        // Check ownership or admin role
        if (article.author.toString() !== req.user.id && !['admin'].includes(req.user.role)) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        console.log('Update request body:', req.body);
        console.log('Update request files:', req.files);

        const updateData = {};

        // Handle translations if provided
        if (req.body.translations) {
            updateData.translations = typeof req.body.translations === 'string' 
                ? JSON.parse(req.body.translations) 
                : req.body.translations;
            
            // Process content images for translations if new content images were uploaded
            const contentImages = req.files?.contentImages || [];
            if (contentImages.length > 0 && updateData.translations) {
                // Save content images
                const savedContentImages = [];
                for (const file of contentImages) {
                    const imageUrl = await saveUploadedFile(file, 'articles');
                    savedContentImages.push({ url: imageUrl, originalname: file.originalname });
                }

                let globalImageIndex = 0;
                const languages = ['en', 'fr', 'ar'];
                
                languages.forEach(lang => {
                    if (updateData.translations[lang] && updateData.translations[lang].content) {
                        updateData.translations[lang].content = updateData.translations[lang].content.map(block => {
                            if (block.type === 'image-group' && block.metadata?.images) {
                                block.metadata.images = block.metadata.images.map(img => {
                                    // Replace blob URL with server URL for new uploads
                                    if (img.url && img.url.startsWith('blob:') && globalImageIndex < savedContentImages.length) {
                                        return {
                                            ...img,
                                            url: savedContentImages[globalImageIndex++].url
                                        };
                                    }
                                    return img;
                                });
                            }
                            return block;
                        });
                    }
                });
            }
        }

        // Handle tags if provided
        if (req.body.tags) {
            updateData.tags = typeof req.body.tags === 'string' 
                ? JSON.parse(req.body.tags) 
                : req.body.tags;
        }

        // Handle category if provided
        if (req.body.category) {
            updateData.category = req.body.category;
        }

        // Handle status if provided
        if (req.body.status) {
            updateData.status = req.body.status;
            // Set publishedAt if status is being changed to published
            if (req.body.status === 'published' && article.status !== 'published') {
                updateData.publishedAt = new Date();
            }
        }

        // Handle main image upload
        const mainImage = req.files?.image?.[0];
        if (mainImage) {
            // Delete old image from Cloudinary if it exists
            if (article.image && article.image.startsWith('https://res.cloudinary.com/')) {
                await deleteFromCloudinary(article.image);
            }
            
            const mainImageUrl = await saveUploadedFile(mainImage, 'articles');
            updateData.image = mainImageUrl;
        } else if (req.body.existingImage) {
            // Keep existing image if no new file uploaded
            updateData.image = req.body.existingImage;
        }

        console.log('Update data:', updateData);

        const updatedArticle = await Article.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).populate('author', 'name email');

        if (!updatedArticle) {
            return res.status(404).json({ message: 'Article not found after update' });
        }

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

// Search articles - Reliable two-step search approach
exports.searchArticles = async (req, res) => {
    try {
        const { q, page = 1, limit = 10, category } = req.query;

        if (!q || q.trim().length === 0) {
            return res.status(400).json({ message: 'Search query is required' });
        }

        const searchTerm = q.trim();
        console.log('Search request:', { searchTerm, category, page, limit });

        // Build base query
        const baseQuery = { status: 'published' };
        if (category && category !== 'all') {
            baseQuery.category = category;
        }

        let articles = [];
        let searchMethod = '';

        // Step 1: Try MongoDB text search first (most accurate)
        try {
            const textSearchQuery = {
                ...baseQuery,
                $text: { $search: searchTerm }
            };

            articles = await Article.find(textSearchQuery, { score: { $meta: 'textScore' } })
                .populate('author', 'name email')
            .sort({ score: { $meta: 'textScore' } })
            .limit(limit * 1)
            .skip((page - 1) * limit)
                .exec();

            searchMethod = 'text_search';
            console.log(`Text search found ${articles.length} results`);
        } catch (textError) {
            console.log('Text search failed:', textError.message);
        }

        // Step 2: If no text search results, try regex search (fallback)
        if (articles.length === 0) {
            console.log('Falling back to regex search...');
            
            const searchRegex = new RegExp(searchTerm.split(' ').join('|'), 'i');
            
            const regexSearchQuery = {
                ...baseQuery,
                $or: [
                    // Titles in all languages
                    { 'translations.en.title': searchRegex },
                    { 'translations.fr.title': searchRegex },
                    { 'translations.ar.title': searchRegex },
                    
                    // Excerpts in all languages
                    { 'translations.en.excerpt': searchRegex },
                    { 'translations.fr.excerpt': searchRegex },
                    { 'translations.ar.excerpt': searchRegex },
                    
                    // Content blocks
                    { 'translations.en.content.content': searchRegex },
                    { 'translations.fr.content.content': searchRegex },
                    { 'translations.ar.content.content': searchRegex },
                    
                    // Tags
                    { 'tags': searchRegex }
                ]
            };

            articles = await Article.find(regexSearchQuery)
                .populate('author', 'name email')
                .sort({ publishedAt: -1 })
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .exec();

            searchMethod = 'regex_search';
            console.log(`Regex search found ${articles.length} results`);
        }

        // Step 3: If still no results, try flexible word-based search
        if (articles.length === 0) {
            console.log('Trying flexible word-based search...');
            
            const words = searchTerm.split(' ').filter(word => word.length > 1);
            if (words.length > 0) {
                const flexibleRegex = new RegExp(words.join('|'), 'i');
                
                const flexibleQuery = {
                    ...baseQuery,
                    $or: [
                        { 'translations.en.title': flexibleRegex },
                        { 'translations.fr.title': flexibleRegex },
                        { 'translations.ar.title': flexibleRegex },
                        { 'translations.en.excerpt': flexibleRegex },
                        { 'translations.fr.excerpt': flexibleRegex },
                        { 'translations.ar.excerpt': flexibleRegex },
                        { 'tags': flexibleRegex }
                    ]
                };
                
                articles = await Article.find(flexibleQuery)
            .populate('author', 'name email')
                    .sort({ publishedAt: -1 })
                    .limit(limit * 1)
                    .skip((page - 1) * limit)
            .exec();

                searchMethod = 'flexible_search';
                console.log(`Flexible search found ${articles.length} results`);
            }
        }

        // Get total count for pagination (use simpler query for counting)
        let count = 0;
        try {
            if (searchMethod === 'text_search') {
                count = await Article.countDocuments({
                    ...baseQuery,
                    $text: { $search: searchTerm }
                });
            } else {
                const searchRegex = new RegExp(searchTerm.split(' ').join('|'), 'i');
                count = await Article.countDocuments({
                    ...baseQuery,
                    $or: [
                        { 'translations.en.title': searchRegex },
                        { 'translations.fr.title': searchRegex },
                        { 'translations.ar.title': searchRegex }
                    ]
                });
            }
        } catch (countError) {
            console.log('Count query failed, using articles length');
            count = articles.length;
        }

        // Transform articles to match frontend expectations
        const backendUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || 
                          process.env.FRONTEND_URL?.replace('://localhost:3000', '://localhost:5000') || 
                          'https://deployment-experimental-backend.onrender.com';

        const transformedArticles = articles.map(article => {
            const articleObj = article.toObject();
            
            return {
                ...articleObj,
                image: articleObj.image ? `${backendUrl}${articleObj.image}` : null,
                date: new Date(articleObj.publishedAt || articleObj.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }),
                rawDate: articleObj.publishedAt || articleObj.createdAt,
                authorImage: articleObj.authorImage ? `${backendUrl}${articleObj.authorImage}` : null,
                likes: {
                    count: articleObj.likes?.count || 0,
                    users: articleObj.likes?.users || []
                },
                comments: articleObj.commentCount || 0,
                views: articleObj.views || 0,
                tags: articleObj.tags || []
            };
        });

        console.log(`Search completed: found ${transformedArticles.length} articles for "${searchTerm}" using ${searchMethod}`);

        res.json({
            articles: transformedArticles,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page),
            total: count,
            query: searchTerm,
            searchMethod // Debug info
        });
    } catch (error) {
        console.error('Search articles error:', error);
        res.status(500).json({ 
            message: 'Search failed',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
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
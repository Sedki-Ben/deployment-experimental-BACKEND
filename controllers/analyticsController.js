const View = require('../models/View');
const Analytics = require('../models/Analytics');
const UAParser = require('ua-parser-js');
const Article = require('../models/Article');

// Helper function to parse user agent
const parseUserAgent = (userAgent) => {
    const parser = new UAParser(userAgent);
    const result = parser.getResult();
    return {
        browser: result.browser.name,
        os: result.os.name,
        device: result.device.type || 'desktop'
    };
};

// Track page view
exports.trackView = async (req, res) => {
    try {
        const { articleId } = req.params;
        const article = await Article.findById(articleId);
        
        if (!article) {
            return res.status(404).json({ message: 'Article not found' });
        }

        // Increment view count
        await article.incrementViews();

        // Record analytics
        await Analytics.create({
            article: articleId,
            user: req.user?.id,
            type: 'view',
            timestamp: new Date()
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Track view error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Track user interaction
exports.trackEvent = async (req, res) => {
    try {
        const { type, articleId, eventData } = req.body;
        const userAgent = parseUserAgent(req.headers['user-agent']);

        const analytics = new Analytics({
            type,
            article: articleId,
            user: req.user?._id,
            metadata: {
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                referrer: req.headers.referer,
                device: userAgent.device,
                browser: userAgent.browser,
                os: userAgent.os
            },
            eventData
        });

        await analytics.save();
        res.status(201).json({ success: true });
    } catch (error) {
        console.error('Track event error:', error);
        res.status(500).json({ message: 'Error tracking event' });
    }
};

// Get analytics stats
exports.getStats = async (req, res) => {
    try {
        const { startDate, endDate, type } = req.query;
        const query = {};

        if (startDate && endDate) {
            query.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        if (type) {
            query.type = type;
        }

        const stats = await Analytics.aggregate([
            { $match: query },
            {
                $group: {
                    _id: {
                        type: '$type',
                        date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $group: {
                    _id: '$_id.type',
                    data: {
                        $push: {
                            date: '$_id.date',
                            count: '$count'
                        }
                    }
                }
            }
        ]);

        res.json(stats);
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ message: 'Error getting analytics stats' });
    }
};

// Get popular articles
exports.getPopularArticles = async (req, res) => {
    try {
        const { days = 7 } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const popularArticles = await View.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: '$article',
                    viewCount: { $sum: 1 },
                    uniqueUsers: { $addToSet: '$user' }
                }
            },
            {
                $lookup: {
                    from: 'articles',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'article'
                }
            },
            { $unwind: '$article' },
            {
                $project: {
                    title: '$article.title',
                    viewCount: 1,
                    uniqueUsers: { $size: '$uniqueUsers' }
                }
            },
            { $sort: { viewCount: -1 } },
            { $limit: 10 }
        ]);

        res.json(popularArticles);
    } catch (error) {
        console.error('Get popular articles error:', error);
        res.status(500).json({ message: 'Error getting popular articles' });
    }
};

// Track engagement time
exports.trackEngagement = async (req, res) => {
    try {
        const { articleId } = req.params;
        const { timeSpent } = req.body;

        await Analytics.create({
            article: articleId,
            user: req.user?.id,
            type: 'engagement',
            data: { timeSpent },
            timestamp: new Date()
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Track engagement error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Track interaction (like, share, comment)
exports.trackInteraction = async (req, res) => {
    try {
        const { articleId } = req.params;
        const { type } = req.body;

        await Analytics.create({
            article: articleId,
            user: req.user?.id,
            type: `interaction_${type}`,
            timestamp: new Date()
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Track interaction error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get article analytics
exports.getArticleAnalytics = async (req, res) => {
    try {
        const { articleId } = req.params;
        
        const analytics = await Analytics.aggregate([
            { $match: { article: articleId } },
            {
                $group: {
                    _id: '$type',
                    count: { $sum: 1 },
                    users: { $addToSet: '$user' }
                }
            }
        ]);

        res.json(analytics);
    } catch (error) {
        console.error('Get article analytics error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get writer's dashboard analytics
exports.getWriterAnalytics = async (req, res) => {
    try {
        const userId = req.user.id;

        // Get all articles by the writer
        const articles = await Article.find({ author: userId });
        const articleIds = articles.map(article => article._id);

        // Get analytics for all articles
        const analytics = await Analytics.aggregate([
            { $match: { article: { $in: articleIds } } },
            {
                $group: {
                    _id: {
                        article: '$article',
                        type: '$type'
                    },
                    count: { $sum: 1 },
                    uniqueUsers: { $addToSet: '$user' }
                }
            },
            {
                $group: {
                    _id: '$_id.article',
                    metrics: {
                        $push: {
                            type: '$_id.type',
                            count: '$count',
                            uniqueUsers: { $size: '$uniqueUsers' }
                        }
                    }
                }
            }
        ]);

        res.json(analytics);
    } catch (error) {
        console.error('Get writer analytics error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}; 
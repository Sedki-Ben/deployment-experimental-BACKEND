const Comment = require('../models/Comment');
const Article = require('../models/Article');
const User = require('../models/User');
const { validationResult } = require('express-validator');

// Create comment
exports.createComment = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const article = await Article.findById(req.params.articleId);
        if (!article) {
            return res.status(404).json({ message: 'Article not found' });
        }

        const comment = new Comment({
            content: req.body.content,
            author: req.user.id,
            article: req.params.articleId,
            parentComment: req.body.parentId // Fixed: Use parentComment instead of parent
        });

        await comment.save();

        const populatedComment = await Comment.findById(comment._id)
            .populate('author', 'name profileImage')
            .populate('parentComment');

        res.status(201).json(populatedComment);
    } catch (error) {
        console.error('Create comment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get comments for article
exports.getComments = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;

        // Get top-level comments first (no parent)
        const comments = await Comment.find({
            article: req.params.articleId,
            parentComment: null, // Fixed: Use parentComment instead of parent
            status: 'active'
        })
            .populate('author', 'name profileImage')
            .populate({
                path: 'replies',
                match: { status: 'active' },
                populate: {
                    path: 'author',
                    select: 'name profileImage'
                }
            })
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

        const count = await Comment.countDocuments({
            article: req.params.articleId,
            parentComment: null,
            status: 'active'
        });

        res.json({
            comments,
            totalPages: Math.ceil(count / limit),
            currentPage: page
        });
    } catch (error) {
        console.error('Get comments error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Update comment
exports.updateComment = async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.commentId);

        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        // Check ownership or admin privileges
        const isOwner = comment.author.toString() === req.user.id;
        
        // Fetch user to check admin status
        const user = await User.findById(req.user.id);
        const isAdmin = user && user.role === 'admin';
        
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Use the edit method from the model
        await comment.edit(req.body.content);

        const updatedComment = await Comment.findById(comment._id)
            .populate('author', 'name profileImage')
            .populate('parentComment');

        res.json(updatedComment);
    } catch (error) {
        console.error('Update comment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Delete comment
exports.deleteComment = async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.commentId);

        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        // Check ownership or admin privileges
        const isOwner = comment.author.toString() === req.user.id;
        
        // Fetch user to check admin status
        const user = await User.findById(req.user.id);
        const isAdmin = user && user.role === 'admin';
        
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Use soft delete method
        await comment.softDelete();
        res.json({ message: 'Comment deleted' });
    } catch (error) {
        console.error('Delete comment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Toggle like on comment
exports.toggleLike = async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.commentId);

        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        // Use the toggleLike method from the model
        await comment.toggleLike(req.user.id);

        res.json({ 
            likes: comment.likes.count,
            hasLiked: comment.likes.users.includes(req.user.id)
        });
    } catch (error) {
        console.error('Toggle comment like error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get all comments for an article (updated implementation)
exports.getArticleComments = async (req, res) => {
    try {
        return await exports.getComments(req, res);
    } catch (error) {
        console.error('Get article comments error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get replies to a comment
exports.getCommentReplies = async (req, res) => {
    try {
        const replies = await Comment.find({
            parentComment: req.params.id,
            status: 'active'
        })
            .populate('author', 'name profileImage')
            .sort({ createdAt: 1 })
            .exec();

        res.json({ replies });
    } catch (error) {
        console.error('Get comment replies error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get users who liked the comment
exports.getCommentLikes = async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id)
            .populate('likes.users', 'name profileImage')
            .exec();

        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        res.json({ 
            likes: comment.likes.users,
            count: comment.likes.count
        });
    } catch (error) {
        console.error('Get comment likes error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Report a comment
exports.reportComment = async (req, res) => {
    try {
        const { reason } = req.body;
        const comment = await Comment.findById(req.params.id);

        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        // In a full implementation, you'd save the report to a reports collection
        // For now, we'll just log it
        console.log(`Comment reported: ${req.params.id}, Reason: ${reason}, Reporter: ${req.user.id}`);
        
        res.json({ message: 'Comment reported successfully' });
    } catch (error) {
        console.error('Report comment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}; 
 
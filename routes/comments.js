const express = require('express');
const { check } = require('express-validator');
const commentsController = require('../controllers/commentController');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/comments/article/:articleId
// @desc    Get all comments for an article
// @access  Public
router.get('/article/:articleId', commentsController.getComments);

// @route   GET /api/comments/:id/replies
// @desc    Get replies to a comment
// @access  Public
router.get('/:id/replies', commentsController.getCommentReplies);

// @route   POST /api/comments/article/:articleId
// @desc    Create a comment for an article
// @access  Private
router.post('/article/:articleId', [
    auth,
    check('content', 'Content is required').not().isEmpty().trim(),
    check('parentId').optional({ nullable: true, checkFalsy: true }).isMongoId()
], commentsController.createComment);

// @route   POST /api/comments
// @desc    Create a comment (legacy route)
// @access  Private
router.post('/', [
    auth,
    check('content', 'Content is required').not().isEmpty().trim(),
    check('articleId', 'Article ID is required').not().isEmpty(),
    check('parentComment').optional({ nullable: true, checkFalsy: true }).isMongoId()
], commentsController.createComment);

// @route   PUT /api/comments/:commentId
// @desc    Update a comment
// @access  Private
router.put('/:commentId', [
    auth,
    check('content', 'Content is required').not().isEmpty().trim()
], commentsController.updateComment);

// @route   DELETE /api/comments/:commentId
// @desc    Delete a comment
// @access  Private
router.delete('/:commentId', auth, commentsController.deleteComment);

// @route   POST /api/comments/:commentId/like
// @desc    Toggle like on comment
// @access  Private
router.post('/:commentId/like', auth, commentsController.toggleLike);

// @route   GET /api/comments/:id/likes
// @desc    Get users who liked the comment
// @access  Public
router.get('/:id/likes', commentsController.getCommentLikes);

// @route   POST /api/comments/:id/report
// @desc    Report a comment
// @access  Private
router.post('/:id/report', [
    auth,
    check('reason', 'Reason is required').not().isEmpty()
], commentsController.reportComment);

module.exports = router; 
 
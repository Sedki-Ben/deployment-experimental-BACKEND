const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
    article: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Article',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    type: {
        type: String,
        required: true,
        enum: [
            'view',
            'engagement',
            'interaction_like',
            'interaction_share',
            'interaction_comment'
        ]
    },
    data: {
        type: mongoose.Schema.Types.Mixed
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    metadata: {
        ip: String,
        userAgent: String,
        referrer: String,
        device: {
            type: String,
            enum: ['desktop', 'mobile', 'tablet']
        }
    }
}, {
    timestamps: true
});

// Indexes for faster queries
analyticsSchema.index({ article: 1, type: 1 });
analyticsSchema.index({ timestamp: 1 });
analyticsSchema.index({ user: 1 });

module.exports = mongoose.model('Analytics', analyticsSchema); 
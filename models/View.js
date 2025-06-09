const mongoose = require('mongoose');

const viewSchema = new mongoose.Schema({
    article: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Article',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    sessionId: String,
    ip: String,
    userAgent: String,
    referrer: String,
    timestamp: {
        type: Date,
        default: Date.now
    },
    duration: Number, // Time spent on article in seconds
    readPercentage: Number, // How far they scrolled (0-100)
    device: {
        type: String,
        enum: ['desktop', 'tablet', 'mobile'],
        required: true
    }
}, {
    timestamps: true
});

// Compound index to prevent duplicate views in a session
viewSchema.index({ article: 1, sessionId: 1 }, { unique: true });

// Index for analytics queries
viewSchema.index({ timestamp: -1 });
viewSchema.index({ article: 1, timestamp: -1 });
viewSchema.index({ user: 1, timestamp: -1 });

const View = mongoose.model('View', viewSchema);

module.exports = View; 
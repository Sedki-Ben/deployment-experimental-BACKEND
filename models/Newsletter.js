const mongoose = require('mongoose');

const newsletterSchema = new mongoose.Schema({
    subject: {
        type: String,
        required: true,
        trim: true
    },
    content: {
        type: String,
        required: true
    },
    sentAt: {
        type: Date,
        default: Date.now
    },
    recipientCount: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['draft', 'sent', 'failed'],
        default: 'draft'
    },
    category: {
        type: String,
        enum: ['weekly-digest', 'breaking-news', 'feature-article'],
        required: true
    }
}, {
    timestamps: true
});

const subscriptionSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    preferences: {
        weeklyDigest: {
            type: Boolean,
            default: true
        },
        breakingNews: {
            type: Boolean,
            default: true
        },
        featureArticles: {
            type: Boolean,
            default: true
        }
    },
    verificationToken: String,
    verificationExpires: Date,
    unsubscribeToken: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

// Create indexes
subscriptionSchema.index({ email: 1 });
subscriptionSchema.index({ verificationToken: 1 });
subscriptionSchema.index({ unsubscribeToken: 1 });

const Newsletter = mongoose.model('Newsletter', newsletterSchema);
const Subscription = mongoose.model('Subscription', subscriptionSchema);

module.exports = {
    Newsletter,
    Subscription
}; 
 
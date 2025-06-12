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
        enum: ['weekly-digest', 'breaking-news', 'feature-article', 'manual', 'article-notification'],
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
        // Email frequency preferences
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
        },
        // Category-specific preferences
        etoileDuSahel: {
            type: Boolean,
            default: true
        },
        theBeautifulGame: {
            type: Boolean,
            default: true
        },
        allSportsHub: {
            type: Boolean,
            default: true
        },
        // Notification preferences
        immediateNotification: {
            type: Boolean,
            default: true // Send email immediately when article is published
        },
        dailyDigest: {
            type: Boolean,
            default: false // Send daily summary (future feature)
        },
        weeklyDigestEnabled: {
            type: Boolean,
            default: false // Send weekly summary (future feature)
        }
    },
    verificationToken: String,
    verificationExpires: Date,
    unsubscribeToken: {
        type: String,
        required: true
    },
    // Additional metadata
    subscriptionSource: {
        type: String,
        enum: ['website', 'article-page', 'homepage', 'category-page'],
        default: 'website'
    },
    lastEmailSent: {
        type: Date
    },
    emailsSent: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Create indexes
subscriptionSchema.index({ email: 1 });
subscriptionSchema.index({ isVerified: 1 });
subscriptionSchema.index({ verificationToken: 1 });
subscriptionSchema.index({ unsubscribeToken: 1 });
subscriptionSchema.index({ createdAt: -1 });

// Create compound indexes for efficient queries
subscriptionSchema.index({ isVerified: 1, 'preferences.etoileDuSahel': 1 });
subscriptionSchema.index({ isVerified: 1, 'preferences.theBeautifulGame': 1 });
subscriptionSchema.index({ isVerified: 1, 'preferences.allSportsHub': 1 });

const Newsletter = mongoose.model('Newsletter', newsletterSchema);
const Subscription = mongoose.model('Subscription', subscriptionSchema);

module.exports = {
    Newsletter,
    Subscription
}; 
 
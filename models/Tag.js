const mongoose = require('mongoose');
const slugify = require('slugify');

const tagSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    slug: {
        type: String,
        unique: true
    },
    description: String,
    articleCount: {
        type: Number,
        default: 0
    },
    lastUsed: {
        type: Date,
        default: Date.now
    },
    color: {
        type: String,
        default: '#3B82F6' // Default blue color
    },
    featured: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Auto-generate slug
tagSchema.pre('save', function(next) {
    if (this.isModified('name')) {
        this.slug = slugify(this.name, {
            lower: true,
            strict: true
        });
    }
    next();
});

// Method to increment article count
tagSchema.methods.incrementArticleCount = async function() {
    this.articleCount += 1;
    this.lastUsed = new Date();
    return this.save();
};

// Method to decrement article count
tagSchema.methods.decrementArticleCount = async function() {
    if (this.articleCount > 0) {
        this.articleCount -= 1;
        return this.save();
    }
};

// Indexes
tagSchema.index({ name: 1 });
tagSchema.index({ slug: 1 });
tagSchema.index({ articleCount: -1 });
tagSchema.index({ lastUsed: -1 });

const Tag = mongoose.model('Tag', tagSchema);

module.exports = Tag; 
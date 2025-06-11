const mongoose = require('mongoose');
const slugify = require('slugify');

const contentBlockSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['paragraph', 'heading', 'quote', 'image', 'image-group', 'list']
    },
    content: {
        type: String,
        required: true
    },
    metadata: {
        level: Number, // For headings (h2, h3, etc.)
        source: String, // For quotes
        caption: String, // For images
        alignment: {
            type: String,
            enum: ['left', 'center', 'right', 'justify']
        },
        style: {
            margins: {
                top: Number,
                bottom: Number
            },
            textColor: String,
            backgroundColor: String
        },
        listType: {
            type: String,
            enum: ['bullet', 'numbered']
        },
        images: [{
            url: String,
            caption: String,
            alignment: String,
            width: Number,
            height: Number
        }]
    }
});

const translationSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    excerpt: {
        type: String,
        required: true
    },
    content: {
        type: [contentBlockSchema],
        required: true,
        default: []
    },
    // For backward compatibility
    legacyContent: {
        type: String
    }
});

const articleSchema = new mongoose.Schema({
    translations: {
        en: {
            type: translationSchema,
            required: true
        },
        fr: {
            type: translationSchema,
            required: false  // Make French optional
        },
        ar: {
            type: translationSchema,
            required: true
        }
    },
    // Fixed: Make author reference User model
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    authorImage: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    image: {
        type: String,
        required: true
    },
    category: {
        type: String,
        enum: ['etoile-du-sahel', 'the-beautiful-game', 'all-sports-hub'],
        required: true
    },
    status: {
        type: String,
        enum: ['draft', 'published', 'archived'],
        default: 'published'
    },
    publishedAt: {
        type: Date
    },
    views: {
        type: Number,
        default: 0
    },
    // Fixed: Consistent like structure
    likes: {
        count: {
            type: Number,
            default: 0
        },
        users: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }]
    },
    shares: {
        count: {
            type: Number,
            default: 0
        },
        platforms: {
            twitter: { type: Number, default: 0 },
            facebook: { type: Number, default: 0 },
            linkedin: { type: Number, default: 0 }
        }
    },
    // Added: Tags field that frontend expects
    tags: [{
        type: String,
        trim: true
    }],
    slug: {
        type: String,
        unique: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Add text index for search functionality
articleSchema.index({ 
    'translations.en.title': 'text',
    'translations.fr.title': 'text',
    'translations.ar.title': 'text',
    'translations.en.excerpt': 'text',
    'translations.fr.excerpt': 'text',
    'translations.ar.excerpt': 'text',
    'translations.en.content.content': 'text',
    'translations.fr.content.content': 'text',
    'translations.ar.content.content': 'text',
    'tags': 'text'
});

// Additional indexes for performance
articleSchema.index({ category: 1, status: 1, publishedAt: -1 });
articleSchema.index({ author: 1, status: 1 });
articleSchema.index({ slug: 1 });

// Virtual for comments (only count active comments)
articleSchema.virtual('commentCount', {
    ref: 'Comment',
    localField: '_id',
    foreignField: 'article',
    count: true,
    match: { status: 'active' }
});

// Check for duplicate title before saving
articleSchema.pre('save', async function(next) {
    if (this.isModified('translations.en.title') || this.isModified('translations.fr.title')) {
        // Check English title
        if (this.isModified('translations.en.title')) {
            const existingArticle = await this.constructor.findOne({
                'translations.en.title': this.translations.en.title,
                _id: { $ne: this._id } // Exclude current article when updating
            });

            if (existingArticle) {
                const error = new Error('An article with this English title already exists. Please choose a different title.');
                error.name = 'ValidationError';
                return next(error);
            }
        }

        // Check French title
        if (this.isModified('translations.fr.title') && this.translations.fr.title) {
            const existingFrenchArticle = await this.constructor.findOne({
                'translations.fr.title': this.translations.fr.title,
                _id: { $ne: this._id } // Exclude current article when updating
            });

            if (existingFrenchArticle) {
                const error = new Error('An article with this French title already exists. Please choose a different title.');
                error.name = 'ValidationError';
                return next(error);
            }
        }

        // Generate slug from English title (primary language)
        this.slug = slugify(this.translations.en.title, {
            lower: true,
            strict: true
        });
    }
    
    if (this.status === 'published' && !this.publishedAt) {
        this.publishedAt = new Date();
    }
    
    next();
});

// Method to increment view count
articleSchema.methods.incrementViews = async function() {
    this.views += 1;
    return this.save({ validateBeforeSave: false });
};

// Fixed: Method to handle likes consistently
articleSchema.methods.toggleLike = async function(userId) {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const userIndex = this.likes.users.findIndex(id => id.equals(userObjectId));
    
    if (userIndex === -1) {
        this.likes.users.push(userObjectId);
        this.likes.count += 1;
    } else {
        this.likes.users.splice(userIndex, 1);
        this.likes.count -= 1;
    }
    
    return this.save({ validateBeforeSave: false });
};

// Method to increment share count
articleSchema.methods.incrementShare = async function(platform) {
    if (this.shares.platforms[platform] !== undefined) {
        this.shares.platforms[platform] += 1;
        this.shares.count += 1;
        return this.save({ validateBeforeSave: false });
    }
    throw new Error('Invalid platform');
};

// Method to get article by slug
articleSchema.statics.findBySlug = function(slug) {
    return this.findOne({ slug }).populate('author', 'name email');
};

module.exports = mongoose.model('Article', articleSchema);
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    language: {
        type: String,
        enum: ['en', 'fr', 'ar'],
        default: 'en'
    },
    preferences: {
        notifications: {
            type: Boolean,
            default: true
        },
        newsletter: {
            type: Boolean,
            default: true
        }
    },
    role: {
        type: String,
        enum: ['user', 'writer', 'admin'],
        default: 'user'
    },
    likedPosts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Article'
    }],
    profilePicture: {
        type: String,
        default: ''
    },
    bio: {
        type: String,
        maxLength: 1000
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastLogin: {
        type: Date
    },
    profileImage: {
        type: String
    },
    dateOfBirth: {
        type: Date
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other']
    },
    location: {
        type: String
    },
    profession: {
        type: String
    },
    website: {
        type: String
    },
    twitter: {
        type: String
    },
    linkedin: {
        type: String
    }
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Method to check if user has liked a post
userSchema.methods.hasLiked = function(postId) {
    return this.likedPosts.includes(postId);
};

const User = mongoose.model('User', userSchema);

module.exports = User; 
 
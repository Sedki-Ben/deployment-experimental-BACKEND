const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    article: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Article',
        required: true
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: true,
        trim: true,
        maxLength: 1000
    },
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
    parentComment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment'
    },
    isEdited: {
        type: Boolean,
        default: false
    },
    editHistory: [{
        content: String,
        editedAt: Date
    }],
    status: {
        type: String,
        enum: ['active', 'deleted', 'hidden'],
        default: 'active'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for replies
commentSchema.virtual('replies', {
    ref: 'Comment',
    localField: '_id',
    foreignField: 'parentComment'
});

// Method to edit comment
commentSchema.methods.edit = async function(newContent) {
    if (this.content !== newContent) {
        this.editHistory.push({
            content: this.content,
            editedAt: new Date()
        });
        this.content = newContent;
        this.isEdited = true;
        return this.save();
    }
    return this;
};

// Method to toggle like
commentSchema.methods.toggleLike = async function(userId) {
    const userIndex = this.likes.users.indexOf(userId);
    
    if (userIndex === -1) {
        this.likes.users.push(userId);
        this.likes.count += 1;
    } else {
        this.likes.users.splice(userIndex, 1);
        this.likes.count -= 1;
    }
    
    return this.save();
};

// Method to soft delete
commentSchema.methods.softDelete = async function() {
    this.status = 'deleted';
    return this.save();
};

const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment; 
 
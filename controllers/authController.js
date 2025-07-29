const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const { uploadToCloudinary, deleteFromCloudinary, isCloudinaryConfigured } = require('../utils/cloudinaryStorage');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = 'uploads/profile/';
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    // Check file type
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    }
});

// Generate JWT Token
const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET || 'your_jwt_secret_key_here', {
        expiresIn: '24h'
    });
};

// Register new user
exports.register = async (req, res) => {
    try {
        // Validate request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, email, password, language } = req.body;

        // Check if user already exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Create new user
        const userData = { name, email, password };
        if (language) userData.language = language;
        user = new User(userData);

        await user.save();

        // Generate token
        const token = generateToken(user._id);

        res.status(201).json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                language: user.language
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Login user
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate token
        const token = generateToken(user._id);

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                language: user.language,
                profileImage: user.profileImage,
                dateOfBirth: user.dateOfBirth,
                gender: user.gender,
                location: user.location,
                bio: user.bio,
                profession: user.profession,
                website: user.website,
                twitter: user.twitter,
                linkedin: user.linkedin
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get current user
exports.getCurrentUser = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Update user language
exports.updateLanguage = async (req, res) => {
    try {
        const { language } = req.body;
        if (!['en', 'fr', 'ar'].includes(language)) {
            return res.status(400).json({ message: 'Invalid language' });
        }

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { language },
            { new: true }
        ).select('-password');

        res.json(user);
    } catch (error) {
        console.error('Update language error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Logout user
exports.logout = (req, res) => {
    res.json({ message: 'Logged out' });
};

// Update user profile - COMPLETE IMPLEMENTATION
exports.updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const updateData = {};

        // Extract form data
        const {
            name,
            dateOfBirth,
            gender,
            location,
            bio,
            profession,
            website,
            twitter,
            linkedin
        } = req.body;

        // Validate required fields
        if (!name || name.trim() === '') {
            return res.status(400).json({ message: 'Name is required' });
        }

        // Add fields to update data if they exist
        if (name) updateData.name = name.trim();
        if (dateOfBirth) updateData.dateOfBirth = dateOfBirth;
        if (gender) updateData.gender = gender;
        if (location) updateData.location = location.trim();
        if (bio) updateData.bio = bio.trim();
        if (profession) updateData.profession = profession.trim();
        if (website) updateData.website = website.trim();
        if (twitter) updateData.twitter = twitter.trim();
        if (linkedin) updateData.linkedin = linkedin.trim();

        // Handle profile image upload
        if (req.file) {
            // Get current user to delete old image
            const currentUser = await User.findById(userId);
            
            // Delete old profile image if it exists and is not a default avatar
            if (currentUser.profileImage && 
                !currentUser.profileImage.includes('mann.png') && 
                !currentUser.profileImage.includes('frau.png') &&
                currentUser.profileImage.startsWith('https://res.cloudinary.com/')) {
                // Only delete from Cloudinary if it's a cloud URL
                await deleteFromCloudinary(currentUser.profileImage);
            }

            // Check if we should use cloud storage
            const useCloudStorage = isCloudinaryConfigured() && (process.env.NODE_ENV === 'production' || process.env.USE_CLOUDINARY === 'true');
            
            if (useCloudStorage) {
                // Upload to Cloudinary
                const profileImageUrl = await uploadToCloudinary(
                    req.file.buffer, 
                    req.file.originalname, 
                    'profiles'
                );
                updateData.profileImage = profileImageUrl;
            } else {
                // Fallback to local storage
            updateData.profileImage = `/uploads/profile/${req.file.filename}`;
            }
        }

        // Update user in database
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Return the user object directly (not wrapped) to match frontend expectations
        res.json(updatedUser);

    } catch (error) {
        console.error('Update profile error:', error);
        
        // Delete uploaded file if there was an error
        if (req.file) {
            const filePath = path.join(__dirname, '..', req.file.path);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        
        res.status(500).json({ message: 'Server error' });
    }
};

// Multer middleware for profile image upload
exports.uploadProfileImage = upload.single('profileImage');

// Change password
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        // Find user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check current password
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }

        // Update password
        user.password = newPassword;
        await user.save();

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Forgot password
exports.forgotPassword = (req, res) => {
    res.json({ message: 'Password reset email sent (stub)' });
};

// Reset password
exports.resetPassword = (req, res) => {
    res.json({ message: 'Password reset (stub)' });
};

// Get all users (admin)
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json({ users });
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Update user role (admin)
exports.updateUserRole = async (req, res) => {
    try {
        const { userId, role } = req.body;
        
        if (!['user', 'admin'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { role },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ message: 'User role updated successfully', user });
    } catch (error) {
        console.error('Update user role error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Delete user (admin)
exports.deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;
        
        const user = await User.findByIdAndDelete(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Delete profile image if it exists
        if (user.profileImage && 
            !user.profileImage.includes('mann.png') && 
            !user.profileImage.includes('frau.png')) {
            const imagePath = path.join(__dirname, '..', user.profileImage);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
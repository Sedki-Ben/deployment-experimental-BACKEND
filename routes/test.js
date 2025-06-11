const express = require('express');
const router = express.Router();
const { isCloudinaryConfigured } = require('../utils/cloudinaryStorage');

// Test endpoint to check Cloudinary configuration
router.get('/cloudinary-status', (req, res) => {
    const isConfigured = isCloudinaryConfigured();
    const config = {
        isCloudinaryConfigured: isConfigured,
        nodeEnv: process.env.NODE_ENV,
        useCloudinary: process.env.USE_CLOUDINARY,
        hasCloudName: !!process.env.CLOUDINARY_CLOUD_NAME,
        hasApiKey: !!process.env.CLOUDINARY_API_KEY,
        hasApiSecret: !!process.env.CLOUDINARY_API_SECRET,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME ? `${process.env.CLOUDINARY_CLOUD_NAME.substring(0, 3)}***` : 'NOT_SET'
    };
    
    res.json({
        message: 'Cloudinary Configuration Status',
        ...config,
        storageMode: isConfigured && (process.env.NODE_ENV === 'production' || process.env.USE_CLOUDINARY === 'true') ? 'CLOUDINARY' : 'LOCAL'
    });
});

module.exports = router; 
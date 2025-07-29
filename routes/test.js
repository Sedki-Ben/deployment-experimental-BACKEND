const express = require('express');
const router = express.Router();
const multer = require('multer');
const { isCloudinaryConfigured, uploadToCloudinary } = require('../utils/cloudinaryStorage');

// Configure multer for memory storage
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

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

// Test endpoint to try a simple Cloudinary upload
router.post('/cloudinary-upload', upload.single('testImage'), async (req, res) => {
    try {
        console.log('Test upload started...');
        
        if (!req.file) {
            return res.status(400).json({ 
                error: 'No file uploaded',
                message: 'Please upload a test image file'
            });
        }

        console.log('File received:', {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size
        });

        // Check if Cloudinary is configured
        if (!isCloudinaryConfigured()) {
            return res.status(500).json({
                error: 'Cloudinary not configured',
                message: 'Missing Cloudinary environment variables'
            });
        }

        console.log('Attempting Cloudinary upload...');
        
        // Try to upload to Cloudinary
        const cloudinaryUrl = await uploadToCloudinary(
            req.file.buffer, 
            req.file.originalname, 
            'test-uploads'
        );

        console.log('Upload successful:', cloudinaryUrl);

        res.json({
            success: true,
            message: 'Test upload successful!',
            cloudinaryUrl: cloudinaryUrl,
            fileInfo: {
                originalname: req.file.originalname,
                size: req.file.size,
                mimetype: req.file.mimetype
            }
        });

    } catch (error) {
        console.error('Test upload error:', error);
        
        res.status(500).json({
            success: false,
            error: error.message,
            details: {
                name: error.name,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            }
        });
    }
});

module.exports = router; 
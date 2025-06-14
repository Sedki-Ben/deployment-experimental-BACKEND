const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Check if Cloudinary is properly configured
const isCloudinaryConfigured = () => {
    const hasCloudName = !!process.env.CLOUDINARY_CLOUD_NAME;
    const hasApiKey = !!process.env.CLOUDINARY_API_KEY;
    const hasApiSecret = !!process.env.CLOUDINARY_API_SECRET;
    
    console.log('Cloudinary Configuration Check:', {
        hasCloudName,
        hasApiKey,
        hasApiSecret,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY ? '***' : undefined,
        apiSecret: process.env.CLOUDINARY_API_SECRET ? '***' : undefined,
        nodeEnv: process.env.NODE_ENV
    });
    
    return hasCloudName && hasApiKey && hasApiSecret;
};

// Configure Cloudinary storage for articles
const articleStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'articles',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
        transformation: [
            { width: 800, height: 600, crop: 'limit', quality: 'auto' },
            { format: 'auto' }
        ]
    }
});

// Configure Cloudinary storage for profiles
const profileStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'profiles',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [
            { width: 300, height: 300, crop: 'fill', gravity: 'face', quality: 'auto' },
            { format: 'auto' }
        ]
    }
});

// Multer instances
const uploadArticleImage = multer({ 
    storage: articleStorage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const uploadProfileImage = multer({ 
    storage: profileStorage,
    limits: { fileSize: 2 * 1024 * 1024 } // 2MB limit
});

// Helper function to upload a file to Cloudinary
const uploadToCloudinary = async (file, folder = 'articles') => {
    try {
        if (!file) return null;

        // If file is already a Cloudinary URL, return it
        if (typeof file === 'string' && file.startsWith('http')) {
            return file;
        }

        // If file is a buffer (from multer)
        if (file.buffer) {
            const result = await new Promise((resolve, reject) => {
                cloudinary.uploader.upload_stream(
                    {
                        folder,
                        resource_type: 'auto',
                        transformation: [
                            { width: 800, height: 600, crop: 'limit', quality: 'auto' },
                            { format: 'auto' }
                        ]
                    },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                ).end(file.buffer);
            });
            return result.secure_url;
        }

        // If file is a path
        if (typeof file === 'string') {
            const result = await cloudinary.uploader.upload(file, {
                folder,
                resource_type: 'auto',
                transformation: [
                    { width: 800, height: 600, crop: 'limit', quality: 'auto' },
                    { format: 'auto' }
                ]
            });
            return result.secure_url;
        }

        return null;
    } catch (error) {
        console.error('Error uploading to Cloudinary:', error);
        return null;
    }
};

// Helper function to delete a file from Cloudinary
const deleteFromCloudinary = async (url) => {
    try {
        if (!url || !url.startsWith('http')) return;

        const publicId = url.split('/').slice(-1)[0].split('.')[0];
        await cloudinary.uploader.destroy(publicId);
    } catch (error) {
        console.error('Error deleting from Cloudinary:', error);
    }
};

// Helper function to get image URL with fallback
const getImageUrl = (imagePath, type = 'article') => {
    if (!imagePath) {
        return type === 'profile' ? '/images/default-author.jpg' : '/images/default-article.jpg';
    }
    
    // If it's already a full URL (Cloudinary), return as is
    if (imagePath.startsWith('http')) return imagePath;
    
    // If it's a local path, convert to full URL
    if (imagePath.startsWith('/uploads')) {
        return `${process.env.BACKEND_URL}${imagePath}`;
    }
    
    return imagePath;
};

module.exports = {
    cloudinary,
    uploadArticleImage,
    uploadProfileImage,
    uploadToCloudinary,
    deleteFromCloudinary,
    getImageUrl,
    isCloudinaryConfigured
}; 
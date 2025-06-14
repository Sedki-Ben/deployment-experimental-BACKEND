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

// Upload file to Cloudinary
const uploadToCloudinary = async (file, originalname, folder = 'articles') => {
    try {
        if (!isCloudinaryConfigured()) {
            console.log('Cloudinary not configured, falling back to local storage');
            return null;
        }

        console.log('Attempting to upload to Cloudinary:', {
            filename: originalname,
            folder: folder,
            fileType: typeof file,
            hasPath: !!file?.path,
            hasBuffer: !!file?.buffer
        });

        // If the file is already uploaded to Cloudinary (has path), return the path
        if (file?.path && file.path.startsWith('https://res.cloudinary.com/')) {
            console.log('File already uploaded to Cloudinary:', file.path);
            return file.path;
        }

        // Create a unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = `${folder}/${uniqueSuffix}-${originalname}`;

        let result;
        if (file?.buffer) {
            // Upload buffer to Cloudinary
            result = await new Promise((resolve, reject) => {
                cloudinary.uploader.upload_stream(
                    {
                        folder: folder,
                        resource_type: 'auto',
                        public_id: filename,
                        overwrite: true
                    },
                    (error, result) => {
                        if (error) {
                            console.error('Cloudinary upload error:', error);
                            reject(error);
                        } else {
                            console.log('Cloudinary upload successful:', {
                                url: result.secure_url,
                                publicId: result.public_id,
                                format: result.format,
                                size: result.bytes
                            });
                            resolve(result);
                        }
                    }
                ).end(file.buffer);
            });
        } else if (file?.path) {
            // Upload file from path
            result = await cloudinary.uploader.upload(file.path, {
                folder: folder,
                resource_type: 'auto',
                public_id: filename,
                overwrite: true
            });
        } else {
            throw new Error('Invalid file object: neither buffer nor path provided');
        }

        return result.secure_url;
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        throw new Error('Failed to upload to Cloudinary: ' + error.message);
    }
};

// Delete file from Cloudinary
const deleteFromCloudinary = async (url) => {
    try {
        if (!isCloudinaryConfigured()) {
            throw new Error('Cloudinary is not configured');
        }

        // Extract public_id from URL
        const publicId = url.split('/').slice(-1)[0].split('.')[0];
        
        // Delete from Cloudinary
        const result = await cloudinary.uploader.destroy(publicId);
        console.log('Cloudinary delete result:', result);
        return result;
    } catch (error) {
        console.error('Cloudinary delete error:', error);
        throw new Error('Failed to delete from Cloudinary: ' + error.message);
    }
};

// Configure Cloudinary storage for multer
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'articles',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        resource_type: 'auto',
        transformation: [{ width: 1000, height: 1000, crop: 'limit' }]
    }
});

// Create multer upload instance
const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

module.exports = {
    cloudinary,
    storage,
    upload,
    uploadToCloudinary,
    deleteFromCloudinary,
    isCloudinaryConfigured
}; 
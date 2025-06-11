const cloudinary = require("cloudinary").v2;

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload file buffer to Cloudinary
 * @param {Buffer} fileBuffer - File buffer to upload
 * @param {string} originalname - Original filename
 * @param {string} folder - Storage folder (e.g., 'articles', 'profiles')
 * @returns {Promise<string>} - Public URL of uploaded file
 */
const uploadToCloudinary = async (fileBuffer, originalname, folder = 'articles') => {
    try {
        return new Promise((resolve, reject) => {
            // Create a unique filename
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const filename = `${uniqueSuffix}-${originalname.replace(/\s+/g, '_')}`;
            
            cloudinary.uploader.upload_stream(
                {
                    resource_type: 'image',
                    folder: `football-journal/${folder}`, // Organize in folders
                    public_id: filename,
                    overwrite: false,
                    quality: 'auto', // Automatic quality optimization
                    fetch_format: 'auto' // Automatic format optimization
                },
                (error, result) => {
                    if (error) {
                        console.error('Error uploading to Cloudinary:', error);
                        reject(new Error('Failed to upload image to cloud storage'));
                    } else {
                        console.log(`File uploaded successfully to Cloudinary: ${result.secure_url}`);
                        resolve(result.secure_url);
                    }
                }
            ).end(fileBuffer);
        });
    } catch (error) {
        console.error('Error uploading to Cloudinary:', error);
        throw new Error('Failed to upload image to cloud storage');
    }
};

/**
 * Delete file from Cloudinary
 * @param {string} fileUrl - Public URL of file to delete
 * @returns {Promise<void>}
 */
const deleteFromCloudinary = async (fileUrl) => {
    try {
        // Extract public_id from Cloudinary URL
        // URL format: https://res.cloudinary.com/cloud_name/image/upload/v1234567890/folder/filename.jpg
        const urlParts = fileUrl.split('/');
        const versionIndex = urlParts.findIndex(part => part.startsWith('v'));
        
        if (versionIndex !== -1 && versionIndex < urlParts.length - 1) {
            // Extract folder and filename (everything after version)
            const pathParts = urlParts.slice(versionIndex + 1);
            const fullPath = pathParts.join('/');
            // Remove file extension
            const publicId = fullPath.replace(/\.[^/.]+$/, '');
            
            await cloudinary.uploader.destroy(publicId);
            console.log(`File deleted successfully from Cloudinary: ${publicId}`);
        }
    } catch (error) {
        console.error('Error deleting from Cloudinary:', error);
        // Don't throw error for deletion failures to avoid breaking the main flow
    }
};

/**
 * Check if Cloudinary is properly configured
 * @returns {boolean}
 */
const isCloudinaryConfigured = () => {
    return !!(
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
    );
};

module.exports = {
    uploadToCloudinary,
    deleteFromCloudinary,
    isCloudinaryConfigured
}; 
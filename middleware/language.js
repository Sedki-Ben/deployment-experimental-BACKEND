const User = require('../models/User');

const languageMiddleware = async (req, res, next) => {
    try {
        // Check if user is authenticated and has a language preference
        if (req.user && req.user.id) {
            const user = await User.findById(req.user.id);
            if (user && user.language) {
                req.language = user.language;
            }
        }
        
        // If no user preference, use the language detected by i18next
        if (!req.language) {
            req.language = req.language || 'en';
        }

        next();
    } catch (error) {
        console.error('Language middleware error:', error);
        next();
    }
};

module.exports = languageMiddleware; 
 
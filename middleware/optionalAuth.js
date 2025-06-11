const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    try {
        // Get token from header
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            // No token provided, continue without user
            req.user = null;
            return next();
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here');
        
        // Add user from payload
        req.user = {
            id: decoded.userId || decoded.user.id // Handle both formats
        };
        
        next();
    } catch (error) {
        // Invalid token, continue without user
        req.user = null;
        next();
    }
}; 
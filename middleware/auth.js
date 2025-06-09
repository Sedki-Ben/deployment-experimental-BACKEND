const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    try {
        // Get token from header
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ message: 'No token, authorization denied' });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here');
        
        // Add user from payload
        req.user = {
            id: decoded.userId || decoded.user.id // Handle both formats
        };
        next();
    } catch (error) {
        res.status(401).json({ message: 'Token is not valid' });
    }
}; 
 
const User = require('../models/User');

module.exports = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        
        if (user.role !== 'writer' && user.role !== 'admin') {
            return res.status(403).json({ msg: 'Access denied. Writer privileges required.' });
        }
        
        next();
    } catch (err) {
        console.error('Error in isWriter middleware:', err);
        res.status(500).json({ msg: 'Server error' });
    }
}; 
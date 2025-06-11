const rateLimit = require('express-rate-limit');

// Create a simple memory store limiter
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        status: 'error',
        message: 'Too many requests from this IP, please try again after 15 minutes'
    }
});

// Auth limiter
const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // limit each IP to 5 login attempts per hour
    message: {
        status: 'error',
        message: 'Too many login attempts from this IP, please try again after an hour'
    }
});

// Newsletter limiter
const newsletterLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 3, // limit each IP to 3 newsletter subscriptions per day
    message: {
        status: 'error',
        message: 'Too many subscription attempts from this IP, please try again tomorrow'
    }
});

module.exports = {
    limiter,
    authLimiter,
    newsletterLimiter
}; 
 
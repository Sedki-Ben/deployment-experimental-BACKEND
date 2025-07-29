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
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 login attempts per 15 minutes
    message: {
        status: 'error',
        message: 'Too many login attempts. Please try again after 15 minutes'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
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
 
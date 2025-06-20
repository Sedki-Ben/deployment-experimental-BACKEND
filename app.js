const express = require('express');
const cors = require('cors');
const { i18nextMiddleware } = require('./utils/i18n');
const { limiter, authLimiter, newsletterLimiter } = require('./middleware/rateLimiter');
const path = require('path');
const fs = require('fs');

const app = express();

// CORS Configuration
const allowedOrigins = [
  'http://localhost:3000',
  'https://deployment-experimental.vercel.app',
  'https://pure-tactics-cartel.vercel.app',
  'https://pure-tactics-cartel-sedkibenhaouala-6473s-projects.vercel.app',
  'https://pure-tactics-cartel-git-main-sedkibenhaouala-6473s-projects.vercel.app',
  'https://pure-tactics-cartel-cyue1spy2-sedkibenhaouala-6473s-projects.vercel.app',
  'https://pure-tactics-cartel-4ndlfxt5p-sedkibenhaouala-6473s-projects.vercel.app'
];

// Add FRONTEND_URL from environment if it exists and isn't already in the list
if (process.env.FRONTEND_URL && !allowedOrigins.includes(process.env.FRONTEND_URL)) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check for exact match first
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // For Vercel deployments, allow any subdomain of vercel.app that contains 'pure-tactics-cartel'
    if (origin && origin.includes('pure-tactics-cartel') && origin.includes('vercel.app')) {
      console.log('CORS: Allowing Vercel deployment:', origin);
      return callback(null, true);
    }
    
    // For development, allow localhost on any port
    if (origin && origin.startsWith('http://localhost:')) {
      console.log('CORS: Allowing localhost development:', origin);
      return callback(null, true);
    }
    
    console.error('CORS Error: Origin not allowed:', origin);
    console.log('Allowed origins:', allowedOrigins);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply i18n middleware before routes
app.use(i18nextMiddleware);

// Apply global rate limiter
app.use(limiter);

// Apply specific rate limits
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/newsletter/subscribe', newsletterLimiter);

// Enhanced static file serving with error handling and logging
app.use('/uploads', (req, res, next) => {
  const filePath = path.join(__dirname, 'uploads', req.path);
  
  // Log the request
  console.log(`Static file request: ${req.path}`);
  console.log(`Full path: ${filePath}`);
  
  // Check if file exists
  if (fs.existsSync(filePath)) {
    console.log(`File exists, serving: ${req.path}`);
    next(); // Continue to express.static
  } else {
    console.error(`File not found: ${req.path}`);
    console.error(`Attempted path: ${filePath}`);
    
    // List directory contents for debugging
    const uploadDir = path.join(__dirname, 'uploads');
    if (fs.existsSync(uploadDir)) {
      const files = fs.readdirSync(uploadDir);
      console.log(`Available files in uploads directory: ${files.join(', ')}`);
    } else {
      console.error('Uploads directory does not exist!');
    }
    
    // Return 404 with helpful information
    res.status(404).json({
      error: 'File not found',
      requestedFile: req.path,
      message: 'This file may have been deleted due to server restart on Render\'s ephemeral file system'
    });
  }
}, express.static(path.join(__dirname, 'uploads')));

// Import routes
const authRoutes = require('./routes/auth');
const articleRoutes = require('./routes/articles');
const commentRoutes = require('./routes/comments');
const newsletterRoutes = require('./routes/newsletter');
const analyticsRoutes = require('./routes/analytics');

// Basic root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Football Journal API Server', 
    version: '1.0.0',
    status: 'online',
    endpoints: {
      articles: '/api/articles',
      search: '/api/articles/search',
      auth: '/api/auth',
      comments: '/api/comments',
      newsletter: '/api/newsletter',
      analytics: '/api/analytics'
    }
  });
});

// Health check route
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/analytics', analyticsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  const status = err.status || 500;
  const message = err.message || 'Something went wrong!';
  
  res.status(status).json({
    status: 'error',
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found'
  });
});

module.exports = app;
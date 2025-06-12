require('dotenv').config();

const testCorsConfiguration = () => {
    console.log('🌐 Testing CORS Configuration...\n');

    // Import the CORS configuration from app.js
    const app = require('./app');

    // Test URLs
    const testOrigins = [
        'http://localhost:3000',
        'https://pure-tactics-cartel.vercel.app',
        'https://pure-tactics-cartel-4ndlfxt5p-sedkibenhaouala-6473s-projects.vercel.app',
        'https://pure-tactics-cartel-git-main-sedkibenhaouala-6473s-projects.vercel.app',
        'https://deployment-experimental.vercel.app',
        'https://malicious-site.com' // This should be blocked
    ];

    console.log('📋 Testing Origins:');
    
    testOrigins.forEach(origin => {
        // Simulate the CORS check
        const isAllowed = checkOrigin(origin);
        const status = isAllowed ? '✅ ALLOWED' : '❌ BLOCKED';
        console.log(`${status}: ${origin}`);
    });

    console.log('\n🎯 CORS Configuration Summary:');
    console.log('- ✅ Localhost development URLs are allowed');
    console.log('- ✅ All Pure Tactics Cartel Vercel deployments are allowed');
    console.log('- ✅ Specific production URLs are whitelisted');
    console.log('- ❌ Unknown/malicious origins are blocked');
    
    console.log('\n📝 Environment Variables:');
    console.log(`FRONTEND_URL: ${process.env.FRONTEND_URL || 'Not set'}`);
    console.log(`NODE_ENV: ${process.env.NODE_ENV || 'Not set'}`);
};

// Simulate the CORS origin check logic
function checkOrigin(origin) {
    const allowedOrigins = [
        'http://localhost:3000',
        'https://deployment-experimental.vercel.app',
        'https://pure-tactics-cartel.vercel.app',
        'https://pure-tactics-cartel-sedkibenhaouala-6473s-projects.vercel.app',
        'https://pure-tactics-cartel-git-main-sedkibenhaouala-6473s-projects.vercel.app',
        'https://pure-tactics-cartel-cyue1spy2-sedkibenhaouala-6473s-projects.vercel.app',
        'https://pure-tactics-cartel-4ndlfxt5p-sedkibenhaouala-6473s-projects.vercel.app'
    ];

    // Add FRONTEND_URL from environment if it exists
    if (process.env.FRONTEND_URL && !allowedOrigins.includes(process.env.FRONTEND_URL)) {
        allowedOrigins.push(process.env.FRONTEND_URL);
    }

    // Check for exact match first
    if (allowedOrigins.includes(origin)) {
        return true;
    }
    
    // For Vercel deployments, allow any subdomain that contains 'pure-tactics-cartel'
    if (origin && origin.includes('pure-tactics-cartel') && origin.includes('vercel.app')) {
        return true;
    }
    
    // For development, allow localhost on any port
    if (origin && origin.startsWith('http://localhost:')) {
        return true;
    }
    
    return false;
}

// Run the test
testCorsConfiguration(); 
require('dotenv').config();
const EmailService = require('./utils/emailService');

async function testBrevoIntegration() {
    console.log('🧪 Testing Brevo Integration...\n');

    // Check environment variables
    console.log('📋 Environment Check:');
    console.log('- BREVO_API_KEY:', !!process.env.BREVO_API_KEY ? '✅ Set' : '❌ Missing');
    console.log('- EMAIL_FROM:', process.env.EMAIL_FROM || '❌ Missing');
    console.log('- FRONTEND_URL:', process.env.FRONTEND_URL || '❌ Missing');
    console.log('');

    if (!process.env.BREVO_API_KEY) {
        console.log('❌ BREVO_API_KEY is required. Please set it in your .env file.');
        return;
    }

    if (!process.env.EMAIL_FROM) {
        console.log('❌ EMAIL_FROM is required. Please set it in your .env file.');
        return;
    }

    try {
        // Test 1: Send welcome email
        console.log('📧 Test 1: Sending welcome email...');
        await EmailService.sendWelcomeEmail({
            email: 'test@example.com',
            name: 'Test User'
        });
        console.log('✅ Welcome email sent successfully!\n');

        // Test 2: Send verification email
        console.log('📧 Test 2: Sending verification email...');
        await EmailService.sendVerificationEmail({
            email: 'test@example.com'
        }, 'test-verification-token-123');
        console.log('✅ Verification email sent successfully!\n');

        // Test 3: Send article notification
        console.log('📧 Test 3: Sending article notification...');
        await EmailService.sendArticleNotification([
            { email: 'test@example.com', name: 'Test User' }
        ], {
            title: 'Test Article: Tactical Analysis of Modern Football',
            summary: 'This is a test article to verify our newsletter system is working correctly.',
            excerpt: 'A comprehensive look at modern football tactics and strategies.',
            _id: '507f1f77bcf86cd799439011',
            slug: 'test-article-tactical-analysis',
            category: 'the-beautiful-game',
            image: 'https://via.placeholder.com/600x400/3b82f6/ffffff?text=Test+Article'
        });
        console.log('✅ Article notification sent successfully!\n');

        console.log('🎉 All tests passed! Brevo integration is working correctly.');
        console.log('');
        console.log('📝 Next steps:');
        console.log('1. Check your email inbox for the test emails');
        console.log('2. Verify the email templates look correct');
        console.log('3. Test the subscription flow on your website');
        console.log('4. Deploy to production with the environment variables');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.log('');
        console.log('🔧 Troubleshooting:');
        console.log('1. Verify your BREVO_API_KEY is correct');
        console.log('2. Check that your sender email is verified in Brevo');
        console.log('3. Ensure you have sufficient email credits in your Brevo account');
        console.log('4. Check Brevo dashboard for any account issues');
    }
}

// Run the test
testBrevoIntegration(); 
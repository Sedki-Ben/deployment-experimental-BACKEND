require('dotenv').config();

const testBrevoIntegration = async () => {
    console.log('🧪 Testing Brevo Integration...\n');

    // Check environment variables
    console.log('📋 Environment Check:');
    console.log(`BREVO_API_KEY: ${process.env.BREVO_API_KEY ? '✅ Set' : '❌ Missing'}`);
    console.log(`EMAIL_FROM: ${process.env.EMAIL_FROM ? '✅ Set' : '❌ Missing'}`);
    console.log(`FRONTEND_URL: ${process.env.FRONTEND_URL ? '✅ Set' : '❌ Missing'}`);
    console.log('');

    if (!process.env.BREVO_API_KEY || !process.env.EMAIL_FROM) {
        console.log('❌ Missing required environment variables. Please check your .env file.');
        return;
    }

    try {
        // Test Brevo service initialization
        console.log('🔧 Testing Brevo Service...');
        const brevoService = require('./utils/brevoService');
        console.log('✅ Brevo service initialized successfully\n');

        // Test email templates
        console.log('🎨 Testing Email Templates...');
        const { getWelcomeEmailTemplate, getArticleNotificationTemplate } = require('./templates/emailTemplates');
        
        const welcomeTemplate = getWelcomeEmailTemplate('Test User', 'en', 'https://example.com/verify');
        console.log('✅ Welcome template generated');
        
        const articleTemplate = getArticleNotificationTemplate({
            title: 'Test Article: Tactical Analysis',
            excerpt: 'This is a test article about football tactics...',
            category: 'the-beautiful-game',
            _id: 'test123',
            slug: 'test-article',
            publishedAt: new Date(),
            image: 'https://via.placeholder.com/600x300'
        }, 'en');
        console.log('✅ Article notification template generated');
        console.log('');

        // Test sending a welcome email (if test email is provided)
        const testEmail = process.env.TEST_EMAIL;
        if (testEmail) {
            console.log(`📧 Sending test welcome email to ${testEmail}...`);
            
            await brevoService.sendEmail({
                to: testEmail,
                subject: 'Test Email - Pure Tactics Cartel Brevo Integration',
                html: welcomeTemplate.html,
                tags: ['test', 'integration']
            });
            
            console.log('✅ Test email sent successfully!');
            console.log('📬 Please check your inbox for the test email.');
        } else {
            console.log('ℹ️  To test email sending, set TEST_EMAIL in your .env file');
        }

        console.log('\n🎉 Brevo integration test completed successfully!');
        console.log('\n📝 Next steps:');
        console.log('1. Check your email inbox if you provided TEST_EMAIL');
        console.log('2. Start your backend server: npm run dev');
        console.log('3. Test newsletter subscription via API');
        console.log('4. Publish an article to test automatic notifications');

    } catch (error) {
        console.error('❌ Brevo integration test failed:', error.message);
        console.error('\n🔍 Troubleshooting:');
        console.error('1. Verify your BREVO_API_KEY is correct');
        console.error('2. Ensure your sender email is verified in Brevo');
        console.error('3. Check your internet connection');
        console.error('4. Review the full error above for details');
    }
};

// Run the test
testBrevoIntegration(); 
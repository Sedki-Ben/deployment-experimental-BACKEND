const path = require('path');
const fs = require('fs');

console.log('Current working directory:', process.cwd());
console.log('Looking for .env file in:', path.join(process.cwd(), '.env'));

// Try to load .env file
try {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
        console.log('Found .env file at:', envPath);
        require('dotenv').config({ path: envPath });
    } else {
        console.log('No .env file found at:', envPath);
        // Try parent directory
        const parentEnvPath = path.join(process.cwd(), '..', '.env');
        if (fs.existsSync(parentEnvPath)) {
            console.log('Found .env file in parent directory:', parentEnvPath);
            require('dotenv').config({ path: parentEnvPath });
        } else {
            console.log('No .env file found in parent directory either');
        }
    }
} catch (error) {
    console.error('Error loading .env file:', error);
}

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

const brevo = require('@getbrevo/brevo');

// Test configuration
const config = {
    apiKey: process.env.BREVO_API_KEY,
    senderEmail: process.env.EMAIL_FROM,
    testRecipient: 'bonhommelibre25@gmail.com'
};

// Print all environment variables (for debugging)
console.log('\nEnvironment variables:');
console.log('BREVO_API_KEY:', process.env.BREVO_API_KEY ? 'Set' : 'Not Set');
console.log('EMAIL_FROM:', process.env.EMAIL_FROM);
console.log('NODE_ENV:', process.env.NODE_ENV);

async function testBrevoAPI() {
    console.log('\n🔍 Testing Brevo API Configuration...');
    console.log('API Key present:', config.apiKey ? 'Yes' : 'No');
    console.log('Sender Email:', config.senderEmail);
    console.log('Test Recipient:', config.testRecipient);

    try {
        // Initialize API client
        const defaultClient = brevo.ApiClient.instance;
        const apiKey = defaultClient.authentications['api-key'];
        apiKey.apiKey = config.apiKey;

        // Create API instance
        const apiInstance = new brevo.TransactionalEmailsApi(defaultClient);

        // Create test email
        const sendSmtpEmail = new brevo.SendSmtpEmail();
        sendSmtpEmail.subject = "Brevo API Test";
        sendSmtpEmail.htmlContent = "<h1>Brevo API Test</h1><p>If you're receiving this email, your Brevo API configuration is working correctly!</p>";
        sendSmtpEmail.sender = {
            name: "Brevo Test",
            email: config.senderEmail
        };
        sendSmtpEmail.to = [{
            email: config.testRecipient,
            name: "Test Recipient"
        }];

        console.log('📧 Attempting to send test email...');
        
        // Send the email
        const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
        
        console.log('✅ Test successful!');
        console.log('Response:', response);
        console.log('Message ID:', response.messageId);
        
    } catch (error) {
        console.error('❌ Test failed!');
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Response body:', error.response.body);
            console.error('Response text:', error.response.text);
        }
    }
}

// Run the test
testBrevoAPI(); 
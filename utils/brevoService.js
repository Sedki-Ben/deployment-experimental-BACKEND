const brevo = require('@getbrevo/brevo');

class BrevoService {
    constructor() {
        this.isConfigured = false;
        this.configError = null;
        
        // Debug log to verify environment variables
        console.log('Environment check:', {
            hasApiKey: !!process.env.BREVO_API_KEY,
            hasEmailFrom: !!process.env.EMAIL_FROM,
            hasSenderName: !!process.env.BREVO_SENDER_NAME
        });
        
        // Validate configuration first
        if (!process.env.BREVO_API_KEY) {
            this.configError = 'BREVO_API_KEY is not set in environment variables';
            console.error('❌', this.configError);
            return;
        }
        
        if (!process.env.EMAIL_FROM) {
            this.configError = 'EMAIL_FROM is not set in environment variables';
            console.error('❌', this.configError);
            return;
        }

        try {
            // Initialize Brevo API client
            this.apiInstance = new brevo.TransactionalEmailsApi();
            
            // Set API key directly in the headers
            this.apiInstance.defaultHeaders = {
                'api-key': process.env.BREVO_API_KEY,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            };
            
            this.isConfigured = true;
            console.log('✅ Brevo service initialized successfully');
        } catch (error) {
            this.configError = `Failed to initialize Brevo service: ${error.message}`;
            console.error('❌', this.configError);
        }
    }

    // Check if service is properly configured
    checkConfiguration() {
        if (!this.isConfigured) {
            throw new Error(this.configError || 'Brevo service is not properly configured');
        }
    }

    /**
     * Send a single email
     * @param {Object} emailData - Email configuration
     * @param {string|Array} emailData.to - Recipient email(s)
     * @param {string} emailData.subject - Email subject
     * @param {string} emailData.html - HTML content
     * @param {string} emailData.text - Plain text content (optional)
     * @param {Object} emailData.sender - Sender info (optional)
     * @param {Object} emailData.params - Template parameters (optional)
     * @param {Array} emailData.tags - Email tags (optional)
     */
    async sendEmail(emailData) {
        try {
            this.checkConfiguration();
            
            const sendSmtpEmail = new brevo.SendSmtpEmail();
            
            // Set basic email properties
            sendSmtpEmail.subject = emailData.subject;
            sendSmtpEmail.htmlContent = emailData.html;
            
            if (emailData.text) {
                sendSmtpEmail.textContent = emailData.text;
            }
            
            // Set sender
            sendSmtpEmail.sender = emailData.sender || {
                name: process.env.BREVO_SENDER_NAME || 'Pure Tactics Cartel',
                email: process.env.EMAIL_FROM
            };
            
            // Set recipients
            if (Array.isArray(emailData.to)) {
                sendSmtpEmail.to = emailData.to.map(email => 
                    typeof email === 'string' ? { email } : email
                );
            } else {
                sendSmtpEmail.to = [
                    typeof emailData.to === 'string' ? { email: emailData.to } : emailData.to
                ];
            }
            
            // Set optional parameters
            if (emailData.params) {
                sendSmtpEmail.params = emailData.params;
            }
            
            if (emailData.tags) {
                sendSmtpEmail.tags = emailData.tags;
            }
            
            // Set reply-to if provided
            if (emailData.replyTo) {
                sendSmtpEmail.replyTo = emailData.replyTo;
            }
            
            // Send the email
            const response = await this.apiInstance.sendTransacEmail(sendSmtpEmail);
            
            console.log('✅ Email sent successfully:', {
                messageId: response.messageId,
                to: sendSmtpEmail.to.map(recipient => recipient.email),
                subject: emailData.subject
            });
            
            return response;
            
        } catch (error) {
            console.error('❌ Brevo email sending failed:', {
                error: error.message,
                to: emailData.to,
                subject: emailData.subject,
                response: error.response?.body || error.response?.text
            });
            throw new Error(`Failed to send email: ${error.message}`);
        }
    }

    /**
     * Send bulk emails (for newsletter)
     * @param {Array} recipients - Array of recipient objects
     * @param {string} subject - Email subject
     * @param {string} html - HTML content
     * @param {Object} options - Additional options
     */
    async sendBulkEmail(recipients, subject, html, options = {}) {
        try {
            // Brevo recommends sending to max 50 recipients per request
            const batchSize = 50;
            const batches = [];
            
            for (let i = 0; i < recipients.length; i += batchSize) {
                batches.push(recipients.slice(i, i + batchSize));
            }
            
            const results = [];
            
            for (const batch of batches) {
                const emailData = {
                    to: batch,
                    subject,
                    html,
                    ...options
                };
                
                const result = await this.sendEmail(emailData);
                results.push(result);
                
                // Small delay between batches to avoid rate limiting
                if (batches.length > 1) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
            
            console.log(`✅ Bulk email sent to ${recipients.length} recipients in ${batches.length} batches`);
            return results;
            
        } catch (error) {
            console.error('❌ Bulk email sending failed:', error.message);
            throw error;
        }
    }

    /**
     * Send newsletter to subscribers
     * @param {Array} subscribers - Array of subscriber objects
     * @param {Object} newsletter - Newsletter data
     */
    async sendNewsletter(subscribers, newsletter) {
        try {
            if (!subscribers || subscribers.length === 0) {
                console.log('📭 No subscribers to send newsletter to');
                return { sent: 0, failed: 0 };
            }

            console.log(`📧 Sending newsletter to ${subscribers.length} subscribers...`);
            
            // Prepare recipients with unsubscribe URLs
            const recipients = subscribers.map(subscriber => ({
                email: subscriber.email,
                name: subscriber.name || subscriber.email.split('@')[0]
            }));
            
            const result = await this.sendBulkEmail(
                recipients,
                newsletter.subject,
                newsletter.content,
                {
                    tags: ['newsletter', newsletter.category || 'general'],
                    params: {
                        newsletter_id: newsletter._id || 'manual',
                        category: newsletter.category || 'general'
                    }
                }
            );
            
            return {
                sent: recipients.length,
                failed: 0,
                results: result
            };
            
        } catch (error) {
            console.error('❌ Newsletter sending failed:', error.message);
            throw new Error(`Failed to send newsletter: ${error.message}`);
        }
    }

    /**
     * Send article notification to subscribers
     * @param {Array} subscribers - Array of subscriber objects
     * @param {Object} article - Article data
     */
    async sendArticleNotification(subscribers, article) {
        try {
            this.checkConfiguration();
            
            // Get the first 200 characters of the Arabic content for preview
            const previewContent = article.content.ar ? 
                article.content.ar.substring(0, 200) + '...' : 
                'اقرأ المزيد عن هذا المقال المميز';
            
            const articleUrl = `${process.env.FRONTEND_URL}/article/${article.slug}`;
            
            const htmlContent = `
                <!DOCTYPE html>
                <html dir="rtl" lang="ar">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>${article.title.ar} - Pure Tactics Cartel</title>
                    <style>
                        body {
                            font-family: 'Arial', sans-serif;
                            line-height: 1.6;
                            color: #333;
                            margin: 0;
                            padding: 20px;
                            background-color: #f4f4f4;
                        }
                        .container {
                            max-width: 600px;
                            margin: 0 auto;
                            background: white;
                            padding: 20px;
                            border-radius: 10px;
                            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                        }
                        .header {
                            text-align: center;
                            padding: 20px 0;
                            border-bottom: 2px solid #eee;
                        }
                        .content {
                            padding: 20px 0;
                        }
                        .article-preview {
                            background: #f9f9f9;
                            padding: 20px;
                            border-radius: 5px;
                            margin: 20px 0;
                        }
                        .button {
                            display: inline-block;
                            padding: 12px 24px;
                            background-color: #007bff;
                            color: white;
                            text-decoration: none;
                            border-radius: 5px;
                            margin: 20px 0;
                        }
                        .social-icons {
                            text-align: center;
                            margin: 20px 0;
                        }
                        .social-icons a {
                            display: inline-block;
                            margin: 0 10px;
                            color: #333;
                            font-size: 24px;
                            text-decoration: none;
                        }
                        .footer {
                            text-align: center;
                            padding: 20px 0;
                            border-top: 2px solid #eee;
                            font-size: 12px;
                            color: #666;
                        }
                        .article-image {
                            width: 100%;
                            max-height: 300px;
                            object-fit: cover;
                            border-radius: 5px;
                            margin: 20px 0;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Pure Tactics Cartel</h1>
                        </div>
                        <div class="content">
                            <h2>مقال جديد: ${article.title.ar}</h2>
                            ${article.image ? `<img src="${article.image}" alt="${article.title.ar}" class="article-image">` : ''}
                            <div class="article-preview">
                                <p>${previewContent}</p>
                            </div>
                            <p>اقرأ المقال كاملاً على موقعنا:</p>
                            <a href="${articleUrl}" class="button">اقرأ المزيد</a>
                        </div>
                        <div class="social-icons">
                            <a href="https://www.facebook.com/profile.php?id=61557120280089" target="_blank">📘</a>
                            <a href="https://twitter.com/PureTacticsC" target="_blank">📘</a>
                            <a href="#" target="_blank">📸</a>
                            <a href="#" target="_blank">📱</a>
                        </div>
                        <div class="footer">
                            <p>© 2024 Pure Tactics Cartel. جميع الحقوق محفوظة.</p>
                        </div>
                    </div>
                </body>
                </html>
            `;

            const emailPromises = subscribers.map(subscriber => 
                this.sendEmail({
                    to: subscriber.email,
                    subject: `مقال جديد: ${article.title.ar}`,
                    html: htmlContent
                })
            );

            const results = await Promise.allSettled(emailPromises);
            
            const sent = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;
            
            return { sent, failed };
        } catch (error) {
            console.error('Send article notification error:', error);
            throw new Error(`Failed to send article notification: ${error.message}`);
        }
    }

    /**
     * Send welcome/verification email
     * @param {Object} user - User object
     * @param {string} verificationToken - Verification token
     */
    async sendWelcomeEmail(user, verificationToken) {
        try {
            const { getWelcomeEmailTemplate } = require('../templates/emailTemplates');
            
            const verificationUrl = verificationToken 
                ? `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`
                : null;
            
            const template = getWelcomeEmailTemplate(
                user.name || user.email.split('@')[0],
                'en', // Can be determined from user preferences
                verificationUrl
            );
            
            await this.sendEmail({
                to: user.email,
                subject: template.subject,
                html: template.html,
                tags: ['welcome', 'verification']
            });
            
            console.log(`✅ Welcome email sent to ${user.email}`);
            
        } catch (error) {
            console.error('❌ Welcome email sending failed:', error.message);
            // Don't throw error for welcome emails as they're not critical
        }
    }

    /**
     * Send password reset email
     * @param {Object} user - User object
     * @param {string} resetToken - Reset token
     */
    async sendPasswordResetEmail(user, resetToken) {
        try {
            const { getPasswordResetTemplate } = require('../templates/emailTemplates');
            
            const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
            
            const template = getPasswordResetTemplate(
                user.name || user.email.split('@')[0],
                resetUrl,
                'en' // Can be determined from user preferences
            );
            
            await this.sendEmail({
                to: user.email,
                subject: template.subject,
                html: template.html,
                tags: ['password-reset']
            });
            
            console.log(`✅ Password reset email sent to ${user.email}`);
            
        } catch (error) {
            console.error('❌ Password reset email sending failed:', error.message);
            throw new Error(`Failed to send password reset email: ${error.message}`);
        }
    }

    /**
     * Send verification email for newsletter subscription
     * @param {Object} subscription - Subscription object
     * @param {string} verificationToken - Verification token
     */
    async sendVerificationEmail(subscription, verificationToken) {
        try {
            const verificationUrl = `${process.env.FRONTEND_URL}/newsletter/verify/${verificationToken}`;
            
            const { getWelcomeEmailTemplate } = require('../templates/emailTemplates');
            
            const template = getWelcomeEmailTemplate(
                subscription.email.split('@')[0],
                'en', // Can be determined from subscription preferences
                verificationUrl
            );
            
            await this.sendEmail({
                to: subscription.email,
                subject: 'Please verify your newsletter subscription',
                html: template.html,
                tags: ['newsletter-verification']
            });
            
            console.log(`✅ Newsletter verification email sent to ${subscription.email}`);
            
        } catch (error) {
            console.error('❌ Newsletter verification email sending failed:', error.message);
            throw new Error(`Failed to send verification email: ${error.message}`);
        }
    }
}

// Create and export singleton instance
let brevoServiceInstance = null;

const getBrevoService = () => {
    if (!brevoServiceInstance) {
        brevoServiceInstance = new BrevoService();
    }
    return brevoServiceInstance;
};

module.exports = getBrevoService(); 
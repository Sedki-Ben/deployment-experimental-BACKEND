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
            const articleUrl = `${process.env.FRONTEND_URL}/article/${article._id}`;
            const htmlContent = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
                    <h1 style="color: #333;">Pure Tactics Cartel</h1>
                    <h2 style="color: #444;">${article.title}</h2>
                    <p style="color: #555;">${article.summary}</p>
                    <a href="${articleUrl}" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background: #007bff; color: #fff; text-decoration: none; border-radius: 4px;">Read the full article</a>
                    <div style="margin-top: 30px; color: #aaa; font-size: 12px;">&copy; ${new Date().getFullYear()} Pure Tactics Cartel. All rights reserved.</div>
                </div>
            `;
            const emailPromises = subscribers.map(subscriber =>
                this.sendEmail({
                    to: subscriber.email,
                    subject: `New Article: ${article.title}`,
                    html: htmlContent
                })
            );
            await Promise.all(emailPromises);
        } catch (error) {
            console.error('Send article notification error:', error);
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
            this.checkConfiguration();
            const homeUrl = process.env.FRONTEND_URL;
            
            await this.sendEmail({
                to: subscription.email,
                subject: 'مرحباً بك في Pure Tactics Cartel',
                html: `
                    <!DOCTYPE html>
                    <html dir="rtl" lang="ar">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>مرحباً بك في Pure Tactics Cartel</title>
                        <style>
                            body {
                                font-family: Arial, Helvetica, sans-serif;
                                line-height: 1.6;
                                color: #333;
                                margin: 0;
                                padding: 0;
                                background-color: #fff5f5;
                            }
                            .container {
                                max-width: 600px;
                                margin: 0 auto;
                                background: white;
                                border-radius: 15px;
                                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                                overflow: hidden;
                            }
                            .header {
                                background: linear-gradient(135deg, #b00020 0%, #f44336 100%);
                                padding: 40px 20px;
                                text-align: center;
                                color: white;
                            }
                            .header h1 {
                                margin: 0;
                                font-size: 28px;
                                font-weight: bold;
                            }
                            .subtitle {
                                margin-top: 10px;
                                font-size: 16px;
                                opacity: 0.9;
                            }
                            .content {
                                padding: 30px;
                            }
                            .greeting {
                                text-align: center;
                                font-size: 24px;
                                color: #d62828;
                                margin-bottom: 20px;
                            }
                            .welcome-text {
                                text-align: right;
                                margin-bottom: 30px;
                                color: #333;
                            }
                            .features-box {
                                background: #fff5f5;
                                border: 2px solid #f28482;
                                border-radius: 12px;
                                padding: 20px;
                                margin: 20px 0;
                            }
                            .features-title {
                                color: #d62828;
                                font-weight: bold;
                                margin-bottom: 15px;
                                text-align: right;
                            }
                            .feature-item {
                                margin: 10px 0;
                                text-align: right;
                            }
                            .button {
                                display: inline-block;
                                padding: 15px 30px;
                                background: linear-gradient(135deg, #d62828 0%, #e63946 100%);
                                color: white;
                                text-decoration: none;
                                border-radius: 25px;
                                margin: 20px 0;
                                text-align: center;
                                box-shadow: 0 4px 6px rgba(214, 40, 40, 0.2);
                                transition: transform 0.2s;
                            }
                            .button:hover {
                                transform: translateY(-2px);
                            }
                            .social-section {
                                text-align: center;
                                margin: 30px 0;
                            }
                            .social-title {
                                color: #d62828;
                                margin-bottom: 15px;
                            }
                            .social-icons {
                                display: flex;
                                justify-content: center;
                                gap: 20px;
                            }
                            .social-icon {
                                width: 40px;
                                height: 40px;
                                background: #fff5f5;
                                border-radius: 50%;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                color: #d62828;
                                text-decoration: none;
                                transition: transform 0.2s;
                            }
                            .social-icon:hover {
                                transform: scale(1.1);
                            }
                            .footer {
                                text-align: center;
                                padding: 20px;
                                background: #fff5f5;
                                color: #666;
                                font-size: 12px;
                            }
                            @media only screen and (max-width: 600px) {
                                .container {
                                    margin: 10px;
                                }
                                .content {
                                    padding: 20px;
                                }
                                .button {
                                    display: block;
                                    text-align: center;
                                }
                                .social-icons {
                                    flex-wrap: wrap;
                                }
                            }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <h1>Pure Tactics Cartel</h1>
                                <div class="subtitle">الذكاء التكتيكي • الرؤية الثقافية • كرة القدم العالمية</div>
                            </div>
                            <div class="content">
                                <div class="greeting">مرحباً بك عزيزي المشترك!</div>
                                <div class="welcome-text">
                                    شكرًا لانضمامك إلى مجتمع Pure Tactics Cartel! نحن سعداء جدًا بانضمامك إلينا.
                                    ستكون جزءًا من مجتمع يهتم بالتحليلات التكتيكية العميقة، والآراء الثقافية حول كرة القدم، والتحديثات العالمية.
                                </div>
                                <div class="features-box">
                                    <div class="features-title">ما يمكنك فعله:</div>
                                    <div class="feature-item">📖 قراءة تحليلات تكتيكية معمقة</div>
                                    <div class="feature-item">💬 التفاعل مع مجتمعنا</div>
                                    <div class="feature-item">⚽ البقاء على اطلاع بأحدث المستجدات</div>
                                    <div class="feature-item">🌍 استكشاف كرة القدم من منظور عالمي</div>
                                </div>
                                <div style="text-align: center;">
                                    <a href="${homeUrl}" class="button">مرحباً بك في الكارتل</a>
                                </div>
                                <div class="social-section">
                                    <div class="social-title">تواصل معنا عبر:</div>
                                    <div class="social-icons">
                                        <a href="https://www.facebook.com/profile.php?id=61557120280089" class="social-icon" target="_blank">📘</a>
                                        <a href="https://twitter.com/PureTacticsC" class="social-icon" target="_blank">📘</a>
                                        <a href="#" class="social-icon" target="_blank">📸</a>
                                        <a href="#" class="social-icon" target="_blank">📱</a>
                                    </div>
                                </div>
                            </div>
                            <div class="footer">
                                <p>لقد استلمت هذا البريد الإلكتروني لأنك اشتركت في نشرتنا البريدية.</p>
                                <p>© 2024 Pure Tactics Cartel. جميع الحقوق محفوظة.</p>
                            </div>
                        </div>
                    </body>
                    </html>
                `,
                tags: ['welcome', 'subscription']
            });
            
            console.log(`✅ Welcome email sent to ${subscription.email}`);
        } catch (error) {
            console.error('❌ Welcome email sending failed:', error);
            throw error;
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
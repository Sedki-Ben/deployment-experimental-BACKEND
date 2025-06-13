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
                subject: 'Pure Tactics Cartel مرحباً بك في ',
                html: `
                    <!DOCTYPE html>
                    <html dir="rtl" lang="ar">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Pure Tactics Cartel مرحبا بك في</title>
                        <meta name="color-scheme" content="light dark">
                        <meta name="supported-color-schemes" content="light dark">
                        <!--[if mso]>
                        <noscript>
                            <xml>
                                <o:OfficeDocumentSettings>
                                    <o:PixelsPerInch>96</o:PixelsPerInch>
                                </o:OfficeDocumentSettings>
                            </xml>
                        </noscript>
                        <![endif]-->
                        <style>
                            /* Reset & Base Styles */
                            * { margin: 0; padding: 0; box-sizing: border-box; }
                            
                            body {
                                margin: 0 !important;
                                padding: 0 !important;
                                background-color:rgb(194, 194, 201);
                                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans Arabic', sans-serif;
                                line-height: 1.6;
                                color: #2c3e50;
                                -webkit-text-size-adjust: 100%;
                                -ms-text-size-adjust: 100%;
                            }
                            
                            /* Dark mode support */
                            @media (prefers-color-scheme: dark) {
                                body { background-color: #1a1a1a !important; }
                                .email-container { background-color: #2d2d2d !important; }
                                .content-text { color: #e0e0e0 !important; }
                                .features-card { background-color: #3a3a3a !important; border-color: #555 !important; }
                            }
                            
                            /* Email Container - Table Based for Compatibility */
                            .email-wrapper {
                                width: 100%;
                                background-color:rgb(111, 163, 219);
                                padding: 20px 0;
                            }
                            
                            .email-container {
                                max-width: 640px;
                                margin: 0 auto;
                                background:linear-gradient(135deg, rgba(189, 184, 184, 0.8) 30%, #fff8f3 100%);
                                border-radius: 16px;
                                overflow: hidden;
                                box-shadow: 0 8px 32px rgba(0,0,0,0.08);
                            }
                            
                            /* Header Section */
                            .header {
                                background: linear-gradient(135deg,rgb(255, 255, 255) 30%, rgb(255, 0, 0) 70%);
                                padding: 48px 24px;
                                text-align: center;
                                position: relative;
                            }
                            
                            .header::before {
                                content: '';
                                position: absolute;
                                top: 0;
                                left: 0;
                                right: 0;
                                bottom: 0;
                                background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="10" cy="10" r="1" fill="rgba(255,255,255,0.1)"/></pattern></defs><rect width="100" height="100" fill="url(%23pattern)"/></svg>');
                                opacity: 0.3;
                            }
                            
                            .header-content { position: relative; z-index: 1; }
                            
                            .logo {
                                font-size: 32px;
                                font-weight: 800;
                                color: #ffffff;
                                margin-bottom: 8px;
                                letter-spacing: -0.5px;
                            }
                            
                            .tagline {
                                font-size: 28px;
                                color: rgba(255,255,255,0.95);
                                font-weight: 700;
                                margin-bottom: 24px;
                            }
                            
                            
                            /* Content Sections */
                            .content {
                                padding: 40px 32px;
                            }
                            
                            .greeting {
                                text-align: center;
                                margin-bottom: 32px;
                            }
                            
                            .greeting-title {
                                font-size: 28px;
                                color: #c62828;
                                font-weight: 700;
                                margin-bottom: 12px;
                            }
                            
                            .greeting-subtitle {
                                font-size: 20px;
                                color: #c62828;
                                font-weight: 600;
                            }
                            
                            .welcome-message {
                                background: linear-gradient(135deg,rgb(255, 0, 0) 50%,rgb(255, 255, 255) 50%);
                                border-right: 4px solidrgb(255, 0, 0);
                                padding: 24px;
                                margin: 32px 0;
                                border-radius: 12px;
                                text-align: right;
                            }
                            
                            .welcome-text {
                                font-size: 20px;
                                line-height: 1.8;
                                color:rgb(0, 0, 0);
                                margin-bottom: 16px;
                            }
                            
                            .stats-row {
                                display: table;
                                width: 100%;
                                margin: 32px 0;
                            }
                            
                            .stat-item {
                                display: table-cell;
                                text-align: center;
                                padding: 16px;
                                vertical-align: top;
                            }
                            
                            .stat-number {
                                font-size: 24px;
                                font-weight: 700;
                                color: #c62828;
                                display: block;
                            }
                            
                            .stat-label {
                                font-size: 14px;
                                color: #78909c;
                                margin-top: 4px;
                            }
                            
                            /* Features Grid */
                            .features-grid {
                                margin: 32px 0;
                            }
                            
                            .features-title {
                                font-size: 20px;
                                font-weight: 700;
                                color: #c62828;
                                text-align: right;
                                margin-bottom: 24px;
                            }
                            
                            .feature-card {
                                background: #ffffff;
                                border: 2px solid #ffecec;
                                border-radius: 12px;
                                padding: 20px;
                                margin-bottom: 16px;
                                text-align: right;
                                transition: border-color 0.2s ease;
                            }
                            
                            /* Outlook fallback */
                            .feature-card:hover {
                                border-color: #ffcdd2;
                            }
                            
                            .feature-icon {
                                font-size: 24px;
                                margin-left: 12px;
                                vertical-align: middle;
                            }
                            
                            .feature-text {
                                font-size: 16px;
                                color: #455a64;
                                font-weight: 500;
                                vertical-align: middle;
                            }
                            
                            /* CTA Section */
                            .cta-section {
                                text-align: center;
                                margin: 40px 0;
                                padding: 32px 24px;
                                background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%);
                                border-radius: 16px;
                            }
                            
                            .cta-title {
                                font-size: 20px;
                                color: #c62828;
                                font-weight: 700;
                                margin-bottom: 16px;
                            }
                            
                            .cta-button {
                                display: inline-block;
                                padding: 16px 32px;
                                background: linear-gradient(135deg, #c62828 0%, #d32f2f 100%);
                                color: #ffffff !important;
                                text-decoration: none;
                                border-radius: 50px;
                                font-weight: 600;
                                font-size: 16px;
                                box-shadow: 0 4px 16px rgba(198, 40, 40, 0.3);
                                border: none;
                                cursor: pointer;
                            }
                            
                            /* Social Section */
                            .social-section {
                                text-align: center;
                                margin: 40px 0;
                                padding: 24px;
                                background: #fff;
                                border-radius: 12px;
                            }
                            
                            .social-title {
                                font-size: 18px;
                                color: #c62828;
                                font-weight: 600;
                                margin-bottom: 20px;
                            }
                            
                            .social-links {
                                text-align: center;
                            }
                            
                            .social-link {
                                display: inline-block;
                                width: 48px;
                                height: 48px;
                                background: #f8f9fa;
                                border: 2px solid #e0e0e0;
                                border-radius: 50%;
                                margin: 0 8px;
                                text-decoration: none;
                                vertical-align: middle;
                                line-height: 44px;
                                font-size: 20px;
                            }
                            
                            .social-link.facebook { color: #1877f2; border-color: #e3f2fd; background: #f3f9ff; }
                            .social-link.twitter { color: #1da1f2; border-color: #e1f5fe; background: #f0faff; }
                            .social-link.instagram { color: #e4405f; border-color: #fce4ec; background: #fff0f3; }
                            .social-link.telegram { color:rgb(156, 0, 204); border-color: #e0f2f1; background: #f0fffe; }
                            
                            /* Footer */
                            .footer {
                                background: #f8f9fa;
                                padding: 32px 24px;
                                text-align: center;
                                border-top: 1px solid #e0e0e0;
                            }
                            
                            .footer-text {
                                font-size: 14px;
                                color: #78909c;
                                line-height: 1.6;
                                margin-bottom: 12px;
                            }
                            
                            .unsubscribe-link {
                                color: #c62828;
                                text-decoration: none;
                                font-weight: 500;
                            }
                            
                            /* Mobile Responsiveness */
                            @media only screen and (max-width: 640px) {
                                .email-wrapper { padding: 10px 0; }
                                .email-container { margin: 0 10px; border-radius: 12px; }
                                .header { padding: 32px 20px; }
                                .logo { font-size: 28px; }
                                .content { padding: 24px 20px; }
                                .greeting-title { font-size: 24px; }
                                .welcome-message { padding: 20px; }
                                .stats-row { display: block; }
                                .stat-item { display: block; padding: 12px 0; }
                                .cta-section { padding: 24px 16px; }
                                .cta-button { display: block; margin: 0 auto; }
                                .social-link { margin: 0 4px; }
                            }
                            
                            /* High DPI Support */
                            @media only screen and (-webkit-min-device-pixel-ratio: 2), 
                                only screen and (min-resolution: 192dpi) {
                                .cta-button { box-shadow: 0 2px 8px rgba(198, 40, 40, 0.4); }
                            }
                        </style>
                    </head>
                    <body>
                        <div class="email-wrapper">
                            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f8f9fa;">
                                <tr>
                                    <td align="center" valign="top">
                                        <div class="email-container">
                                            <!-- Header -->
                                            <div class="header">
                                                <div class="header-content">
                                                    <div class="logo">Pure Tactics Cartel</div>
                                                    <div class="tagline">فضاؤكم لكرة القدم العالمية</div>
                                                    <div class="hero-badge">مجتمع النخبة التكتيكية</div>
                                                </div>
                                            </div>
                                            
                                            <!-- Content -->
                                            <div class="content">
                                                <!-- Greeting -->
                                                <div class="greeting">
                                                    <div class="greeting-title">أهلاً وسهلاً بك</div>
                                                    <div class="greeting-subtitle"> Pure Tactics Cartel في عائلة </div>
                                                </div>
                                                
                                                <!-- Welcome Message -->
                                                <div class="welcome-message">
                                                    <div class="welcome-text">
                                                        مرحباً بك في مجتمعنا المتميز! أنت الآن جزء من نخبة محللي كرة القدم والمهتمين بالتكتيكات المتقدمة.
                                                    </div>
                                                    <div class="welcome-text">
                                                        نحن متحمسون لمشاركة أعمق التحليلات التكتيكية وأحدث الرؤى الثقافية معك.
                                                    </div>
                                                </div>
                                                
                                                <!-- Stats Row -->
                                                <div class="stats-row">
                                                    <div class="stat-item">
                                                        <span class="stat-number">15K+</span>
                                                        <span class="stat-label">عضو نشط</span>
                                                    </div>
                                                    <div class="stat-item">
                                                        <span class="stat-number">200+</span>
                                                        <span class="stat-label">تحليل أسبوعي</span>
                                                    </div>
                                                    <div class="stat-item">
                                                        <span class="stat-number">50+</span>
                                                        <span class="stat-label">دوري مُغطى</span>
                                                    </div>
                                                </div>
                                                
                                                <!-- Features -->
                                                <div class="features-grid">
                                                    <div class="features-title">ما الذي ينتظرك:</div>
                                                    
                                                    <div class="feature-card">
                                                        <span class="feature-icon">🌍</span>
                                                        <span class="feature-text">تحليلات تكتيكية متعمقة للمباريات الكبرى</span>
                                                    </div>
                                                    
                                                    <div class="feature-card">
                                                        <span class="feature-icon">🧠</span>
                                                        <span class="feature-text">رؤى استراتيجية حول إدارة كرة القدم</span>
                                                    </div>
                                                    
                                                    <div class="feature-card">
                                                        <span class="feature-icon"></span>
                                                        <span class="feature-text">متابعة دائمة لشؤون النجم الساحلي</span>
                                                    </div>
                                                    
                                                    <div class="feature-card">
                                                        <span class="feature-icon">💬</span>
                                                        <span class="feature-text">مناقشات حية وآراء متبادلة</span>
                                                    </div>
                                                </div>
                                                
                                                <!-- CTA Section -->
                                                <div class="cta-section">
                                                    <a href="${homeUrl}" class="cta-button">انضم إلى الكارتال</a>
                                                </div>
                                                
                                                <!-- Social Section -->
                                                <div class="social-section">
                                                    <div class="social-title">تابعنا على منصاتنا:</div>
                                                    <div class="social-links">
                                                        <a href="https://www.facebook.com/profile.php?id=61557120280089" class="social-link facebook" target="_blank" aria-label="Facebook">facebook</a>
                                                        <a href="https://twitter.com/PureTacticsC" class="social-link twitter" target="_blank" aria-label="Twitter">twitter</a>
                                                        <a href="#" class="social-link instagram" target="_blank" aria-label="Instagram">instagram</a>
                                                        <a href="#" class="social-link telegram" target="_blank" aria-label="Telegram">TikTok</a>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <!-- Footer -->
                                            <div class="footer">
                                                <div class="footer-text">
                                                    تلقيت هذا البريد لأنك اشتركت في نشرتنا الإخبارية.
                                                </div>
                                                <div class="footer-text">
                                                    لا تريد استلام هذه الرسائل؟ <a href="#" class="unsubscribe-link">إلغاء الاشتراك</a>
                                                </div>
                                                <div class="footer-text">
                                                    © 2024 Pure Tactics Cartel. جميع الحقوق محفوظة.
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </div>
                    </body>
                    </html>
                `,
                tags: ['welcome', 'subscription', 'modern', 'responsive']
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
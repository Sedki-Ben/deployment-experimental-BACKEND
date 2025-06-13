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
                                background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans Arabic', sans-serif;
                                line-height: 1.6;
                                color: #334155;
                                -webkit-text-size-adjust: 100%;
                                -ms-text-size-adjust: 100%;
                                min-height: 100vh;
                            }
                            
                            /* Dark mode support */
                            @media (prefers-color-scheme: dark) {
                                body { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%) !important; }
                                .email-container { background: linear-gradient(145deg, #1e293b 0%, #334155 100%) !important; }
                                .content-text { color: #e2e8f0 !important; }
                                .features-card { background: linear-gradient(145deg, #334155 0%, #475569 100%) !important; }
                            }
                            
                            /* Email Container - Table Based for Compatibility */
                            .email-wrapper {
                                width: 100%;
                                background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                                padding: 30px 0;
                            }
                            
                            .email-container {
                                max-width: 640px;
                                margin: 0 auto;
                                background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
                                border-radius: 24px;
                                overflow: hidden;
                                box-shadow: 
                                    0 25px 50px rgba(0,0,0,0.08),
                                    0 10px 20px rgba(51, 65, 85, 0.12),
                                    inset 0 1px 0 rgba(255,255,255,0.8);
                                border: 1px solid rgba(226, 232, 240, 0.6);
                            }
                            
                            /* Header Section */
                            .header {
                                background: linear-gradient(135deg, #6b7280 0%, #4b5563 50%, #374151 100%);
                                padding: 52px 28px;
                                text-align: center;
                                position: relative;
                                box-shadow: 
                                    0 8px 32px rgba(55, 65, 81, 0.2),
                                    inset 0 -1px 0 rgba(0,0,0,0.1);
                            }
                            
                            .header-content { position: relative; z-index: 1; }
                            
                            .logo {
                                font-size: 36px;
                                font-weight: 800;
                                color: #ffffff;
                                margin-bottom: 12px;
                                letter-spacing: -0.5px;
                                text-shadow: 0 2px 4px rgba(0,0,0,0.2);
                            }
                            
                            .tagline {
                                font-size: 18px;
                                color: rgba(255,255,255,0.9);
                                font-weight: 500;
                                text-shadow: 0 1px 2px rgba(0,0,0,0.1);
                            }
                            
                            /* Content Sections */
                            .content {
                                padding: 44px 36px;
                                background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
                            }
                            
                            .greeting {
                                text-align: center;
                                margin-bottom: 36px;
                            }
                            
                            .greeting-title {
                                font-size: 32px;
                                color: #475569;
                                font-weight: 700;
                                margin-bottom: 16px;
                                text-shadow: 0 1px 2px rgba(71, 85, 105, 0.1);
                            }
                            
                            .greeting-subtitle {
                                font-size: 20px;
                                color: #64748b;
                                font-weight: 400;
                            }
                            
                            .welcome-message {
                                background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
                                border-right: 4px solid #64748b;
                                padding: 28px;
                                margin: 36px 0;
                                border-radius: 16px;
                                text-align: right;
                                box-shadow: 
                                    0 8px 16px rgba(51, 65, 85, 0.08),
                                    inset 0 1px 0 rgba(255,255,255,0.8);
                            }
                            
                            .welcome-text {
                                font-size: 18px;
                                line-height: 1.9;
                                color: #334155;
                                margin-bottom: 0;
                            }
                            
                            .stats-row {
                                display: table;
                                width: 100%;
                                margin: 36px 0;
                                background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
                                border-radius: 16px;
                                padding: 24px;
                                box-shadow: 
                                    0 8px 16px rgba(51, 65, 85, 0.06),
                                    inset 0 1px 0 rgba(255,255,255,0.8);
                            }
                            
                            .stat-item {
                                display: table-cell;
                                text-align: center;
                                padding: 20px;
                                vertical-align: top;
                            }
                            
                            .stat-number {
                                font-size: 20px;
                                font-weight: 700;
                                color: #6b7280;
                                display: block;
                                text-shadow: 0 2px 4px rgba(107, 114, 128, 0.3);
                            }
                            
                            .stat-label {
                                font-size: 16px;
                                color: #9ca3af;
                                margin-top: 8px;
                            }
                            
                            /* Features Grid */
                            .features-grid {
                                margin: 36px 0;
                            }
                            
                            .features-title {
                                font-size: 22px;
                                font-weight: 700;
                                color: #475569;
                                text-align: right;
                                margin-bottom: 28px;
                                text-shadow: 0 1px 2px rgba(71, 85, 105, 0.1);
                            }
                            
                            .feature-card {
                                background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                                border: 1px solid rgba(226, 232, 240, 0.8);
                                border-radius: 16px;
                                padding: 24px;
                                margin-bottom: 20px;
                                text-align: right;
                                transition: all 0.3s ease;
                                box-shadow: 
                                    0 4px 8px rgba(51, 65, 85, 0.06),
                                    inset 0 1px 0 rgba(255,255,255,0.9);
                            }
                            
                            .feature-card:hover {
                                border-color: #cbd5e1;
                                transform: translateY(-1px);
                                box-shadow: 
                                    0 8px 16px rgba(51, 65, 85, 0.12),
                                    0 2px 4px rgba(100, 116, 139, 0.1),
                                    inset 0 1px 0 rgba(255,255,255,0.95);
                            }
                            
                            .feature-icon {
                                font-size: 20px;
                                margin-left: 16px;
                                vertical-align: middle;
                                opacity: 0.8;
                            }
                            
                            .feature-text {
                                font-size: 18px;
                                color: #334155;
                                font-weight: 500;
                                vertical-align: middle;
                            }
                            
                            /* CTA Section */
                            .cta-section {
                                text-align: center;
                                margin: 44px 0;
                                padding: 36px 28px;
                                background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
                                border-radius: 20px;
                                box-shadow: 
                                    0 8px 16px rgba(51, 65, 85, 0.08),
                                    inset 0 1px 0 rgba(255,255,255,0.8);
                            }
                            
                            .cta-title {
                                font-size: 22px;
                                color: #475569;
                                font-weight: 700;
                                margin-bottom: 20px;
                                text-shadow: 0 1px 2px rgba(71, 85, 105, 0.1);
                            }
                            
                            .cta-button {
                                display: inline-block;
                                padding: 18px 36px;
                                background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
                                color: #ffffff !important;
                                text-decoration: none;
                                border-radius: 50px;
                                font-weight: 600;
                                font-size: 18px;
                                box-shadow: 
                                    0 6px 12px rgba(55, 65, 81, 0.2),
                                    0 2px 4px rgba(0,0,0,0.1),
                                    inset 0 1px 0 rgba(255,255,255,0.15);
                                border: none;
                                cursor: pointer;
                                transition: all 0.3s ease;
                            }
                            
                            .cta-button:hover {
                                transform: translateY(-1px);
                                box-shadow: 
                                    0 8px 16px rgba(55, 65, 81, 0.25),
                                    0 4px 8px rgba(0,0,0,0.15),
                                    inset 0 1px 0 rgba(255,255,255,0.2);
                            }
                            
                            /* Social Section */
                            .social-section {
                                text-align: center;
                                margin: 44px 0;
                                padding: 28px;
                                background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                                border-radius: 16px;
                                box-shadow: 
                                    0 6px 12px rgba(51, 65, 85, 0.06),
                                    inset 0 1px 0 rgba(255,255,255,0.9);
                            }
                            
                            .social-title {
                                font-size: 20px;
                                color: #475569;
                                font-weight: 600;
                                margin-bottom: 24px;
                                text-shadow: 0 1px 2px rgba(71, 85, 105, 0.05);
                            }
                            
                            .social-links {
                                text-align: center;
                            }
                            
                            .social-link {
                                display: inline-block;
                                width: 48px;
                                height: 48px;
                                background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
                                border: 1px solid rgba(203, 213, 225, 0.6);
                                border-radius: 50%;
                                margin: 0 8px;
                                text-decoration: none;
                                vertical-align: middle;
                                line-height: 46px;
                                font-size: 18px;
                                transition: all 0.3s ease;
                                box-shadow: 
                                    0 3px 6px rgba(51, 65, 85, 0.08),
                                    inset 0 1px 0 rgba(255,255,255,0.8);
                            }
                            
                            .social-link:hover {
                                transform: translateY(-2px);
                                border-color: #94a3b8;
                                box-shadow: 
                                    0 6px 12px rgba(51, 65, 85, 0.12),
                                    0 2px 4px rgba(100, 116, 139, 0.08);
                            }
                            
                            .social-link.facebook { color: #1877f2; }
                            .social-link.twitter { color: #1da1f2; }
                            .social-link.instagram { color: #e4405f; }
                            .social-link.telegram { color: #64748b; }
                            
                            /* Footer */
                            .footer {
                                background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
                                padding: 36px 28px;
                                text-align: center;
                                border-top: 1px solid rgba(203, 213, 225, 0.6);
                            }
                            
                            .footer-text {
                                font-size: 16px;
                                color: #64748b;
                                line-height: 1.7;
                                margin-bottom: 16px;
                            }
                            
                            .unsubscribe-link {
                                color: #475569;
                                text-decoration: none;
                                font-weight: 500;
                            }
                            
                            /* Mobile Responsiveness */
                            @media only screen and (max-width: 640px) {
                                .email-wrapper { padding: 15px 0; }
                                .email-container { margin: 0 15px; border-radius: 16px; }
                                .header { padding: 36px 24px; }
                                .logo { font-size: 32px; }
                                .content { padding: 28px 24px; }
                                .greeting-title { font-size: 28px; }
                                .welcome-message { padding: 24px; }
                                .stats-row { display: block; }
                                .stat-item { display: block; padding: 16px 0; }
                                .cta-section { padding: 28px 20px; }
                                .cta-button { display: block; margin: 0 auto; }
                                .social-link { margin: 0 6px; }
                            }
                            
                            /* High DPI Support */
                            @media only screen and (-webkit-min-device-pixel-ratio: 2), 
                                only screen and (min-resolution: 192dpi) {
                                .cta-button { box-shadow: 0 4px 12px rgba(107, 114, 128, 0.5); }
                            }
                        </style>
                    </head>
                    <body>
                        <div class="email-wrapper">
                            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);">
                                <tr>
                                    <td align="center" valign="top">
                                        <div class="email-container">
                                            <!-- Header -->
                                            <div class="header">
                                                <div class="header-content">
                                                    <div class="logo">Pure Tactics Cartel</div>
                                                    <div class="tagline">فضاؤكم لكرة القدم العالمية</div>
                                                </div>
                                            </div>
                                            
                                            <!-- Content -->
                                            <div class="content">
                                                <!-- Greeting -->
                                                <div class="greeting">
                                                    <div class="greeting-subtitle"> Pure Tactics Cartel في عائلة</div>
                                                    <div class="greeting-title">أهلاً وسهلاً بك</div>
                                                     
                                                </div>
                                                
                                                <!-- Welcome Message -->
                                                <div class="welcome-message">
                                                    <div class="welcome-text">
                                                        مرحبا بكم في مجتمع الPTC، أين أحاول مشاركة نظرتي لكرة القدم معكم، سواء تعلق الأمر بالبطولات العالمية، العربية او بشكل أخص فريقي النجم الرياضي الساحلي.
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
                                                        <span class="feature-icon">⭐</span>
                                                        <span class="feature-text">متابعة دائمة لشؤون النجم الساحلي</span>
                                                    </div>
                                                    
                                                    <div class="feature-card">
                                                        <span class="feature-icon">💬</span>
                                                        <span class="feature-text">مناقشات حية وآراء متبادلة</span>
                                                    </div>
                                                </div>
                                                
                                                <!-- CTA Section -->
                                                <div class="cta-section">
                                                    <a href="#" class="cta-button">انضم إلى الكارتال</a>
                                                </div>
                                                
                                                <!-- Social Section -->
                                                <div class="social-section">
                                                    <div class="social-title">تابعنا على منصاتنا:</div>
                                                    <div class="social-links">
                                                        <a href="https://www.facebook.com/profile.php?id=61557120280089" class="social-link facebook" target="_blank" aria-label="Facebook">📘</a>
                                                        <a href="https://twitter.com/PureTacticsC" class="social-link twitter" target="_blank" aria-label="Twitter">🐦</a>
                                                        <a href="#" class="social-link instagram" target="_blank" aria-label="Instagram">📷</a>
                                                        <a href="#" class="social-link telegram" target="_blank" aria-label="TikTok">🎵</a>
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
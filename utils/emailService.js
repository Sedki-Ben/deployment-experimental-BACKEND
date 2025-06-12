const SibApiV3Sdk = require('sib-api-v3-sdk');

// Initialize Brevo/Sendinblue client
let defaultClient = SibApiV3Sdk.ApiClient.instance;
let apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;

// Initialize API instances
const transactionalEmailsApi = new SibApiV3Sdk.TransactionalEmailsApi();
const contactsApi = new SibApiV3Sdk.ContactsApi();

console.log('BREVO_API_KEY configured:', !!process.env.BREVO_API_KEY);

class EmailService {
    // Base email template with Pure Tactics Cartel branding
    static getBaseTemplate(content, title = 'Pure Tactics Cartel') {
        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${title}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                    font-family: 'Georgia', 'Times New Roman', serif; 
                    line-height: 1.6; 
                    color: #333; 
                    background-color: #f8f9fa; 
                }
                .container { 
                    max-width: 600px; 
                    margin: 0 auto; 
                    background: white; 
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1); 
                }
                .header { 
                    background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); 
                    color: white; 
                    padding: 30px 20px; 
                    text-align: center; 
                }
                .header h1 { 
                    font-size: 28px; 
                    font-weight: bold; 
                    margin-bottom: 8px; 
                    letter-spacing: 1px; 
                }
                .header p { 
                    font-size: 16px; 
                    opacity: 0.9; 
                    font-style: italic; 
                }
                .content { 
                    padding: 40px 30px; 
                }
                .footer { 
                    background: #f1f5f9; 
                    padding: 30px; 
                    text-align: center; 
                    border-top: 1px solid #e2e8f0; 
                }
                .btn { 
                    display: inline-block; 
                    padding: 12px 30px; 
                    background: #3b82f6; 
                    color: white; 
                    text-decoration: none; 
                    border-radius: 6px; 
                    font-weight: bold; 
                    margin: 20px 0; 
                    transition: background 0.3s; 
                }
                .btn:hover { background: #2563eb; }
                .social-links { margin: 20px 0; }
                .social-links a { 
                    display: inline-block; 
                    margin: 0 10px; 
                    color: #64748b; 
                    text-decoration: none; 
                }
                .divider { 
                    height: 1px; 
                    background: #e2e8f0; 
                    margin: 30px 0; 
                }
                @media (max-width: 600px) {
                    .container { margin: 0; }
                    .content { padding: 20px; }
                    .header { padding: 20px; }
                    .header h1 { font-size: 24px; }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Pure Tactics Cartel</h1>
                    <p>Where Football Intelligence Meets Passion</p>
                </div>
                <div class="content">
                    ${content}
                </div>
                <div class="footer">
                    <div class="social-links">
                        <a href="${process.env.FRONTEND_URL}">Visit Website</a> |
                        <a href="${process.env.FRONTEND_URL}/about">About Us</a> |
                        <a href="${process.env.FRONTEND_URL}/archive">Archive</a>
                    </div>
                    <p style="color: #64748b; font-size: 14px; margin-top: 15px;">
                        You're receiving this email because you subscribed to Pure Tactics Cartel newsletter.
                    </p>
                    <p style="color: #64748b; font-size: 12px; margin-top: 10px;">
                        <a href="{{params.unsubscribeUrl}}" style="color: #64748b;">Unsubscribe</a> | 
                        Pure Tactics Cartel © ${new Date().getFullYear()}
                    </p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    // Send welcome email to new subscribers
    static async sendWelcomeEmail(user) {
        try {
            const content = `
                <h2 style="color: #1e3a8a; margin-bottom: 20px;">Welcome to the Cartel, ${user.name || 'Football Enthusiast'}! ⚽</h2>
                
                <p style="font-size: 16px; margin-bottom: 20px;">
                    Thank you for joining Pure Tactics Cartel – where tactical intelligence meets cultural insight, 
                    and where the love for football is spoken in many languages.
                </p>
                
                <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 25px 0;">
                    <h3 style="color: #1e3a8a; margin-bottom: 15px;">What You Can Expect:</h3>
                    <ul style="list-style: none; padding: 0;">
                        <li style="margin: 10px 0; padding-left: 25px; position: relative;">
                            <span style="position: absolute; left: 0; color: #3b82f6;">⚽</span>
                            In-depth tactical analysis of international fixtures
                        </li>
                        <li style="margin: 10px 0; padding-left: 25px; position: relative;">
                            <span style="position: absolute; left: 0; color: #3b82f6;">🏆</span>
                            Exclusive coverage of Champions League and World Cup
                        </li>
                        <li style="margin: 10px 0; padding-left: 25px; position: relative;">
                            <span style="position: absolute; left: 0; color: #3b82f6;">📊</span>
                            Strategic breakdowns of top leagues (La Liga, Premier League, and more)
                        </li>
                        <li style="margin: 10px 0; padding-left: 25px; position: relative;">
                            <span style="position: absolute; left: 0; color: #3b82f6;">🌟</span>
                            Special focus on Étoile du Sahel and Tunisian football
                        </li>
                    </ul>
                </div>
                
                <p style="font-size: 16px; margin: 25px 0;">
                    From the heart of Tunisian football to the global stage, we bring you content that goes beyond 
                    the surface – because behind every word, there are hours of work.
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.FRONTEND_URL}" class="btn">Start Exploring</a>
                </div>
                
                <p style="font-style: italic; color: #64748b; text-align: center;">
                    "Depth and accuracy over hype" – Welcome to Pure Tactics Cartel
                </p>
            `;

            const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
            sendSmtpEmail.to = [{ email: user.email, name: user.name }];
            sendSmtpEmail.sender = { email: process.env.EMAIL_FROM, name: 'Pure Tactics Cartel' };
            sendSmtpEmail.subject = 'Welcome to Pure Tactics Cartel ⚽';
            sendSmtpEmail.htmlContent = this.getBaseTemplate(content, 'Welcome to Pure Tactics Cartel');

            await transactionalEmailsApi.sendTransacEmail(sendSmtpEmail);
            console.log('Welcome email sent successfully to:', user.email);
        } catch (error) {
            console.error('Send welcome email error:', error);
            // Don't throw error as this is not critical
        }
    }

    // Send password reset email
    static async sendPasswordResetEmail(user, resetToken) {
        try {
            const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
            const content = `
                <h2 style="color: #dc2626; margin-bottom: 20px;">Password Reset Request</h2>
                
                <p style="font-size: 16px; margin-bottom: 20px;">
                    Hello ${user.name || 'there'},
                </p>
                
                <p style="font-size: 16px; margin-bottom: 25px;">
                    We received a request to reset your password for your Pure Tactics Cartel account. 
                    If you made this request, click the button below to reset your password:
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetUrl}" class="btn" style="background: #dc2626;">Reset My Password</a>
                </div>
                
                <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 25px 0;">
                    <p style="color: #dc2626; font-weight: bold; margin-bottom: 5px;">Important:</p>
                    <p style="color: #7f1d1d; font-size: 14px;">
                        This link will expire in 1 hour for security reasons. If you didn't request this reset, 
                        please ignore this email and your password will remain unchanged.
                    </p>
                </div>
                
                <p style="font-size: 14px; color: #64748b; margin-top: 25px;">
                    If the button doesn't work, copy and paste this link into your browser:<br>
                    <a href="${resetUrl}" style="color: #3b82f6; word-break: break-all;">${resetUrl}</a>
                </p>
            `;

            const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
            sendSmtpEmail.to = [{ email: user.email, name: user.name }];
            sendSmtpEmail.sender = { email: process.env.EMAIL_FROM, name: 'Pure Tactics Cartel' };
            sendSmtpEmail.subject = 'Reset Your Password - Pure Tactics Cartel';
            sendSmtpEmail.htmlContent = this.getBaseTemplate(content, 'Password Reset');

            await transactionalEmailsApi.sendTransacEmail(sendSmtpEmail);
            console.log('Password reset email sent successfully to:', user.email);
        } catch (error) {
            console.error('Send password reset email error:', error);
            throw new Error('Error sending password reset email');
        }
    }

    // Send email verification
    static async sendVerificationEmail(subscription, verificationToken) {
        try {
            const verifyUrl = `${process.env.FRONTEND_URL}/api/newsletter/verify/${verificationToken}`;
            const content = `
                <h2 style="color: #059669; margin-bottom: 20px;">Confirm Your Subscription ✅</h2>
                
                <p style="font-size: 16px; margin-bottom: 20px;">
                    Thank you for subscribing to Pure Tactics Cartel newsletter!
                </p>
                
                <p style="font-size: 16px; margin-bottom: 25px;">
                    To complete your subscription and start receiving our tactical insights, 
                    please confirm your email address by clicking the button below:
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${verifyUrl}" class="btn" style="background: #059669;">Confirm Subscription</a>
                </div>
                
                <div style="background: #f0fdf4; border-left: 4px solid #059669; padding: 15px; margin: 25px 0;">
                    <p style="color: #059669; font-weight: bold; margin-bottom: 5px;">What's Next?</p>
                    <p style="color: #166534; font-size: 14px;">
                        Once confirmed, you'll receive notifications whenever we publish new tactical analyses, 
                        match breakdowns, and exclusive football insights.
                    </p>
                </div>
                
                <p style="font-size: 14px; color: #64748b; margin-top: 25px;">
                    If you didn't subscribe to our newsletter, please ignore this email.<br>
                    This verification link will expire in 24 hours.
                </p>
            `;

            const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
            sendSmtpEmail.to = [{ email: subscription.email }];
            sendSmtpEmail.sender = { email: process.env.EMAIL_FROM, name: 'Pure Tactics Cartel' };
            sendSmtpEmail.subject = 'Confirm Your Newsletter Subscription - Pure Tactics Cartel';
            sendSmtpEmail.htmlContent = this.getBaseTemplate(content, 'Confirm Subscription');

            await transactionalEmailsApi.sendTransacEmail(sendSmtpEmail);
            console.log('Verification email sent successfully to:', subscription.email);
        } catch (error) {
            console.error('Send verification email error:', error);
            throw new Error('Error sending verification email');
        }
    }

    // Send newsletter to subscribers
    static async sendNewsletterEmail(subscribers, newsletter) {
        try {
            const content = `
                <div style="margin-bottom: 30px;">
                    ${newsletter.content}
                </div>
            `;

            const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
            sendSmtpEmail.to = subscribers.map(sub => ({ email: sub.email }));
            sendSmtpEmail.sender = { email: process.env.EMAIL_FROM, name: 'Pure Tactics Cartel' };
            sendSmtpEmail.subject = newsletter.subject;
            sendSmtpEmail.htmlContent = this.getBaseTemplate(content, newsletter.subject);

            await transactionalEmailsApi.sendTransacEmail(sendSmtpEmail);
            console.log(`Newsletter sent successfully to ${subscribers.length} subscribers`);
        } catch (error) {
            console.error('Send newsletter error:', error);
            throw new Error('Error sending newsletter');
        }
    }

    // Send new article notification (main feature)
    static async sendArticleNotification(subscribers, article) {
        try {
            // Get article URL - handle both slug and ID
            const articleUrl = article.slug 
                ? `${process.env.FRONTEND_URL}/article/${article.slug}`
                : `${process.env.FRONTEND_URL}/article/${article._id}`;

            // Get category display name
            const getCategoryName = (category) => {
                const categoryNames = {
                    'etoile-du-sahel': 'Étoile Du Sahel',
                    'the-beautiful-game': 'The Beautiful Game',
                    'all-sports-hub': 'All Sports Hub'
                };
                return categoryNames[category] || category;
            };

            const categoryName = getCategoryName(article.category);
            const publishDate = new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            const content = `
                <div style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); padding: 20px; border-radius: 10px; margin-bottom: 30px;">
                    <p style="color: #3b82f6; font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">
                        🆕 New Article Published
                    </p>
                    <h2 style="color: #1e3a8a; font-size: 24px; margin-bottom: 15px; line-height: 1.3;">
                        ${article.title}
                    </h2>
                    <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px; font-size: 14px; color: #64748b;">
                        <span style="background: #3b82f6; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px;">
                            ${categoryName}
                        </span>
                        <span>📅 ${publishDate}</span>
                    </div>
                </div>

                ${article.image ? `
                <div style="text-align: center; margin: 25px 0;">
                    <img src="${article.image}" alt="${article.title}" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                </div>
                ` : ''}

                <div style="font-size: 16px; line-height: 1.7; margin: 25px 0;">
                    ${article.summary || article.excerpt || 'Dive into our latest tactical analysis and football insights.'}
                </div>

                <div style="background: #f8fafc; border-left: 4px solid #3b82f6; padding: 20px; margin: 25px 0;">
                    <p style="color: #1e3a8a; font-weight: bold; margin-bottom: 10px;">Why You'll Love This Article:</p>
                    <ul style="color: #475569; margin: 0; padding-left: 20px;">
                        <li style="margin: 8px 0;">In-depth tactical analysis</li>
                        <li style="margin: 8px 0;">Expert insights and commentary</li>
                        <li style="margin: 8px 0;">Behind-the-scenes perspective</li>
                        <li style="margin: 8px 0;">Cultural and strategic context</li>
                    </ul>
                </div>

                <div style="text-align: center; margin: 35px 0;">
                    <a href="${articleUrl}" class="btn" style="font-size: 16px; padding: 15px 35px;">
                        Read Full Article →
                    </a>
                </div>

                <div style="text-align: center; margin: 30px 0; padding: 20px; background: #f1f5f9; border-radius: 8px;">
                    <p style="color: #64748b; font-size: 14px; margin-bottom: 15px;">
                        Enjoying our content? Share it with fellow football enthusiasts!
                    </p>
                    <div style="display: inline-block;">
                        <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(articleUrl)}&text=${encodeURIComponent(article.title)}" 
                           style="display: inline-block; margin: 0 8px; padding: 8px 16px; background: #1da1f2; color: white; text-decoration: none; border-radius: 4px; font-size: 12px;">
                            Share on Twitter
                        </a>
                        <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(articleUrl)}" 
                           style="display: inline-block; margin: 0 8px; padding: 8px 16px; background: #4267B2; color: white; text-decoration: none; border-radius: 4px; font-size: 12px;">
                            Share on Facebook
                        </a>
                    </div>
                </div>

                <div class="divider"></div>

                <p style="font-style: italic; color: #64748b; text-align: center; font-size: 14px;">
                    "Behind every word, hours of work" – Pure Tactics Cartel delivers depth and accuracy over hype.
                </p>
            `;

            const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
            sendSmtpEmail.to = subscribers.map(sub => ({ 
                email: sub.email,
                name: sub.name || undefined
            }));
            sendSmtpEmail.sender = { email: process.env.EMAIL_FROM, name: 'Pure Tactics Cartel' };
            sendSmtpEmail.subject = `⚽ New Article: ${article.title}`;
            sendSmtpEmail.htmlContent = this.getBaseTemplate(content, `New Article: ${article.title}`);
            
            // Add unsubscribe parameters
            sendSmtpEmail.params = {
                unsubscribeUrl: `${process.env.FRONTEND_URL}/unsubscribe`
            };

            await transactionalEmailsApi.sendTransacEmail(sendSmtpEmail);
            console.log(`Article notification sent successfully to ${subscribers.length} subscribers for article: ${article.title}`);
        } catch (error) {
            console.error('Send article notification error:', error);
            // Don't throw error as this is not critical for article publishing
        }
    }

    // Add subscriber to Brevo contact list (optional feature)
    static async addToContactList(email, name = null, preferences = {}) {
        try {
            const createContact = new SibApiV3Sdk.CreateContact();
            createContact.email = email;
            if (name) createContact.attributes = { FIRSTNAME: name };
            
            // Add to appropriate lists based on preferences
            const listIds = [];
            if (preferences.weeklyDigest) listIds.push(1); // Weekly digest list
            if (preferences.breakingNews) listIds.push(2); // Breaking news list
            if (preferences.featureArticles) listIds.push(3); // Feature articles list
            
            if (listIds.length > 0) {
                createContact.listIds = listIds;
            }

            await contactsApi.createContact(createContact);
            console.log('Contact added to Brevo lists:', email);
        } catch (error) {
            // Contact might already exist, which is fine
            if (error.status !== 400) {
                console.error('Add to contact list error:', error);
            }
        }
    }

    // Remove subscriber from Brevo contact list
    static async removeFromContactList(email) {
        try {
            await contactsApi.deleteContact(email);
            console.log('Contact removed from Brevo:', email);
        } catch (error) {
            console.error('Remove from contact list error:', error);
        }
    }
}

module.exports = EmailService; 
 
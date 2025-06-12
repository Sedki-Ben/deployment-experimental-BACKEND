const sgMail = require('@sendgrid/mail');

// Initialize SendGrid with API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

console.log('SENDGRID_API_KEY:', process.env.SENDGRID_API_KEY);

class EmailService {
    static async sendWelcomeEmail(user) {
        try {
            const msg = {
                to: user.email,
                from: process.env.EMAIL_FROM,
                subject: 'Welcome to Football Journal',
                html: `
                    <h1>Welcome to Football Journal, ${user.name}!</h1>
                    <p>Thank you for joining our community. We're excited to have you on board!</p>
                    <p>You can now:</p>
                    <ul>
                        <li>Read and write articles</li>
                        <li>Comment on articles</li>
                        <li>Like and share content</li>
                    </ul>
                    <p>Start exploring now!</p>
                `
            };
            await sgMail.send(msg);
        } catch (error) {
            console.error('Send welcome email error:', error);
            // Don't throw error as this is not critical
        }
    }

    static async sendPasswordResetEmail(user, resetToken) {
        try {
            const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
            const msg = {
                to: user.email,
                from: process.env.EMAIL_FROM,
                subject: 'Password Reset Request',
                html: `
                    <h1>Password Reset Request</h1>
                    <p>You requested a password reset. Click the link below to reset your password:</p>
                    <a href="${resetUrl}">Reset Password</a>
                    <p>If you didn't request this, please ignore this email.</p>
                    <p>This link will expire in 1 hour.</p>
                `
            };
            await sgMail.send(msg);
        } catch (error) {
            console.error('Send password reset email error:', error);
            throw new Error('Error sending password reset email');
        }
    }

    static async sendVerificationEmail(user, verificationToken) {
        try {
            const verifyUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
            const msg = {
                to: user.email,
                from: process.env.EMAIL_FROM,
                subject: 'Verify Your Email',
                html: `
                    <h1>Email Verification</h1>
                    <p>Please click the link below to verify your email address:</p>
                    <a href="${verifyUrl}">Verify Email</a>
                    <p>If you didn't create an account, please ignore this email.</p>
                `
            };
            await sgMail.send(msg);
        } catch (error) {
            console.error('Send verification email error:', error);
            throw new Error('Error sending verification email');
        }
    }

    static async sendNewsletterEmail(subscribers, newsletter) {
        try {
            const msg = {
                to: subscribers.map(sub => sub.email),
                from: process.env.EMAIL_FROM,
                subject: newsletter.subject,
                html: newsletter.content
            };
            await sgMail.send(msg);
        } catch (error) {
            console.error('Send newsletter error:', error);
            throw new Error('Error sending newsletter');
        }
    }

    static async sendArticleNotification(subscribers, article) {
        try {
            const msg = {
                to: subscribers.map(sub => sub.email),
                from: process.env.EMAIL_FROM,
                subject: `New Article: ${article.title}`,
                html: `
                    <h1>${article.title}</h1>
                    <p>${article.summary}</p>
                    <a href="${process.env.FRONTEND_URL}/articles/${article._id}">Read More</a>
                `
            };
            await sgMail.send(msg);
        } catch (error) {
            console.error('Send article notification error:', error);
            // Don't throw error as this is not critical
        }
    }
}

module.exports = EmailService; 
 
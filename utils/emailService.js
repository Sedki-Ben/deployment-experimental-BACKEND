const brevoService = require('./brevoService');

class EmailService {
    static async sendVerificationEmail(user, verificationToken) {
        try {
            await brevoService.sendVerificationEmail(user, verificationToken);
        } catch (error) {
            console.error('Send verification email error:', error);
            throw new Error('Error sending verification email');
        }
    }

    static async sendPasswordResetEmail(user, resetToken) {
        try {
            await brevoService.sendPasswordResetEmail(user, resetToken);
        } catch (error) {
            console.error('Send password reset email error:', error);
            throw new Error('Error sending password reset email');
        }
    }

    static async sendNewsletterEmail(subscribers, newsletter) {
        try {
            const result = await brevoService.sendNewsletter(subscribers, newsletter);
            return result;
        } catch (error) {
            console.error('Send newsletter error:', error);
            throw new Error('Error sending newsletter');
        }
    }

    static async sendArticleNotification(subscribers, article) {
        try {
            const result = await brevoService.sendArticleNotification(subscribers, article);
            return result;
        } catch (error) {
            console.error('Send article notification error:', error);
            return { sent: 0, failed: subscribers.length, error: error.message };
        }
    }
}

module.exports = EmailService; 
 
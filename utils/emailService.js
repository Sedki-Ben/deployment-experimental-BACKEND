const brevoService = require('./brevoService');

class EmailService {
    static async sendWelcomeEmail(user) {
        try {
            await brevoService.sendWelcomeEmail(user);
        } catch (error) {
            console.error('Send welcome email error:', error);
            // Don't throw error as this is not critical
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

    static async sendVerificationEmail(user, verificationToken) {
        const verificationUrl = `${process.env.FRONTEND_URL}/verify-newsletter?token=${verificationToken}`;
        const homeUrl = process.env.FRONTEND_URL;
        
        const htmlContent = `
            <!DOCTYPE html>
            <html dir="rtl" lang="ar">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>مرحباً بك في Pure Tactics Cartel</title>
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
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Pure Tactics Cartel</h1>
                    </div>
                    <div class="content">
                        <h2>مرحباً بك في مجتمعنا!</h2>
                        <p>عزيزي المشترك،</p>
                        <p>نحن سعداء جداً بانضمامك إلى مجتمع Pure Tactics Cartel. سنبقيك على اطلاع بآخر الأخبار والمقالات المميزة.</p>
                        <p>انقر على الرابط أدناه للعودة إلى الصفحة الرئيسية:</p>
                        <a href="${homeUrl}" class="button">مرحباً بك في الكارتل</a>
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

        await brevoService.sendEmail({
            to: user,
            subject: 'مرحباً بك في Pure Tactics Cartel',
            html: htmlContent
        });
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
            // Don't throw error as this is not critical
            return { sent: 0, failed: subscribers.length, error: error.message };
        }
    }
}

module.exports = EmailService; 
 
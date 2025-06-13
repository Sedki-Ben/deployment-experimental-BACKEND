const getBaseTemplate = (content, language = 'en', unsubscribeUrl = '') => {
  const isRTL = language === 'ar';
  const direction = isRTL ? 'rtl' : 'ltr';
  
  const translations = {
    en: {
      unsubscribe: 'Unsubscribe',
      footer: 'You received this email because you subscribed to Pure Tactics Cartel newsletter.',
      copyright: '© 2025 Pure Tactics Cartel. All rights reserved.',
      viewInBrowser: 'View in browser'
    },
    fr: {
      unsubscribe: 'Se désabonner',
      footer: 'Vous avez reçu cet email car vous êtes abonné à la newsletter Pure Tactics Cartel.',
      copyright: '© 2025 Pure Tactics Cartel. Tous droits réservés.',
      viewInBrowser: 'Voir dans le navigateur'
    },
    ar: {
      unsubscribe: 'إلغاء الاشتراك',
      footer: 'لقد تلقيت هذا البريد الإلكتروني لأنك مشترك في نشرة Pure Tactics Cartel.',
      copyright: '© 2025 Pure Tactics Cartel. جميع الحقوق محفوظة.',
      viewInBrowser: 'عرض في المتصفح'
    }
  };

  const t = translations[language] || translations.en;

  return `
<!DOCTYPE html>
<html lang="${language}" dir="${direction}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pure Tactics Cartel</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', Arial, sans-serif;
            line-height: 1.6;
            color: #1f2937;
            background-color: #f9fafb;
            direction: ${direction};
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .header {
            background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
            padding: 40px 30px;
            text-align: center;
            color: white;
        }
        
        .logo {
            font-family: 'Playfair Display', serif;
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 10px;
            text-decoration: none;
            color: white;
        }
        
        .tagline {
            font-size: 14px;
            opacity: 0.9;
            font-weight: 300;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .footer {
            background-color: #f3f4f6;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }
        
        .footer-text {
            font-size: 12px;
            color: #6b7280;
            margin-bottom: 15px;
        }
        
        .unsubscribe-link {
            color: #3b82f6;
            text-decoration: none;
            font-size: 12px;
        }
        
        .unsubscribe-link:hover {
            text-decoration: underline;
        }
        
        .social-links {
            margin: 20px 0;
        }
        
        .social-link {
            display: inline-block;
            margin: 0 10px;
            padding: 8px;
            background-color: #3b82f6;
            color: white;
            text-decoration: none;
            border-radius: 50%;
            width: 36px;
            height: 36px;
            text-align: center;
            line-height: 20px;
        }
        
        @media only screen and (max-width: 600px) {
            .container {
                width: 100% !important;
            }
            
            .header, .content, .footer {
                padding: 20px !important;
            }
            
            .logo {
                font-size: 24px !important;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">Pure Tactics Cartel</div>
            <div class="tagline">Tactical Intelligence • Cultural Insight • Global Football</div>
        </div>
        
        <div class="content">
            ${content}
        </div>
        
        <div class="footer">
            <div class="social-links">
                <a href="#" class="social-link">📧</a>
                <a href="#" class="social-link">🐦</a>
                <a href="#" class="social-link">📘</a>
            </div>
            <div class="footer-text">${t.footer}</div>
            ${unsubscribeUrl ? `<a href="${unsubscribeUrl}" class="unsubscribe-link">${t.unsubscribe}</a>` : ''}
            <div class="footer-text" style="margin-top: 15px;">${t.copyright}</div>
        </div>
    </div>
</body>
</html>`;
};

const getWelcomeEmailTemplate = (userName, language = 'en', verificationUrl = '', homeUrl = '') => {
    // Only Arabic version for now, as per user request
    return `
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
                    transition: color 0.3s ease;
                }
                .social-icons a:hover {
                    color: #007bff;
                }
                .footer {
                    text-align: center;
                    padding: 20px 0;
                    border-top: 2px solid #eee;
                    font-size: 12px;
                    color: #666;
                }
                @media only screen and (max-width: 600px) {
                    .container {
                        padding: 10px;
                    }
                    .button {
                        display: block;
                        text-align: center;
                    }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Pure Tactics Cartel</h1>
                </div>
                <div class="content">
                    <h2>مرحباً بك عزيزي المشترك!</h2>
                    <p>يسعدنا انضمامك إلى مجتمعنا.</p>
                    <p>مرحباً بك في الكارتل</p>
                    <a href="${homeUrl || verificationUrl}" class="button">العودة إلى الصفحة الرئيسية</a>
                </div>
                <div class="social-icons">
                    <a href="https://www.facebook.com/profile.php?id=61557120280089" target="_blank" title="Facebook">&#x1F426;</a>
                    <a href="https://twitter.com/PureTacticsC" target="_blank" title="Twitter">&#x1F426;</a>
                    <a href="#" target="_blank" title="Instagram">&#x1F33A;</a>
                    <a href="#" target="_blank" title="TikTok">&#x1F3A4;</a>
                </div>
                <div class="footer">
                    <p>© 2024 Pure Tactics Cartel. جميع الحقوق محفوظة.</p>
                </div>
            </div>
        </body>
        </html>
    `;
};

const getArticleNotificationTemplate = (article, language = 'en', unsubscribeUrl = '') => {
  const translations = {
    en: {
      subject: `New Article: ${article.title}`,
      newArticle: 'New Article Published',
      readMore: 'Read Full Article',
      category: 'Category',
      publishedOn: 'Published on',
      dontMiss: 'Don\'t miss our latest tactical insights and football analysis!'
    },
    fr: {
      subject: `Nouvel Article : ${article.title}`,
      newArticle: 'Nouvel Article Publié',
      readMore: 'Lire l\'Article Complet',
      category: 'Catégorie',
      publishedOn: 'Publié le',
      dontMiss: 'Ne manquez pas nos dernières analyses tactiques et analyses de football !'
    },
    ar: {
      subject: `مقال جديد: ${article.title}`,
      newArticle: 'مقال جديد منشور',
      readMore: 'اقرأ المقال كاملاً',
      category: 'الفئة',
      publishedOn: 'نُشر في',
      dontMiss: 'لا تفوت أحدث رؤانا التكتيكية وتحليلات كرة القدم!'
    }
  };

  const t = translations[language] || translations.en;

  const categoryNames = {
    'etoile-du-sahel': {
      en: 'Etoile Du Sahel',
      fr: 'Étoile Du Sahel',
      ar: 'النجم الساحلي'
    },
    'the-beautiful-game': {
      en: 'The Beautiful Game',
      fr: 'Le Beau Jeu',
      ar: 'اللعبة الجميلة'
    },
    'all-sports-hub': {
      en: 'All Sports Hub',
      fr: 'Centre Omnisports',
      ar: 'مركز كل الرياضات'
    }
  };

  const categoryName = categoryNames[article.category]?.[language] || article.category;
  const articleUrl = `${process.env.FRONTEND_URL}/article/${article.slug || article._id}`;

  const content = `
    <div style="text-align: center; margin-bottom: 30px;">
      <h2 style="color: #10b981; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">
        ${t.newArticle}
      </h2>
    </div>
    
    ${article.image ? `
    <div style="text-align: center; margin-bottom: 25px;">
      <img src="${article.image}" alt="${article.title}" style="max-width: 100%; height: 200px; object-fit: cover; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    </div>
    ` : ''}
    
    <h1 style="font-family: 'Playfair Display', serif; font-size: 28px; color: #1e40af; margin-bottom: 15px; line-height: 1.3;">
      ${article.title}
    </h1>
    
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
      <span><strong>${t.category}:</strong> ${categoryName}</span>
      <span><strong>${t.publishedOn}:</strong> ${new Date(article.publishedAt || article.createdAt).toLocaleDateString(language === 'ar' ? 'ar-SA' : language === 'fr' ? 'fr-FR' : 'en-US')}</span>
    </div>
    
    <p style="font-size: 16px; line-height: 1.6; color: #4b5563; margin-bottom: 30px;">
      ${article.excerpt || article.summary || ''}
    </p>
    
    <div style="text-align: center; margin: 35px 0;">
      <a href="${articleUrl}" style="display: inline-block; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        ${t.readMore}
      </a>
    </div>
    
    <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6; margin-top: 30px;">
      <p style="font-size: 14px; color: #1e40af; margin: 0; text-align: center; font-style: italic;">
        ${t.dontMiss}
      </p>
    </div>
  `;

  return {
    subject: t.subject,
    html: getBaseTemplate(content, language, unsubscribeUrl)
  };
};

const getPasswordResetTemplate = (userName, resetUrl, language = 'en') => {
  const translations = {
    en: {
      subject: 'Reset Your Password - Pure Tactics Cartel',
      greeting: `Hello ${userName}`,
      message: 'We received a request to reset your password. Click the button below to create a new password:',
      resetButton: 'Reset Password',
      expiry: 'This link will expire in 1 hour for security reasons.',
      noRequest: 'If you didn\'t request this password reset, please ignore this email.',
      security: 'For your security, never share this link with anyone.'
    },
    fr: {
      subject: 'Réinitialiser votre mot de passe - Pure Tactics Cartel',
      greeting: `Bonjour ${userName}`,
      message: 'Nous avons reçu une demande de réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :',
      resetButton: 'Réinitialiser le mot de passe',
      expiry: 'Ce lien expirera dans 1 heure pour des raisons de sécurité.',
      noRequest: 'Si vous n\'avez pas demandé cette réinitialisation, veuillez ignorer cet email.',
      security: 'Pour votre sécurité, ne partagez jamais ce lien avec qui que ce soit.'
    },
    ar: {
      subject: 'إعادة تعيين كلمة المرور - Pure Tactics Cartel',
      greeting: `مرحباً ${userName}`,
      message: 'تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بك. انقر على الزر أدناه لإنشاء كلمة مرور جديدة:',
      resetButton: 'إعادة تعيين كلمة المرور',
      expiry: 'ستنتهي صلاحية هذا الرابط خلال ساعة واحدة لأسباب أمنية.',
      noRequest: 'إذا لم تطلب إعادة تعيين كلمة المرور هذه، يرجى تجاهل هذا البريد الإلكتروني.',
      security: 'لأمانك، لا تشارك هذا الرابط مع أي شخص.'
    }
  };

  const t = translations[language] || translations.en;

  const content = `
    <h1 style="font-family: 'Playfair Display', serif; font-size: 28px; color: #1e40af; margin-bottom: 20px; text-align: center;">
      ${t.greeting}
    </h1>
    
    <p style="font-size: 16px; margin-bottom: 25px; color: #4b5563;">
      ${t.message}
    </p>
    
    <div style="text-align: center; margin: 35px 0;">
      <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        ${t.resetButton}
      </a>
    </div>
    
    <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 25px 0;">
      <p style="font-size: 14px; color: #92400e; margin: 0;">
        ⚠️ ${t.expiry}
      </p>
    </div>
    
    <p style="font-size: 14px; color: #6b7280; margin-top: 25px;">
      ${t.noRequest}
    </p>
    
    <p style="font-size: 14px; color: #6b7280; margin-top: 10px;">
      🔒 ${t.security}
    </p>
  `;

  return {
    subject: t.subject,
    html: getBaseTemplate(content, language)
  };
};

module.exports = {
  getWelcomeEmailTemplate,
  getArticleNotificationTemplate,
  getPasswordResetTemplate,
  getBaseTemplate
}; 
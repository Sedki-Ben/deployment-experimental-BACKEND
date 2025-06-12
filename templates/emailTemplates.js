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

const getWelcomeEmailTemplate = (userName, language = 'en', verificationUrl = '') => {
  const translations = {
    en: {
      subject: 'Welcome to Pure Tactics Cartel!',
      greeting: `Welcome ${userName}!`,
      message: 'Thank you for joining our community of football enthusiasts. We\'re excited to have you on board!',
      features: 'What you can do:',
      feature1: '📖 Read in-depth tactical analyses',
      feature2: '💬 Engage with our community',
      feature3: '⚽ Stay updated with the latest insights',
      feature4: '🌍 Explore football from a global perspective',
      cta: 'Verify Your Email',
      ctaText: 'Click the button below to verify your email and complete your subscription:',
      explore: 'Start exploring our latest articles and join the conversation!',
      thanks: 'Welcome to the cartel!'
    },
    fr: {
      subject: 'Bienvenue chez Pure Tactics Cartel !',
      greeting: `Bienvenue ${userName} !`,
      message: 'Merci de rejoindre notre communauté de passionnés de football. Nous sommes ravis de vous accueillir !',
      features: 'Ce que vous pouvez faire :',
      feature1: '📖 Lire des analyses tactiques approfondies',
      feature2: '💬 Interagir avec notre communauté',
      feature3: '⚽ Rester informé des dernières analyses',
      feature4: '🌍 Explorer le football d\'une perspective globale',
      cta: 'Vérifiez votre email',
      ctaText: 'Cliquez sur le bouton ci-dessous pour vérifier votre email et compléter votre abonnement :',
      explore: 'Commencez à explorer nos derniers articles et rejoignez la conversation !',
      thanks: 'Bienvenue dans le cartel !'
    },
    ar: {
      subject: 'مرحباً بك في Pure Tactics Cartel!',
      greeting: `مرحباً ${userName}!`,
      message: 'شكراً لانضمامك إلى مجتمعنا من عشاق كرة القدم. نحن متحمسون لوجودك معنا!',
      features: 'ما يمكنك فعله:',
      feature1: '📖 قراءة التحليلات التكتيكية المتعمقة',
      feature2: '💬 التفاعل مع مجتمعنا',
      feature3: '⚽ البقاء على اطلاع بأحدث الرؤى',
      feature4: '🌍 استكشاف كرة القدم من منظور عالمي',
      cta: 'تحقق من بريدك الإلكتروني',
      ctaText: 'انقر على الزر أدناه للتحقق من بريدك الإلكتروني وإكمال اشتراكك:',
      explore: 'ابدأ في استكشاف أحدث مقالاتنا وانضم إلى المحادثة!',
      thanks: 'مرحباً بك في الكارتل!'
    }
  };

  const t = translations[language] || translations.en;

  const content = `
    <h1 style="font-family: 'Playfair Display', serif; font-size: 32px; color: #1e40af; margin-bottom: 20px; text-align: center;">
      ${t.greeting}
    </h1>
    
    <p style="font-size: 16px; margin-bottom: 25px; text-align: center; color: #4b5563;">
      ${t.message}
    </p>
    
    <div style="background-color: #f8fafc; padding: 25px; border-radius: 8px; margin: 30px 0;">
      <h3 style="color: #1e40af; margin-bottom: 15px; font-size: 18px;">${t.features}</h3>
      <ul style="list-style: none; padding: 0;">
        <li style="margin-bottom: 10px; font-size: 14px;">${t.feature1}</li>
        <li style="margin-bottom: 10px; font-size: 14px;">${t.feature2}</li>
        <li style="margin-bottom: 10px; font-size: 14px;">${t.feature3}</li>
        <li style="margin-bottom: 10px; font-size: 14px;">${t.feature4}</li>
      </ul>
    </div>
    
    ${verificationUrl ? `
    <div style="text-align: center; margin: 30px 0;">
      <p style="margin-bottom: 20px; color: #4b5563;">${t.ctaText}</p>
      <a href="${verificationUrl}" style="display: inline-block; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        ${t.cta}
      </a>
    </div>
    ` : ''}
    
    <p style="font-size: 16px; margin-top: 30px; text-align: center; color: #4b5563;">
      ${t.explore}
    </p>
    
    <p style="font-size: 18px; font-weight: 600; text-align: center; color: #1e40af; margin-top: 25px;">
      ${t.thanks}
    </p>
  `;

  return {
    subject: t.subject,
    html: getBaseTemplate(content, language)
  };
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
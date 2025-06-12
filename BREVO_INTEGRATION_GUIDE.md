# Brevo Newsletter Integration Guide

## Overview

This guide covers the complete Brevo (formerly Sendinblue) integration for Pure Tactics Cartel's newsletter system. The integration replaces SendGrid with Brevo for enhanced email functionality and better deliverability.

## Features Implemented

### ✅ Core Newsletter Functionality
- **Email Subscription** - Users can subscribe via newsletter forms
- **Email Verification** - Double opt-in with beautiful verification emails
- **Article Notifications** - Automatic emails when new articles are published
- **Category Preferences** - Users can choose which article categories to receive
- **Unsubscribe Management** - Easy unsubscribe with compliance features

### ✅ Enhanced Email Templates
- **Responsive Design** - Mobile-friendly email templates
- **Brand Consistency** - Pure Tactics Cartel branding throughout
- **Rich Content** - Article images, social sharing, and call-to-actions
- **Professional Layout** - Clean, modern design with proper typography

### ✅ Advanced Features
- **Smart Filtering** - Send emails only to interested subscribers
- **Preference Management** - Granular control over email types
- **Analytics Tracking** - Newsletter statistics and subscriber metrics
- **Admin Dashboard** - Complete subscriber management for admins

## Environment Variables Required

Add these to your `.env` file and deployment platforms:

```bash
# Brevo Configuration
BREVO_API_KEY=your_brevo_api_key_here
EMAIL_FROM=your-verified-sender@yourdomain.com
FRONTEND_URL=https://your-frontend-domain.com

# Remove old SendGrid variables
# SENDGRID_API_KEY=... (remove this)
```

## Brevo Account Setup Steps

### 1. Create Brevo Account
1. Go to [https://www.brevo.com/](https://www.brevo.com/)
2. Sign up for a free account (300 emails/day limit)
3. Verify your email address

### 2. Get API Key
1. Log into Brevo dashboard
2. Go to **SMTP & API** → **API Keys**
3. Click **Generate a new API key**
4. Name it "Pure Tactics Cartel Newsletter"
5. Select **Full access** permissions
6. Copy the API key (starts with `xkeysib-`)

### 3. Verify Sender Domain
1. Go to **Senders & IP** → **Senders**
2. Add your email address (e.g., `newsletter@yourdomain.com`)
3. Verify the email address
4. Optionally set up domain authentication for better deliverability

### 4. Create Contact Lists (Optional)
1. Go to **Contacts** → **Lists**
2. Create lists for different categories:
   - "Étoile Du Sahel Subscribers"
   - "The Beautiful Game Subscribers" 
   - "All Sports Hub Subscribers"
   - "Weekly Digest Subscribers"

## Deployment Instructions

### For Vercel (Frontend)
No changes needed for frontend deployment.

### For Render (Backend)
1. Go to your Render dashboard
2. Select your backend service
3. Go to **Environment** tab
4. Add/Update these environment variables:
   ```
   BREVO_API_KEY=your_brevo_api_key_here
   EMAIL_FROM=your-verified-sender@yourdomain.com
   ```
5. Remove the old `SENDGRID_API_KEY` variable
6. Click **Save Changes**
7. Your service will automatically redeploy

## Email Templates Included

### 1. Welcome Email
- Sent after email verification
- Introduces Pure Tactics Cartel
- Lists what subscribers can expect
- Call-to-action to visit website

### 2. Email Verification
- Sent immediately after subscription
- Beautiful confirmation button
- Clear instructions
- 24-hour expiration notice

### 3. New Article Notification
- Sent when articles are published
- Article title, excerpt, and image
- Category badge and publish date
- Social sharing buttons
- "Read Full Article" call-to-action

### 4. Password Reset
- Secure password reset emails
- Clear instructions and warnings
- 1-hour expiration notice

## Subscription Preferences

Users can control:
- **Email Types**: Welcome, article notifications, newsletters
- **Categories**: Étoile Du Sahel, The Beautiful Game, All Sports Hub
- **Frequency**: Immediate notifications, daily digest, weekly digest
- **Content Types**: Breaking news, feature articles, weekly digest

## API Endpoints

### Public Endpoints
- `POST /api/newsletter/subscribe` - Subscribe to newsletter
- `GET /api/newsletter/verify/:token` - Verify subscription
- `POST /api/newsletter/unsubscribe` - Unsubscribe
- `PUT /api/newsletter/preferences` - Update preferences

### Admin Endpoints
- `GET /api/newsletter/subscribers` - Get all subscribers
- `GET /api/newsletter/stats` - Get newsletter statistics
- `POST /api/newsletter/send` - Send manual newsletter
- `DELETE /api/newsletter/subscribers/:email` - Delete subscriber

## Testing the Integration

### 1. Test Subscription Flow
```bash
# Subscribe to newsletter
curl -X POST http://localhost:5000/api/newsletter/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","preferences":{"type":"all"}}'
```

### 2. Check Email Delivery
1. Subscribe with a real email address
2. Check inbox for verification email
3. Click verification link
4. Check for welcome email

### 3. Test Article Notifications
1. Create and publish a new article
2. Check that subscribers receive notification emails
3. Verify email content and formatting

## Monitoring and Analytics

### Brevo Dashboard
- **Campaign Reports** - Open rates, click rates, bounces
- **Contact Activity** - Subscriber engagement metrics
- **Deliverability** - Inbox placement and reputation

### Application Logs
- Subscription events logged to console
- Email sending status and errors
- Subscriber preference changes

### Database Analytics
- Subscriber count by category
- Email sending statistics
- Preference distribution

## Troubleshooting

### Common Issues

1. **Emails not sending**
   - Check BREVO_API_KEY is correct
   - Verify sender email is authenticated
   - Check Brevo account limits

2. **Verification emails not received**
   - Check spam folder
   - Verify sender domain reputation
   - Check email address validity

3. **Unsubscribe not working**
   - Verify unsubscribe token is valid
   - Check database connection
   - Ensure proper error handling

### Debug Mode
Enable detailed logging by setting:
```bash
NODE_ENV=development
```

## Compliance Features

### GDPR Compliance
- ✅ Double opt-in verification
- ✅ Clear consent collection
- ✅ Easy unsubscribe process
- ✅ Data deletion on unsubscribe

### CAN-SPAM Compliance
- ✅ Clear sender identification
- ✅ Truthful subject lines
- ✅ Unsubscribe link in every email
- ✅ Physical address in footer

## Future Enhancements

### Planned Features
- **Email Templates Editor** - Visual email template builder
- **A/B Testing** - Test different email versions
- **Automation Workflows** - Drip campaigns and sequences
- **Advanced Segmentation** - Behavioral targeting
- **SMS Integration** - Multi-channel communication

### Performance Optimizations
- **Bulk Email Processing** - Queue system for large subscriber lists
- **Rate Limiting** - Respect Brevo API limits
- **Caching** - Cache subscriber preferences
- **Database Optimization** - Efficient queries for large datasets

## Support

For issues with this integration:
1. Check the troubleshooting section above
2. Review Brevo documentation: [https://developers.brevo.com/](https://developers.brevo.com/)
3. Check application logs for detailed error messages
4. Verify environment variables are correctly set

---

**Integration completed successfully! 🎉**

Your newsletter system is now powered by Brevo with beautiful, responsive email templates and advanced subscriber management. 
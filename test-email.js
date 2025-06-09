const sgMail = require('@sendgrid/mail');
require('dotenv').config();

// Set SendGrid API Key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Create email message
const msg = {
  to: 'test@example.com', // Replace with your email
  from: process.env.EMAIL_FROM, // Your verified sender
  subject: 'Testing SendGrid Integration',
  text: 'This is a test email from Football Journal',
  html: '<strong>This is a test email from Football Journal</strong>',
};

// Send email
sgMail
  .send(msg)
  .then(() => {
    console.log('Test email sent successfully');
  })
  .catch((error) => {
    console.error('Error sending test email:');
    console.error(error.response ? error.response.body : error);
  }); 
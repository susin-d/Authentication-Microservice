/**
 * Email Service - v1.1.0
 * Brevo transactional email integration (updated SDK)
 */

const brevo = require('@getbrevo/brevo');

class EmailService {
  constructor() {
    const apiInstance = new brevo.TransactionalEmailsApi();
    const apiKey = apiInstance.authentications['apiKey'];
    apiKey.apiKey = process.env.BREVO_API_KEY;
    
    this.apiInstance = apiInstance;
  }

  async sendVerificationEmail(toEmail, verificationLink) {
    const sendSmtpEmail = new brevo.SendSmtpEmail();

    sendSmtpEmail.subject = "Verify Your Email Address 📧";

    sendSmtpEmail.htmlContent = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h1 style="color: #4285F4;">Verify Your Email Address</h1>
            <p>Thank you for signing up! Please verify your email address to activate your account.</p>
            <div style="margin: 30px 0;">
              <a href="${verificationLink}" 
                 style="background-color: #4285F4; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Verify Email Address
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">If you didn't create this account, you can safely ignore this email.</p>
            <p style="color: #666; font-size: 14px;">This link will expire in 24 hours.</p>
          </div>
        </body>
      </html>`;
    
    sendSmtpEmail.sender = { 
      name: process.env.BREVO_SENDER_NAME, 
      email: process.env.BREVO_SENDER_EMAIL 
    };
    
    sendSmtpEmail.to = [{ email: toEmail }];

    try {
      const data = await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log('✅ Verification email sent successfully. Message ID:', data.messageId);
      return data;
    } catch (error) {
      console.error('❌ Verification email error:', error);
      // We don't throw error here so the signup process doesn't crash 
      // if the email fails.
    }
  }

  async sendWelcomeEmail(toEmail, userName) {
    const sendSmtpEmail = new brevo.SendSmtpEmail();

    sendSmtpEmail.subject = "Welcome to M-Auth! 🚀";
    const displayName = userName || toEmail.split('@')[0];

    sendSmtpEmail.htmlContent = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h1 style="color: #34A853;">Welcome aboard, ${displayName}! 🎉</h1>
            <p>Your email has been verified successfully!</p>
            <p>Thank you for joining M-Auth. Your account is now fully active and ready to use.</p>
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #4285F4;">What's Next?</h3>
              <ul style="padding-left: 20px;">
                <li>Complete your profile with additional information</li>
                <li>Explore our features and services</li>
                <li>Connect with our community</li>
              </ul>
            </div>
            <p>If you have any questions, feel free to reach out to our support team.</p>
            <p style="margin-top: 30px;">
              <a href="${process.env.FRONTEND_URL}" 
                 style="background-color: #34A853; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Get Started
              </a>
            </p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;" />
            <p style="color: #666; font-size: 12px; text-align: center;">
              © 2026 M-Auth. All rights reserved.
            </p>
          </div>
        </body>
      </html>`;
    
    sendSmtpEmail.sender = { 
      name: process.env.BREVO_SENDER_NAME, 
      email: process.env.BREVO_SENDER_EMAIL 
    };
    
    sendSmtpEmail.to = [{ email: toEmail }];

    try {
      const data = await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log('✅ Welcome email sent successfully. Message ID:', data.messageId);
      return data;
    } catch (error) {
      console.error('❌ Welcome email error:', error);
      // We don't throw error here so it doesn't affect the verification flow
    }
  }

  async sendBroadcastEmail(toEmail, subject, htmlContent) {
    const sendSmtpEmail = new brevo.SendSmtpEmail();

    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = htmlContent;
    
    sendSmtpEmail.sender = { 
      name: process.env.BREVO_SENDER_NAME, 
      email: process.env.BREVO_SENDER_EMAIL 
    };
    
    sendSmtpEmail.to = [{ email: toEmail }];

    try {
      const data = await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      return { success: true, messageId: data.messageId };
    } catch (error) {
      console.error('❌ Broadcast email error for', toEmail, ':', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();
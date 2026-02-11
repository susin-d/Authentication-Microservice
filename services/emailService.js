import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { verificationEmailTemplate, passwordResetEmailTemplate } from './emailTemplates.js';

dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['ZOHO_EMAIL', 'ZOHO_PASSWORD', 'ZOHO_SMTP_HOST', 'ZOHO_SMTP_PORT', 'EMAIL_FROM', 'FRONTEND_URL'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.warn(`Warning: Missing email service environment variables: ${missingEnvVars.join(', ')}. Email functionality will not work until these are set.`);
}

// Create transporter with Zoho Mail SMTP configuration
const transporter = nodemailer.createTransport({
  host: process.env.ZOHO_SMTP_HOST || 'smtp.zoho.com',
  port: parseInt(process.env.ZOHO_SMTP_PORT) || 587,
  secure: parseInt(process.env.ZOHO_SMTP_PORT) === 465, // Use SSL for port 465, TLS for 587
  auth: {
    user: process.env.ZOHO_EMAIL,
    pass: process.env.ZOHO_PASSWORD
  },
  tls: {
    rejectUnauthorized: false // Allow self-signed certificates for development
  }
});

/**
 * Send verification email to user
 * @param {string} email - Recipient email address
 * @param {string} verificationToken - JWT verification token
 * @returns {Promise<Object>} - Nodemailer send result
 */
export const sendVerificationEmail = async (email, verificationToken) => {
  if (process.env.MOCK_DB === 'true') {
    console.log(`MOCK MODE: Simulating verification email to ${email}`);
    return { messageId: 'mock-msg-id-' + Date.now() };
  }

  try {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;

    const mailOptions = {
      from: `"Stellar Auth" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: 'Verify your email address',
      html: verificationEmailTemplate(verificationUrl)
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`Verification email sent to ${email}: ${result.messageId}`);
    return result;
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw new Error(`Failed to send verification email: ${error.message}`);
  }
};

/**
 * Send password reset email to user
 * @param {string} email - Recipient email address
 * @param {string} resetToken - JWT password reset token
 * @returns {Promise<Object>} - Nodemailer send result
 */
export const sendPasswordResetEmail = async (email, resetToken) => {
  if (process.env.MOCK_DB === 'true') {
    console.log(`MOCK MODE: Simulating password reset email to ${email}`);
    return { messageId: 'mock-msg-id-' + Date.now() };
  }

  try {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    const mailOptions = {
      from: `"Stellar Auth" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: 'Reset your password',
      html: passwordResetEmailTemplate(resetUrl)
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${email}: ${result.messageId}`);
    return result;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error(`Failed to send password reset email: ${error.message}`);
  }
};

/**
 * Verify email transporter connection
 * @returns {Promise<boolean>} - True if connection successful
 */
export const verifyEmailConnection = async () => {
  try {
    await transporter.verify();
    console.log('Email server connection verified successfully');
    return true;
  } catch (error) {
    console.error('Email server connection failed:', error);
    return false;
  }
};

export default {
  sendVerificationEmail,
  sendPasswordResetEmail,
  verifyEmailConnection
};

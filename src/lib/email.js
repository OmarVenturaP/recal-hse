// src/lib/email.js
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Sends an email with optional attachments.
 * @param {Object} options - Email options.
 * @param {string} options.to - Recipient email.
 * @param {string} options.subject - Email subject.
 * @param {string} options.text - Plain text content.
 * @param {string} options.html - HTML content.
 * @param {Array} options.attachments - Array of attachment objects (nodemailer format).
 */
export async function sendEmail({ to, subject, text, html, attachments }) {
  try {
    const info = await transporter.sendMail({
      from: `"ObrasOS DOCS Backup" <${process.env.SMTP_USER}>`,
      to: to || process.env.BACKUP_EMAIL_TO,
      subject,
      text,
      html,
      attachments,
    });
    console.log('Email sent: %s', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Email Service (Nodemailer) for Claim & Account Notifications
 */

const nodemailer = require('nodemailer');

const isEmailConfigured = () => {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
};

let transporter = null;

function getTransporter() {
  if (!transporter && isEmailConfigured()) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  return transporter;
}

async function sendClaimStatusEmail({ to, name, itemTitle, status, collectionLocation }) {
  if (!isEmailConfigured() || !to) return false;

  const client = getTransporter();
  if (!client) return false;

  const isApproved = status === 'approved';
  const subject = isApproved
    ? `Campus Lost & Found: Claim Approved for "${itemTitle}"`
    : `Campus Lost & Found: Update on Claim for "${itemTitle}"`;

  const text = isApproved
    ? `Hello ${name || 'Campus Member'},\n\nGreat news! Your ownership claim for "${itemTitle}" has been approved.\n\nPlease collect your item at:\n${collectionLocation || 'Student Center Security Desk, Room 102'}\n\nPlease bring your official university Student ID when claiming your item.\n\n— Campus Security & Dispatch Team`
    : `Hello ${name || 'Campus Member'},\n\nYour ownership claim for "${itemTitle}" was not approved after staff review.\n\nIf you believe this decision was in error, please visit the campus security office in person with additional documentation.\n\n— Campus Security & Dispatch Team`;

  try {
    await client.sendMail({
      from: process.env.SMTP_FROM || 'noreply@university.edu',
      to,
      subject,
      text
    });
    return true;
  } catch (err) {
    console.warn('[Email Warning] Failed to send status notification email:', err.message);
    return false;
  }
}

async function sendPasswordResetEmail({ to, name, resetUrl }) {
  if (!isEmailConfigured() || !to) return false;

  const client = getTransporter();
  if (!client) return false;

  const subject = 'Campus Lost & Found: Password Reset Request';
  const text = `Hello ${name || 'Campus Member'},\n\nWe received a request to reset your password. You can reset it by visiting the link below (valid for 1 hour):\n\n${resetUrl}\n\nIf you did not request a password reset, you can safely ignore this email.\n\n— Campus Lost & Found Team`;

  try {
    await client.sendMail({
      from: process.env.SMTP_FROM || 'noreply@university.edu',
      to,
      subject,
      text
    });
    return true;
  } catch (err) {
    console.warn('[Email Warning] Failed to send password reset email:', err.message);
    return false;
  }
}

module.exports = {
  isEmailConfigured,
  sendClaimStatusEmail,
  sendPasswordResetEmail
};

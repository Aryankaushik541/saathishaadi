/**
 * Email Utility - Nodemailer se Email OTP bhejne ke liye
 * Supports Gmail / any SMTP server
 */

const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;
  
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_PORT === '465', // true for 465, false for 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production',
    },
  });

  return transporter;
};

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

/**
 * Email OTP send karo
 */
const sendOTPEmail = async (email, otp, name = 'User') => {
  const mailer = getTransporter();
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  const logoPath = process.env.EMAIL_LOGO_PATH
    ? path.resolve(process.cwd(), process.env.EMAIL_LOGO_PATH)
    : path.resolve(__dirname, '../../saathishaadi-frontend/src/assest/logo.png');
  const hasLocalLogo = fs.existsSync(logoPath);
  const logoSrc = hasLocalLogo ? 'cid:saathishaadi-logo' : (process.env.EMAIL_LOGO_URL || `${frontendUrl}/logo.png`);
  const safeName = escapeHtml(name);
  
  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body { font-family: Arial, sans-serif; background: #f5ece0; margin: 0; padding: 0; color: #2c1810; }
      .wrapper { padding: 28px 12px; }
      .container { max-width: 520px; margin: 0 auto; background: #fff; border-radius: 14px; overflow: hidden; box-shadow: 0 8px 28px rgba(44,24,16,0.14); border: 1px solid #ead9c9; }
      .header { background: linear-gradient(135deg, #1a0a0a, #2d1010); color: white; padding: 28px 24px; text-align: center; }
      .logo { width: 74px; height: 74px; object-fit: contain; display: block; margin: 0 auto 10px; background: #fff; border-radius: 50%; padding: 7px; }
      .header h1 { margin: 0; font-size: 25px; letter-spacing: 0.2px; }
      .header p { margin: 6px 0 0; color: #d4a017; font-size: 14px; }
      .body { padding: 30px 28px; text-align: center; }
      .greeting { color:#2c1810; font-size:17px; margin: 0 0 10px; }
      .intro { color:#6d5148; font-size:14px; line-height:1.7; margin:0; }
      .otp-box { background: #fff8f0; border: 2px dashed #c0392b; border-radius: 12px; padding: 20px 16px; margin: 22px 0 18px; }
      .otp-label { color: #7a5c52; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
      .otp { font-size: 42px; font-weight: bold; color: #c0392b; letter-spacing: 9px; line-height: 1; }
      .note { color: #7a5c52; font-size: 13px; margin: 14px 0 0; line-height: 1.6; }
      .warning { background:#fff0ec; color: #96281b; font-size: 13px; margin-top: 16px; padding: 12px 14px; border-radius: 10px; line-height: 1.6; }
      .footer { background: #fbf4eb; text-align: center; padding: 17px 18px; color: #8a756c; font-size: 12px; border-top: 1px solid #ead9c9; line-height: 1.6; }
      .footer strong { color: #2c1810; }
      @media only screen and (max-width: 520px) {
        .body { padding: 24px 18px; }
        .otp { font-size: 34px; letter-spacing: 6px; }
      }
    </style>
  </head>
  <body>
    <div class="wrapper">
      <div class="container">
        <div class="header">
          <img class="logo" src="${logoSrc}" alt="SaathiShaadi Logo" />
          <h1>SaathiShaadi</h1>
          <p>Bihar ka Apna Vivah Portal</p>
        </div>
        <div class="body">
          <p class="greeting">Namaste <strong>${safeName}</strong>,</p>
          <p class="intro">Aapke SaathiShaadi account ke liye email verification OTP neeche diya gaya hai.</p>
          <div class="otp-box">
            <div class="otp-label">Your OTP Code</div>
            <div class="otp">${otp}</div>
          </div>
          <p class="note">Yeh OTP sirf <strong>10 minutes</strong> ke liye valid hai.</p>
          <div class="warning">Security note: Yeh OTP kisi ke saath share mat karein. SaathiShaadi team kabhi OTP nahi maangti.</div>
        </div>
        <div class="footer">
          <strong>SaathiShaadi</strong><br>
          &copy; ${new Date().getFullYear()} SaathiShaadi. All rights reserved.<br>
          Agar aapne yeh request nahi ki, to is email ko ignore karein.
        </div>
      </div>
    </div>
  </body>
  </html>`;

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'SaathiShaadi <noreply@saathishaadi.com>',
    to: email,
    subject: `${otp} - Aapka SaathiShaadi OTP`,
    text: `Namaste ${name}!\n\nAapka SaathiShaadi OTP hai: ${otp}\n\nYeh OTP 10 minutes me expire ho jayega.\n\nKisi ke saath share mat karein. SaathiShaadi team kabhi OTP nahi maangti.\n\n- SaathiShaadi Team`,
    html: htmlContent,
    attachments: hasLocalLogo ? [{
      filename: 'saathishaadi-logo.png',
      path: logoPath,
      cid: 'saathishaadi-logo',
    }] : [],
  };

  try {
    const info = await mailer.sendMail(mailOptions);
    logger.info(`OTP email sent to ${email}`, { messageId: info.messageId });
    return true;
  } catch (err) {
    logger.error(`Email send failed to ${email}`, { error: err.message });
    throw new Error('Email bhejne mein problem aayi. Baad mein try karein.');
  }
};

/**
 * Verify email format
 */
const isValidEmail = (email) => {
  const re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return re.test(email);
};

module.exports = { sendOTPEmail, isValidEmail };

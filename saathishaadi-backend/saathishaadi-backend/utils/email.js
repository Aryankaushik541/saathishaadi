/**
 * Email Utility - Nodemailer se Email OTP bhejne ke liye
 * Supports Gmail / any SMTP server
 */

const nodemailer = require('nodemailer');
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

/**
 * Email OTP send karo
 */
const sendOTPEmail = async (email, otp, name = 'User') => {
  const mailer = getTransporter();
  
  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <style>
      body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
      .container { max-width: 500px; margin: 30px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
      .header { background: linear-gradient(135deg, #e44d7b, #c23b6e); color: white; padding: 30px; text-align: center; }
      .header h1 { margin: 0; font-size: 24px; }
      .header p { margin: 5px 0 0; opacity: 0.9; }
      .body { padding: 30px; text-align: center; }
      .otp-box { background: #fff5f8; border: 2px dashed #e44d7b; border-radius: 10px; padding: 20px; margin: 20px 0; }
      .otp { font-size: 42px; font-weight: bold; color: #c23b6e; letter-spacing: 10px; }
      .note { color: #888; font-size: 13px; margin-top: 15px; }
      .footer { background: #f9f9f9; text-align: center; padding: 15px; color: #aaa; font-size: 12px; border-top: 1px solid #eee; }
      .warning { color: #e44d7b; font-size: 13px; margin-top: 15px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>🕉️ SaathiShaadi</h1>
        <p>Aapka Saathi, Aapka Jeevan</p>
      </div>
      <div class="body">
        <p style="color:#444; font-size:16px;">Namaste <strong>${name}</strong>! 🙏</p>
        <p style="color:#555;">Aapka Email OTP neeche hai:</p>
        <div class="otp-box">
          <div class="otp">${otp}</div>
        </div>
        <p class="note">⏱️ Yeh OTP sirf <strong>10 minutes</strong> ke liye valid hai.</p>
        <p class="warning">⚠️ Yeh OTP kisi ke saath share mat karein. SaathiShaadi kabhi OTP nahi maangta.</p>
      </div>
      <div class="footer">
        &copy; ${new Date().getFullYear()} SaathiShaadi. All rights reserved.<br>
        Agar aapne yeh request nahi ki, please ignore karein.
      </div>
    </div>
  </body>
  </html>`;

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'SaathiShaadi <noreply@saathishaadi.com>',
    to: email,
    subject: `${otp} - Aapka SaathiShaadi OTP`,
    text: `Namaste ${name}!\n\nAapka SaathiShaadi OTP hai: ${otp}\n\nYeh OTP 10 minutes me expire ho jayega.\n\nKisi ke saath share mat karein.\n\n- SaathiShaadi Team`,
    html: htmlContent,
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

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
    secure: process.env.SMTP_PORT === '465',

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

const escapeHtml = (value = '') =>
  String(value)
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

  const frontendUrl = (
    process.env.FRONTEND_URL || 'http://localhost:3000'
  ).replace(/\/$/, '');

  const logoPath = process.env.EMAIL_LOGO_PATH
    ? path.resolve(process.cwd(), process.env.EMAIL_LOGO_PATH)
    : path.resolve(
        __dirname,
        '../../saathishaadi-frontend/src/assest/logo.png'
      );

  const hasLocalLogo = fs.existsSync(logoPath);

  const logoSrc = hasLocalLogo
    ? 'cid:saathishaadi-logo'
    : process.env.EMAIL_LOGO_URL || `${frontendUrl}/logo.png`;

  const safeName = escapeHtml(name);

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SaathiShaadi OTP</title>
</head>

<body style="margin:0;padding:0;background:#efefef;font-family:Arial,sans-serif;">

<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#efefef">
<tr>
<td align="center" style="padding:30px 10px;">

  <table width="520" border="0" cellspacing="0" cellpadding="0"
    style="background:#ffffff;border:1px solid #e5d7ca;">

    <!-- Header -->
    <tr>
      <td align="center"
        style="background:#2b0000;padding:30px 20px;">

        <img
          src="${logoSrc}"
          alt="SaathiShaadi Logo"
          width="80"
          height="80"
          style="display:block;border-radius:50%;background:#ffffff;padding:6px;margin-bottom:12px;object-fit:contain;"
        >

        <div
          style="color:#ffffff;font-size:22px;font-weight:bold;margin-bottom:8px;">
          SaathiShaadi
        </div>

        <div style="color:#d6a100;font-size:14px;">
          Bihar ka Apna Vivah Portal
        </div>

      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td align="center"
        style="padding:35px 28px;background:#ffffff;">

        <div
          style="font-size:16px;color:#2c1810;line-height:1.8;margin-bottom:14px;">
          Namaste <strong>${safeName}</strong>,
        </div>

        <div
          style="font-size:15px;color:#6e5b55;line-height:1.8;margin-bottom:28px;">
          Aapke SaathiShaadi account ke liye email verification OTP neeche diya gaya hai.
        </div>

        <!-- OTP Box -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0"
          style="border:2px dashed #d84335;background:#fffaf5;border-radius:14px;margin-bottom:22px;">

          <tr>
            <td align="center" style="padding:20px;">

              <div
                style="font-size:12px;font-weight:bold;color:#8c6b63;letter-spacing:2px;margin-bottom:12px;">
                YOUR OTP CODE
              </div>

              <div
                style="font-size:44px;font-weight:bold;color:#c0392b;letter-spacing:10px;">
                ${otp}
              </div>

            </td>
          </tr>

        </table>

        <div
          style="font-size:14px;color:#6e5b55;line-height:1.7;margin-bottom:22px;">
          Yeh OTP sirf <strong>10 minutes</strong> ke liye valid hai.
        </div>

        <!-- Warning -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0"
          style="background:#fff1ed;border-radius:10px;">

          <tr>
            <td
              style="padding:16px;font-size:14px;color:#b93122;line-height:1.7;text-align:center;">

              Security note: Yeh OTP kisi ke saath share mat karein.
              SaathiShaadi team kabhi OTP nahi maangti.

            </td>
          </tr>

        </table>

      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td align="center"
        style="background:#f5eee7;padding:18px;font-size:12px;color:#7a6d67;line-height:1.8;border-top:1px solid #e5d7ca;">

        <strong style="color:#2c1810;">
          SaathiShaadi
        </strong>

        <br>

        © 2025 SaathiShaadi. All rights reserved.

        <br>

        Agar aapne yeh request nahi ki, to is email ko ignore karein.

      </td>
    </tr>

  </table>

</td>
</tr>
</table>

</body>
</html>
`;

  const mailOptions = {
    from:
      process.env.EMAIL_FROM ||
      'SaathiShaadi <noreply@saathishaadi.com>',

    to: email,

    subject: `${otp} - Aapka SaathiShaadi OTP`,

    text: `
Namaste ${name},

Aapka SaathiShaadi OTP hai: ${otp}

Yeh OTP 10 minutes ke liye valid hai.

OTP kisi ke saath share mat karein.

- SaathiShaadi Team
`,

    html: htmlContent,

    attachments: hasLocalLogo
      ? [
          {
            filename: 'saathishaadi-logo.png',
            path: logoPath,
            cid: 'saathishaadi-logo',
          },
        ]
      : [],
  };

  try {
    const info = await mailer.sendMail(mailOptions);

    logger.info(`OTP email sent to ${email}`, {
      messageId: info.messageId,
    });

    return true;
  } catch (err) {
    console.log(err);

    logger.error(`Email send failed to ${email}`, {
      error: err.message,
    });

    throw new Error(
      'Email bhejne mein problem aayi. Baad mein try karein.'
    );
  }
};

/**
 * Verify email format
 */
const isValidEmail = (email) => {
  const re =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_\`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  return re.test(email);
};

module.exports = {
  sendOTPEmail,
  isValidEmail,
};

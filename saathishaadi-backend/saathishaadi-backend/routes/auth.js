/**
 * Auth Routes - Email OTP based authentication
 * 
 * POST /api/auth/send-otp     → Email par OTP bhejo
 * POST /api/auth/verify-otp   → OTP verify karo & login
 * POST /api/auth/register     → Naya account banao
 * POST /api/auth/logout       → Token invalidate karo
 * GET  /api/auth/me           → Apni profile dekho
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const User = require('../models/User');
const OTP = require('../models/OTP');
const upload = require('../middleware/upload');
const { protect, blacklistToken } = require('../middleware/auth');
const { authLimiter, loginLimiter } = require('../middleware/security');
const { sendOTPEmail, isValidEmail } = require('../utils/email');
const { generateOTP, hashOTP, verifyOTP } = require('../utils/crypto');
const logger = require('../utils/logger');

// ─── Helper ──────────────────────────────────────────────────────────────────

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
    algorithm: 'HS256',
  });

const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }
  return null;
};

// ─── POST /api/auth/send-otp ─────────────────────────────────────────────────
router.post('/send-otp',
  authLimiter,
  [
    body('email')
      .isEmail().withMessage('Valid email address daalen')
      .normalizeEmail()
      .isLength({ max: 100 }).withMessage('Email too long'),
  ],
  async (req, res) => {
    const validErr = handleValidation(req, res);
    if (validErr) return;

    try {
      const { email } = req.body;
      const ip = req.ip;

      // Delete all old unused OTPs for this email
      await OTP.deleteMany({ email, used: false });

      // Generate secure OTP
      const otp = generateOTP();
      const otpHash = await hashOTP(otp); // Hash karo store karne se pehle
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

      await OTP.create({
        email,
        otpHash,
        expiresAt,
        purpose: 'login',
        ipAddress: ip,
      });

      // Send email
      const user = await User.findOne({ email });
      await sendOTPEmail(email, otp, user?.name || 'User');

      logger.info(`OTP sent to ${email} from IP ${ip}`);

      res.json({
        message: 'OTP aapke email par bhej diya gaya hai',
        email: email.replace(/(.{2})(.*)(@.*)/, '$1***$3'), // Partially masked
      });
    } catch (err) {
      logger.error('Send OTP error', { error: err.message });
      res.status(500).json({ message: err.message || 'OTP bhejne mein error aayi' });
    }
  }
);

// ─── POST /api/auth/verify-otp (Login) ───────────────────────────────────────
router.post('/verify-otp',
  loginLimiter,
  [
    body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
    body('otp').isLength({ min: 6, max: 6 }).isNumeric().withMessage('6 digit OTP required'),
  ],
  async (req, res) => {
    const validErr = handleValidation(req, res);
    if (validErr) return;

    try {
      const { email, otp } = req.body;

      // Find latest unused OTP
      const otpRecord = await OTP.findOne({ email, used: false }).sort({ createdAt: -1 });

      if (!otpRecord) {
        return res.status(400).json({ message: 'OTP nahi mila. Pehle OTP mangwayein.' });
      }

      // Check expiry
      if (new Date() > otpRecord.expiresAt) {
        await OTP.deleteOne({ _id: otpRecord._id });
        return res.status(400).json({ message: 'OTP expire ho gaya. Naya OTP mangwayein.' });
      }

      // Check attempts (brute force protection)
      if (otpRecord.attempts >= 5) {
        await OTP.deleteOne({ _id: otpRecord._id });
        logger.warn(`OTP brute force for ${email}`);
        return res.status(429).json({ message: 'Bahut zyada galat attempts. Naya OTP mangwayein.' });
      }

      // Verify OTP hash
      const isValid = await verifyOTP(otp, otpRecord.otpHash);
      if (!isValid) {
        otpRecord.attempts += 1;
        await otpRecord.save();
        const remaining = 5 - otpRecord.attempts;
        return res.status(400).json({
          message: `Galat OTP. ${remaining} attempts baaki hain.`
        });
      }

      // Mark OTP as used
      otpRecord.used = true;
      await otpRecord.save();

      // Find user
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({
          message: 'Account nahi mila. Pehle register karein.',
          needsRegister: true,
        });
      }

      if (user.isBlocked) {
        return res.status(403).json({ message: 'Account block kar diya gaya hai. Admin se contact karein.' });
      }

      if (user.isLocked()) {
        return res.status(423).json({ message: 'Account temporarily locked hai.' });
      }

      // Mark email verified & update last seen
      user.isEmailVerified = true;
      await user.resetLoginAttempts();

      logger.info(`User logged in: ${email}`);

      res.json({
        message: 'Login safal raha!',
        token: generateToken(user._id),
        user,
      });
    } catch (err) {
      logger.error('Verify OTP error', { error: err.message });
      res.status(500).json({ message: 'Login error. Baad mein try karein.' });
    }
  }
);

// ─── POST /api/auth/register ─────────────────────────────────────────────────
router.post('/register',
  authLimiter,
  upload.single('photo'),
  [
    body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
    body('otp').isLength({ min: 6, max: 6 }).isNumeric().withMessage('Valid OTP required'),
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Naam 2-100 characters ka hona chahiye'),
    body('age').isInt({ min: 18, max: 65 }).withMessage('Umar 18-65 ke beech honi chahiye'),
    body('gender').isIn(['Male', 'Female']).withMessage('Gender Male ya Female hona chahiye'),
    body('religion').trim().notEmpty().withMessage('Dharm required hai'),
  ],
  async (req, res) => {
    const validErr = handleValidation(req, res);
    if (validErr) return;

    try {
      const { email, otp, name, age, gender, religion, caste, district, profession, bio } = req.body;

      // Verify OTP for registration
      const otpRecord = await OTP.findOne({ email, used: false }).sort({ createdAt: -1 });

      if (!otpRecord) {
        return res.status(400).json({ message: 'OTP nahi mila. Pehle OTP mangwayein.' });
      }

      if (new Date() > otpRecord.expiresAt) {
        return res.status(400).json({ message: 'OTP expire ho gaya. Naya OTP mangwayein.' });
      }

      if (otpRecord.attempts >= 5) {
        return res.status(429).json({ message: 'Bahut zyada galat attempts. Naya OTP mangwayein.' });
      }

      const isValid = await verifyOTP(otp, otpRecord.otpHash);
      if (!isValid) {
        otpRecord.attempts += 1;
        await otpRecord.save();
        return res.status(400).json({ message: 'Galat OTP' });
      }

      otpRecord.used = true;
      await otpRecord.save();

      // Check if already registered
      const existing = await User.findOne({ email });
      if (existing) {
        // Update existing
        const updates = { name, age: Number(age), gender, religion };
        if (caste !== undefined) updates.caste = caste;
        if (district !== undefined) updates.district = district;
        if (profession !== undefined) updates.profession = profession;
        if (bio !== undefined) updates.bio = bio;
        if (req.file) updates.photo = req.file.filename;
        updates.isEmailVerified = true;

        Object.assign(existing, updates);
        await existing.save();

        return res.json({
          message: 'Profile update ho gaya!',
          token: generateToken(existing._id),
          user: existing,
        });
      }

      // Create new user
      const userData = {
        email,
        name,
        age: Number(age),
        gender,
        religion,
        caste: caste || '',
        district: district || '',
        profession: profession || '',
        bio: bio || '',
        isEmailVerified: true,
      };
      if (req.file) userData.photo = req.file.filename;

      const user = await User.create(userData);
      logger.info(`New user registered: ${email}`);

      res.status(201).json({
        message: 'Registration safal raha! SaathiShaadi par swagat hai 🙏',
        token: generateToken(user._id),
        user,
      });
    } catch (err) {
      logger.error('Register error', { error: err.message });
      if (err.code === 11000) {
        return res.status(400).json({ message: 'Email already registered hai' });
      }
      res.status(500).json({ message: 'Registration error. Baad mein try karein.' });
    }
  }
);

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
router.post('/logout', protect, (req, res) => {
  blacklistToken(req.token);
  logger.info(`User logged out: ${req.user.email}`);
  res.json({ message: 'Aap logout ho gaye hain. Phir milenge! 🙏' });
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', protect, (req, res) => {
  res.json(req.user);
});

module.exports = router;

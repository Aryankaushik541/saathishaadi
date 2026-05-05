/**
 * Users Routes
 * GET  /api/users         → Profiles browse (with filters)
 * GET  /api/users/:id     → Single user profile
 * PUT  /api/users/profile → Update own profile
 */

const express = require('express');
const router = express.Router();
const { body, query, param, validationResult } = require('express-validator');

const User = require('../models/User');
const Proposal = require('../models/Proposal');
const { protect } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/security');
const upload = require('../middleware/upload');
const { handleUploadError } = require('../middleware/upload');
const logger = require('../utils/logger');

const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
  return null;
};

// GET /api/users — Browse profiles with filters
router.get('/',
  protect,
  apiLimiter,
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
    query('minAge').optional().isInt({ min: 18 }).toInt(),
    query('maxAge').optional().isInt({ max: 65 }).toInt(),
  ],
  async (req, res) => {
    const validErr = handleValidation(req, res);
    if (validErr) return;

    try {
      const {
        religion, gender, minAge, maxAge, district, caste,
        page = 1, limit = 12,
      } = req.query;

      // Sanitized query
      const dbQuery = {
        isBlocked: false,
        isAdmin: false,
        _id: { $ne: req.user._id },
      };

      // Strict whitelist of allowed filter values
      if (religion && typeof religion === 'string') dbQuery.religion = religion.trim().substring(0, 50);
      if (gender && ['Male', 'Female'].includes(gender)) dbQuery.gender = gender;
      if (district && typeof district === 'string') dbQuery.district = district.trim().substring(0, 100);
      if (caste && typeof caste === 'string') dbQuery.caste = caste.trim().substring(0, 100);
      if (minAge || maxAge) {
        dbQuery.age = {};
        if (minAge) dbQuery.age.$gte = Math.max(18, Number(minAge));
        if (maxAge) dbQuery.age.$lte = Math.min(65, Number(maxAge));
      }

      const pageNum = Math.max(1, Number(page));
      const limitNum = Math.min(50, Math.max(1, Number(limit)));
      const skip = (pageNum - 1) * limitNum;

      const [users, total] = await Promise.all([
        User.find(dbQuery)
          .select('name age gender religion caste district profession bio photo lastSeen createdAt')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        User.countDocuments(dbQuery),
      ]);

      res.json({
        users,
        total,
        totalPages: Math.ceil(total / limitNum),
        page: pageNum,
      });
    } catch (err) {
      logger.error('Get users error', { error: err.message });
      res.status(500).json({ message: 'Profiles load karne mein error aayi' });
    }
  }
);

// GET /api/users/:id — Single profile
router.get('/:id',
  protect,
  apiLimiter,
  [param('id').isMongoId().withMessage('Invalid user ID')],
  async (req, res) => {
    const validErr = handleValidation(req, res);
    if (validErr) return;

    try {
      const user = await User.findById(req.params.id)
        .select('-__v -loginAttempts -lockUntil')
        .lean();

      if (!user || user.isBlocked || user.isAdmin) {
        return res.status(404).json({ message: 'User nahi mila' });
      }

      const isSelf = req.params.id === req.user._id.toString();

      if (!isSelf) {
        // Check if proposal accepted (to show email)
        const accepted = await Proposal.findOne({
          status: 'accepted',
          $or: [
            { sender: req.user._id, receiver: user._id },
            { sender: user._id, receiver: req.user._id },
          ],
        }).lean();

        if (!accepted) {
          // Hide email for unconnected users
          user.email = '***@***.***';
        }
      }

      res.json(user);
    } catch (err) {
      logger.error('Get user by ID error', { error: err.message });
      res.status(500).json({ message: 'Profile load karne mein error' });
    }
  }
);

// PUT /api/users/profile — Update own profile
router.put('/profile',
  protect,
  upload.single('photo'),
  handleUploadError,
  [
    body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Naam 2-100 char ka hona chahiye'),
    body('age').optional().isInt({ min: 18, max: 65 }).withMessage('Umar 18-65 ke beech honi chahiye'),
    body('bio').optional().isLength({ max: 500 }).withMessage('Bio 500 characters se zyada nahi'),
  ],
  async (req, res) => {
    const validErr = handleValidation(req, res);
    if (validErr) return;

    try {
      const allowed = ['name', 'age', 'religion', 'caste', 'district', 'profession', 'bio'];
      const updates = {};

      for (const field of allowed) {
        if (req.body[field] !== undefined) {
          updates[field] = field === 'age' ? Number(req.body[field]) : req.body[field];
        }
      }

      if (req.file) updates.photo = req.file.filename;

      const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: updates },
        { new: true, runValidators: true }
      ).select('-__v -loginAttempts -lockUntil');

      logger.info(`Profile updated: ${req.user.email}`);
      res.json({ message: 'Profile update ho gaya!', user });
    } catch (err) {
      logger.error('Update profile error', { error: err.message });
      res.status(500).json({ message: 'Profile update karne mein error' });
    }
  }
);

module.exports = router;

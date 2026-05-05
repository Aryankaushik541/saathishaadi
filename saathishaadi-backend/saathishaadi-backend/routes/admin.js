/**
 * Admin Routes - Secure admin panel
 * All routes under /api/admin
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const Proposal = require('../models/Proposal');
const Message = require('../models/Message');
const Advertisement = require('../models/Advertisement');
const { protect, adminOnly } = require('../middleware/auth');
const { adminLimiter } = require('../middleware/security');
const { safeCompare } = require('../utils/crypto');
const logger = require('../utils/logger');

const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
  return null;
};

// POST /api/admin/login — Admin login (credentials based)
router.post('/login',
  adminLimiter,
  [
    body('username').trim().notEmpty().withMessage('Username required'),
    body('password').notEmpty().withMessage('Password required'),
  ],
  async (req, res) => {
    const validErr = handleValidation(req, res);
    if (validErr) return;

    try {
      const { username, password } = req.body;
      const ADMIN_USER = process.env.ADMIN_USERNAME || 'admin';
      const ADMIN_PASS = process.env.ADMIN_PASSWORD;

      if (!ADMIN_PASS) {
        logger.error('ADMIN_PASSWORD not set in environment!');
        return res.status(500).json({ message: 'Server configuration error' });
      }

      const userMatch = safeCompare(username, ADMIN_USER);
      const passMatch = safeCompare(password, ADMIN_PASS);

      if (!userMatch || !passMatch) {
        logger.warn(`Failed admin login attempt from IP: ${req.ip}`);
        return res.status(401).json({ message: 'Galat credentials' });
      }

      let admin = await User.findOne({ isAdmin: true });
      if (!admin) {
        admin = await User.create({
          email: 'admin@saathishaadi.com',
          name: 'Admin',
          age: 30,
          gender: 'Male',
          religion: 'Hindu',
          isAdmin: true,
          isEmailVerified: true,
        });
      }

      const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, {
        expiresIn: '7d',
        algorithm: 'HS256',
      });

      logger.info(`Admin logged in from IP: ${req.ip}`);
      res.json({ token, admin: { _id: admin._id, name: admin.name, isAdmin: true } });
    } catch (err) {
      logger.error('Admin login error', { error: err.message });
      res.status(500).json({ message: 'Admin login error' });
    }
  }
);

// All routes below require admin auth
router.use(protect, adminOnly, adminLimiter);

// ─── Dashboard ────────────────────────────────────────────────────────────────

router.get('/dashboard', async (req, res) => {
  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [
      totalUsers, activeUsers, totalProposals, acceptedProposals,
      totalMessages, blockedUsers, newUsersThisWeek, maleCnt, femaleCnt,
      pendingProposals, rejectedProposals,
    ] = await Promise.all([
      User.countDocuments({ isAdmin: false }),
      User.countDocuments({ isAdmin: false, isBlocked: false }),
      Proposal.countDocuments(),
      Proposal.countDocuments({ status: 'accepted' }),
      Message.countDocuments(),
      User.countDocuments({ isBlocked: true }),
      User.countDocuments({ isAdmin: false, createdAt: { $gte: weekAgo } }),
      User.countDocuments({ gender: 'Male', isAdmin: false }),
      User.countDocuments({ gender: 'Female', isAdmin: false }),
      Proposal.countDocuments({ status: 'pending' }),
      Proposal.countDocuments({ status: 'rejected' }),
    ]);

    const [religionStats, districtStats] = await Promise.all([
      User.aggregate([
        { $match: { isAdmin: false } },
        { $group: { _id: '$religion', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      User.aggregate([
        { $match: { isAdmin: false, district: { $ne: '' } } },
        { $group: { _id: '$district', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);

    res.json({
      totalUsers, activeUsers, totalProposals, acceptedProposals,
      totalMessages, blockedUsers, newUsersThisWeek,
      maleCnt, femaleCnt, religionStats, districtStats,
      pendingProposals, rejectedProposals,
    });
  } catch (err) {
    logger.error('Dashboard error', { error: err.message });
    res.status(500).json({ message: 'Dashboard load error' });
  }
});

// ─── Users Management ─────────────────────────────────────────────────────────

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, gender, religion, isBlocked } = req.query;
    const dbQuery = { isAdmin: false };

    if (search && typeof search === 'string') {
      const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').substring(0, 50);
      dbQuery.$or = [
        { name: { $regex: safeSearch, $options: 'i' } },
        { email: { $regex: safeSearch, $options: 'i' } },
        { district: { $regex: safeSearch, $options: 'i' } },
      ];
    }
    if (gender && ['Male', 'Female'].includes(gender)) dbQuery.gender = gender;
    if (religion) dbQuery.religion = religion;
    if (isBlocked !== undefined) dbQuery.isBlocked = isBlocked === 'true';

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [users, total] = await Promise.all([
      User.find(dbQuery).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      User.countDocuments(dbQuery),
    ]);

    res.json({ users, total, totalPages: Math.ceil(total / limitNum) });
  } catch (err) {
    res.status(500).json({ message: 'Users load error' });
  }
});

// PUT /api/admin/users/:id — Edit user details
router.put('/users/:id',
  [
    body('name').optional().trim().notEmpty().isLength({ max: 100 }).withMessage('Name valid hona chahiye'),
    body('age').optional().isInt({ min: 18, max: 65 }).withMessage('Age 18-65 ke beech honi chahiye'),
    body('gender').optional().isIn(['Male', 'Female']).withMessage('Gender Male ya Female hona chahiye'),
    body('religion').optional().trim().notEmpty().withMessage('Religion valid hona chahiye'),
    body('bio').optional().isLength({ max: 500 }).withMessage('Bio max 500 chars'),
  ],
  async (req, res) => {
    const validErr = handleValidation(req, res);
    if (validErr) return;

    try {
      const allowedFields = ['name', 'age', 'gender', 'religion', 'caste', 'district', 'profession', 'bio'];
      const updateData = {};
      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) updateData[field] = req.body[field];
      });

      const user = await User.findOneAndUpdate(
        { _id: req.params.id, isAdmin: false },
        updateData,
        { new: true, runValidators: true }
      );
      if (!user) return res.status(404).json({ message: 'User nahi mila' });
      logger.info(`User edited: ${user.email} by admin`);
      res.json({ message: 'User update ho gaya', user });
    } catch (err) {
      res.status(500).json({ message: 'User update error' });
    }
  }
);

// PUT /api/admin/users/:id/block
router.put('/users/:id/block', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isBlocked: true },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: 'User nahi mila' });
    logger.info(`User blocked: ${user.email} by admin`);
    res.json({ message: 'User block kar diya gaya', user });
  } catch (err) {
    res.status(500).json({ message: 'Block error' });
  }
});

// PUT /api/admin/users/:id/unblock
router.put('/users/:id/unblock', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isBlocked: false, loginAttempts: 0, lockUntil: null },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: 'User nahi mila' });
    logger.info(`User unblocked: ${user.email} by admin`);
    res.json({ message: 'User unblock kar diya gaya', user });
  } catch (err) {
    res.status(500).json({ message: 'Unblock error' });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findOneAndDelete({ _id: req.params.id, isAdmin: false });
    if (!user) return res.status(404).json({ message: 'User nahi mila' });

    await Promise.all([
      Proposal.deleteMany({ $or: [{ sender: req.params.id }, { receiver: req.params.id }] }),
      Message.deleteMany({ $or: [{ sender: req.params.id }, { receiver: req.params.id }] }),
    ]);

    logger.info(`User deleted: ${user.email} by admin`);
    res.json({ message: 'User aur unka data delete kar diya gaya' });
  } catch (err) {
    res.status(500).json({ message: 'Delete error' });
  }
});

// ─── Proposals Management ──────────────────────────────────────────────────────

// GET /api/admin/proposals
router.get('/proposals', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const dbQuery = {};

    if (status && ['pending', 'accepted', 'rejected'].includes(status)) {
      dbQuery.status = status;
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    let query = Proposal.find(dbQuery)
      .populate('sender', 'name email gender religion district')
      .populate('receiver', 'name email gender religion district')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const [proposals, total] = await Promise.all([
      query.lean(),
      Proposal.countDocuments(dbQuery),
    ]);

    // Filter by search after populate
    let filtered = proposals;
    if (search && typeof search === 'string') {
      const s = search.toLowerCase();
      filtered = proposals.filter(p =>
        p.sender?.name?.toLowerCase().includes(s) ||
        p.receiver?.name?.toLowerCase().includes(s) ||
        p.sender?.email?.toLowerCase().includes(s) ||
        p.receiver?.email?.toLowerCase().includes(s)
      );
    }

    res.json({ proposals: filtered, total, totalPages: Math.ceil(total / limitNum) });
  } catch (err) {
    logger.error('Proposals admin error', { error: err.message });
    res.status(500).json({ message: 'Proposals load error' });
  }
});

// PUT /api/admin/proposals/:id/status — Admin change status
router.put('/proposals/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const proposal = await Proposal.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('sender', 'name email').populate('receiver', 'name email');
    if (!proposal) return res.status(404).json({ message: 'Proposal nahi mila' });
    logger.info(`Proposal status changed to ${status} by admin`);
    res.json({ message: `Proposal ${status} kar diya`, proposal });
  } catch (err) {
    res.status(500).json({ message: 'Status update error' });
  }
});

// DELETE /api/admin/proposals/:id
router.delete('/proposals/:id', async (req, res) => {
  try {
    const proposal = await Proposal.findByIdAndDelete(req.params.id);
    if (!proposal) return res.status(404).json({ message: 'Proposal nahi mila' });
    logger.info(`Proposal deleted by admin`);
    res.json({ message: 'Proposal delete kar diya' });
  } catch (err) {
    res.status(500).json({ message: 'Proposal delete error' });
  }
});

// ─── Messages Management ──────────────────────────────────────────────────────

// GET /api/admin/messages
router.get('/messages', async (req, res) => {
  try {
    const { page = 1, limit = 30, search } = req.query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [messages, total] = await Promise.all([
      Message.find()
        .populate('sender', 'name email gender')
        .populate('receiver', 'name email gender')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Message.countDocuments(),
    ]);

    let filtered = messages;
    if (search && typeof search === 'string') {
      const s = search.toLowerCase();
      filtered = messages.filter(m =>
        m.sender?.name?.toLowerCase().includes(s) ||
        m.receiver?.name?.toLowerCase().includes(s) ||
        m.text?.toLowerCase().includes(s)
      );
    }

    res.json({ messages: filtered, total, totalPages: Math.ceil(total / limitNum) });
  } catch (err) {
    logger.error('Messages admin error', { error: err.message });
    res.status(500).json({ message: 'Messages load error' });
  }
});

// DELETE /api/admin/messages/:id
router.delete('/messages/:id', async (req, res) => {
  try {
    const message = await Message.findByIdAndDelete(req.params.id);
    if (!message) return res.status(404).json({ message: 'Message nahi mila' });
    logger.info(`Message deleted by admin`);
    res.json({ message: 'Message delete kar diya' });
  } catch (err) {
    res.status(500).json({ message: 'Message delete error' });
  }
});

// ─── Ads Management ──────────────────────────────────────────────────────────

router.get('/ads', async (req, res) => {
  try {
    const ads = await Advertisement.find().sort({ createdAt: -1 }).lean();
    res.json(ads);
  } catch (err) {
    res.status(500).json({ message: 'Ads load error' });
  }
});

router.post('/ads',
  [
    body('title').trim().notEmpty().isLength({ max: 200 }).withMessage('Ad title required'),
    body('imageUrl').optional().isURL().withMessage('Valid image URL required'),
  ],
  async (req, res) => {
    const validErr = handleValidation(req, res);
    if (validErr) return;

    try {
      const ad = await Advertisement.create(req.body);
      res.status(201).json(ad);
    } catch (err) {
      res.status(500).json({ message: 'Ad create karne mein error' });
    }
  }
);

router.put('/ads/:id', async (req, res) => {
  try {
    const ad = await Advertisement.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!ad) return res.status(404).json({ message: 'Ad nahi mila' });
    res.json(ad);
  } catch (err) {
    res.status(500).json({ message: 'Ad update error' });
  }
});

router.delete('/ads/:id', async (req, res) => {
  try {
    await Advertisement.findByIdAndDelete(req.params.id);
    res.json({ message: 'Ad delete kar diya' });
  } catch (err) {
    res.status(500).json({ message: 'Ad delete error' });
  }
});

module.exports = router;

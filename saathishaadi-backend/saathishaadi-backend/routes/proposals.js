const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const Proposal = require('../models/Proposal');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/security');
const logger = require('../utils/logger');

const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
  return null;
};

// POST /api/proposals — Proposal bhejo
router.post('/', protect, apiLimiter,
  [
    body('receiverId').isMongoId().withMessage('Valid receiver ID required'),
    body('message').optional().trim().isLength({ max: 500 }).withMessage('Message 500 char se zyada nahi'),
  ],
  async (req, res) => {
    const validErr = handleValidation(req, res);
    if (validErr) return;

    try {
      const { receiverId, message } = req.body;

      if (receiverId === req.user._id.toString()) {
        return res.status(400).json({ message: 'Khud ko proposal nahi bhej sakte' });
      }

      const receiver = await User.findById(receiverId).lean();
      if (!receiver || receiver.isBlocked || receiver.isAdmin) {
        return res.status(404).json({ message: 'User nahi mila' });
      }

      const existing = await Proposal.findOne({ sender: req.user._id, receiver: receiverId });
      if (existing) return res.status(400).json({ message: 'Aapne pehle se proposal bheja hai' });

      const proposal = await Proposal.create({
        sender: req.user._id,
        receiver: receiverId,
        message: message || 'Main aapke saath jeevan bitana chahta/chahti hun.',
      });

      const populated = await proposal.populate(['sender', 'receiver']);
      res.status(201).json(populated);
    } catch (err) {
      if (err.code === 11000) return res.status(400).json({ message: 'Proposal pehle se bheja gaya hai' });
      logger.error('Proposal send error', { error: err.message });
      res.status(500).json({ message: 'Proposal bhejne mein error' });
    }
  }
);

// GET /api/proposals/received
router.get('/received', protect, apiLimiter, async (req, res) => {
  try {
    const proposals = await Proposal.find({ receiver: req.user._id })
      .populate('sender', '-email -loginAttempts -lockUntil -__v')
      .sort({ createdAt: -1 })
      .lean();
    res.json(proposals);
  } catch (err) {
    res.status(500).json({ message: 'Proposals load karne mein error' });
  }
});

// GET /api/proposals/sent
router.get('/sent', protect, apiLimiter, async (req, res) => {
  try {
    const proposals = await Proposal.find({ sender: req.user._id })
      .populate('receiver', '-email -loginAttempts -lockUntil -__v')
      .sort({ createdAt: -1 })
      .lean();
    res.json(proposals);
  } catch (err) {
    res.status(500).json({ message: 'Proposals load karne mein error' });
  }
});

// PUT /api/proposals/:id — Accept/Reject
router.put('/:id', protect, apiLimiter,
  [
    param('id').isMongoId().withMessage('Invalid proposal ID'),
    body('status').isIn(['accepted', 'rejected']).withMessage('Status accepted ya rejected hona chahiye'),
  ],
  async (req, res) => {
    const validErr = handleValidation(req, res);
    if (validErr) return;

    try {
      const proposal = await Proposal.findOne({ _id: req.params.id, receiver: req.user._id });
      if (!proposal) return res.status(404).json({ message: 'Proposal nahi mila' });
      if (proposal.status !== 'pending') {
        return res.status(400).json({ message: 'Yeh proposal pehle se ' + proposal.status + ' hai' });
      }

      proposal.status = req.body.status;
      await proposal.save();
      const populated = await proposal.populate(['sender', 'receiver']);
      res.json(populated);
    } catch (err) {
      logger.error('Proposal update error', { error: err.message });
      res.status(500).json({ message: 'Proposal update karne mein error' });
    }
  }
);

module.exports = router;

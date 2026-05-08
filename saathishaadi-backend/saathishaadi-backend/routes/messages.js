const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const Message = require('../models/Message');
const Proposal = require('../models/Proposal');
const { protect } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/security');
const logger = require('../utils/logger');

const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
  return null;
};

// Only accepted proposal wale chat kar sakte hain
const checkConnection = async (senderId, receiverId) => {
  return Proposal.findOne({
    status: 'accepted',
    $or: [
      { sender: senderId, receiver: receiverId },
      { sender: receiverId, receiver: senderId },
    ],
  });
};

// GET /api/messages/:userId — Chat history
router.get('/:userId', protect, apiLimiter,
  [param('userId').isMongoId().withMessage('Invalid user ID')],
  async (req, res) => {
    const validErr = handleValidation(req, res);
    if (validErr) return;

    try {
      const connected = await checkConnection(req.user._id, req.params.userId);
      if (!connected) return res.status(403).json({ message: 'Pehle proposal accept karo' });

      const messages = await Message.find({
        $or: [
          { sender: req.user._id, receiver: req.params.userId },
          { sender: req.params.userId, receiver: req.user._id },
        ],
      }).sort({ createdAt: 1 }).limit(200).lean();

      res.json(messages);
    } catch (err) {
      res.status(500).json({ message: 'Messages load karne mein error' });
    }
  }
);

// POST /api/messages — Send message
router.post('/', protect, apiLimiter,
    [
      body('receiverId').isMongoId().withMessage('Valid receiver ID required'),
    body('content').trim().notEmpty().isLength({ max: 5000 }).withMessage('Message 1-5000 characters ka hona chahiye'),
    body('encrypted').optional().isBoolean().withMessage('Encrypted flag valid hona chahiye'),
  ],
  async (req, res) => {
    const validErr = handleValidation(req, res);
    if (validErr) return;

    try {
      const { receiverId, content, encrypted = false } = req.body;

      const connected = await checkConnection(req.user._id, receiverId);
      if (!connected) return res.status(403).json({ message: 'Pehle proposal accept karo' });

      const message = await Message.create({
        sender: req.user._id,
        receiver: receiverId,
        content,
        encrypted,
      });

      res.status(201).json(message);
    } catch (err) {
      logger.error('Send message error', { error: err.message });
      res.status(500).json({ message: 'Message bhejne mein error' });
    }
  }
);

module.exports = router;

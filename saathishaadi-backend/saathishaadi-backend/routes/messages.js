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

// GET /api/messages/conversations - Accepted matches with latest message
router.get('/conversations', protect, apiLimiter, async (req, res) => {
  try {
    const proposals = await Proposal.find({
      status: 'accepted',
      $or: [
        { sender: req.user._id },
        { receiver: req.user._id },
      ],
    })
      .populate('sender', 'name age gender religion caste district profession photo e2eePublicKey')
      .populate('receiver', 'name age gender religion caste district profession photo e2eePublicKey')
      .sort({ updatedAt: -1 })
      .lean();

    const conversations = await Promise.all(proposals.map(async (proposal) => {
      const senderId = proposal.sender?._id?.toString();
      const otherUser = senderId === req.user._id.toString()
        ? proposal.receiver
        : proposal.sender;

      if (!otherUser?._id) return null;

      const lastMessage = await Message.findOne({
        $or: [
          { sender: req.user._id, receiver: otherUser._id },
          { sender: otherUser._id, receiver: req.user._id },
        ],
      }).sort({ createdAt: -1 }).lean();

      return { user: otherUser, lastMessage };
    }));

    res.json(conversations.filter(Boolean));
  } catch (err) {
    logger.error('Conversations load error', { error: err.message });
    res.status(500).json({ message: 'Conversations load karne mein error' });
  }
});

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
    body('adminContent').optional().trim().isLength({ max: 5000 }).withMessage('Admin message copy 5000 characters se zyada nahi honi chahiye'),
    body('encrypted').optional().isBoolean().withMessage('Encrypted flag valid hona chahiye'),
  ],
  async (req, res) => {
    const validErr = handleValidation(req, res);
    if (validErr) return;

    try {
      const { receiverId, content, adminContent, encrypted = false } = req.body;

      const connected = await checkConnection(req.user._id, receiverId);
      if (!connected) return res.status(403).json({ message: 'Pehle proposal accept karo' });

      const message = await Message.create({
        sender: req.user._id,
        receiver: receiverId,
        content,
        adminContent,
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

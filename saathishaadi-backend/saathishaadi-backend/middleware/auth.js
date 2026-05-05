/**
 * Auth Middleware
 * - JWT verify with proper error handling
 * - Token blacklist check (logout ke liye)
 * - Admin check
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

// In-memory token blacklist (production mein Redis use karo)
const tokenBlacklist = new Set();

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Token nahi mila. Please login karein.' });
    }

    const token = authHeader.split(' ')[1];

    // Check blacklist (logged out tokens)
    if (tokenBlacklist.has(token)) {
      return res.status(401).json({ message: 'Session expire ho gaya. Dobara login karein.' });
    }

    // Verify JWT
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Session expire ho gaya. Dobara login karein.' });
      }
      if (jwtErr.name === 'JsonWebTokenError') {
        logger.warn(`Invalid JWT from IP: ${req.ip}`);
        return res.status(401).json({ message: 'Invalid token.' });
      }
      throw jwtErr;
    }

    const user = await User.findById(decoded.id).select('-__v');
    if (!user) {
      return res.status(401).json({ message: 'User nahi mila.' });
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: 'Account block kar diya gaya hai. Admin se contact karein.' });
    }

    if (user.isLocked()) {
      return res.status(423).json({ message: 'Account temporarily locked hai. Baad mein try karein.' });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    logger.error('Auth middleware error', { error: err.message });
    res.status(401).json({ message: 'Authentication failed.' });
  }
};

const adminOnly = (req, res, next) => {
  if (!req.user?.isAdmin) {
    logger.warn(`Non-admin tried admin route: ${req.user?._id} on ${req.path}`);
    return res.status(403).json({ message: 'Admin access required.' });
  }
  next();
};

/**
 * Blacklist a token (on logout)
 */
const blacklistToken = (token) => {
  tokenBlacklist.add(token);
  // Clean up old entries every hour (production mein JWT expiry ke hisaab se karo)
  setTimeout(() => tokenBlacklist.delete(token), 30 * 24 * 60 * 60 * 1000);
};

module.exports = { protect, adminOnly, blacklistToken };

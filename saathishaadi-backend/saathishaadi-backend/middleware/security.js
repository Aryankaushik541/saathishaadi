/**
 * Security Middleware Collection
 * - Rate Limiting (DoS/DDoS protection)
 * - Brute force protection
 * - Request sanitization
 * - Security headers
 * - IP blacklisting
 */

const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// ─── IP Blacklist (in-memory, badhao DB se agar chahiye) ──────────────────────
const blacklistedIPs = new Set();
const suspiciousIPs = new Map(); // ip -> { count, firstSeen }

/**
 * IP Blacklist Middleware - Blacklisted IPs ko block karo
 */
const ipBlacklist = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  if (blacklistedIPs.has(ip)) {
    logger.warn(`Blacklisted IP blocked: ${ip}`);
    return res.status(403).json({ message: 'Access denied.' });
  }
  next();
};

/**
 * DDoS / Flood Detection Middleware
 * Bahut zyada requests wale IPs ko auto-blacklist karo
 */
const ddosProtection = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  const maxRequests = 200; // max requests per minute per IP

  if (!suspiciousIPs.has(ip)) {
    suspiciousIPs.set(ip, { count: 1, firstSeen: now });
  } else {
    const entry = suspiciousIPs.get(ip);
    if (now - entry.firstSeen > windowMs) {
      // Reset window
      suspiciousIPs.set(ip, { count: 1, firstSeen: now });
    } else {
      entry.count++;
      if (entry.count > maxRequests) {
        blacklistedIPs.add(ip);
        logger.warn(`IP auto-blacklisted for DDoS: ${ip} (${entry.count} req/min)`);
        return res.status(429).json({ message: 'Too many requests. Temporarily blocked.' });
      }
    }
  }
  next();
};

// ─── Rate Limiters ────────────────────────────────────────────────────────────

/**
 * Global rate limiter - Sab routes ke liye
 */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // max 300 req per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Bahut zyada requests. 15 minute baad try karein.' },
  handler: (req, res, next, options) => {
    logger.warn(`Global rate limit hit: ${req.ip} on ${req.path}`);
    res.status(429).json(options.message);
  },
});

/**
 * Auth rate limiter - OTP/Login ke liye strict limit
 */
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // max 5 OTP requests per 10 min
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  message: { message: 'Bahut zyada OTP requests. 10 minute baad try karein.' },
  handler: (req, res, next, options) => {
    logger.warn(`Auth rate limit hit: ${req.ip} - ${req.body?.email || 'unknown'}`);
    res.status(429).json(options.message);
  },
});

/**
 * Login brute force limiter
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // max 10 login attempts
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Bahut zyada login attempts. 15 minute baad try karein.' },
  handler: (req, res, next, options) => {
    logger.warn(`Login brute force attempt: ${req.ip}`);
    res.status(429).json(options.message);
  },
});

/**
 * API general limiter
 */
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 req/min
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please slow down.' },
});

/**
 * Admin limiter - Extra strict
 */
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Admin rate limit exceeded.' },
});

/**
 * Request size limiter middleware
 */
const requestSizeLimiter = (req, res, next) => {
  const MAX_SIZE = 10 * 1024; // 10KB for JSON payloads
  if (req.headers['content-length'] && parseInt(req.headers['content-length']) > MAX_SIZE) {
    // Allow file upload routes to pass through
    if (!req.path.includes('register') && !req.path.includes('profile')) {
      return res.status(413).json({ message: 'Request too large.' });
    }
  }
  next();
};

/**
 * Security headers (supplement to helmet)
 */
const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  // Remove server fingerprint
  res.removeHeader('X-Powered-By');
  next();
};

/**
 * Log suspicious requests
 */
const suspiciousRequestLogger = (req, res, next) => {
  const suspicious = [
    '../', '..\\', '<script', 'javascript:', 'onload=', 'onerror=',
    'SELECT ', 'DROP TABLE', 'INSERT INTO', 'UNION SELECT',
    '/etc/passwd', '/proc/', 'eval(', 'exec(',
  ];
  const requestStr = JSON.stringify({ url: req.url, body: req.body, query: req.query });
  for (const pattern of suspicious) {
    if (requestStr.toLowerCase().includes(pattern.toLowerCase())) {
      logger.warn(`Suspicious request from ${req.ip}: ${pattern} detected in ${req.path}`);
      break;
    }
  }
  next();
};

module.exports = {
  ipBlacklist,
  ddosProtection,
  globalLimiter,
  authLimiter,
  loginLimiter,
  apiLimiter,
  adminLimiter,
  requestSizeLimiter,
  securityHeaders,
  suspiciousRequestLogger,
  blacklistedIPs,
};

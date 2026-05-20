/**
 * Security Middleware - v3.0 (Dynamic Settings Support)
 * Admin panel se sab configure ho sakta hai
 * Settings DB se read hoti hain - restart nahi chahiye
 */

const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// ─── In-Memory Caches ─────────────────────────────────────────────────────────
const blacklistedIPs = new Set();           // fast lookup (also in DB)
const suspiciousIPs = new Map();            // ip -> { count, firstSeen }

// Settings cache (refresh every 60 seconds)
let _settingsCache = null;
let _settingsCacheTime = 0;
const SETTINGS_CACHE_TTL = 60 * 1000;

const getSettings = async () => {
  if (_settingsCache && Date.now() - _settingsCacheTime < SETTINGS_CACHE_TTL) {
    return _settingsCache;
  }
  try {
    const Settings = require('../models/Settings');
    _settingsCache = await Settings.getAll();
    _settingsCacheTime = Date.now();
    return _settingsCache;
  } catch {
    return _settingsCache || {};
  }
};

// Invalidate cache immediately (called after settings update)
const invalidateSettingsCache = () => {
  _settingsCache = null;
  _settingsCacheTime = 0;
};

// ─── IP Helpers ───────────────────────────────────────────────────────────────
const getClientIp = (req) =>
  req.headers['cf-connecting-ip'] ||
  req.headers['x-real-ip'] ||
  req.ip ||
  req.connection?.remoteAddress ||
  '0.0.0.0';

// ─── Load DB Blacklist into memory on startup ─────────────────────────────────
const loadDbBlacklist = async () => {
  try {
    const IPBlacklist = require('../models/IPBlacklist');
    const blocked = await IPBlacklist.find({ isActive: true }).lean();
    blocked.forEach(b => blacklistedIPs.add(b.ip));
    logger.info(`Loaded ${blocked.length} blacklisted IPs from DB`);
  } catch (err) {
    logger.error('Could not load IP blacklist from DB', { error: err.message });
  }
};

// ─── Middleware: IP Blacklist Check ──────────────────────────────────────────
const ipBlacklist = async (req, res, next) => {
  const ip = getClientIp(req);

  // Check in-memory first (fast)
  if (blacklistedIPs.has(ip)) {
    logger.warn(`Blacklisted IP blocked: ${ip}`);
    return res.status(403).json({ message: 'Access denied. Your IP is blocked.' });
  }

  // Check DB for IPs not in memory (edge case)
  try {
    const IPBlacklist = require('../models/IPBlacklist');
    const entry = await IPBlacklist.findOne({ ip, isActive: true }).lean();
    if (entry) {
      blacklistedIPs.add(ip); // Add to memory cache
      logger.warn(`Blacklisted IP blocked (from DB): ${ip}`);
      return res.status(403).json({ message: 'Access denied. Your IP is blocked.' });
    }
  } catch { /* ignore DB errors */ }

  next();
};

// ─── Middleware: DDoS / Flood Detection ──────────────────────────────────────
const ddosProtection = async (req, res, next) => {
  const ip = getClientIp(req);
  const settings = await getSettings();
  const windowMs = settings['ddos.windowMs'] || 60000;
  const maxReq = settings['ddos.maxRequests'] || 200;
  const now = Date.now();

  if (!suspiciousIPs.has(ip)) {
    suspiciousIPs.set(ip, { count: 1, firstSeen: now });
  } else {
    const entry = suspiciousIPs.get(ip);
    if (now - entry.firstSeen > windowMs) {
      suspiciousIPs.set(ip, { count: 1, firstSeen: now });
    } else {
      entry.count++;
      if (entry.count > maxReq) {
        // Auto-blacklist in memory
        blacklistedIPs.add(ip);

        // Persist to DB
        try {
          const IPBlacklist = require('../models/IPBlacklist');
          await IPBlacklist.findOneAndUpdate(
            { ip },
            {
              ip,
              reason: `Auto-blocked: DDoS (${entry.count} req/${windowMs / 1000}s)`,
              autoBlocked: true,
              requestCount: entry.count,
              isActive: true,
              lastSeen: new Date(),
            },
            { upsert: true }
          );
        } catch { /* ignore */ }

        logger.warn(`IP auto-blacklisted for DDoS: ${ip} (${entry.count} req)`);
        return res.status(429).json({ message: 'Too many requests. Temporarily blocked.' });
      }
    }
  }
  next();
};

// ─── Dynamic Rate Limiter Factory ────────────────────────────────────────────
const makeDynamicLimiter = (settingsPrefix, defaults) => {
  return rateLimit({
    windowMs: defaults.windowMs,
    max: defaults.max,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    keyGenerator: (req) => getClientIp(req),
    handler: async (req, res, next, options) => {
      const settings = await getSettings();
      logger.warn(`Rate limit hit [${settingsPrefix}]: ${getClientIp(req)} on ${req.path}`);
      res.status(429).json({ message: settings[`${settingsPrefix}.message`] || options.message.message });
    },
    // Dynamic max via async getter is not natively supported in express-rate-limit
    // So we refresh windowMs/max on each window by using skip function
    skip: async (req) => {
      // Never skip - just used to potentially update settings
      return false;
    },
    ...defaults,
  });
};

// ─── Fixed Rate Limiters (dynamic refresh via middleware wrapper) ──────────────
const _makeLimiter = (wMs, mx, msg) => rateLimit({
  windowMs: wMs,
  max: mx,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIp,
  message: { message: msg },
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit: ${getClientIp(req)} → ${req.path}`);
    res.status(429).json(options.message);
  },
});

// Global limiters (static - refreshed on server restart or manual call)
let globalLimiter = _makeLimiter(15 * 60 * 1000, 300, 'Bahut zyada requests. 15 min baad try karein.');
let authLimiter   = _makeLimiter(10 * 60 * 1000, 10,  'Bahut zyada OTP requests. 10 min baad try karein.');
let loginLimiter  = _makeLimiter(15 * 60 * 1000, 20,  'Bahut zyada login attempts. 15 min baad try karein.');
let apiLimiter    = _makeLimiter(60 * 1000,       60,  'Too many requests. Please slow down.');
let adminLimiter  = _makeLimiter(15 * 60 * 1000, 60,  'Admin rate limit exceeded.');

// Refresh limiters from DB settings (call on startup & after settings update)
const refreshLimiters = async () => {
  const s = await getSettings();
  if (s['rl.global.windowMs']) globalLimiter = _makeLimiter(s['rl.global.windowMs'], s['rl.global.max'], 'Bahut zyada requests. Baad mein try karein.');
  if (s['rl.auth.windowMs'])   authLimiter   = _makeLimiter(s['rl.auth.windowMs'],   s['rl.auth.max'],   'Bahut zyada OTP requests. Baad mein try karein.');
  if (s['rl.login.windowMs'])  loginLimiter  = _makeLimiter(s['rl.login.windowMs'],  s['rl.login.max'],  'Bahut zyada login attempts. Baad mein try karein.');
  if (s['rl.api.windowMs'])    apiLimiter    = _makeLimiter(s['rl.api.windowMs'],    s['rl.api.max'],    'Too many requests.');
  if (s['rl.admin.windowMs'])  adminLimiter  = _makeLimiter(s['rl.admin.windowMs'],  s['rl.admin.max'],  'Admin rate limit exceeded.');
  logger.info('Rate limiters refreshed from settings');
};

// Proxy wrappers so routes always use latest limiter instance
const globalLimiterProxy  = (req, res, next) => globalLimiter(req, res, next);
const authLimiterProxy    = (req, res, next) => authLimiter(req, res, next);
const loginLimiterProxy   = (req, res, next) => loginLimiter(req, res, next);
const apiLimiterProxy     = (req, res, next) => apiLimiter(req, res, next);
const adminLimiterProxy   = (req, res, next) => adminLimiter(req, res, next);

// ─── Request Size Limiter ─────────────────────────────────────────────────────
const requestSizeLimiter = async (req, res, next) => {
  const settings = await getSettings();
  const maxKB = settings['security.requestMaxKB'] || 10;
  const MAX_SIZE = maxKB * 1024;
  if (req.headers['content-length'] && parseInt(req.headers['content-length']) > MAX_SIZE) {
    if (!req.path.includes('register') && !req.path.includes('profile') && !req.path.includes('upload')) {
      return res.status(413).json({ message: `Request too large (max ${maxKB}KB).` });
    }
  }
  next();
};

// ─── Security Headers ─────────────────────────────────────────────────────────
const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.removeHeader('X-Powered-By');
  next();
};

// ─── Cloudflare Security ──────────────────────────────────────────────────────
const cloudflareSecurity = async (req, res, next) => {
  if (req.headers['cf-connecting-ip']) req.realIp = req.headers['cf-connecting-ip'];
  res.setHeader('CF-Cache-Status-Control', 'no-store');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  const settings = await getSettings();
  const host = req.hostname;
  const ip = getClientIp(req);
  const isLocalRequest =
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === '::ffff:127.0.0.1';

  if (process.env.NODE_ENV !== 'production' && isLocalRequest) {
    return next();
  }

  const cfOnly = settings['security.cloudflareOnly'] !== undefined
    ? settings['security.cloudflareOnly']
    : (process.env.CLOUDFLARE_ONLY === 'true');

  if (cfOnly && !req.headers['cf-connecting-ip']) {
    return res.status(403).json({ message: 'Direct origin access denied.' });
  }
  next();
};

// ─── Maintenance Mode ─────────────────────────────────────────────────────────
const maintenanceCheck = async (req, res, next) => {
  // Always allow admin routes
  if (req.path.startsWith('/api/admin') || req.path === '/health') return next();
  const settings = await getSettings();
  if (settings['system.maintenanceMode']) {
    return res.status(503).json({ message: 'Site maintenance mode mein hai. Thodi der baad try karein.' });
  }
  next();
};

// ─── Suspicious Request Logger ────────────────────────────────────────────────
const suspiciousPatterns = [
  '../', '..\\', '<script', 'javascript:', 'onload=', 'onerror=',
  'SELECT ', 'DROP TABLE', 'INSERT INTO', 'UNION SELECT',
  '/etc/passwd', '/proc/', 'eval(', 'exec(', 'base64_decode',
];

const suspiciousRequestLogger = async (req, res, next) => {
  const settings = await getSettings();
  if (!settings['security.suspiciousPatternBlock'] && settings['security.suspiciousPatternBlock'] !== undefined) {
    return next();
  }

  const requestStr = JSON.stringify({ url: req.url, body: req.body, query: req.query });
  let detectedPattern = null;
  for (const pattern of suspiciousPatterns) {
    if (requestStr.toLowerCase().includes(pattern.toLowerCase())) {
      detectedPattern = pattern;
      break;
    }
  }

  if (detectedPattern) {
    const ip = getClientIp(req);
    logger.warn(`Suspicious request from ${ip}: "${detectedPattern}" in ${req.path}`);

    // Log to AccessLog
    try {
      const AccessLog = require('../models/AccessLog');
      await AccessLog.create({
        ip,
        path: req.path,
        method: req.method,
        statusCode: 400,
        userAgent: req.headers['user-agent'],
        suspicious: true,
        suspiciousReason: `Pattern: ${detectedPattern}`,
        timestamp: new Date(),
      });
    } catch { /* ignore */ }
  }

  next();
};

// ─── Access Logger Middleware ─────────────────────────────────────────────────
const accessLogger = async (req, res, next) => {
  const settings = await getSettings();
  if (!settings['security.accessLogEnabled'] && settings['security.accessLogEnabled'] !== undefined) {
    return next();
  }

  // Skip static files and health checks
  if (req.path.startsWith('/uploads') || req.path === '/health' || req.path === '/') {
    return next();
  }

  const start = Date.now();
  const ip = getClientIp(req);

  res.on('finish', async () => {
    try {
      const AccessLog = require('../models/AccessLog');
      const logEntry = {
        ip,
        realIp: req.headers['cf-connecting-ip'] || null,
        path: req.path,
        method: req.method,
        statusCode: res.statusCode,
        userAgent: req.headers['user-agent'],
        referer: req.headers['referer'],
        responseTimeMs: Date.now() - start,
        requestSizeBytes: parseInt(req.headers['content-length']) || 0,
        country: req.headers['cf-ipcountry'] || null,
        cfRay: req.headers['cf-ray'] || null,
        timestamp: new Date(),
      };

      // Attach user if authenticated
      if (req.user) {
        logEntry.userId = req.user._id?.toString();
        logEntry.userEmail = req.user.email;
      }

      await AccessLog.create(logEntry);
    } catch { /* ignore logging errors */ }
  });

  next();
};

module.exports = {
  // Middleware
  ipBlacklist,
  ddosProtection,
  requestSizeLimiter,
  securityHeaders,
  cloudflareSecurity,
  suspiciousRequestLogger,
  accessLogger,
  maintenanceCheck,
  // Proxy limiters (always current)
  globalLimiter: globalLimiterProxy,
  authLimiter: authLimiterProxy,
  loginLimiter: loginLimiterProxy,
  apiLimiter: apiLimiterProxy,
  adminLimiter: adminLimiterProxy,
  // Helpers
  getClientIp,
  blacklistedIPs,
  suspiciousIPs,
  // Functions
  loadDbBlacklist,
  refreshLimiters,
  invalidateSettingsCache,
};

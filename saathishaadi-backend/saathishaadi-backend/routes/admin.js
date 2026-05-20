/**
 * Admin Routes v3.0 - Complete Admin Control Panel Backend
 * ✅ Settings CRUD (rate limits, OTP, security, calls)
 * ✅ IP Blacklist Management (add/remove/view)
 * ✅ Access Logs (viewer, filter by IP, export)
 * ✅ Suspicious IPs
 * ✅ Call Logs & Recording Settings
 * ✅ OTP Logs
 * ✅ System Health & Stats
 * All routes under /api/admin
 */

const express = require('express');
const router  = express.Router();
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const path = require('path');

const User          = require('../models/User');
const Proposal      = require('../models/Proposal');
const Message       = require('../models/Message');
const Advertisement = require('../models/Advertisement');
const Page          = require('../models/Page');
const Settings      = require('../models/Settings');
const AccessLog     = require('../models/AccessLog');
const IPBlacklist   = require('../models/IPBlacklist');
const CallLog       = require('../models/CallLog');
const OTP           = require('../models/OTP');

const upload      = require('../middleware/upload');
const { protect, adminOnly } = require('../middleware/auth');
const {
  adminLimiter,
  blacklistedIPs,
  suspiciousIPs,
  refreshLimiters,
  invalidateSettingsCache,
} = require('../middleware/security');
const { safeCompare } = require('../utils/crypto');
const logger = require('../utils/logger');

const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
  return null;
};

// ─── POST /api/admin/login ─────────────────────────────────────────────────
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
        logger.error('ADMIN_PASSWORD not set!');
        return res.status(500).json({ message: 'Server configuration error' });
      }

      const userMatch = safeCompare(username, ADMIN_USER);
      const passMatch = safeCompare(password, ADMIN_PASS);

      if (!userMatch || !passMatch) {
        logger.warn(`Failed admin login: ${req.ip}`);
        return res.status(401).json({ message: 'Galat credentials' });
      }

      let admin = await User.findOne({ isAdmin: true });
      if (!admin) {
        admin = await User.create({
          email: 'admin@saathishaadi.com',
          name: 'Admin',
          age: 30, gender: 'Male', religion: 'Hindu',
          isAdmin: true, isEmailVerified: true,
        });
      }

      const adminExpiry = await Settings.get('jwt.adminExpiresIn', '7d');
      const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, {
        expiresIn: adminExpiry,
        algorithm: 'HS256',
      });

      logger.info(`Admin logged in: ${req.ip}`);
      res.json({ token, admin: { _id: admin._id, name: admin.name, isAdmin: true } });
    } catch (err) {
      logger.error('Admin login error', { error: err.message });
      res.status(500).json({ message: 'Admin login error' });
    }
  }
);

// All routes below require admin auth
router.use(protect, adminOnly, adminLimiter);

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/dashboard', async (req, res) => {
  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [
      totalUsers, activeUsers, totalProposals, acceptedProposals,
      totalMessages, blockedUsers, newUsersThisWeek, maleCnt, femaleCnt,
      pendingProposals, rejectedProposals, e2eeUsers, totalPages,
      totalCallLogs, totalAccessLogs, blacklistedIPsCount, suspiciousLogsCount,
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
      User.countDocuments({ isAdmin: false, e2eePublicKey: { $ne: null } }),
      Page.countDocuments(),
      CallLog.countDocuments(),
      AccessLog.countDocuments(),
      IPBlacklist.countDocuments({ isActive: true }),
      AccessLog.countDocuments({ suspicious: true }),
    ]);

    const [religionStats, districtStats, recentSuspicious, callStats, dailyTraffic] = await Promise.all([
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
      AccessLog.find({ suspicious: true })
        .sort({ timestamp: -1 }).limit(5).lean(),
      CallLog.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      AccessLog.aggregate([
        {
          $match: {
            timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    res.json({
      totalUsers, activeUsers, totalProposals, acceptedProposals,
      totalMessages, blockedUsers, newUsersThisWeek,
      maleCnt, femaleCnt, pendingProposals, rejectedProposals, e2eeUsers, totalPages,
      religionStats, districtStats,
      security: {
        totalAccessLogs, blacklistedIPsCount, suspiciousLogsCount,
        recentSuspicious, inMemoryBlacklisted: blacklistedIPs.size,
        inMemorySuspicious: suspiciousIPs.size,
      },
      calls: { totalCallLogs, callStats },
      dailyTraffic,
    });
  } catch (err) {
    logger.error('Dashboard error', { error: err.message });
    res.status(500).json({ message: 'Dashboard load error' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// SETTINGS MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

// GET all settings
router.get('/settings', async (req, res) => {
  try {
    const { category } = req.query;
    const query = category ? { category } : {};
    const settings = await Settings.find(query).sort({ category: 1, key: 1 }).lean();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: 'Settings load error' });
  }
});

// GET settings grouped by category
router.get('/settings/grouped', async (req, res) => {
  try {
    const settings = await Settings.find().sort({ category: 1, key: 1 }).lean();
    const grouped = settings.reduce((acc, s) => {
      if (!acc[s.category]) acc[s.category] = [];
      acc[s.category].push(s);
      return acc;
    }, {});
    res.json(grouped);
  } catch (err) {
    res.status(500).json({ message: 'Settings load error' });
  }
});

// PUT single setting
router.put('/settings/:key', async (req, res) => {
  try {
    const { key } = req.params;
    let { value } = req.body;

    // Type coercion based on existing setting
    const existing = await Settings.findOne({ key }).lean();
    if (existing) {
      if (existing.valueType === 'number') value = Number(value);
      else if (existing.valueType === 'boolean') value = value === true || value === 'true';
    }

    const setting = await Settings.findOneAndUpdate(
      { key },
      { value, updatedBy: 'admin' },
      { new: true, upsert: true }
    );

    // Invalidate cache and refresh limiters
    invalidateSettingsCache();

    // Refresh rate limiters if it's a rate limit setting
    if (key.startsWith('rl.')) {
      await refreshLimiters();
    }

    logger.info(`Setting updated: ${key} = ${JSON.stringify(value)}`);
    res.json(setting);
  } catch (err) {
    res.status(500).json({ message: 'Setting update error' });
  }
});

// PUT bulk settings update
router.put('/settings', async (req, res) => {
  try {
    const { settings } = req.body; // [{ key, value }]
    if (!Array.isArray(settings)) return res.status(400).json({ message: 'settings must be array' });

    const results = [];
    for (const { key, value } of settings) {
      const existing = await Settings.findOne({ key }).lean();
      let v = value;
      if (existing?.valueType === 'number') v = Number(value);
      else if (existing?.valueType === 'boolean') v = v === true || v === 'true';

      const s = await Settings.findOneAndUpdate(
        { key },
        { value: v, updatedBy: 'admin' },
        { new: true, upsert: true }
      );
      results.push(s);
    }

    invalidateSettingsCache();
    await refreshLimiters();

    logger.info(`Bulk settings updated: ${settings.length} settings`);
    res.json({ message: `${settings.length} settings updated`, results });
  } catch (err) {
    res.status(500).json({ message: 'Bulk settings update error' });
  }
});

// POST reset setting to default (re-seed)
router.post('/settings/reset', async (req, res) => {
  try {
    await Settings.deleteMany({});
    await Settings.seedDefaults();
    invalidateSettingsCache();
    await refreshLimiters();
    res.json({ message: 'Settings reset to defaults' });
  } catch (err) {
    res.status(500).json({ message: 'Reset error' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// IP MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

// GET all blacklisted IPs
router.get('/ip-blacklist', async (req, res) => {
  try {
    const { page = 1, limit = 50, search, autoBlocked } = req.query;
    const query = {};
    if (search) query.ip = { $regex: search, $options: 'i' };
    if (autoBlocked !== undefined) query.autoBlocked = autoBlocked === 'true';

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(200, Number(limit));
    const skip = (pageNum - 1) * limitNum;

    const [ips, total] = await Promise.all([
      IPBlacklist.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      IPBlacklist.countDocuments(query),
    ]);

    res.json({ ips, total, totalPages: Math.ceil(total / limitNum), inMemory: blacklistedIPs.size });
  } catch (err) {
    res.status(500).json({ message: 'IP blacklist load error' });
  }
});

// POST add IP to blacklist
router.post('/ip-blacklist',
  [
    body('ip').trim().notEmpty().withMessage('IP address required'),
    body('reason').optional().trim().isLength({ max: 200 }),
    body('expiresAt').optional().isISO8601().withMessage('Valid date required'),
  ],
  async (req, res) => {
    const validErr = handleValidation(req, res);
    if (validErr) return;

    try {
      const { ip, reason, expiresAt } = req.body;

      const entry = await IPBlacklist.findOneAndUpdate(
        { ip },
        {
          ip,
          reason: reason || 'Manual block by admin',
          addedBy: 'admin',
          autoBlocked: false,
          isActive: true,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          lastSeen: new Date(),
        },
        { upsert: true, new: true }
      );

      // Add to memory
      blacklistedIPs.add(ip);

      logger.info(`IP manually blacklisted: ${ip} by admin`);
      res.status(201).json({ message: 'IP blacklist mein add kar diya', entry });
    } catch (err) {
      res.status(500).json({ message: 'IP blacklist error' });
    }
  }
);

// DELETE remove IP from blacklist
router.delete('/ip-blacklist/:ip', async (req, res) => {
  try {
    const ip = decodeURIComponent(req.params.ip);
    await IPBlacklist.findOneAndUpdate({ ip }, { isActive: false });
    blacklistedIPs.delete(ip);
    logger.info(`IP removed from blacklist: ${ip}`);
    res.json({ message: 'IP blacklist se remove kar diya' });
  } catch (err) {
    res.status(500).json({ message: 'IP remove error' });
  }
});

// POST unblock all auto-blocked IPs
router.post('/ip-blacklist/clear-auto', async (req, res) => {
  try {
    const result = await IPBlacklist.updateMany({ autoBlocked: true }, { isActive: false });
    // Reload memory blacklist
    const active = await IPBlacklist.find({ isActive: true }).lean();
    blacklistedIPs.clear();
    active.forEach(b => blacklistedIPs.add(b.ip));
    res.json({ message: `${result.modifiedCount} auto-blocked IPs cleared` });
  } catch (err) {
    res.status(500).json({ message: 'Clear auto-blocked error' });
  }
});

// GET suspicious IPs (from memory + recent DDoS attempts)
router.get('/ip-suspicious', async (req, res) => {
  try {
    const suspicious = [];
    for (const [ip, data] of suspiciousIPs.entries()) {
      suspicious.push({ ip, ...data, age: Date.now() - data.firstSeen });
    }
    suspicious.sort((a, b) => b.count - a.count);

    // Also get from access logs
    const fromLogs = await AccessLog.aggregate([
      { $match: { suspicious: true } },
      { $group: { _id: '$ip', count: { $sum: 1 }, lastSeen: { $max: '$timestamp' }, reasons: { $addToSet: '$suspiciousReason' } } },
      { $sort: { count: -1 } },
      { $limit: 50 },
    ]);

    res.json({ inMemory: suspicious, fromLogs });
  } catch (err) {
    res.status(500).json({ message: 'Suspicious IPs load error' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ACCESS LOGS
// ═══════════════════════════════════════════════════════════════════════════════

// GET access logs (paginated, filterable)
router.get('/access-logs', async (req, res) => {
  try {
    const { page = 1, limit = 50, ip, path: reqPath, statusCode, suspicious, method, startDate, endDate } = req.query;
    const query = {};

    if (ip) query.ip = { $regex: ip, $options: 'i' };
    if (reqPath) query.path = { $regex: reqPath, $options: 'i' };
    if (statusCode) query.statusCode = Number(statusCode);
    if (suspicious !== undefined) query.suspicious = suspicious === 'true';
    if (method) query.method = method.toUpperCase();
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(200, Number(limit));
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      AccessLog.find(query).sort({ timestamp: -1 }).skip(skip).limit(limitNum).lean(),
      AccessLog.countDocuments(query),
    ]);

    res.json({ logs, total, totalPages: Math.ceil(total / limitNum) });
  } catch (err) {
    res.status(500).json({ message: 'Access logs load error' });
  }
});

// GET logs for specific IP
router.get('/access-logs/ip/:ip', async (req, res) => {
  try {
    const ip = decodeURIComponent(req.params.ip);
    const { limit = 100 } = req.query;

    const logs = await AccessLog.find({ ip })
      .sort({ timestamp: -1 })
      .limit(Math.min(500, Number(limit)))
      .lean();

    const stats = await AccessLog.aggregate([
      { $match: { ip } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          suspicious: { $sum: { $cond: ['$suspicious', 1, 0] } },
          avgResponseTime: { $avg: '$responseTimeMs' },
          paths: { $addToSet: '$path' },
          firstSeen: { $min: '$timestamp' },
          lastSeen: { $max: '$timestamp' },
        },
      },
    ]);

    res.json({ ip, logs, stats: stats[0] || {} });
  } catch (err) {
    res.status(500).json({ message: 'IP logs load error' });
  }
});

// GET top IPs by request count
router.get('/access-logs/top-ips', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const since = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);

    const topIPs = await AccessLog.aggregate([
      { $match: { timestamp: { $gte: since } } },
      {
        $group: {
          _id: '$ip',
          count: { $sum: 1 },
          suspicious: { $sum: { $cond: ['$suspicious', 1, 0] } },
          lastSeen: { $max: '$timestamp' },
          paths: { $addToSet: '$path' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 30 },
    ]);

    res.json(topIPs);
  } catch (err) {
    res.status(500).json({ message: 'Top IPs load error' });
  }
});

// DELETE clear access logs (with optional filter)
router.delete('/access-logs', async (req, res) => {
  try {
    const { olderThanDays, ip, suspicious } = req.body;
    const query = {};
    if (olderThanDays) query.timestamp = { $lt: new Date(Date.now() - Number(olderThanDays) * 24 * 60 * 60 * 1000) };
    if (ip) query.ip = ip;
    if (suspicious !== undefined) query.suspicious = suspicious;

    const result = await AccessLog.deleteMany(query);
    logger.info(`Access logs cleared: ${result.deletedCount} entries`);
    res.json({ message: `${result.deletedCount} logs delete kar diye` });
  } catch (err) {
    res.status(500).json({ message: 'Log clear error' });
  }
});

// GET access log stats
router.get('/access-logs/stats', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const since = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);

    const [total, suspicious, byStatus, byMethod, hourly] = await Promise.all([
      AccessLog.countDocuments({ timestamp: { $gte: since } }),
      AccessLog.countDocuments({ timestamp: { $gte: since }, suspicious: true }),
      AccessLog.aggregate([
        { $match: { timestamp: { $gte: since } } },
        { $group: { _id: '$statusCode', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      AccessLog.aggregate([
        { $match: { timestamp: { $gte: since } } },
        { $group: { _id: '$method', count: { $sum: 1 } } },
      ]),
      AccessLog.aggregate([
        { $match: { timestamp: { $gte: since } } },
        {
          $group: {
            _id: { $hour: '$timestamp' },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    res.json({ total, suspicious, byStatus, byMethod, hourly });
  } catch (err) {
    res.status(500).json({ message: 'Stats error' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CALL LOGS & RECORDING
// ═══════════════════════════════════════════════════════════════════════════════

// GET all call logs
router.get('/call-logs', async (req, res) => {
  try {
    const { page = 1, limit = 30, callType, status, search, startDate, endDate } = req.query;
    const query = {};

    if (callType && ['video', 'audio', 'voice'].includes(callType)) query.callType = callType;
    if (status) query.status = status;
    if (startDate || endDate) {
      query.startTime = {};
      if (startDate) query.startTime.$gte = new Date(startDate);
      if (endDate) query.startTime.$lte = new Date(endDate);
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Number(limit));
    const skip = (pageNum - 1) * limitNum;

    let dbQuery = CallLog.find(query).sort({ startTime: -1 }).skip(skip).limit(limitNum);
    let [calls, total] = await Promise.all([dbQuery.lean(), CallLog.countDocuments(query)]);

    // Filter by search after fetch
    if (search) {
      const s = search.toLowerCase();
      calls = calls.filter(c =>
        c.callerName?.toLowerCase().includes(s) ||
        c.receiverName?.toLowerCase().includes(s) ||
        c.callerEmail?.toLowerCase().includes(s) ||
        c.receiverEmail?.toLowerCase().includes(s)
      );
    }

    // Stats
    const stats = await CallLog.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 }, totalDuration: { $sum: '$durationSeconds' } } },
    ]);

    res.json({ calls, total, totalPages: Math.ceil(total / limitNum), stats });
  } catch (err) {
    res.status(500).json({ message: 'Call logs load error' });
  }
});

// POST create call log (called from socket.io events in server.js)
router.post('/call-logs', async (req, res) => {
  try {
    const log = await CallLog.create(req.body);
    res.status(201).json(log);
  } catch (err) {
    res.status(500).json({ message: 'Call log create error' });
  }
});

// PUT update call log (on call end)
router.put('/call-logs/:id', async (req, res) => {
  try {
    const allowed = ['endTime', 'durationSeconds', 'status', 'endReason', 'recordingUrl', 'recordingSizeBytes', 'metadata'];
    const update = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });

    const log = await CallLog.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!log) return res.status(404).json({ message: 'Call log nahi mila' });
    res.json(log);
  } catch (err) {
    res.status(500).json({ message: 'Call log update error' });
  }
});

// DELETE call log
router.delete('/call-logs/:id', async (req, res) => {
  try {
    await CallLog.findByIdAndDelete(req.params.id);
    res.json({ message: 'Call log delete kar diya' });
  } catch (err) {
    res.status(500).json({ message: 'Call log delete error' });
  }
});

// DELETE bulk clear call logs
router.delete('/call-logs', async (req, res) => {
  try {
    const { olderThanDays } = req.body;
    const query = {};
    if (olderThanDays) query.createdAt = { $lt: new Date(Date.now() - Number(olderThanDays) * 24 * 60 * 60 * 1000) };
    const result = await CallLog.deleteMany(query);
    res.json({ message: `${result.deletedCount} call logs delete kar diye` });
  } catch (err) {
    res.status(500).json({ message: 'Call logs clear error' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// OTP MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

// GET OTP logs (active/used/expired)
router.get('/otp-logs', async (req, res) => {
  try {
    const { page = 1, limit = 50, used, email, startDate, endDate } = req.query;
    const query = {};

    if (used !== undefined) query.used = used === 'true';
    if (email) query.email = { $regex: email, $options: 'i' };
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(200, Number(limit));
    const skip = (pageNum - 1) * limitNum;

    const [otps, total] = await Promise.all([
      OTP.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      OTP.countDocuments(query),
    ]);

    // Stats
    const stats = await OTP.aggregate([
      {
        $group: {
          _id: '$used',
          count: { $sum: 1 },
          avgAttempts: { $avg: '$attempts' },
        },
      },
    ]);

    // Top IPs sending OTPs
    const topIPs = await OTP.aggregate([
      { $group: { _id: '$ipAddress', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    res.json({ otps, total, totalPages: Math.ceil(total / limitNum), stats, topIPs });
  } catch (err) {
    res.status(500).json({ message: 'OTP logs load error' });
  }
});

// DELETE all used/expired OTPs
router.delete('/otp-logs/cleanup', async (req, res) => {
  try {
    const result = await OTP.deleteMany({
      $or: [{ used: true }, { expiresAt: { $lt: new Date() } }],
    });
    res.json({ message: `${result.deletedCount} OTP records cleaned up` });
  } catch (err) {
    res.status(500).json({ message: 'OTP cleanup error' });
  }
});

// DELETE specific OTP (invalidate)
router.delete('/otp-logs/:id', async (req, res) => {
  try {
    await OTP.findByIdAndDelete(req.params.id);
    res.json({ message: 'OTP invalidate kar diya' });
  } catch (err) {
    res.status(500).json({ message: 'OTP delete error' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// SYSTEM HEALTH
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/system/health', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const os = require('os');
    const memUsage = process.memoryUsage();

    res.json({
      status: 'OK',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      db: {
        status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        host: mongoose.connection.host,
        name: mongoose.connection.name,
      },
      memory: {
        rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB',
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
      },
      system: {
        platform: os.platform(),
        cpus: os.cpus().length,
        totalMemGB: (os.totalmem() / 1024 / 1024 / 1024).toFixed(1),
        freeMemGB: (os.freemem() / 1024 / 1024 / 1024).toFixed(1),
        loadAvg: os.loadavg(),
      },
      security: {
        inMemoryBlacklist: blacklistedIPs.size,
        inMemorySuspicious: suspiciousIPs.size,
      },
      nodeVersion: process.version,
    });
  } catch (err) {
    res.status(500).json({ message: 'Health check error' });
  }
});

// POST refresh settings cache & rate limiters
router.post('/system/refresh-settings', async (req, res) => {
  try {
    const { loadDbBlacklist } = require('../middleware/security');
    invalidateSettingsCache();
    await refreshLimiters();
    await loadDbBlacklist();
    res.json({ message: 'Settings aur limiters refresh ho gaye' });
  } catch (err) {
    res.status(500).json({ message: 'Refresh error' });
  }
});

// POST toggle maintenance mode
router.post('/system/maintenance', async (req, res) => {
  try {
    const { enabled } = req.body;
    await Settings.set('system.maintenanceMode', !!enabled, { updatedBy: 'admin' });
    invalidateSettingsCache();
    logger.info(`Maintenance mode: ${enabled}`);
    res.json({ message: `Maintenance mode ${enabled ? 'enable' : 'disable'} kar diya`, enabled: !!enabled });
  } catch (err) {
    res.status(500).json({ message: 'Maintenance mode error' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// USERS (existing, kept)
// ═══════════════════════════════════════════════════════════════════════════════

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

router.put('/users/:id',
  [
    body('name').optional().trim().notEmpty().isLength({ max: 100 }),
    body('age').optional().isInt({ min: 18, max: 65 }),
    body('gender').optional().isIn(['Male', 'Female']),
    body('bio').optional().isLength({ max: 500 }),
  ],
  async (req, res) => {
    const validErr = handleValidation(req, res);
    if (validErr) return;
    try {
      const allowedFields = ['name', 'mobile', 'age', 'gender', 'religion', 'caste', 'district', 'profession', 'bio'];
      const updateData = {};
      allowedFields.forEach(f => { if (req.body[f] !== undefined) updateData[f] = req.body[f]; });
      const user = await User.findOneAndUpdate({ _id: req.params.id, isAdmin: false }, updateData, { new: true, runValidators: true });
      if (!user) return res.status(404).json({ message: 'User nahi mila' });
      res.json({ message: 'User update ho gaya', user });
    } catch (err) {
      res.status(500).json({ message: 'User update error' });
    }
  }
);

router.put('/users/:id/block', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isBlocked: true }, { new: true });
    if (!user) return res.status(404).json({ message: 'User nahi mila' });
    logger.info(`User blocked: ${user.email}`);
    res.json({ message: 'User block kar diya', user });
  } catch (err) { res.status(500).json({ message: 'Block error' }); }
});

router.put('/users/:id/unblock', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isBlocked: false, loginAttempts: 0, lockUntil: null }, { new: true });
    if (!user) return res.status(404).json({ message: 'User nahi mila' });
    logger.info(`User unblocked: ${user.email}`);
    res.json({ message: 'User unblock kar diya', user });
  } catch (err) { res.status(500).json({ message: 'Unblock error' }); }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findOneAndDelete({ _id: req.params.id, isAdmin: false });
    if (!user) return res.status(404).json({ message: 'User nahi mila' });
    await Promise.all([
      Proposal.deleteMany({ $or: [{ sender: req.params.id }, { receiver: req.params.id }] }),
      Message.deleteMany({ $or: [{ sender: req.params.id }, { receiver: req.params.id }] }),
    ]);
    res.json({ message: 'User aur data delete kar diya' });
  } catch (err) { res.status(500).json({ message: 'Delete error' }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PROPOSALS (existing)
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/proposals', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const dbQuery = {};
    if (status && ['pending', 'accepted', 'rejected'].includes(status)) dbQuery.status = status;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;
    let [proposals, total] = await Promise.all([
      Proposal.find(dbQuery).populate('sender', 'name email gender religion district').populate('receiver', 'name email gender religion district').sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      Proposal.countDocuments(dbQuery),
    ]);
    if (search) {
      const s = search.toLowerCase();
      proposals = proposals.filter(p => p.sender?.name?.toLowerCase().includes(s) || p.receiver?.name?.toLowerCase().includes(s));
    }
    res.json({ proposals, total, totalPages: Math.ceil(total / limitNum) });
  } catch (err) { res.status(500).json({ message: 'Proposals load error' }); }
});

router.put('/proposals/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'accepted', 'rejected'].includes(status)) return res.status(400).json({ message: 'Invalid status' });
    const proposal = await Proposal.findByIdAndUpdate(req.params.id, { status }, { new: true }).populate('sender', 'name email').populate('receiver', 'name email');
    if (!proposal) return res.status(404).json({ message: 'Proposal nahi mila' });
    res.json({ message: `Proposal ${status}`, proposal });
  } catch (err) { res.status(500).json({ message: 'Status update error' }); }
});

router.delete('/proposals/:id', async (req, res) => {
  try {
    await Proposal.findByIdAndDelete(req.params.id);
    res.json({ message: 'Proposal delete kar diya' });
  } catch (err) { res.status(500).json({ message: 'Proposal delete error' }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// MESSAGES (existing)
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/messages', async (req, res) => {
  try {
    const { page = 1, limit = 30, search } = req.query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;
    let [messages, total] = await Promise.all([
      Message.find().populate('sender', 'name email gender').populate('receiver', 'name email gender').sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      Message.countDocuments(),
    ]);
    if (search) {
      const s = search.toLowerCase();
      messages = messages.filter(m => m.sender?.name?.toLowerCase().includes(s) || m.receiver?.name?.toLowerCase().includes(s) || m.text?.toLowerCase().includes(s));
    }
    res.json({ messages, total, totalPages: Math.ceil(total / limitNum) });
  } catch (err) { res.status(500).json({ message: 'Messages load error' }); }
});

router.delete('/messages/:id', async (req, res) => {
  try {
    await Message.findByIdAndDelete(req.params.id);
    res.json({ message: 'Message delete kar diya' });
  } catch (err) { res.status(500).json({ message: 'Message delete error' }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADS (existing)
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/ads', async (req, res) => {
  try {
    const ads = await Advertisement.find().sort({ createdAt: -1 }).lean();
    res.json(ads);
  } catch (err) { res.status(500).json({ message: 'Ads load error' }); }
});

router.post('/ads/upload-image', protect, adminOnly, upload.single('image'), upload.handleUploadError, (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Image nahi mili' });
  const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.json({ imageUrl, filename: req.file.filename });
});

router.post('/ads',
  [body('title').trim().notEmpty().isLength({ max: 200 }).withMessage('Ad title required')],
  async (req, res) => {
    const validErr = handleValidation(req, res);
    if (validErr) return;
    try {
      const ad = await Advertisement.create(req.body);
      res.status(201).json(ad);
    } catch (err) { res.status(500).json({ message: 'Ad create error' }); }
  }
);

router.put('/ads/:id', async (req, res) => {
  try {
    const ad = await Advertisement.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!ad) return res.status(404).json({ message: 'Ad nahi mila' });
    res.json(ad);
  } catch (err) { res.status(500).json({ message: 'Ad update error' }); }
});

router.delete('/ads/:id', async (req, res) => {
  try {
    await Advertisement.findByIdAndDelete(req.params.id);
    res.json({ message: 'Ad delete kar diya' });
  } catch (err) { res.status(500).json({ message: 'Ad delete error' }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PAGES (existing)
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/pages', async (req, res) => {
  try {
    const pages = await Page.find().sort({ updatedAt: -1 }).lean();
    res.json(pages);
  } catch (err) { res.status(500).json({ message: 'Pages load error' }); }
});

router.post('/pages',
  [
    body('slug').trim().isSlug().withMessage('Slug valid hona chahiye'),
    body('title').trim().notEmpty().isLength({ max: 120 }).withMessage('Title required'),
    body('content').trim().notEmpty().isLength({ max: 5000 }).withMessage('Content required'),
  ],
  async (req, res) => {
    const validErr = handleValidation(req, res);
    if (validErr) return;
    try {
      const page = await Page.create({ slug: req.body.slug, title: req.body.title, subtitle: req.body.subtitle || '', content: req.body.content, isActive: req.body.isActive !== false });
      res.status(201).json(page);
    } catch (err) {
      if (err.code === 11000) return res.status(409).json({ message: 'Slug already exists' });
      res.status(500).json({ message: 'Page create error' });
    }
  }
);

router.put('/pages/:id',
  [body('title').optional().trim().notEmpty().isLength({ max: 120 })],
  async (req, res) => {
    const validErr = handleValidation(req, res);
    if (validErr) return;
    try {
      const allowed = ['slug', 'title', 'subtitle', 'content', 'isActive'];
      const update = {};
      allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
      const page = await Page.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
      if (!page) return res.status(404).json({ message: 'Page nahi mila' });
      res.json(page);
    } catch (err) { res.status(500).json({ message: 'Page update error' }); }
  }
);

router.delete('/pages/:id', async (req, res) => {
  try {
    const page = await Page.findByIdAndDelete(req.params.id);
    if (!page) return res.status(404).json({ message: 'Page nahi mila' });
    res.json({ message: 'Page delete kar diya' });
  } catch (err) { res.status(500).json({ message: 'Page delete error' }); }
});

module.exports = router;

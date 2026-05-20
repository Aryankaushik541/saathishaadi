/**
 * Settings Model - Admin se configure karne wali sab settings
 * Key-value store in MongoDB
 */
const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, trim: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  category: {
    type: String,
    enum: ['rate_limit', 'otp', 'security', 'cors', 'call', 'system', 'notification'],
    default: 'system',
  },
  label: { type: String },
  description: { type: String },
  valueType: { type: String, enum: ['number', 'string', 'boolean', 'json'], default: 'string' },
  updatedBy: { type: String, default: 'admin' },
}, { timestamps: true });

// Static: get single value with fallback
settingsSchema.statics.get = async function (key, defaultValue = null) {
  try {
    const s = await this.findOne({ key }).lean();
    return s !== null ? s.value : defaultValue;
  } catch { return defaultValue; }
};

// Static: set single value
settingsSchema.statics.set = async function (key, value, meta = {}) {
  return this.findOneAndUpdate({ key }, { value, ...meta }, { upsert: true, new: true });
};

// Static: get all as flat object
settingsSchema.statics.getAll = async function () {
  const list = await this.find().lean();
  return list.reduce((acc, s) => { acc[s.key] = s.value; return acc; }, {});
};

// Static: seed defaults if not exist
settingsSchema.statics.seedDefaults = async function () {
  const defaults = [
    // ── Rate Limits ──────────────────────────────────────────────────────────
    { key: 'rl.global.windowMs',     value: 15 * 60 * 1000, category: 'rate_limit', valueType: 'number', label: 'Global - Window (ms)', description: '15 minute window for global rate limiter' },
    { key: 'rl.global.max',          value: 300,            category: 'rate_limit', valueType: 'number', label: 'Global - Max Requests', description: 'Max requests per window per IP (global)' },
    { key: 'rl.auth.windowMs',       value: 10 * 60 * 1000, category: 'rate_limit', valueType: 'number', label: 'Auth/OTP - Window (ms)', description: 'Window for OTP/auth rate limiter' },
    { key: 'rl.auth.max',            value: 10,             category: 'rate_limit', valueType: 'number', label: 'Auth/OTP - Max Requests', description: 'Max OTP requests per window per IP' },
    { key: 'rl.login.windowMs',      value: 15 * 60 * 1000, category: 'rate_limit', valueType: 'number', label: 'Login - Window (ms)', description: 'Window for login brute force limiter' },
    { key: 'rl.login.max',           value: 20,             category: 'rate_limit', valueType: 'number', label: 'Login - Max Attempts', description: 'Max login attempts per window per IP' },
    { key: 'rl.api.windowMs',        value: 60 * 1000,      category: 'rate_limit', valueType: 'number', label: 'API - Window (ms)', description: 'Window for general API rate limiter' },
    { key: 'rl.api.max',             value: 60,             category: 'rate_limit', valueType: 'number', label: 'API - Max Requests', description: 'Max API requests per minute per IP' },
    { key: 'rl.admin.windowMs',      value: 15 * 60 * 1000, category: 'rate_limit', valueType: 'number', label: 'Admin - Window (ms)', description: 'Window for admin panel rate limiter' },
    { key: 'rl.admin.max',           value: 60,             category: 'rate_limit', valueType: 'number', label: 'Admin - Max Requests', description: 'Max admin requests per window' },
    // ── DDoS / Security ──────────────────────────────────────────────────────
    { key: 'ddos.windowMs',          value: 60 * 1000,      category: 'security', valueType: 'number', label: 'DDoS Window (ms)', description: 'DDoS detection window duration' },
    { key: 'ddos.maxRequests',       value: 200,            category: 'security', valueType: 'number', label: 'DDoS Max Requests', description: 'Requests per window before auto-blacklist' },
    { key: 'security.requestMaxKB',  value: 10,             category: 'security', valueType: 'number', label: 'Max Request Size (KB)', description: 'Max JSON payload size in KB' },
    { key: 'security.cloudflareOnly',value: false,          category: 'security', valueType: 'boolean',label: 'Cloudflare Only Mode', description: 'Block direct origin requests (production only)' },
    { key: 'security.accessLogEnabled', value: true,        category: 'security', valueType: 'boolean',label: 'Enable Access Logs', description: 'Log all HTTP requests to DB' },
    { key: 'security.accessLogRetentionDays', value: 30,    category: 'security', valueType: 'number', label: 'Access Log Retention (days)', description: 'Auto-delete access logs after N days' },
    { key: 'security.suspiciousPatternBlock', value: true,  category: 'security', valueType: 'boolean',label: 'Block Suspicious Patterns', description: 'Block requests with SQL/XSS patterns' },
    // ── OTP ──────────────────────────────────────────────────────────────────
    { key: 'otp.expiryMinutes',      value: 10,             category: 'otp', valueType: 'number', label: 'OTP Expiry (minutes)', description: 'How long OTP is valid' },
    { key: 'otp.maxAttempts',        value: 5,              category: 'otp', valueType: 'number', label: 'OTP Max Wrong Attempts', description: 'Max wrong OTP attempts before invalidation' },
    { key: 'otp.length',             value: 6,              category: 'otp', valueType: 'number', label: 'OTP Length (digits)', description: 'Number of OTP digits (4-8)' },
    { key: 'otp.perIp5min',          value: 3,              category: 'otp', valueType: 'number', label: 'OTP per IP per 5 min', description: 'Max OTPs from same IP in 5 minutes' },
    { key: 'otp.perEmail10min',      value: 5,              category: 'otp', valueType: 'number', label: 'OTP per Email per 10 min', description: 'Max OTPs to same email in 10 minutes' },
    // ── CORS ─────────────────────────────────────────────────────────────────
    { key: 'cors.extraOrigins',      value: '',             category: 'cors', valueType: 'string', label: 'Extra CORS Origins', description: 'Comma-separated additional allowed origins' },
    // ── Call Recording ────────────────────────────────────────────────────────
    { key: 'call.recordingEnabled',  value: false,          category: 'call', valueType: 'boolean',label: 'Auto Recording Enabled', description: 'Auto-record all video/audio calls' },
    { key: 'call.recordingRetentionDays', value: 90,        category: 'call', valueType: 'number', label: 'Recording Retention (days)', description: 'Auto-delete call recordings after N days' },
    { key: 'call.maxDurationMinutes',value: 60,             category: 'call', valueType: 'number', label: 'Max Call Duration (minutes)', description: 'Auto-end calls after N minutes' },
    { key: 'call.logEnabled',        value: true,           category: 'call', valueType: 'boolean',label: 'Call Logging Enabled', description: 'Log all call metadata (caller, receiver, duration)' },
    // ── JWT ──────────────────────────────────────────────────────────────────
    { key: 'jwt.expiresIn',          value: '30d',          category: 'system', valueType: 'string', label: 'JWT Expiry', description: 'User JWT token expiry (e.g. 7d, 30d, 24h)' },
    { key: 'jwt.adminExpiresIn',     value: '7d',           category: 'system', valueType: 'string', label: 'Admin JWT Expiry', description: 'Admin JWT token expiry' },
    // ── System ───────────────────────────────────────────────────────────────
    { key: 'system.maintenanceMode', value: false,          category: 'system', valueType: 'boolean',label: 'Maintenance Mode', description: 'Block all non-admin API requests' },
    { key: 'system.registrationOpen',value: true,           category: 'system', valueType: 'boolean',label: 'Registration Open', description: 'Allow new user registrations' },
    { key: 'system.socketRateLimitPerMin', value: 100,      category: 'system', valueType: 'number', label: 'Socket Events/min per User', description: 'Max socket events per minute per user' },
  ];

  for (const d of defaults) {
    await this.findOneAndUpdate(
      { key: d.key },
      { $setOnInsert: d },
      { upsert: true }
    );
  }
};

module.exports = mongoose.model('Settings', settingsSchema);

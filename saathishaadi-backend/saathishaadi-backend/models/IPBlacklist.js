/**
 * IPBlacklist Model - Persistent IP blacklist (DB-backed)
 * Admin panel se manage karo - restart par bhi bacha rahega
 */
const mongoose = require('mongoose');

const ipBlacklistSchema = new mongoose.Schema({
  ip:          { type: String, required: true, unique: true, index: true },
  reason:      { type: String, default: 'Manual block by admin' },
  addedBy:     { type: String, default: 'admin' }, // 'admin' or 'system' (auto-block)
  autoBlocked: { type: Boolean, default: false },   // true = auto-blocked by DDoS detection
  requestCount:{ type: Number, default: 0 },        // requests that triggered auto-block
  isActive:    { type: Boolean, default: true, index: true },
  expiresAt:   { type: Date },  // null = permanent ban
  country:     { type: String },
  lastSeen:    { type: Date },
}, { timestamps: true });

// Sparse TTL index - only applies to docs where expiresAt is set
ipBlacklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, sparse: true });

module.exports = mongoose.model('IPBlacklist', ipBlacklistSchema);

/**
 * AccessLog Model - Har request ka record
 * IP, path, user, response time sab log hota hai
 * Auto-delete after retention period
 */
const mongoose = require('mongoose');

const accessLogSchema = new mongoose.Schema({
  ip:              { type: String, index: true },
  realIp:          { type: String },           // CF-Connecting-IP if behind Cloudflare
  path:            { type: String },
  method:          { type: String },
  statusCode:      { type: Number, index: true },
  userId:          { type: String, index: true },
  userEmail:       { type: String },
  userAgent:       { type: String },
  referer:         { type: String },
  responseTimeMs:  { type: Number },
  requestSizeBytes:{ type: Number },
  country:         { type: String },           // from CF-IPCountry header
  cfRay:           { type: String },           // Cloudflare Ray ID
  suspicious:      { type: Boolean, default: false, index: true },
  suspiciousReason:{ type: String },
  timestamp:       { type: Date, default: Date.now, index: true },
}, { timestamps: false, versionKey: false });

// Compound indexes for common queries
accessLogSchema.index({ ip: 1, timestamp: -1 });
accessLogSchema.index({ suspicious: 1, timestamp: -1 });
accessLogSchema.index({ statusCode: 1, timestamp: -1 });
accessLogSchema.index({ userId: 1, timestamp: -1 });

// TTL index - auto delete (30 days default, changed via settings)
accessLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model('AccessLog', accessLogSchema);

/**
 * OTP Model - Email OTP ke liye
 * - OTP bcrypt hashed store hota hai (plain text nahi)
 * - Auto-expire TTL index
 * - Attempt counting for brute force protection
 */

const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  otpHash: {
    type: String,
    required: true,
    // Hashed OTP stored - never plain text
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  used: {
    type: Boolean,
    default: false,
  },
  attempts: {
    type: Number,
    default: 0,
    max: 5, // Max 5 wrong attempts allowed
  },
  purpose: {
    type: String,
    enum: ['login', 'register', 'reset'],
    default: 'login',
  },
  ipAddress: {
    type: String,
    default: '',
  },
}, { timestamps: true });

// Auto-delete expired OTPs from MongoDB
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// One active OTP per email at a time (compound index)
otpSchema.index({ email: 1, used: 1 });

module.exports = mongoose.model('OTP', otpSchema);

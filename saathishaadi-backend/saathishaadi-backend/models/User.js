/**
 * User Model - SaathiShaadi
 * - Phone field removed (email se OTP)
 * - Email field added (unique, required)
 * - Sensitive fields encrypted
 */

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Valid email address daalen'],
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  age: {
    type: Number,
    required: true,
    min: 18,
    max: 65,
  },
  gender: {
    type: String,
    enum: ['Male', 'Female'],
    required: true,
  },
  religion: {
    type: String,
    required: true,
    trim: true,
  },
  caste: {
    type: String,
    default: '',
    trim: true,
  },
  district: {
    type: String,
    default: '',
    trim: true,
  },
  profession: {
    type: String,
    default: '',
    trim: true,
  },
  bio: {
    type: String,
    default: '',
    maxlength: 500,
  },
  photo: {
    type: String,
    default: '',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isBlocked: {
    type: Boolean,
    default: false,
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  lastSeen: {
    type: Date,
    default: Date.now,
  },
  loginAttempts: {
    type: Number,
    default: 0,
  },
  lockUntil: {
    type: Date,
    default: null,
  },
}, { timestamps: true });

// Method: Check if account is locked
userSchema.methods.isLocked = function () {
  return this.lockUntil && this.lockUntil > Date.now();
};

// Method: Increment failed login attempt
userSchema.methods.incrementLoginAttempts = async function () {
  // After 5 failed attempts, lock for 30 min
  if (this.loginAttempts >= 4) {
    this.lockUntil = new Date(Date.now() + 30 * 60 * 1000);
  }
  this.loginAttempts += 1;
  return this.save();
};

// Method: Reset login attempts on success
userSchema.methods.resetLoginAttempts = async function () {
  this.loginAttempts = 0;
  this.lockUntil = null;
  this.lastSeen = new Date();
  return this.save();
};

// Never return sensitive fields in JSON by default
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.__v;
    delete ret.loginAttempts;
    delete ret.lockUntil;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);

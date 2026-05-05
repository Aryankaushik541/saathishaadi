/**
 * Cryptography Utility
 * - AES-256-GCM symmetric encryption (sensitive data ke liye)
 * - HMAC-SHA256 signature verification
 * - Secure random token generation
 * - OTP hashing (bcrypt)
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const ALGORITHM = 'aes-256-gcm';
// Must be 32-byte hex key in env
const getEncKey = () => {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || Buffer.from(key, 'hex').length !== 32) {
    throw new Error('ENCRYPTION_KEY must be a 32-byte hex string (64 hex chars)');
  }
  return Buffer.from(key, 'hex');
};

/**
 * Encrypt plain text using AES-256-GCM
 * Returns: iv:authTag:ciphertext (all base64)
 */
const encrypt = (text) => {
  const iv = crypto.randomBytes(12); // 96-bit IV for GCM
  const key = getEncKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
};

/**
 * Decrypt AES-256-GCM encrypted string
 */
const decrypt = (encryptedStr) => {
  const [ivB64, authTagB64, dataB64] = encryptedStr.split(':');
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');
  const data = Buffer.from(dataB64, 'base64');
  const key = getEncKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(data) + decipher.final('utf8');
};

/**
 * Generate cryptographically secure random token
 */
const generateSecureToken = (bytes = 32) => {
  return crypto.randomBytes(bytes).toString('hex');
};

/**
 * Generate a 6-digit OTP (cryptographically secure)
 */
const generateOTP = () => {
  // Use crypto.randomInt for uniform distribution, no modulo bias
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * Hash OTP using bcrypt before storing in DB
 */
const hashOTP = async (otp) => {
  return bcrypt.hash(otp, 10);
};

/**
 * Compare plain OTP with stored hash
 */
const verifyOTP = async (plainOTP, hashedOTP) => {
  return bcrypt.compare(plainOTP, hashedOTP);
};

/**
 * HMAC-SHA256 signature (for webhook verification etc.)
 */
const createHmac = (data, secret) => {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
};

/**
 * Constant-time string comparison (prevents timing attacks)
 */
const safeCompare = (a, b) => {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
};

module.exports = { encrypt, decrypt, generateSecureToken, generateOTP, hashOTP, verifyOTP, createHmac, safeCompare };

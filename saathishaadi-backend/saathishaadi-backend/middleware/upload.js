/**
 * File Upload Middleware - Secure Multer config
 * - File type strict check (MIME + extension)
 * - File size limit
 * - Secure filename (UUID based)
 * - Malicious file protection
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    // UUID-based filename - original name expose nahi hogi
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `photo_${uuidv4()}${ext}`;
    cb(null, safeName);
  },
});

const ALLOWED_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_EXTS = ['.jpg', '.jpeg', '.png', '.webp'];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  
  // Double check: both MIME type AND extension
  if (!ALLOWED_MIMES.includes(file.mimetype)) {
    logger.warn(`Blocked file upload - bad MIME: ${file.mimetype} from ${req.ip}`);
    return cb(new Error('Sirf image files allowed hain (jpg, png, webp)'), false);
  }
  if (!ALLOWED_EXTS.includes(ext)) {
    logger.warn(`Blocked file upload - bad extension: ${ext} from ${req.ip}`);
    return cb(new Error('Sirf .jpg, .png, .webp files upload kar sakte hain'), false);
  }
  
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
    files: 1, // Only 1 file at a time
    fields: 20,
  },
});

// Error handler for multer
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File size 5MB se zyada nahi honi chahiye' });
    }
    return res.status(400).json({ message: 'File upload error: ' + err.message });
  }
  if (err) {
    return res.status(400).json({ message: err.message });
  }
  next();
};

module.exports = upload;
module.exports.handleUploadError = handleUploadError;

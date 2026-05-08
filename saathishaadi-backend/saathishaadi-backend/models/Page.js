const mongoose = require('mongoose');

const pageSchema = new mongoose.Schema({
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: /^[a-z0-9-]+$/,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120,
  },
  subtitle: {
    type: String,
    trim: true,
    maxlength: 200,
    default: '',
  },
  content: {
    type: String,
    required: true,
    maxlength: 5000,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('Page', pageSchema);

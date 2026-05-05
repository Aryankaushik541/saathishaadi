const mongoose = require('mongoose');

const adSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  link: { type: String, default: '#' },
  position: { type: String, enum: ['top', 'sidebar', 'inline'], default: 'sidebar' },
  bgColor: { type: String, default: '#1a5276' },
  isActive: { type: Boolean, default: true },
  clicks: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Advertisement', adSchema);

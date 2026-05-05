const mongoose = require('mongoose');

const proposalSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  message: { type: String, default: 'Main aapke saath jeevan bitana chahta/chahti hun.' },
}, { timestamps: true });

proposalSchema.index({ sender: 1, receiver: 1 }, { unique: true });

module.exports = mongoose.model('Proposal', proposalSchema);

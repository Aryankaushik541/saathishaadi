/**
 * CallLog Model - Video/Audio call ka complete record
 * Recording URL, duration, participants sab store hota hai
 */
const mongoose = require('mongoose');

const callLogSchema = new mongoose.Schema({
  callerId:        { type: String, index: true },
  callerName:      { type: String },
  callerEmail:     { type: String },
  receiverId:      { type: String, index: true },
  receiverName:    { type: String },
  receiverEmail:   { type: String },
  callType:        { type: String, enum: ['video', 'audio', 'voice'], default: 'audio' },
  startTime:       { type: Date, default: Date.now },
  endTime:         { type: Date },
  durationSeconds: { type: Number, default: 0 },
  status:          { type: String, enum: ['completed', 'missed', 'rejected', 'ongoing', 'failed'], default: 'ongoing', index: true },
  endReason:       { type: String }, // 'normal', 'caller_disconnect', 'receiver_reject', 'timeout'
  recordingEnabled:{ type: Boolean, default: false },
  recordingUrl:    { type: String },
  recordingPath:   { type: String }, // local file path
  recordingSizeBytes:{ type: Number },
  callerIp:        { type: String },
  receiverIp:      { type: String },
  callerCountry:   { type: String },
  receiverCountry: { type: String },
  roomId:          { type: String }, // socket room ID
  metadata:        { type: mongoose.Schema.Types.Mixed }, // extra WebRTC stats
}, { timestamps: true });

callLogSchema.index({ createdAt: -1 });
callLogSchema.index({ callerId: 1, createdAt: -1 });
callLogSchema.index({ receiverId: 1, createdAt: -1 });

// TTL index - auto-delete after retention (default 90 days)
callLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model('CallLog', callLogSchema);

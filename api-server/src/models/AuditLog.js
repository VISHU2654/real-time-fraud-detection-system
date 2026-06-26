/**
 * @module models/AuditLog
 * @description Mongoose schema and model for audit trail entries.
 * Records all analyst review actions for compliance and traceability.
 */
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  transactionId: { type: String, required: true },
  userId: { type: String, required: true },
  details: { type: String },
  timestamp: { type: Date, default: Date.now }
});

auditLogSchema.index({ transactionId: 1 });
auditLogSchema.index({ timestamp: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;

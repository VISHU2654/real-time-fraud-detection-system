/**
 * @module models/Alert
 * @description Mongoose schema and model for fraud detection alerts.
 * Created when the ML pipeline flags a high-risk transaction.
 */
const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  transactionId: { type: String, required: true },
  score: { type: Number, required: true },
  reasoning: { type: String },
  timestamp: { type: Date, default: Date.now },
  status: { type: String, default: 'UNREAD', enum: ['UNREAD', 'READ', 'DISMISSED'] }
});

alertSchema.index({ status: 1 });
alertSchema.index({ timestamp: -1 });

const Alert = mongoose.model('Alert', alertSchema);

module.exports = Alert;

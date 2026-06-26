/**
 * @module models/Transaction
 * @description Mongoose schema and model for financial transactions.
 * Includes indexes for common query patterns (status, userId, createdAt).
 */
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  amount: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
  lat: { type: Number, required: true },
  lon: { type: Number, required: true },
  distance_from_home: { type: Number, required: true },
  repeat_retailer: { type: Number, required: true },
  used_chip: { type: Number, required: true },
  used_pin_number: { type: Number, required: true },
  online_order: { type: Number, required: true },
  fraud_score: { type: Number, default: -1 },
  status: { type: String, default: 'PENDING' },
  reasoning: { type: String }
}, { timestamps: true });

// Performance indexes for common query patterns
transactionSchema.index({ status: 1 });
transactionSchema.index({ userId: 1 });
transactionSchema.index({ createdAt: -1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;

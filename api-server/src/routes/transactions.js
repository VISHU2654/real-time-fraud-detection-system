/**
 * @module routes/transactions
 * @description Transaction CRUD and review endpoints.
 * Includes input validation, pagination, ReDoS protection, and audit logging.
 */
const express = require('express');
const rateLimit = require('express-rate-limit');
const config = require('../config');
const logger = require('../utils/logger');
const Transaction = require('../models/Transaction');
const AuditLog = require('../models/AuditLog');
const { producer } = require('../services/kafka');
const { authMiddleware } = require('../middleware/auth');
const { validate, transactionSchema, reviewSchema, bulkReviewSchema } = require('../middleware/validate');

const router = express.Router();

// Rate limiter for transaction submission
const transactionLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMax,
  message: { error: 'Too many transactions from this IP, please try again after a minute' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Escape special regex characters to prevent ReDoS attacks.
 * @param {string} str - Raw user input
 * @returns {string} Escaped string safe for RegExp constructor
 */
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * POST /transaction
 * Submit a new transaction for fraud scoring.
 * The transaction is saved to MongoDB and published to Kafka.
 */
router.post('/transaction', transactionLimiter, validate(transactionSchema), async (req, res) => {
  try {
    const transaction = new Transaction({
      userId: req.body.userId,
      amount: req.body.amount,
      lat: req.body.lat,
      lon: req.body.lon,
      distance_from_home: req.body.distance_from_home,
      repeat_retailer: req.body.repeat_retailer,
      used_chip: req.body.used_chip,
      used_pin_number: req.body.used_pin_number,
      online_order: req.body.online_order,
    });

    await transaction.save();

    await producer.send({
      topic: config.kafkaTopic,
      messages: [{ value: JSON.stringify(transaction) }],
    });

    logger.info({ transactionId: transaction._id, userId: transaction.userId }, 'Transaction created');
    res.status(201).json(transaction);
  } catch (err) {
    logger.error({ err: err.message }, 'Error processing transaction');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /transactions/flagged
 * Retrieve all flagged transactions, sorted by newest first.
 */
router.get('/transactions/flagged', async (req, res) => {
  try {
    const flaggedTransactions = await Transaction.find({ status: 'FLAGGED' })
      .sort({ createdAt: -1 })
      .limit(200);
    res.status(200).json(flaggedTransactions);
  } catch (err) {
    logger.error({ err: err.message }, 'Error fetching flagged transactions');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /transactions/stats
 * Aggregated statistics using a single aggregation pipeline (not 4 separate queries).
 */
router.get('/transactions/stats', async (req, res) => {
  try {
    const pipeline = await Transaction.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const stats = { total: 0, flagged: 0, blocked: 0, cleared: 0, pending: 0 };
    pipeline.forEach(({ _id, count }) => {
      const key = (_id || 'pending').toLowerCase();
      if (key in stats) stats[key] = count;
      stats.total += count;
    });

    res.status(200).json(stats);
  } catch (err) {
    logger.error({ err: err.message }, 'Stats aggregation error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /transactions/all
 * List transactions with filtering and pagination.
 * Query params: userId, status, minAmount, maxAmount, page, limit
 */
router.get('/transactions/all', async (req, res) => {
  try {
    const { userId, status, minAmount, maxAmount } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 20), 100);
    const skip = (page - 1) * limit;

    const filter = {};

    // Escape user input before using in regex to prevent ReDoS
    if (userId) filter.userId = { $regex: escapeRegex(userId), $options: 'i' };
    if (status) filter.status = status;
    if (minAmount || maxAmount) {
      filter.amount = {};
      if (minAmount) filter.amount.$gte = Number(minAmount);
      if (maxAmount) filter.amount.$lte = Number(maxAmount);
    }

    const [transactions, total] = await Promise.all([
      Transaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Transaction.countDocuments(filter),
    ]);

    res.status(200).json({
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      }
    });
  } catch (err) {
    logger.error({ err: err.message }, 'Error fetching transactions');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /transactions/:id
 * Retrieve a single transaction by ID.
 */
router.get('/transactions/:id', async (req, res) => {
  try {
    const tx = await Transaction.findById(req.params.id);
    if (!tx) return res.status(404).json({ error: 'Not found' });
    res.status(200).json(tx);
  } catch (err) {
    logger.error({ err: err.message, id: req.params.id }, 'Error fetching transaction');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /transactions/:id/review
 * Analyst reviews a transaction (CLEARED or BLOCKED). Requires authentication.
 */
router.put('/transactions/:id/review', authMiddleware, validate(reviewSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { newStatus } = req.body;

    const updatedTransaction = await Transaction.findByIdAndUpdate(
      id,
      { $set: { status: newStatus } },
      { new: true }
    );

    if (!updatedTransaction) return res.status(404).json({ error: 'Not found' });

    // Save audit log
    const log = new AuditLog({
      action: newStatus,
      transactionId: id,
      userId: req.user.id,
      details: `Analyst marked transaction as ${newStatus}`
    });
    await log.save();

    logger.info({ transactionId: id, newStatus, analyst: req.user.id }, 'Transaction reviewed');
    res.status(200).json(updatedTransaction);
  } catch (err) {
    logger.error({ err: err.message }, 'Error reviewing transaction');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /transactions/bulk-review
 * Bulk review multiple transactions. Requires authentication.
 */
router.put('/transactions/bulk-review', authMiddleware, validate(bulkReviewSchema), async (req, res) => {
  try {
    const { ids, newStatus } = req.body;

    await Transaction.updateMany(
      { _id: { $in: ids } },
      { $set: { status: newStatus } }
    );

    // Audit logs for all transactions
    const logs = ids.map(id => ({
      action: newStatus,
      transactionId: id,
      userId: req.user.id,
      details: `Analyst bulk marked transaction as ${newStatus}`
    }));
    await AuditLog.insertMany(logs);

    logger.info({ count: ids.length, newStatus, analyst: req.user.id }, 'Bulk review completed');
    res.status(200).json({ message: `Updated ${ids.length} transactions to ${newStatus}` });
  } catch (err) {
    logger.error({ err: err.message }, 'Error in bulk review');
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

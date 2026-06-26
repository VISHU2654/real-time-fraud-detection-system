/**
 * @module routes/transactions
 * @description Transaction CRUD and review endpoints.
 * Includes input validation, pagination, ReDoS protection, and audit logging.
 */
const express = require('express');
const rateLimit = require('express-rate-limit');
const { Op } = require('sequelize');
const config = require('../config');
const logger = require('../utils/logger');
const Transaction = require('../models/Transaction');
const AuditLog = require('../models/AuditLog');
const { producer } = require('../services/kafka');
const { authMiddleware } = require('../middleware/auth');
const { validate, transactionSchema, reviewSchema, bulkReviewSchema } = require('../middleware/validate');
const sequelize = require('../database');

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
 * POST /transaction
 * Submit a new transaction for fraud scoring.
 * The transaction is saved to RDS and published to Kafka.
 */
router.post('/transaction', transactionLimiter, validate(transactionSchema), async (req, res) => {
  try {
    const transaction = await Transaction.create({
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

    await producer.send({
      topic: config.kafkaTopic,
      messages: [{ value: JSON.stringify(transaction.toJSON()) }],
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
    const flaggedTransactions = await Transaction.findAll({
      where: { status: 'FLAGGED' },
      order: [['createdAt', 'DESC']],
      limit: 200
    });
    res.status(200).json(flaggedTransactions);
  } catch (err) {
    logger.error({ err: err.message }, 'Error fetching flagged transactions');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /transactions/stats
 * Aggregated statistics using a single query.
 */
router.get('/transactions/stats', async (req, res) => {
  try {
    const pipeline = await Transaction.findAll({
      attributes: ['status', [sequelize.fn('COUNT', sequelize.col('status')), 'count']],
      group: ['status'],
      raw: true
    });

    const stats = { total: 0, flagged: 0, blocked: 0, cleared: 0, pending: 0 };
    pipeline.forEach(row => {
      // In Postgres, count is returned as a string, so parseInt
      const count = parseInt(row.count, 10);
      const key = (row.status || 'pending').toLowerCase();
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

    if (userId) filter.userId = { [Op.iLike]: `%${userId}%` };
    if (status) filter.status = status;
    if (minAmount || maxAmount) {
      filter.amount = {};
      if (minAmount) filter.amount[Op.gte] = Number(minAmount);
      if (maxAmount) filter.amount[Op.lte] = Number(maxAmount);
    }

    const { count, rows } = await Transaction.findAndCountAll({
      where: filter,
      order: [['createdAt', 'DESC']],
      offset: skip,
      limit: limit
    });

    res.status(200).json({
      data: rows,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit),
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
    const tx = await Transaction.findByPk(req.params.id);
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

    const [numAffected, updatedTransactions] = await Transaction.update(
      { status: newStatus },
      { where: { _id: id }, returning: true }
    );

    if (numAffected === 0) return res.status(404).json({ error: 'Not found' });
    
    const updatedTransaction = updatedTransactions[0];

    // Save audit log
    await AuditLog.create({
      action: newStatus,
      transactionId: id,
      userId: req.user.id,
      details: `Analyst marked transaction as ${newStatus}`
    });

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

    await Transaction.update(
      { status: newStatus },
      { where: { _id: ids } }
    );

    // Audit logs for all transactions
    const logs = ids.map(id => ({
      action: newStatus,
      transactionId: id,
      userId: req.user.id,
      details: `Analyst bulk marked transaction as ${newStatus}`
    }));
    await AuditLog.bulkCreate(logs);

    logger.info({ count: ids.length, newStatus, analyst: req.user.id }, 'Bulk review completed');
    res.status(200).json({ message: `Updated ${ids.length} transactions to ${newStatus}` });
  } catch (err) {
    logger.error({ err: err.message }, 'Error in bulk review');
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

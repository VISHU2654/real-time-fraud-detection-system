/**
 * @module routes/system
 * @description System management endpoints: health, threshold, retrain, metrics.
 */
const express = require('express');
const mongoose = require('mongoose');
const { exec } = require('child_process');
const promClient = require('prom-client');
const redis = require('../services/redis');
const config = require('../config');
const logger = require('../utils/logger');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { validate, thresholdSchema } = require('../middleware/validate');

const router = express.Router();

// --- Prometheus Metrics ---
const collectDefaultMetrics = promClient.collectDefaultMetrics;
collectDefaultMetrics({ prefix: 'fraud_api_' });

/**
 * GET /health
 * Health check endpoint — reports status of MongoDB and Redis connections.
 */
router.get('/health', async (req, res) => {
  try {
    const mongoState = mongoose.connection.readyState;
    const redisState = redis.status;

    if (mongoState === 1 && redisState === 'ready') {
      res.status(200).json({ status: 'OK', mongo: 'connected', redis: 'connected' });
    } else {
      res.status(503).json({
        status: 'DEGRADED',
        mongo: mongoState === 1 ? 'connected' : 'disconnected',
        redis: redisState === 'ready' ? 'connected' : 'disconnected',
      });
    }
  } catch (err) {
    logger.error({ err: err.message }, 'Health check failed');
    res.status(500).json({ error: 'Health check failed' });
  }
});

/**
 * GET /threshold
 * Get the current fraud detection threshold.
 */
router.get('/threshold', async (req, res) => {
  try {
    let thresh = await redis.get('fraud_threshold');
    if (!thresh) thresh = '0.60';
    res.json({ threshold: parseFloat(thresh) });
  } catch (err) {
    logger.error({ err: err.message }, 'Error fetching threshold');
    res.status(500).json({ error: 'Error fetching threshold' });
  }
});

/**
 * PUT /threshold
 * Update the fraud detection threshold. Requires admin role.
 */
router.put('/threshold', authMiddleware, requireRole('admin'), validate(thresholdSchema), async (req, res) => {
  try {
    const { threshold } = req.body;
    await redis.set('fraud_threshold', threshold.toString());
    logger.info({ threshold, analyst: req.user.id }, 'Fraud threshold updated');
    res.json({ message: 'Threshold updated', threshold });
  } catch (err) {
    logger.error({ err: err.message }, 'Error updating threshold');
    res.status(500).json({ error: 'Error updating threshold' });
  }
});

/**
 * POST /retrain
 * Trigger the ML model retraining pipeline. Requires admin role.
 */
router.post('/retrain', authMiddleware, requireRole('admin'), (req, res) => {
  logger.info({ analyst: req.user.id }, 'Triggering retraining pipeline');

  exec('python src/retrain.py', (error, stdout, stderr) => {
    if (error) {
      logger.error({ error: error.message }, 'Retrain error');
      return;
    }
    if (stderr) {
      logger.warn({ stderr }, 'Retrain stderr');
      return;
    }
    logger.info({ stdout }, 'Retrain completed');
  });

  res.json({ message: 'Retraining pipeline started in the background.' });
});

/**
 * GET /metrics
 * Prometheus metrics endpoint.
 */
router.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', promClient.register.contentType);
    res.end(await promClient.register.metrics());
  } catch (err) {
    logger.error({ err: err.message }, 'Error serving metrics');
    res.status(500).json({ error: 'Error serving metrics' });
  }
});

module.exports = router;

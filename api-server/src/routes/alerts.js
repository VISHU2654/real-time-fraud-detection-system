/**
 * @module routes/alerts
 * @description Alert management endpoints.
 */
const express = require('express');
const Alert = require('../models/Alert');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /alerts
 * Retrieve the most recent alerts, sorted by newest first.
 */
router.get('/alerts', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const alerts = await Alert.find().sort({ timestamp: -1 }).limit(limit);
    res.json(alerts);
  } catch (err) {
    logger.error({ err: err.message }, 'Error fetching alerts');
    res.status(500).json({ error: 'Error fetching alerts' });
  }
});

module.exports = router;

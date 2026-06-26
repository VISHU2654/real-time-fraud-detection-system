/**
 * @module middleware/errorHandler
 * @description Global error handling middleware.
 * Catches unhandled errors, logs them, and returns sanitized responses.
 */
const logger = require('../utils/logger');
const config = require('../config');

/**
 * Global error handler — must be registered LAST in the middleware chain.
 * In production, error details are hidden from the client.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const statusCode = err.status || err.statusCode || 500;

  logger.error({
    err: { message: err.message, stack: err.stack },
    method: req.method,
    url: req.originalUrl,
    statusCode,
  }, 'Unhandled error');

  res.status(statusCode).json({
    error: config.nodeEnv === 'production'
      ? 'Internal server error'
      : err.message,
  });
};

module.exports = errorHandler;

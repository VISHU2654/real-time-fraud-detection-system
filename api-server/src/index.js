/**
 * @module index
 * @description API Server entry point.
 * Sets up Express with security middleware, mounts versioned routes,
 * connects to all services, and handles graceful shutdown.
 */
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const pinoHttp = require('pino-http');

const config = require('./config');
const logger = require('./utils/logger');
const redis = require('./services/redis');
const { connectProducer, disconnectProducer } = require('./services/kafka');
const errorHandler = require('./middleware/errorHandler');

// Import route modules
const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const alertRoutes = require('./routes/alerts');
const systemRoutes = require('./routes/system');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// --- INITIALIZE APP ---
const app = express();

// --- SECURITY & PARSING MIDDLEWARE ---
app.use(helmet());
app.use(express.json({ limit: '100kb' }));
app.use(compression());
app.use(cors({ origin: config.corsOrigin }));
app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/health' || req.url === '/metrics' } }));

// --- ROOT ENDPOINT ---
app.get('/', (req, res) => {
  res.json({ message: 'API Server is running!', version: '2.0.0' });
});

// --- MOUNT ROUTES ---
// Versioned routes (recommended)
app.use('/api/v1', authRoutes);
app.use('/api/v1', transactionRoutes);
app.use('/api/v1', alertRoutes);
app.use('/api/v1', systemRoutes);

// Backward-compatible routes (same routes without prefix)
app.use('/', authRoutes);
app.use('/', transactionRoutes);
app.use('/', alertRoutes);
app.use('/', systemRoutes);

// --- GLOBAL ERROR HANDLER (must be last) ---
app.use(errorHandler);

// --- MONGODB CONNECTION ---
mongoose.connect(config.mongoUri)
  .then(() => logger.info('MongoDB connected'))
  .catch(err => logger.error({ err: err.message }, 'MongoDB connection error'));

// --- GRACEFUL SHUTDOWN ---
let server;

const shutdown = async (signal) => {
  logger.info({ signal }, 'Received shutdown signal. Closing connections...');

  if (server) {
    server.close(() => logger.info('HTTP server closed'));
  }

  try {
    await disconnectProducer();
  } catch (e) {
    logger.error({ err: e.message }, 'Error disconnecting Kafka');
  }

  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  } catch (e) {
    logger.error({ err: e.message }, 'Error closing MongoDB');
  }

  try {
    redis.disconnect();
    logger.info('Redis connection closed');
  } catch (e) {
    logger.error({ err: e.message }, 'Error closing Redis');
  }

  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// --- START SERVER ---
const startServer = async () => {
  while (true) {
    try {
      await connectProducer();

      server = app.listen(config.port, () => {
        logger.info({ port: config.port }, 'API Server listening');
      });
      break;
    } catch (err) {
      logger.warn({ err: err.message }, 'Failed to start, retrying in 5 seconds...');
      await sleep(5000);
    }
  }
};

startServer();

// Export app for testing
module.exports = app;
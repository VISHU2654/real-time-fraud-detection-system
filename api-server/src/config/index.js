/**
 * @module config
 * @description Centralized configuration loaded from environment variables.
 * All config values have sensible defaults for Docker environment.
 * JWT_SECRET is required and will throw if missing.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });

const config = {
  port: parseInt(process.env.API_PORT || process.env.PORT || '4000', 10),
  mongoUri: process.env.MONGO_URI || 'mongodb://mongodb:27017/fraudDB',
  kafkaBrokers: (process.env.KAFKA_BROKERS || 'kafka:9092').split(','),
  kafkaTopic: process.env.KAFKA_TOPIC || 'transactions',
  redisHost: process.env.REDIS_HOST || 'redis',
  redisPort: parseInt(process.env.REDIS_PORT || '6379', 10),
  jwtSecret: process.env.JWT_SECRET,
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminPasswordHash: process.env.ADMIN_PASSWORD_HASH || '',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  logLevel: process.env.LOG_LEVEL || 'info',
  nodeEnv: process.env.NODE_ENV || 'development',
};

// JWT_SECRET is required — fail fast if missing
if (!config.jwtSecret) {
  // Allow a default in development only
  if (config.nodeEnv === 'development') {
    config.jwtSecret = 'dev-secret-key-change-in-production-minimum-32-chars';
  } else {
    throw new Error('FATAL: JWT_SECRET environment variable is required in production');
  }
}

module.exports = config;

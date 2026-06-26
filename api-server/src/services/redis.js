/**
 * @module services/redis
 * @description Redis client singleton with connection logging.
 */
const Redis = require('ioredis');
const config = require('../config');
const logger = require('../utils/logger');

const redis = new Redis({
  host: config.redisHost,
  port: config.redisPort,
  retryStrategy: (times) => Math.min(times * 500, 5000),
  maxRetriesPerRequest: 3,
});

redis.on('connect', () => logger.info('Redis connected'));
redis.on('error', (err) => logger.error({ err: err.message }, 'Redis connection error'));

module.exports = redis;

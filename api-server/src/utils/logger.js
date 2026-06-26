/**
 * @module logger
 * @description Structured JSON logger using pino.
 * Provides consistent, queryable log output across the API server.
 */
const pino = require('pino');
const config = require('../config');

const logger = pino({
  level: config.logLevel,
  transport: config.nodeEnv === 'development' ? {
    target: 'pino-pretty',
    options: { colorize: true, translateTime: 'SYS:standard' }
  } : undefined,
  base: { service: 'api-server' },
});

module.exports = logger;

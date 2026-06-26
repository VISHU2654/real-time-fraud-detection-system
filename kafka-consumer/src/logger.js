/**
 * @module logger
 * @description Structured JSON logger for the Kafka consumer service.
 */
const pino = require('pino');
const config = require('./config');

const logger = pino({
  level: config.logLevel,
  transport: config.nodeEnv === 'development' ? {
    target: 'pino-pretty',
    options: { colorize: true, translateTime: 'SYS:standard' }
  } : undefined,
  base: { service: 'kafka-consumer' },
});

module.exports = logger;

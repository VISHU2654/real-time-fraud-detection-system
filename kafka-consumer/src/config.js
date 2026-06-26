/**
 * @module config
 * @description Kafka consumer configuration loaded from environment variables.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const config = {
  mongoUri: process.env.MONGO_URI || 'mongodb://mongodb:27017/fraudDB',
  kafkaBrokers: (process.env.KAFKA_BROKERS || 'kafka:9092').split(','),
  kafkaTopic: process.env.KAFKA_TOPIC || 'transactions',
  kafkaGroupId: process.env.KAFKA_GROUP_ID || 'fraud-detector-group',
  redisHost: process.env.REDIS_HOST || 'redis',
  redisPort: parseInt(process.env.REDIS_PORT || '6379', 10),
  consumerPort: parseInt(process.env.CONSUMER_PORT || '4001', 10),
  maxCacheSize: parseInt(process.env.MAX_CACHE_SIZE || '50', 10),
  defaultFraudThreshold: parseFloat(process.env.DEFAULT_FRAUD_THRESHOLD || '0.60'),
  logLevel: process.env.LOG_LEVEL || 'info',
  nodeEnv: process.env.NODE_ENV || 'development',
};

module.exports = config;

/**
 * @module services/kafka
 * @description Kafka producer service singleton.
 * Provides connect/disconnect lifecycle and message publishing.
 */
const { Kafka } = require('kafkajs');
const config = require('../config');
const logger = require('../utils/logger');

const kafka = new Kafka({
  clientId: 'api-server',
  brokers: config.kafkaBrokers,
});

const producer = kafka.producer();
const admin = kafka.admin();

/**
 * Connect the Kafka producer and ensure the topic exists.
 */
const connectProducer = async () => {
  await producer.connect();
  await admin.connect();
  await admin.createTopics({
    topics: [{ topic: config.kafkaTopic, numPartitions: 1, replicationFactor: 1 }],
    waitForLeaders: true,
  });
  await admin.disconnect();
  logger.info('Kafka producer connected and topic ensured');
};

/**
 * Disconnect the Kafka producer gracefully.
 */
const disconnectProducer = async () => {
  await producer.disconnect();
  logger.info('Kafka producer disconnected');
};

module.exports = { kafka, producer, connectProducer, disconnectProducer };

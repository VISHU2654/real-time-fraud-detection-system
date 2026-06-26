const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../index');
const redis = require('../services/redis');

// Mock Kafka producer to avoid connection errors in tests
jest.mock('../services/kafka', () => ({
  connectProducer: jest.fn(),
  disconnectProducer: jest.fn(),
  producer: { send: jest.fn() }
}));

describe('System Endpoints', () => {
  afterAll(async () => {
    await mongoose.connection.close();
    redis.disconnect();
  });

  describe('GET /health', () => {
    it('should return 200 OK when services are connected', async () => {
      // Mock mongoose and redis status
      const originalReadyState = mongoose.connection.readyState;
      const originalRedisStatus = redis.status;
      
      Object.defineProperty(mongoose.connection, 'readyState', { get: () => 1 });
      Object.defineProperty(redis, 'status', { get: () => 'ready' });

      const res = await request(app).get('/health');
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('OK');

      // Restore
      Object.defineProperty(mongoose.connection, 'readyState', { get: () => originalReadyState });
      Object.defineProperty(redis, 'status', { get: () => originalRedisStatus });
    });
  });
});

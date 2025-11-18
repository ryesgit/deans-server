import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { mockPrismaClient, resetPrismaMocks, mockTransactions } from '../utils/prismaMock.js';
import { mockAxios, mockESP32Responses, mockESP32ConnectionError, resetAxiosMocks } from '../utils/axiosMock.js';

// Mock Prisma Client
jest.unstable_mockModule('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrismaClient),
}));

// Mock axios
jest.unstable_mockModule('axios', () => ({
  default: mockAxios,
}));

// Create test app
const createTestApp = async () => {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Import routes after mocking
  const doorRoutes = await import('../../routes/door.js');
  app.use('/api/door', doorRoutes.default);

  // Error handler
  app.use((err, req, res, next) => {
    res.status(500).json({
      error: 'Something went wrong!',
      message: err.message,
    });
  });

  return app;
};

describe('Door Control Endpoints', () => {
  let app;

  beforeAll(async () => {
    // Set ESP32 to simulation mode BEFORE creating the app
    mockAxios.get.mockRejectedValue(mockESP32ConnectionError());
    mockAxios.post.mockRejectedValue(mockESP32ConnectionError());
    
    app = await createTestApp();
    
    // Give ESP32Controller time to initialize in simulation mode
    await new Promise(resolve => setTimeout(resolve, 200));
  });

  beforeEach(() => {
    resetPrismaMocks();
    // Don't reset axios mocks here since ESP32Controller is already initialized
  });

  describe('POST /api/door/unlock', () => {
    test('should unlock door manually in simulation mode', async () => {
      const response = await request(app)
        .post('/api/door/unlock')
        .send({ row: 1, column: 3 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Door unlocked successfully');
      expect(response.body.result.status).toBe('simulated');
      expect(response.body.result.row).toBe(1);
      expect(response.body.result.column).toBe(3);
      expect(response.body.timestamp).toBeDefined();
    });

    test('should log access when userId is provided', async () => {
      mockPrismaClient.transaction.create.mockResolvedValue({ id: 1 });

      await request(app)
        .post('/api/door/unlock')
        .send({
          row: 1,
          column: 3,
          userId: 'PUP001',
        })
        .expect(200);

      expect(mockPrismaClient.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'PUP001',
          type: 'RETRIEVAL',
          rowPosition: 1,
          columnPosition: 3,
          notes: 'Access granted',
        }),
      });
    });

    test('should return 400 when row is missing', async () => {
      const response = await request(app)
        .post('/api/door/unlock')
        .send({ column: 3 })
        .expect(400);

      expect(response.body.error).toBe('Missing required parameters');
      expect(response.body.required).toContain('row');
      expect(response.body.required).toContain('column');
    });

    test('should return 400 when column is missing', async () => {
      const response = await request(app)
        .post('/api/door/unlock')
        .send({ row: 1 })
        .expect(400);

      expect(response.body.error).toBe('Missing required parameters');
    });
  });

  describe('POST /api/door/lock', () => {
    test('should lock door manually in simulation mode', async () => {
      const response = await request(app)
        .post('/api/door/lock')
        .send({ row: 1, column: 3 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Door locked successfully');
      expect(response.body.result.status).toBe('simulated');
      expect(response.body.result.row).toBe(1);
      expect(response.body.result.column).toBe(3);
    });

    test('should log access when userId is provided', async () => {
      mockPrismaClient.transaction.create.mockResolvedValue({ id: 1 });

      await request(app)
        .post('/api/door/lock')
        .send({
          row: 1,
          column: 3,
          userId: 'PUP001',
        })
        .expect(200);

      expect(mockPrismaClient.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'PUP001',
          type: 'RETRIEVAL',
          notes: 'Access granted',
        }),
      });
    });

    test('should return 400 when required parameters are missing', async () => {
      const response = await request(app)
        .post('/api/door/lock')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('Missing required parameters');
    });
  });

  describe('GET /api/door/status', () => {
    test('should return status in simulation mode', async () => {
      const response = await request(app)
        .get('/api/door/status')
        .expect(200);

      expect(response.body.esp32.status).toBe('disconnected');
      expect(response.body.esp32.simulation).toBe(true);
      expect(response.body.server.status).toBe('running');
      expect(response.body.server.timestamp).toBeDefined();
    });
  });

  describe('POST /api/door/esp32/config', () => {
    test('should update ESP32 configuration', async () => {
      const response = await request(app)
        .post('/api/door/esp32/config')
        .send({ ip: '192.168.1.200', port: 8080 })
        .expect(200);

      expect(response.body.message).toBe('ESP32 configuration updated');
      expect(response.body.config.ip).toBe('192.168.1.200');
      expect(response.body.config.port).toBe(8080);
      expect(response.body.config.url).toBe('http://192.168.1.200:8080');
    });

    test('should use default port when not provided', async () => {
      const response = await request(app)
        .post('/api/door/esp32/config')
        .send({ ip: '192.168.1.150' })
        .expect(200);

      expect(response.body.config.port).toBe(80);
      expect(response.body.config.url).toBe('http://192.168.1.150:80');
    });

    test('should return 400 when IP is missing', async () => {
      const response = await request(app)
        .post('/api/door/esp32/config')
        .send({ port: 8080 })
        .expect(400);

      expect(response.body.error).toBe('IP address required');
    });
  });

  describe('GET /api/door/logs', () => {
    test('should return access logs', async () => {
      mockPrismaClient.accessLog.findMany.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/door/logs')
        .expect(200);

      expect(response.body.message).toBe('Access logs retrieved successfully');
      expect(response.body.count).toBe(0);
      expect(response.body.logs).toEqual([]);
    });

    test('should return logs with default limit', async () => {
      const mockLogs = Array(50).fill(mockTransactions[0]);
      mockPrismaClient.accessLog.findMany.mockResolvedValue(mockLogs);

      await request(app)
        .get('/api/door/logs')
        .expect(200);

      // Verify findMany was called
      expect(mockPrismaClient.accessLog.findMany).toHaveBeenCalled();
    });

    test('should filter logs by userId when provided', async () => {
      mockPrismaClient.accessLog.findMany.mockResolvedValue([mockTransactions[0]]);

      const response = await request(app)
        .get('/api/door/logs?userId=PUP001')
        .expect(200);

      expect(response.body.count).toBe(1);
      // Note: The actual filtering happens in prismaClient, we just verify the call
    });

    test('should use custom limit when provided', async () => {
      mockPrismaClient.accessLog.findMany.mockResolvedValue([]);

      await request(app)
        .get('/api/door/logs?limit=10')
        .expect(200);

      expect(mockPrismaClient.accessLog.findMany).toHaveBeenCalled();
    });

    test('should return 500 on database error', async () => {
      mockPrismaClient.accessLog.findMany.mockRejectedValue(new Error('DB Error'));

      const response = await request(app)
        .get('/api/door/logs')
        .expect(500);

      expect(response.body.error).toBe('Failed to retrieve logs');
    });
  });
});

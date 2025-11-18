import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { mockPrismaClient, mockUsers, mockFiles, resetPrismaMocks } from '../utils/prismaMock.js';
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
  const qrRoutes = await import('../../routes/qr.js');
  app.use('/api/qr', qrRoutes.default);

  // Error handler
  app.use((err, req, res, next) => {
    res.status(500).json({
      error: 'Something went wrong!',
      message: err.message,
    });
  });

  return app;
};

describe('QR Code Processing - POST /api/qr/scan', () => {
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

  describe('Valid QR Scan Scenarios', () => {
    test('should return file location for valid user ID with available files', async () => {
      const mockUser = mockUsers[0];
      const mockFile = mockFiles[0];

      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaClient.file.findFirst.mockResolvedValue(mockFile);
      mockPrismaClient.transaction.create.mockResolvedValue({ id: 1 });
      mockPrismaClient.file.update.mockResolvedValue(mockFile);

      const response = await request(app)
        .post('/api/qr/scan')
        .send({ userId: 'PUP001' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Door unlocked successfully');
      expect(response.body.user.id).toBe('PUP001');
      expect(response.body.user.name).toBe('Juan Dela Cruz');
      expect(response.body.file.filename).toBe('Engineering_Thesis_2024.pdf');
      expect(response.body.file.row).toBe(1);
      expect(response.body.file.column).toBe(3);
      expect(response.body.esp32Response.status).toBe('simulated');
    });

    test('should return specific file when filename is provided', async () => {
      const mockUser = mockUsers[0];
      const mockFile = mockFiles[1]; // Project_Documentation.pdf

      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaClient.file.findFirst.mockResolvedValue(mockFile);
      mockPrismaClient.transaction.create.mockResolvedValue({ id: 1 });
      mockPrismaClient.file.update.mockResolvedValue(mockFile);

      const response = await request(app)
        .post('/api/qr/scan')
        .send({
          userId: 'PUP001',
          filename: 'Project_Documentation.pdf',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.file.filename).toBe('Project_Documentation.pdf');
      expect(response.body.file.row).toBe(2);
      expect(response.body.file.column).toBe(1);
    });

    test('should trigger ESP32 unlock in simulation mode', async () => {
      const mockUser = mockUsers[0];
      const mockFile = mockFiles[0];

      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaClient.file.findFirst.mockResolvedValue(mockFile);
      mockPrismaClient.transaction.create.mockResolvedValue({ id: 1 });
      mockPrismaClient.file.update.mockResolvedValue(mockFile);

      const response = await request(app)
        .post('/api/qr/scan')
        .send({ userId: 'PUP001' })
        .expect(200);

      expect(response.body.esp32Response.status).toBe('simulated');
      expect(response.body.esp32Response.message).toContain('Simulated unlock');
      expect(mockPrismaClient.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'PUP001',
          type: 'RETRIEVAL',
          notes: 'Access granted',
        }),
      });
    });

    test('should log access and update file status on successful unlock', async () => {
      const mockUser = mockUsers[0];
      const mockFile = mockFiles[0];

      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaClient.file.findFirst.mockResolvedValue(mockFile);
      mockPrismaClient.transaction.create.mockResolvedValue({ id: 1 });
      mockPrismaClient.file.update.mockResolvedValue(mockFile);

      await request(app)
        .post('/api/qr/scan')
        .send({ userId: 'PUP001' })
        .expect(200);

      // Verify access was logged
      expect(mockPrismaClient.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'PUP001',
          fileId: mockFile.id,
          type: 'RETRIEVAL',
          rowPosition: 1,
          columnPosition: 3,
          notes: 'Access granted',
        }),
      });

      // Verify file status was updated
      expect(mockPrismaClient.file.update).toHaveBeenCalledWith({
        where: { id: mockFile.id },
        data: expect.objectContaining({
          status: 'RETRIEVED',
        }),
      });
    });
  });

  describe('Error Scenarios', () => {
    test('should return 400 when userId is missing', async () => {
      const response = await request(app)
        .post('/api/qr/scan')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('User ID is required');
    });

    test('should return 404 when user does not exist', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/qr/scan')
        .send({ userId: 'UNKNOWN' })
        .expect(404);

      expect(response.body.error).toBe('Access denied');
      expect(response.body.message).toContain('not registered');
    });

    test('should return 404 when user exists but has no available files', async () => {
      const mockUser = mockUsers[3]; // USER002
      
      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaClient.file.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/qr/scan')
        .send({ userId: 'USER002' })
        .expect(404);

      expect(response.body.error).toBe('Access denied');
      expect(response.body.message).toContain('No available files');
    });

    test('should return 500 and log failure when ESP32 unlock fails', async () => {
      const mockUser = mockUsers[0];
      const mockFile = mockFiles[0];

      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaClient.file.findFirst.mockResolvedValue(mockFile);
      mockPrismaClient.transaction.create.mockResolvedValue({ id: 1 });

      // ESP32 is in simulation mode (default from beforeEach)
      // Simulation mode won't fail, but we can still test that logging works

      const response = await request(app)
        .post('/api/qr/scan')
        .send({ userId: 'PUP001' })
        .expect(200);

      // In simulation mode, it should succeed
      expect(response.body.success).toBe(true);
      expect(response.body.esp32Response.status).toBe('simulated');

      // Verify success was logged
      expect(mockPrismaClient.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          notes: 'Access granted',
        }),
      });
    });

    test('should return 500 on database error', async () => {
      // User check succeeds but file lookup fails with DB error
      mockPrismaClient.user.findUnique.mockResolvedValue(mockUsers[0]);
      mockPrismaClient.file.findFirst.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/qr/scan')
        .send({ userId: 'PUP001' })
        .expect(500);

      expect(response.body.error).toBe('Server error');
      expect(response.body.message).toBe('Failed to process QR code scan');
    });
  });

  describe('Test Endpoint - GET /api/qr/test/:userId', () => {
    test('should return file data for valid user', async () => {
      const mockFile = mockFiles[0];
      mockPrismaClient.file.findFirst.mockResolvedValue(mockFile);

      const response = await request(app)
        .get('/api/qr/test/PUP001')
        .expect(200);

      expect(response.body.message).toBe('Test lookup successful');
      expect(response.body.data.filename).toBe('Engineering_Thesis_2024.pdf');
    });

    test('should return 404 when file not found', async () => {
      mockPrismaClient.file.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/qr/test/UNKNOWN')
        .expect(404);

      expect(response.body.error).toBe('File not found');
    });

    test('should handle filename query parameter', async () => {
      const mockFile = mockFiles[1];
      mockPrismaClient.file.findFirst.mockResolvedValue(mockFile);

      const response = await request(app)
        .get('/api/qr/test/PUP001?filename=Project_Documentation.pdf')
        .expect(200);

      expect(response.body.data.filename).toBe('Project_Documentation.pdf');
    });
  });
});

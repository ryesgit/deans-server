import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { mockPrismaClient, mockUsers, mockFiles, resetPrismaMocks } from '../utils/prismaMock.js';
import { mockAxios, mockESP32ConnectionError } from '../utils/axiosMock.js';

// Mock axios
jest.unstable_mockModule('axios', () => ({
  default: mockAxios,
}));

// Create mock functions for prismaClient module
const mockCheckUserExists = jest.fn();
const mockGetAvailableFilesForUser = jest.fn();
const mockGetFileLocation = jest.fn();
const mockLogAccess = jest.fn();
const mockUpdateFileAccess = jest.fn();
const mockGetAccessLogs = jest.fn();
const mockAddFile = jest.fn();
const mockGetUserFiles = jest.fn();

// Mock prismaClient module BEFORE any routes are imported
jest.unstable_mockModule('../../prismaClient.js', () => ({
  initializeDatabase: jest.fn(),
  checkUserExists: mockCheckUserExists,
  getAvailableFilesForUser: mockGetAvailableFilesForUser,
  getFileLocation: mockGetFileLocation,
  logAccess: mockLogAccess,
  updateFileAccess: mockUpdateFileAccess,
  getAccessLogs: mockGetAccessLogs,
  addFile: mockAddFile,
  getUserFiles: mockGetUserFiles,
  prisma: {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  },
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
  const mockUser = mockUsers[0];
  const userFiles = mockFiles.filter(f => f.userId === 'PUP001' && f.status === 'AVAILABLE');
  const mappedUserFiles = userFiles.map(file => ({
    id: file.id,
    userId: file.userId,
    name: mockUser.name,
    department: mockUser.department,
    filename: file.filename,
    rowPosition: file.rowPosition,
    columnPosition: file.columnPosition,
    shelfNumber: file.shelfNumber
  }));

  beforeAll(async () => {
    // Set ESP32 to simulation mode BEFORE creating the app
    mockAxios.get.mockRejectedValue(mockESP32ConnectionError());
    mockAxios.post.mockRejectedValue(mockESP32ConnectionError());
    
    app = await createTestApp();
    
    // Give ESP32Controller time to initialize in simulation mode
    await new Promise(resolve => setTimeout(resolve, 200));
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Valid QR Scan Scenarios', () => {
    test('should process all available files for a valid user', async () => {
      mockCheckUserExists.mockResolvedValue(true);
      mockGetAvailableFilesForUser.mockResolvedValue(mappedUserFiles);
      mockLogAccess.mockResolvedValue({ id: 1 });
      mockUpdateFileAccess.mockResolvedValue({ updated: 1 });

      const response = await request(app)
        .post('/api/qr/scan')
        .send({ userId: 'PUP001' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Processed 2 files. 2 succeeded, 0 failed.');
      expect(response.body.user.id).toBe('PUP001');
      expect(response.body.successfulRetrievals).toHaveLength(2);
      expect(response.body.failedRetrievals).toHaveLength(0);
      expect(mockLogAccess).toHaveBeenCalledTimes(2);
      expect(mockUpdateFileAccess).toHaveBeenCalledTimes(2);
    });

    test('should trigger ESP32 unlock for each file in simulation mode', async () => {
      mockCheckUserExists.mockResolvedValue(true);
      mockGetAvailableFilesForUser.mockResolvedValue(mappedUserFiles);
      mockLogAccess.mockResolvedValue({ id: 1 });
      mockUpdateFileAccess.mockResolvedValue({ updated: 1 });

      const response = await request(app)
        .post('/api/qr/scan')
        .send({ userId: 'PUP001' })
        .expect(200);

      expect(response.body.successfulRetrievals[0].esp32Response.status).toBe('simulated');
      expect(response.body.successfulRetrievals[1].esp32Response.status).toBe('simulated');
      expect(mockLogAccess).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.anything(), expect.anything(), expect.anything(), true);
    });

    test('should log access and update file status for each successful unlock', async () => {
      mockCheckUserExists.mockResolvedValue(true);
      mockGetAvailableFilesForUser.mockResolvedValue(mappedUserFiles);
      mockLogAccess.mockResolvedValue({ id: 1 });
      mockUpdateFileAccess.mockResolvedValue({ updated: 1 });

      await request(app)
        .post('/api/qr/scan')
        .send({ userId: 'PUP001' })
        .expect(200);

      expect(mockLogAccess).toHaveBeenCalledTimes(2);
      expect(mockUpdateFileAccess).toHaveBeenCalledTimes(2);
      
      expect(mockLogAccess).toHaveBeenCalledWith('PUP001', userFiles[0].id, 'retrieve', userFiles[0].rowPosition, userFiles[0].columnPosition, true);
      expect(mockUpdateFileAccess).toHaveBeenCalledWith(userFiles[0].id);
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
      mockCheckUserExists.mockResolvedValue(false);

      const response = await request(app)
        .post('/api/qr/scan')
        .send({ userId: 'UNKNOWN' })
        .expect(404);

      expect(response.body.error).toBe('Access denied');
      expect(response.body.message).toContain('not registered');
    });

    test('should return 404 when user exists but has no available files', async () => {
      mockCheckUserExists.mockResolvedValue(true);
      mockGetAvailableFilesForUser.mockResolvedValue([]);

      const response = await request(app)
        .post('/api/qr/scan')
        .send({ userId: 'USER002' })
        .expect(404);

      expect(response.body.error).toBe('Access denied');
      expect(response.body.message).toContain('No available files');
    });

    test('should return 500 on database error during file fetch', async () => {
      mockCheckUserExists.mockResolvedValue(true);
      mockGetAvailableFilesForUser.mockRejectedValue(new Error('Database error'));

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
      mockGetUserFiles.mockResolvedValue([mockFiles[0]]);

      const response = await request(app)
        .get('/api/qr/test/PUP001')
        .expect(200);

      expect(response.body.message).toBe('Test lookup successful');
      expect(response.body.data[0].filename).toBe('Engineering_Thesis_2024.pdf');
    });

    test('should return 404 when file not found', async () => {
      mockGetUserFiles.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/qr/test/UNKNOWN')
        .expect(404);

      expect(response.body.error).toBe('File not found');
    });
  });
});

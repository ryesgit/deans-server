import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { mockUsers, mockFiles } from '../utils/prismaMock.js';

const mockCheckUserExists = jest.fn();
const mockLogAccess = jest.fn();
const mockGetUserFiles = jest.fn();
const mockReturnFile = jest.fn();
const mockUnlockDoor = jest.fn();
const mockLockDoor = jest.fn();

const mockPrisma = {
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  request: {
    findMany: jest.fn(),
  },
  file: {
    findMany: jest.fn(),
    update: jest.fn().mockResolvedValue({ id: 1, status: 'RETRIEVED' }),
  },
};

jest.unstable_mockModule('../../prismaClient.js', () => ({
  initializeDatabase: jest.fn(),
  checkUserExists: mockCheckUserExists,
  logAccess: mockLogAccess,
  getUserFiles: mockGetUserFiles,
  returnFile: mockReturnFile,
  prisma: mockPrisma,
}));

jest.unstable_mockModule('../../esp32Controller.js', () => ({
  esp32Controller: {
    unlockDoor: mockUnlockDoor,
    lockDoor: mockLockDoor,
    isConnected: jest.fn(() => true),
    getStatus: jest.fn(),
  },
}));

const createTestApp = async () => {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const qrRoutes = await import('../../routes/qr.js');
  app.use('/api/qr', qrRoutes.default);

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
  let originalSetTimeout;
  let setTimeoutSpy;
  const mockUser = mockUsers[0];
  const fileOne = {
    ...mockFiles[0],
    userId: 'PUP001',
    status: 'CHECKED_OUT',
    user: {
      name: mockUser.name,
      department: mockUser.department,
    },
  };
  const fileTwo = {
    ...mockFiles[1],
    userId: 'PUP001',
    status: 'CHECKED_OUT',
    user: {
      name: mockUser.name,
      department: mockUser.department,
    },
  };

  beforeAll(async () => {
    originalSetTimeout = global.setTimeout;
    setTimeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation((callback, timeout, ...args) => {
      if (timeout === 3000) {
        return { unref: jest.fn() };
      }

      return originalSetTimeout(callback, timeout, ...args);
    });

    app = await createTestApp();
  });

  afterAll(() => {
    setTimeoutSpy.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.file.update.mockResolvedValue({ id: 1, status: 'RETRIEVED' });
    mockReturnFile.mockResolvedValue({ success: true, fileId: 1, requestsExpired: 1 });
    mockUnlockDoor.mockResolvedValue({
      status: 'success',
      message: 'Door unlocked successfully',
      row: 1,
      column: 1,
      timestamp: new Date('2026-05-05T00:00:00Z').toISOString(),
      duration: '10ms',
    });
    mockLockDoor.mockResolvedValue({
      status: 'success',
      message: 'Door locked successfully',
    });
  });

  describe('Valid QR Scan Scenarios', () => {
    test('should process only the latest approved file for a valid user', async () => {
      mockCheckUserExists.mockResolvedValue(true);
      mockPrisma.request.findMany.mockResolvedValue([
        { id: 102, fileId: fileTwo.id, title: fileTwo.filename, approvedAt: new Date('2026-04-28T10:00:00Z'), createdAt: new Date('2026-04-28T09:00:00Z') },
        { id: 101, fileId: fileOne.id, title: fileOne.filename, approvedAt: new Date('2026-04-27T10:00:00Z'), createdAt: new Date('2026-04-27T09:00:00Z') },
      ]);
      mockPrisma.file.findMany.mockResolvedValue([fileOne, fileTwo]);
      mockLogAccess.mockResolvedValue({ id: 1 });

      const response = await request(app)
        .post('/api/qr/scan')
        .send({ userId: 'PUP001' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Processed 1 file');
      expect(response.body.user.id).toBe('PUP001');
      expect(response.body.successfulOperations).toHaveLength(1);
      expect(response.body.successfulOperations[0].file.id).toBe(fileTwo.id);
      expect(response.body.successfulOperations[0].file.row).toBe(fileTwo.rowPosition);
      expect(response.body.successfulOperations[0].file.column).toBe(fileTwo.columnPosition);
      expect(response.body.successfulOperations[0].esp32Response.status).toBe('success');
      expect(mockUnlockDoor).toHaveBeenCalledWith(fileTwo.rowPosition, fileTwo.columnPosition);
      expect(mockPrisma.file.update).toHaveBeenCalledTimes(1);
      expect(mockPrisma.file.update).toHaveBeenCalledWith({
        where: { id: fileTwo.id },
        data: { status: 'RETRIEVED' }
      });
      expect(mockLogAccess).toHaveBeenCalledTimes(1);
      expect(mockLogAccess).toHaveBeenCalledWith('PUP001', fileTwo.id, 'retrieve', fileTwo.rowPosition, fileTwo.columnPosition, true);
    });

    test('should process only the requested file when fileId is provided', async () => {
      mockCheckUserExists.mockResolvedValue(true);
      mockPrisma.request.findMany.mockResolvedValue([
        { id: 101, fileId: fileOne.id, title: fileOne.filename, approvedAt: new Date('2026-04-27T10:00:00Z'), createdAt: new Date('2026-04-27T09:00:00Z') },
      ]);
      mockPrisma.file.findMany.mockResolvedValue([fileOne]);
      mockLogAccess.mockResolvedValue({ id: 1 });

      const response = await request(app)
        .post('/api/qr/scan')
        .send({ userId: 'PUP001', fileId: fileOne.id })
        .expect(200);

      expect(response.body.successfulOperations).toHaveLength(1);
      expect(response.body.successfulOperations[0].file.id).toBe(fileOne.id);
      expect(response.body.successfulOperations[0].esp32Response.status).toBe('success');
      expect(mockPrisma.request.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          userId: 'PUP001',
          fileId: fileOne.id
        })
      }));
    });

    test('should return only the latest approved retrieved file', async () => {
      const retrievedFile = {
        ...fileTwo,
        status: 'RETRIEVED'
      };

      mockCheckUserExists.mockResolvedValue(true);
      mockPrisma.request.findMany.mockResolvedValue([
        { id: 102, fileId: retrievedFile.id, title: retrievedFile.filename, approvedAt: new Date('2026-04-28T10:00:00Z'), createdAt: new Date('2026-04-28T09:00:00Z') },
        { id: 101, fileId: fileOne.id, title: fileOne.filename, approvedAt: new Date('2026-04-27T10:00:00Z'), createdAt: new Date('2026-04-27T09:00:00Z') },
      ]);
      mockPrisma.file.findMany.mockResolvedValue([
        { ...fileOne, status: 'RETRIEVED' },
        retrievedFile
      ]);

      const response = await request(app)
        .post('/api/qr/scan')
        .send({ userId: 'PUP001' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.successfulOperations).toHaveLength(1);
      expect(response.body.successfulOperations[0].action).toBe('return');
      expect(response.body.successfulOperations[0].file.id).toBe(retrievedFile.id);
      expect(response.body.successfulOperations[0].esp32Response.status).toBe('success');
      expect(mockReturnFile).toHaveBeenCalledTimes(1);
      expect(mockReturnFile).toHaveBeenCalledWith('PUP001', retrievedFile.id);
    });

    test('should fail the operation when ESP32 does not unlock', async () => {
      mockCheckUserExists.mockResolvedValue(true);
      mockPrisma.request.findMany.mockResolvedValue([
        { id: 101, fileId: fileOne.id, title: fileOne.filename, approvedAt: new Date('2026-04-27T10:00:00Z'), createdAt: new Date('2026-04-27T09:00:00Z') },
      ]);
      mockPrisma.file.findMany.mockResolvedValue([fileOne]);
      mockUnlockDoor.mockRejectedValue(new Error('ESP32 websocket is not connected; cannot unlock door'));

      const response = await request(app)
        .post('/api/qr/scan')
        .send({ userId: 'PUP001', fileId: fileOne.id })
        .expect(200);

      expect(response.body.success).toBe(false);
      expect(response.body.successfulOperations).toHaveLength(0);
      expect(response.body.failedOperations).toHaveLength(1);
      expect(response.body.failedOperations[0].error).toBe('Door unlock failed');
      expect(response.body.failedOperations[0].esp32Error).toBe('ESP32 websocket is not connected; cannot unlock door');
      expect(mockPrisma.file.update).not.toHaveBeenCalled();
      expect(mockLogAccess).toHaveBeenCalledWith('PUP001', fileOne.id, 'pickup', fileOne.rowPosition, fileOne.columnPosition, false);
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

    test('should return 404 when user exists but has no approved actionable files', async () => {
      mockCheckUserExists.mockResolvedValue(true);
      mockPrisma.request.findMany.mockResolvedValue([]);

      const response = await request(app)
        .post('/api/qr/scan')
        .send({ userId: 'USER002' })
        .expect(404);

      expect(response.body.error).toBe('Access denied');
      expect(response.body.message).toContain('No files available');
    });

    test('should return 500 on database error during request lookup', async () => {
      mockCheckUserExists.mockResolvedValue(true);
      mockPrisma.request.findMany.mockRejectedValue(new Error('Database error'));

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

import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { mockUsers, mockFiles } from '../utils/prismaMock.js';

// Create mock functions for prismaClient module
const mockGetUserFiles = jest.fn();
const mockGetAllFiles = jest.fn();
const mockAddFile = jest.fn();
const mockSearchFiles = jest.fn();
const mockReturnFile = jest.fn();

// Create mock prisma client
const mockPrismaClient = {
  file: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  $connect: jest.fn(),
  $disconnect: jest.fn(),
};

// Mock prismaClient module BEFORE any routes are imported
jest.unstable_mockModule('../../prismaClient.js', () => ({
  initializeDatabase: jest.fn(),
  getUserFiles: mockGetUserFiles,
  getAllFiles: mockGetAllFiles,
  addFile: mockAddFile,
  searchFiles: mockSearchFiles,
  returnFile: mockReturnFile,
  prisma: mockPrismaClient,
}));

// Mock @prisma/client
jest.unstable_mockModule('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrismaClient),
}));

// Create test app
const createTestApp = async () => {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Import routes after mocking
  const fileRoutes = await import('../../routes/files.js');
  app.use('/api/files', fileRoutes.default);

  // Error handler
  app.use((err, req, res, next) => {
    res.status(500).json({
      error: 'Something went wrong!',
      message: err.message,
    });
  });

  return app;
};

describe('File Management Endpoints', () => {
  let app;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/files/user/:userId', () => {
    test('should fetch all files for a valid user', async () => {
      const userFiles = mockFiles.filter(f => f.userId === 'PUP001');
      mockGetUserFiles.mockResolvedValue(userFiles);

      const response = await request(app)
        .get('/api/files/user/PUP001')
        .expect(200);

      expect(response.body.message).toBe('Files retrieved successfully');
      expect(response.body.userId).toBe('PUP001');
      expect(response.body.count).toBe(2);
      expect(response.body.files).toHaveLength(2);
      expect(mockGetUserFiles).toHaveBeenCalledWith('PUP001');
    });

    test('should handle missing userId in get files', async () => {
      mockGetUserFiles.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/files/user/NOFILES')
        .expect(404);

      expect(response.body.message).toBe('No files found for this user');
      expect(response.body.userId).toBe('NOFILES');
      expect(response.body.files).toEqual([]);
    });

    test('should handle database error on get files', async () => {
      mockGetUserFiles.mockRejectedValue(new Error('DB Error'));

      const response = await request(app)
        .get('/api/files/user/PUP001')
        .expect(500);

      expect(response.body.error).toBe('Failed to retrieve files');
      expect(response.body.message).toBe('DB Error');
    });
  });

  describe('GET /api/files/all', () => {
    test('should get all files', async () => {
      mockGetAllFiles.mockResolvedValue(mockFiles);

      const response = await request(app)
        .get('/api/files/all')
        .expect(200);

      expect(response.body.message).toBe('All files retrieved successfully');
      expect(response.body.count).toBe(mockFiles.length);
      expect(response.body.files).toHaveLength(mockFiles.length);
      expect(mockGetAllFiles).toHaveBeenCalled();
    });

    test('should return empty results when no files exist', async () => {
      mockGetAllFiles.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/files/all')
        .expect(200);

      expect(response.body.count).toBe(0);
      expect(response.body.files).toEqual([]);
    });

    test('should handle database error on get all files', async () => {
      mockGetAllFiles.mockRejectedValue(new Error('DB Error'));

      const response = await request(app)
        .get('/api/files/all')
        .expect(500);

      expect(response.body.error).toBe('Failed to retrieve all files');
    });
  });

  describe('GET /api/files/search', () => {
    test('should search files', async () => {
      const searchResults = [mockFiles[0]];
      mockSearchFiles.mockResolvedValue(searchResults);

      const response = await request(app)
        .get('/api/files/search?q=Engineering')
        .expect(200);

      expect(response.body.message).toBe('Search completed successfully');
      expect(response.body.query).toBe('Engineering');
      expect(response.body.count).toBe(1);
      expect(response.body.files).toHaveLength(1);
      expect(mockSearchFiles).toHaveBeenCalled();
    });

    test('should handle search with missing query parameter', async () => {
      const response = await request(app)
        .get('/api/files/search')
        .expect(400);

      expect(response.body.error).toBe('Search query required');
    });

    test('should handle search with no results', async () => {
      mockSearchFiles.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/files/search?q=NonExistent')
        .expect(200);

      expect(response.body.count).toBe(0);
      expect(response.body.files).toEqual([]);
    });

    test('should handle database error on search files', async () => {
      mockSearchFiles.mockRejectedValue(new Error('Search failed'));

      const response = await request(app)
        .get('/api/files/search?q=test')
        .expect(500);

      expect(response.body.error).toBe('Search failed');
    });
  });

  describe('POST /api/files/add', () => {
    test('should add file', async () => {
      const newFile = { id: 99 };
      mockAddFile.mockResolvedValue({ fileId: newFile.id });

      const response = await request(app)
        .post('/api/files/add')
        .send({
          userId: 'PUP001',
          filename: 'NewFile.pdf',
          rowPosition: 3,
          columnPosition: 4,
          shelfNumber: 1,
        })
        .expect(201);

      expect(response.body.message).toBe('File added successfully');
      expect(response.body.fileId).toBe(99);
      expect(response.body.file.userId).toBe('PUP001');
    });

    test('should handle invalid file data', async () => {
      const response = await request(app)
        .post('/api/files/add')
        .send({
          filename: 'File.pdf',
          rowPosition: 1,
          columnPosition: 1,
        })
        .expect(400);

      expect(response.body.error).toBe('Missing required fields');
    });

    test('should handle database error on add file', async () => {
      mockAddFile.mockRejectedValue(new Error('DB Error'));

      const response = await request(app)
        .post('/api/files/add')
        .send({
          userId: 'PUP001',
          filename: 'File.pdf',
          rowPosition: 1,
          columnPosition: 1,
        })
        .expect(500);

      expect(response.body.error).toBe('Failed to add file');
    });
  });

  describe('POST /api/files/return', () => {
    test('should return file', async () => {
      mockReturnFile.mockResolvedValue({ success: true, fileId: 4 });

      const response = await request(app)
        .post('/api/files/return')
        .send({
          userId: 'USER002',
          fileId: 4,
          rowPosition: 2,
          columnPosition: 2,
        })
        .expect(200);

      expect(response.body.message).toBe('File returned successfully');
      expect(response.body.fileId).toBe(4);
      expect(mockReturnFile).toHaveBeenCalled();
    });

    test('should handle missing file on return', async () => {
      mockReturnFile.mockResolvedValue({ success: false, message: 'File not found or not currently retrieved' });

      const response = await request(app)
        .post('/api/files/return')
        .send({
          userId: 'USER002',
          fileId: 999,
          rowPosition: 1,
          columnPosition: 1,
        })
        .expect(400);

      expect(response.body.error).toBe('File not found or not currently retrieved');
    });

    test('should handle database error on return file', async () => {
      mockReturnFile.mockRejectedValue(new Error('DB Error'));

      const response = await request(app)
        .post('/api/files/return')
        .send({
          userId: 'USER002',
          fileId: 4,
          rowPosition: 2,
          columnPosition: 2,
        })
        .expect(500);

      expect(response.body.error).toBe('Failed to return file');
    });
  });
});
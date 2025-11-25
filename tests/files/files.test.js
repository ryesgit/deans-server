import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { mockUsers, mockFiles } from '../utils/prismaMock.js';

// Create mock functions for prismaClient module
const mockCheckUserExists = jest.fn();
const mockGetAvailableFilesForUser = jest.fn();
const mockGetFileLocation = jest.fn();
const mockLogAccess = jest.fn();
const mockUpdateFileAccess = jest.fn();
const mockGetAccessLogs = jest.fn();
const mockAddFile = jest.fn();
const mockGetUserFiles = jest.fn();
const mockGetAllFiles = jest.fn();
const mockSearchFiles = jest.fn();
const mockReturnFile = jest.fn();

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
  getAllFiles: mockGetAllFiles,
  searchFiles: mockSearchFiles,
  returnFile: mockReturnFile,
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
    });

    test('should return 404 when user has no files', async () => {
      mockGetUserFiles.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/files/user/NOFILES')
        .expect(404);

      expect(response.body.message).toBe('No files found for this user');
      expect(response.body.userId).toBe('NOFILES');
      expect(response.body.files).toEqual([]);
    });

    test('should return 500 on database error', async () => {
      mockGetUserFiles.mockRejectedValue(new Error('DB Error'));

      const response = await request(app)
        .get('/api/files/user/PUP001')
        .expect(500);

      expect(response.body.error).toBe('Failed to retrieve files');
    });
  });

  describe('GET /api/files/all', () => {
    test('should fetch all files in the system', async () => {
      mockGetAllFiles.mockResolvedValue(mockFiles);

      const response = await request(app)
        .get('/api/files/all')
        .expect(200);

      expect(response.body.message).toBe('All files retrieved successfully');
      expect(response.body.count).toBe(mockFiles.length);
      expect(response.body.files).toHaveLength(mockFiles.length);
    });

    test('should return empty array when no files exist', async () => {
      mockGetAllFiles.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/files/all')
        .expect(200);

      expect(response.body.count).toBe(0);
      expect(response.body.files).toEqual([]);
    });

    test('should return 500 on database error', async () => {
      mockGetAllFiles.mockRejectedValue(new Error('DB Error'));

      const response = await request(app)
        .get('/api/files/all')
        .expect(500);

      expect(response.body.error).toBe('Failed to retrieve all files');
    });
  });

  describe('GET /api/files/search', () => {
    test('should return filtered files matching query', async () => {
      const searchResults = [mockFiles[0]]; // Engineering files
      mockSearchFiles.mockResolvedValue(searchResults);

      const response = await request(app)
        .get('/api/files/search?q=Engineering')
        .expect(200);

      expect(response.body.message).toBe('Search completed successfully');
      expect(response.body.query).toBe('Engineering');
      expect(response.body.count).toBe(1);
      expect(response.body.files).toHaveLength(1);
    });

    test('should return 400 when query parameter is missing', async () => {
      const response = await request(app)
        .get('/api/files/search')
        .expect(400);

      expect(response.body.error).toBe('Search query required');
    });

    test('should search by userId when provided', async () => {
      const userFiles = mockFiles.filter(f => f.userId === 'PUP001');
      mockSearchFiles.mockResolvedValue(userFiles);

      const response = await request(app)
        .get('/api/files/search?q=Thesis&userId=PUP001')
        .expect(200);

      expect(response.body.count).toBe(2);
    });

    test('should return empty results when no matches found', async () => {
      mockSearchFiles.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/files/search?q=NonExistent')
        .expect(200);

      expect(response.body.count).toBe(0);
      expect(response.body.files).toEqual([]);
    });

    test('should return 500 on database error', async () => {
      mockSearchFiles.mockRejectedValue(new Error('Search failed'));

      const response = await request(app)
        .get('/api/files/search?q=test')
        .expect(500);

      expect(response.body.error).toBe('Search failed');
    });
  });

  describe('POST /api/files/add', () => {
    test('should add new file with correct data', async () => {
      const newFile = {
        id: 99,
      };
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
    });

    test('should use default shelf number when not provided', async () => {
      mockAddFile.mockResolvedValue({ fileId: 100 });

      const response = await request(app)
        .post('/api/files/add')
        .send({
          userId: 'PUP001',
          filename: 'File.pdf',
          rowPosition: 1,
          columnPosition: 1,
        })
        .expect(201);

      expect(response.body.file.shelfNumber).toBe(1);
    });

    test('should return 400 when userId is missing', async () => {
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

    test('should return 400 when filename is missing', async () => {
      const response = await request(app)
        .post('/api/files/add')
        .send({
          userId: 'PUP001',
          rowPosition: 1,
          columnPosition: 1,
        })
        .expect(400);

      expect(response.body.error).toBe('Missing required fields');
    });

    test('should return 400 when rowPosition is missing', async () => {
      const response = await request(app)
        .post('/api/files/add')
        .send({
          userId: 'PUP001',
          filename: 'File.pdf',
          columnPosition: 1,
        })
        .expect(400);

      expect(response.body.error).toBe('Missing required fields');
    });

    test('should return 400 when columnPosition is missing', async () => {
      const response = await request(app)
        .post('/api/files/add')
        .send({
          userId: 'PUP001',
          filename: 'File.pdf',
          rowPosition: 1,
        })
        .expect(400);

      expect(response.body.error).toBe('Missing required fields');
    });

    test('should return 500 on database error', async () => {
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
    test('should return file successfully', async () => {
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
    });

    test('should return 400 when file not found or not retrieved', async () => {
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

    test('should return 400 when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/files/return')
        .send({
          userId: 'USER002',
          fileId: 4,
        })
        .expect(400);

      expect(response.body.error).toBe('Missing required fields');
    });

    test('should return 500 on database error', async () => {
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
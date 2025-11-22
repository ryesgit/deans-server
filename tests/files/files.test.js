import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { mockUsers, mockFiles } from '../utils/prismaMock.js';
import * as prismaClient from '../../prismaClient.js';

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
    jest.restoreAllMocks();
  });

  describe('GET /api/files/user/:userId', () => {
    test('should fetch all files for a valid user', async () => {
      const userFiles = mockFiles.filter(f => f.userId === 'PUP001');
      const getUserFilesSpy = jest.spyOn(prismaClient, 'getUserFiles').mockResolvedValue(userFiles);

      const response = await request(app)
        .get('/api/files/user/PUP001')
        .expect(200);

      expect(response.body.message).toBe('Files retrieved successfully');
      expect(response.body.userId).toBe('PUP001');
      expect(response.body.count).toBe(2);
      expect(response.body.files).toHaveLength(2);
    });

    test('should return 404 when user has no files', async () => {
      const getUserFilesSpy = jest.spyOn(prismaClient, 'getUserFiles').mockResolvedValue([]);

      const response = await request(app)
        .get('/api/files/user/NOFILES')
        .expect(404);

      expect(response.body.message).toBe('No files found for this user');
      expect(response.body.userId).toBe('NOFILES');
      expect(response.body.files).toEqual([]);
    });

    test('should return 500 on database error', async () => {
      const getUserFilesSpy = jest.spyOn(prismaClient, 'getUserFiles').mockRejectedValue(new Error('DB Error'));

      const response = await request(app)
        .get('/api/files/user/PUP001')
        .expect(500);

      expect(response.body.error).toBe('Failed to retrieve files');
    });
  });

  describe('GET /api/files/all', () => {
    test('should fetch all files in the system', async () => {
      const getAllFilesSpy = jest.spyOn(prismaClient, 'getAllFiles').mockResolvedValue(mockFiles);

      const response = await request(app)
        .get('/api/files/all')
        .expect(200);

      expect(response.body.message).toBe('All files retrieved successfully');
      expect(response.body.count).toBe(mockFiles.length);
      expect(response.body.files).toHaveLength(mockFiles.length);
    });

    test('should return empty array when no files exist', async () => {
      const getAllFilesSpy = jest.spyOn(prismaClient, 'getAllFiles').mockResolvedValue([]);

      const response = await request(app)
        .get('/api/files/all')
        .expect(200);

      expect(response.body.count).toBe(0);
      expect(response.body.files).toEqual([]);
    });

    test('should return 500 on database error', async () => {
      const getAllFilesSpy = jest.spyOn(prismaClient, 'getAllFiles').mockRejectedValue(new Error('DB Error'));

      const response = await request(app)
        .get('/api/files/all')
        .expect(500);

      expect(response.body.error).toBe('Failed to retrieve all files');
    });
  });

  describe('GET /api/files/search', () => {
    test('should return filtered files matching query', async () => {
      const searchResults = [mockFiles[0]]; // Engineering files
      const searchFilesSpy = jest.spyOn(prismaClient, 'searchFiles').mockResolvedValue(searchResults);

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
      const searchFilesSpy = jest.spyOn(prismaClient, 'searchFiles').mockResolvedValue(userFiles);

      const response = await request(app)
        .get('/api/files/search?q=Thesis&userId=PUP001')
        .expect(200);

      expect(response.body.count).toBe(2);
    });

    test('should return empty results when no matches found', async () => {
      const searchFilesSpy = jest.spyOn(prismaClient, 'searchFiles').mockResolvedValue([]);

      const response = await request(app)
        .get('/api/files/search?q=NonExistent')
        .expect(200);

      expect(response.body.count).toBe(0);
      expect(response.body.files).toEqual([]);
    });

    test('should return 500 on database error', async () => {
      const searchFilesSpy = jest.spyOn(prismaClient, 'searchFiles').mockRejectedValue(new Error('Search failed'));

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
      const addFileSpy = jest.spyOn(prismaClient, 'addFile').mockResolvedValue({ fileId: newFile.id });

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
      const addFileSpy = jest.spyOn(prismaClient, 'addFile').mockResolvedValue({ fileId: 100 });

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
      const addFileSpy = jest.spyOn(prismaClient, 'addFile').mockRejectedValue(new Error('DB Error'));

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
      const returnFileSpy = jest.spyOn(prismaClient, 'returnFile').mockResolvedValue({ success: true, fileId: 4 });

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
      const returnFileSpy = jest.spyOn(prismaClient, 'returnFile').mockResolvedValue({ success: false, message: 'File not found or not currently retrieved' });

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
      const returnFileSpy = jest.spyOn(prismaClient, 'returnFile').mockRejectedValue(new Error('DB Error'));

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
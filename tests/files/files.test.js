import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { mockPrismaClient, mockUsers, mockFiles, resetPrismaMocks } from '../utils/prismaMock.js';

// Mock Prisma Client
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
    resetPrismaMocks();
  });

  describe('GET /api/files/user/:userId', () => {
    test('should fetch all files for a valid user', async () => {
      const userFiles = mockFiles.filter(f => f.userId === 'PUP001');
      mockPrismaClient.file.findMany.mockResolvedValue(userFiles);

      const response = await request(app)
        .get('/api/files/user/PUP001')
        .expect(200);

      expect(response.body.message).toBe('Files retrieved successfully');
      expect(response.body.userId).toBe('PUP001');
      expect(response.body.count).toBe(2);
      expect(response.body.files).toHaveLength(2);
      expect(response.body.files[0].user_id).toBe('PUP001');
    });

    test('should return 404 when user has no files', async () => {
      mockPrismaClient.file.findMany.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/files/user/NOFILES')
        .expect(404);

      expect(response.body.message).toBe('No files found for this user');
      expect(response.body.userId).toBe('NOFILES');
      expect(response.body.files).toEqual([]);
    });

    test('should return 500 on database error', async () => {
      mockPrismaClient.file.findMany.mockRejectedValue(new Error('DB Error'));

      const response = await request(app)
        .get('/api/files/user/PUP001')
        .expect(500);

      expect(response.body.error).toBe('Failed to retrieve files');
    });
  });

  describe('GET /api/files/all', () => {
    test('should fetch all files in the system', async () => {
      mockPrismaClient.file.findMany.mockResolvedValue(mockFiles);

      const response = await request(app)
        .get('/api/files/all')
        .expect(200);

      expect(response.body.message).toBe('All files retrieved successfully');
      expect(response.body.count).toBe(mockFiles.length);
      expect(response.body.files).toHaveLength(mockFiles.length);
    });

    test('should return empty array when no files exist', async () => {
      mockPrismaClient.file.findMany.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/files/all')
        .expect(200);

      expect(response.body.count).toBe(0);
      expect(response.body.files).toEqual([]);
    });

    test('should return 500 on database error', async () => {
      mockPrismaClient.file.findMany.mockRejectedValue(new Error('DB Error'));

      const response = await request(app)
        .get('/api/files/all')
        .expect(500);

      expect(response.body.error).toBe('Failed to retrieve all files');
    });
  });

  describe('GET /api/files/search', () => {
    test('should return filtered files matching query', async () => {
      const searchResults = [mockFiles[0]]; // Engineering files
      mockPrismaClient.file.findMany.mockResolvedValue(searchResults);

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
      mockPrismaClient.file.findMany.mockResolvedValue(userFiles);

      const response = await request(app)
        .get('/api/files/search?q=Thesis&userId=PUP001')
        .expect(200);

      expect(response.body.count).toBe(2);
      expect(mockPrismaClient.file.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          OR: expect.any(Array),
        }),
        include: expect.any(Object),
        orderBy: expect.any(Object),
      });
    });

    test('should return empty results when no matches found', async () => {
      mockPrismaClient.file.findMany.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/files/search?q=NonExistent')
        .expect(200);

      expect(response.body.count).toBe(0);
      expect(response.body.files).toEqual([]);
    });

    test('should return 500 on database error', async () => {
      mockPrismaClient.file.findMany.mockRejectedValue(new Error('Search failed'));

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
        userId: 'PUP001',
        filename: 'NewFile.pdf',
        rowPosition: 3,
        columnPosition: 4,
        shelfNumber: 1,
      };
      mockPrismaClient.file.create.mockResolvedValue(newFile);

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
      expect(response.body.file.filename).toBe('NewFile.pdf');
      expect(response.body.file.rowPosition).toBe(3);
      expect(response.body.file.columnPosition).toBe(4);
    });

    test('should use default shelf number when not provided', async () => {
      const newFile = { id: 100, shelfNumber: 1 };
      mockPrismaClient.file.create.mockResolvedValue(newFile);

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
      expect(response.body.required).toContain('userId');
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
      mockPrismaClient.file.create.mockRejectedValue(new Error('DB Error'));

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
      const retrievedFile = {
        id: 4,
        userId: 'USER002',
        status: 'RETRIEVED',
        rowPosition: 2,
        columnPosition: 2,
      };

      mockPrismaClient.file.findFirst.mockResolvedValue(retrievedFile);
      mockPrismaClient.file.update.mockResolvedValue({
        ...retrievedFile,
        status: 'AVAILABLE',
      });
      mockPrismaClient.transaction.create.mockResolvedValue({ id: 1 });

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
      mockPrismaClient.file.findFirst.mockResolvedValue(null);

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
      mockPrismaClient.file.findFirst.mockRejectedValue(new Error('DB Error'));

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

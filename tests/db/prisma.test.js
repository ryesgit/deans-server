import { jest } from '@jest/globals';
import { mockPrismaClient, mockUsers, mockFiles, resetPrismaMocks } from '../utils/prismaMock.js';

// Mock the Prisma Client
jest.unstable_mockModule('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrismaClient),
}));

// Import the functions to test (after mocking)
const { checkUserExists, getFileLocation, getUserFiles, addFile, logAccess, updateFileAccess } = await import('../../prismaClient.js');

describe('Database Layer - Prisma Client Functions', () => {
  beforeEach(() => {
    resetPrismaMocks();
  });

  describe('checkUserExists', () => {
    test('should return true when user exists', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(mockUsers[0]);

      const result = await checkUserExists('PUP001');

      expect(result).toBe(true);
      expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { userId: 'PUP001' },
      });
    });

    test('should return false when user does not exist', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(null);

      const result = await checkUserExists('UNKNOWN');

      expect(result).toBe(false);
      expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { userId: 'UNKNOWN' },
      });
    });

    test('should return false on database error', async () => {
      mockPrismaClient.user.findUnique.mockRejectedValue(new Error('DB Error'));

      const result = await checkUserExists('PUP001');

      expect(result).toBe(false);
    });
  });

  describe('getFileLocation', () => {
    test('should return file location for valid user with available files', async () => {
      const mockFile = mockFiles[0];
      mockPrismaClient.file.findFirst.mockResolvedValue(mockFile);

      const result = await getFileLocation('PUP001');

      expect(result).toEqual({
        id: mockFile.id,
        user_id: mockFile.userId,
        filename: mockFile.filename,
        file_path: mockFile.filePath,
        row_position: mockFile.rowPosition,
        column_position: mockFile.columnPosition,
        shelf_number: mockFile.shelfNumber,
        created_at: mockFile.createdAt.toISOString(),
        accessed_at: null,
        name: mockFile.user.name,
        department: mockFile.user.department,
      });

      expect(mockPrismaClient.file.findFirst).toHaveBeenCalledWith({
        where: { userId: 'PUP001', status: 'AVAILABLE' },
        include: {
          user: {
            select: {
              name: true,
              department: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });

    test('should return specific file when filename is provided', async () => {
      const mockFile = mockFiles[0];
      mockPrismaClient.file.findFirst.mockResolvedValue(mockFile);

      const result = await getFileLocation('PUP001', 'Engineering_Thesis_2024.pdf');

      expect(result).not.toBeNull();
      expect(result.filename).toBe('Engineering_Thesis_2024.pdf');
      expect(mockPrismaClient.file.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 'PUP001',
          status: 'AVAILABLE',
          filename: 'Engineering_Thesis_2024.pdf',
        },
        include: expect.any(Object),
        orderBy: expect.any(Object),
      });
    });

    test('should return null when no available files found', async () => {
      mockPrismaClient.file.findFirst.mockResolvedValue(null);

      const result = await getFileLocation('USER002');

      expect(result).toBeNull();
    });

    test('should throw error on database failure', async () => {
      mockPrismaClient.file.findFirst.mockRejectedValue(new Error('DB Error'));

      await expect(getFileLocation('PUP001')).rejects.toThrow('DB Error');
    });
  });

  describe('getUserFiles', () => {
    test('should return all files for a user', async () => {
      const userFiles = mockFiles.filter(f => f.userId === 'PUP001');
      mockPrismaClient.file.findMany.mockResolvedValue(userFiles);

      const result = await getUserFiles('PUP001');

      expect(result).toHaveLength(2);
      expect(result[0].user_id).toBe('PUP001');
      expect(mockPrismaClient.file.findMany).toHaveBeenCalledWith({
        where: { userId: 'PUP001' },
        include: expect.any(Object),
        orderBy: {
          createdAt: 'desc',
        },
      });
    });

    test('should return empty array when user has no files', async () => {
      mockPrismaClient.file.findMany.mockResolvedValue([]);

      const result = await getUserFiles('NOFILES');

      expect(result).toEqual([]);
    });

    test('should throw error on database failure', async () => {
      mockPrismaClient.file.findMany.mockRejectedValue(new Error('DB Error'));

      await expect(getUserFiles('PUP001')).rejects.toThrow('DB Error');
    });
  });

  describe('addFile', () => {
    test('should add a new file successfully', async () => {
      const newFile = {
        id: 99,
        userId: 'PUP001',
        filename: 'NewFile.pdf',
        rowPosition: 3,
        columnPosition: 4,
        shelfNumber: 1,
      };
      mockPrismaClient.file.create.mockResolvedValue(newFile);

      const result = await addFile('PUP001', 'NewFile.pdf', 3, 4, 1);

      expect(result).toEqual({ fileId: 99 });
      expect(mockPrismaClient.file.create).toHaveBeenCalledWith({
        data: {
          userId: 'PUP001',
          filename: 'NewFile.pdf',
          rowPosition: 3,
          columnPosition: 4,
          shelfNumber: 1,
          categoryId: null,
          fileType: null,
          fileUrl: null,
        },
      });
    });

    test('should throw error on database failure', async () => {
      mockPrismaClient.file.create.mockRejectedValue(new Error('DB Error'));

      await expect(addFile('PUP001', 'File.pdf', 1, 1, 1)).rejects.toThrow('DB Error');
    });
  });

  describe('logAccess', () => {
    test('should log retrieval access successfully', async () => {
      const mockTransaction = {
        id: 1,
        userId: 'PUP001',
        fileId: 1,
        type: 'RETRIEVAL',
        rowPosition: 1,
        columnPosition: 3,
        notes: 'Access granted',
        timestamp: new Date(),
      };
      mockPrismaClient.transaction.create.mockResolvedValue(mockTransaction);

      const result = await logAccess('PUP001', 1, 'retrieve', 1, 3, true);

      expect(result).toEqual({ logId: 1 });
      expect(mockPrismaClient.transaction.create).toHaveBeenCalledWith({
        data: {
          userId: 'PUP001',
          fileId: 1,
          type: 'RETRIEVAL',
          rowPosition: 1,
          columnPosition: 3,
          notes: 'Access granted',
        },
      });
    });

    test('should log failed access with correct notes', async () => {
      const mockTransaction = {
        id: 2,
        userId: 'PUP001',
        fileId: 1,
        type: 'RETRIEVAL',
        notes: 'Access denied',
      };
      mockPrismaClient.transaction.create.mockResolvedValue(mockTransaction);

      await logAccess('PUP001', 1, 'retrieve', 1, 3, false);

      expect(mockPrismaClient.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          notes: 'Access denied',
        }),
      });
    });

    test('should map return access type correctly', async () => {
      mockPrismaClient.transaction.create.mockResolvedValue({ id: 1 });

      await logAccess('PUP001', 1, 'return', 1, 3, true);

      expect(mockPrismaClient.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'RETURN',
        }),
      });
    });

    test('should throw error on database failure', async () => {
      mockPrismaClient.transaction.create.mockRejectedValue(new Error('DB Error'));

      await expect(logAccess('PUP001', 1, 'retrieve', 1, 3, true)).rejects.toThrow('DB Error');
    });
  });

  describe('updateFileAccess', () => {
    test('should update file status to RETRIEVED', async () => {
      const updatedFile = { id: 1, status: 'RETRIEVED', updatedAt: new Date() };
      mockPrismaClient.file.update.mockResolvedValue(updatedFile);

      const result = await updateFileAccess(1);

      expect(result).toEqual({ updated: 1 });
      expect(mockPrismaClient.file.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          updatedAt: expect.any(Date),
          status: 'RETRIEVED',
        },
      });
    });

    test('should throw error on database failure', async () => {
      mockPrismaClient.file.update.mockRejectedValue(new Error('DB Error'));

      await expect(updateFileAccess(1)).rejects.toThrow('DB Error');
    });
  });
});

import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { mockPrismaClient, resetPrismaMocks } from '../utils/prismaMock.js';

// Mock Prisma Client
jest.unstable_mockModule('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrismaClient),
}));

// Mock middleware
const mockAuthenticateToken = (req, res, next) => next();
const mockAuthorizeRoles = (...roles) => (req, res, next) => next();
const mockReadLimiter = (req, res, next) => next();
const mockApiLimiter = (req, res, next) => next();

jest.unstable_mockModule('../../middleware/auth.js', () => ({
  authenticateToken: mockAuthenticateToken,
  authorizeRoles: mockAuthorizeRoles,
}));

jest.unstable_mockModule('../../middleware/rateLimiter.js', () => ({
  readLimiter: mockReadLimiter,
  apiLimiter: mockApiLimiter,
}));

// Create test app
const createTestApp = async () => {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const settingsRoutes = await import('../../routes/settings.js');
  app.use('/api/settings', settingsRoutes.default);

  app.use((err, req, res, next) => {
    res.status(500).json({
      error: 'Something went wrong!',
      message: err.message,
    });
  });

  return app;
};

describe('Settings API', () => {
  let app;

  const mockSettings = [
    {
      id: 1,
      key: 'max_file_size',
      value: '52428800',
      category: 'file_limits',
      updatedAt: new Date('2025-01-01'),
    },
    {
      id: 2,
      key: 'max_files_per_user',
      value: '50',
      category: 'file_limits',
      updatedAt: new Date('2025-01-01'),
    },
    {
      id: 3,
      key: 'auto_unlock_duration',
      value: '3000',
      category: 'door_config',
      updatedAt: new Date('2025-01-01'),
    },
    {
      id: 4,
      key: 'esp32_ip_address',
      value: '192.168.1.100',
      category: 'hardware',
      updatedAt: new Date('2025-01-01'),
    },
  ];

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(() => {
    resetPrismaMocks();
  });

  describe('GET /api/settings', () => {
    describe('Successful Retrieval', () => {
      test('should get all settings', async () => {
        mockPrismaClient.settings.findMany.mockResolvedValue(mockSettings);

        const response = await request(app)
          .get('/api/settings')
          .expect(200);

        expect(response.body.message).toBe('Settings retrieved successfully');
        expect(response.body.count).toBe(4);
        expect(response.body.settings).toBeDefined();
        expect(response.body.raw.length).toBe(4);
        expect(mockPrismaClient.settings.findMany).toHaveBeenCalledWith({
          where: {},
          orderBy: { key: 'asc' },
        });
      });

      test('should convert settings to key-value object', async () => {
        mockPrismaClient.settings.findMany.mockResolvedValue(mockSettings);

        const response = await request(app)
          .get('/api/settings')
          .expect(200);

        const { settings } = response.body;
        expect(settings.max_file_size.value).toBe('52428800');
        expect(settings.max_file_size.category).toBe('file_limits');
        expect(settings.esp32_ip_address.value).toBe('192.168.1.100');
        expect(settings.esp32_ip_address.category).toBe('hardware');
      });

      test('should get settings filtered by category', async () => {
        const fileLimitSettings = mockSettings.filter(s => s.category === 'file_limits');
        mockPrismaClient.settings.findMany.mockResolvedValue(fileLimitSettings);

        const response = await request(app)
          .get('/api/settings?category=file_limits')
          .expect(200);

        expect(response.body.count).toBe(2);
        expect(mockPrismaClient.settings.findMany).toHaveBeenCalledWith({
          where: { category: 'file_limits' },
          orderBy: { key: 'asc' },
        });
      });

      test('should handle empty settings list', async () => {
        mockPrismaClient.settings.findMany.mockResolvedValue([]);

        const response = await request(app)
          .get('/api/settings')
          .expect(200);

        expect(response.body.count).toBe(0);
        expect(response.body.settings).toEqual({});
        expect(response.body.raw).toEqual([]);
      });

      test('should handle multiple categories', async () => {
        const doorSettings = mockSettings.filter(s => s.category === 'door_config');
        mockPrismaClient.settings.findMany.mockResolvedValue(doorSettings);

        const response = await request(app)
          .get('/api/settings?category=door_config')
          .expect(200);

        expect(response.body.count).toBe(1);
        expect(mockPrismaClient.settings.findMany).toHaveBeenCalledWith({
          where: { category: 'door_config' },
          orderBy: { key: 'asc' },
        });
      });
    });

    describe('Error Cases', () => {
      test('should return 500 on database error', async () => {
        mockPrismaClient.settings.findMany.mockRejectedValue(new Error('DB Error'));

        const response = await request(app)
          .get('/api/settings')
          .expect(500);

        expect(response.body.error).toBe('Failed to retrieve settings');
        expect(response.body.message).toBe('DB Error');
      });
    });
  });

  describe('GET /api/settings/:key', () => {
    describe('Successful Retrieval', () => {
      test('should get setting by key', async () => {
        mockPrismaClient.settings.findUnique.mockResolvedValue(mockSettings[0]);

        const response = await request(app)
          .get('/api/settings/max_file_size')
          .expect(200);

        expect(response.body.message).toBe('Setting retrieved successfully');
        expect(response.body.setting.key).toBe(mockSettings[0].key);
        expect(response.body.setting.value).toBe(mockSettings[0].value);
        expect(response.body.setting.category).toBe(mockSettings[0].category);
        expect(mockPrismaClient.settings.findUnique).toHaveBeenCalledWith({
          where: { key: 'max_file_size' },
        });
      });

      test('should get different settings by key', async () => {
        mockPrismaClient.settings.findUnique.mockResolvedValue(mockSettings[3]);

        const response = await request(app)
          .get('/api/settings/esp32_ip_address')
          .expect(200);

        expect(response.body.setting.value).toBe('192.168.1.100');
        expect(response.body.setting.category).toBe('hardware');
      });
    });

    describe('Error Cases', () => {
      test('should return 404 when setting not found', async () => {
        mockPrismaClient.settings.findUnique.mockResolvedValue(null);

        const response = await request(app)
          .get('/api/settings/nonexistent_key')
          .expect(404);

        expect(response.body.error).toBe('Setting not found');
        expect(response.body.message).toBe('No setting found with that key');
      });

      test('should return 500 on database error', async () => {
        mockPrismaClient.settings.findUnique.mockRejectedValue(new Error('DB Error'));

        const response = await request(app)
          .get('/api/settings/max_file_size')
          .expect(500);

        expect(response.body.error).toBe('Failed to retrieve setting');
        expect(response.body.message).toBe('DB Error');
      });
    });
  });

  describe('PUT /api/settings (Create/Update)', () => {
    describe('Create New Setting', () => {
      test('should create new setting', async () => {
        const newSetting = {
          id: 5,
          key: 'new_setting',
          value: 'new_value',
          category: 'custom',
          updatedAt: new Date(),
        };

        mockPrismaClient.settings.upsert.mockResolvedValue(newSetting);

        const response = await request(app)
          .put('/api/settings')
          .send({
            key: 'new_setting',
            value: 'new_value',
            category: 'custom',
          })
          .expect(200);

        expect(response.body.message).toBe('Setting saved successfully');
        expect(response.body.setting.key).toBe('new_setting');
        expect(response.body.setting.value).toBe('new_value');
        expect(response.body.setting.category).toBe('custom');
        expect(mockPrismaClient.settings.upsert).toHaveBeenCalledWith({
          where: { key: 'new_setting' },
          update: { value: 'new_value', category: 'custom' },
          create: { key: 'new_setting', value: 'new_value', category: 'custom' },
        });
      });

      test('should create setting without category', async () => {
        const newSetting = {
          id: 6,
          key: 'simple_setting',
          value: 'simple_value',
          category: undefined,
          updatedAt: new Date(),
        };

        mockPrismaClient.settings.upsert.mockResolvedValue(newSetting);

        const response = await request(app)
          .put('/api/settings')
          .send({
            key: 'simple_setting',
            value: 'simple_value',
          })
          .expect(200);

        expect(response.body.message).toBe('Setting saved successfully');
        expect(response.body.setting.key).toBe('simple_setting');
      });
    });

    describe('Update Existing Setting', () => {
      test('should update existing setting', async () => {
        const updatedSetting = {
          ...mockSettings[0],
          value: '104857600',
          updatedAt: new Date(),
        };

        mockPrismaClient.settings.upsert.mockResolvedValue(updatedSetting);

        const response = await request(app)
          .put('/api/settings')
          .send({
            key: 'max_file_size',
            value: '104857600',
            category: 'file_limits',
          })
          .expect(200);

        expect(response.body.message).toBe('Setting saved successfully');
        expect(response.body.setting.value).toBe('104857600');
        expect(mockPrismaClient.settings.upsert).toHaveBeenCalled();
      });

      test('should update only value', async () => {
        const updatedSetting = { ...mockSettings[1], value: '100' };
        mockPrismaClient.settings.upsert.mockResolvedValue(updatedSetting);

        const response = await request(app)
          .put('/api/settings')
          .send({
            key: 'max_files_per_user',
            value: '100',
          })
          .expect(200);

        expect(response.body.setting.value).toBe('100');
      });
    });

    describe('Validation Errors', () => {
      test('should return 400 when key is missing', async () => {
        const response = await request(app)
          .put('/api/settings')
          .send({
            value: 'test_value',
            category: 'test',
          })
          .expect(400);

        expect(response.body.error).toBe('Missing required fields');
        expect(response.body.message).toBe('key and value are required');
      });

      test('should return 400 when value is missing', async () => {
        const response = await request(app)
          .put('/api/settings')
          .send({
            key: 'test_key',
            category: 'test',
          })
          .expect(400);

        expect(response.body.error).toBe('Missing required fields');
        expect(response.body.message).toBe('key and value are required');
      });

      test('should return 400 when both key and value are missing', async () => {
        const response = await request(app)
          .put('/api/settings')
          .send({
            category: 'test',
          })
          .expect(400);

        expect(response.body.error).toBe('Missing required fields');
      });

      test('should return 400 with empty body', async () => {
        const response = await request(app)
          .put('/api/settings')
          .send({})
          .expect(400);

        expect(response.body.error).toBe('Missing required fields');
      });
    });

    describe('Error Cases', () => {
      test('should return 500 on database error', async () => {
        mockPrismaClient.settings.upsert.mockRejectedValue(new Error('DB Error'));

        const response = await request(app)
          .put('/api/settings')
          .send({
            key: 'test_key',
            value: 'test_value',
          })
          .expect(500);

        expect(response.body.error).toBe('Failed to save setting');
        expect(response.body.message).toBe('DB Error');
      });
    });
  });

  describe('PUT /api/settings/bulk (Bulk Update)', () => {
    describe('Successful Bulk Operations', () => {
      test('should bulk update multiple settings', async () => {
        const updatedSettings = [
          { ...mockSettings[0], value: '104857600' },
          { ...mockSettings[1], value: '100' },
        ];

        mockPrismaClient.settings.upsert
          .mockResolvedValueOnce(updatedSettings[0])
          .mockResolvedValueOnce(updatedSettings[1]);

        const response = await request(app)
          .put('/api/settings/bulk')
          .send({
            settings: [
              { key: 'max_file_size', value: '104857600', category: 'file_limits' },
              { key: 'max_files_per_user', value: '100', category: 'file_limits' },
            ],
          })
          .expect(200);

        expect(response.body.message).toBe('Settings updated successfully');
        expect(response.body.count).toBe(2);
        expect(response.body.settings[0].key).toBe('max_file_size');
        expect(response.body.settings[0].value).toBe('104857600');
        expect(response.body.settings[1].key).toBe('max_files_per_user');
        expect(response.body.settings[1].value).toBe('100');
        expect(mockPrismaClient.settings.upsert).toHaveBeenCalledTimes(2);
      });

      test('should handle single setting in bulk update', async () => {
        mockPrismaClient.settings.upsert.mockResolvedValueOnce(mockSettings[0]);

        const response = await request(app)
          .put('/api/settings/bulk')
          .send({
            settings: [
              { key: 'max_file_size', value: '52428800', category: 'file_limits' },
            ],
          })
          .expect(200);

        expect(response.body.count).toBe(1);
        expect(mockPrismaClient.settings.upsert).toHaveBeenCalledTimes(1);
      });

      test('should handle multiple settings without category', async () => {
        const newSettings = [
          { key: 'setting1', value: 'value1' },
          { key: 'setting2', value: 'value2' },
        ];

        mockPrismaClient.settings.upsert
          .mockResolvedValueOnce(newSettings[0])
          .mockResolvedValueOnce(newSettings[1]);

        const response = await request(app)
          .put('/api/settings/bulk')
          .send({ settings: newSettings })
          .expect(200);

        expect(response.body.count).toBe(2);
      });
    });

    describe('Validation Errors', () => {
      test('should return 400 when settings is missing', async () => {
        const response = await request(app)
          .put('/api/settings/bulk')
          .send({})
          .expect(400);

        expect(response.body.error).toBe('Invalid request');
        expect(response.body.message).toBe('settings array is required');
      });

      test('should return 400 when settings is not an array', async () => {
        const response = await request(app)
          .put('/api/settings/bulk')
          .send({
            settings: { key: 'test_key', value: 'test_value' },
          })
          .expect(400);

        expect(response.body.error).toBe('Invalid request');
        expect(response.body.message).toBe('settings array is required');
      });

      test('should return 400 with empty settings array', async () => {
        mockPrismaClient.settings.upsert.mockResolvedValue([]);

        const response = await request(app)
          .put('/api/settings/bulk')
          .send({ settings: [] })
          .expect(200);

        expect(response.body.count).toBe(0);
      });

      test('should return 400 when settings is null', async () => {
        const response = await request(app)
          .put('/api/settings/bulk')
          .send({
            settings: null,
          })
          .expect(400);

        expect(response.body.error).toBe('Invalid request');
      });
    });

    describe('Error Cases', () => {
      test('should return 500 on database error', async () => {
        mockPrismaClient.settings.upsert.mockRejectedValue(new Error('DB Error'));

        const response = await request(app)
          .put('/api/settings/bulk')
          .send({
            settings: [
              { key: 'test_key1', value: 'test_value1' },
              { key: 'test_key2', value: 'test_value2' },
            ],
          })
          .expect(500);

        expect(response.body.error).toBe('Failed to update settings');
        expect(response.body.message).toBe('DB Error');
      });

      test('should handle partial failure in bulk update', async () => {
        mockPrismaClient.settings.upsert
          .mockResolvedValueOnce(mockSettings[0])
          .mockRejectedValueOnce(new Error('Partial error'));

        const response = await request(app)
          .put('/api/settings/bulk')
          .send({
            settings: [
              { key: 'max_file_size', value: '52428800' },
              { key: 'max_files_per_user', value: '50' },
            ],
          })
          .expect(500);

        expect(response.body.error).toBe('Failed to update settings');
      });
    });
  });

  describe('DELETE /api/settings/:key', () => {
    describe('Successful Deletion', () => {
      test('should delete existing setting', async () => {
        mockPrismaClient.settings.delete.mockResolvedValue(mockSettings[0]);

        const response = await request(app)
          .delete('/api/settings/max_file_size')
          .expect(200);

        expect(response.body.message).toBe('Setting deleted successfully');
        expect(response.body.key).toBe('max_file_size');
        expect(mockPrismaClient.settings.delete).toHaveBeenCalledWith({
          where: { key: 'max_file_size' },
        });
      });

      test('should delete different settings', async () => {
        mockPrismaClient.settings.delete.mockResolvedValue(mockSettings[3]);

        const response = await request(app)
          .delete('/api/settings/esp32_ip_address')
          .expect(200);

        expect(response.body.key).toBe('esp32_ip_address');
        expect(response.body.message).toBe('Setting deleted successfully');
      });
    });

    describe('Error Cases', () => {
      test('should return 404 when setting not found', async () => {
        const error = new Error('Not found');
        error.code = 'P2025';
        mockPrismaClient.settings.delete.mockRejectedValue(error);

        const response = await request(app)
          .delete('/api/settings/nonexistent_key')
          .expect(404);

        expect(response.body.error).toBe('Setting not found');
        expect(response.body.message).toBe('No setting found with that key');
      });

      test('should return 500 on database error (non-P2025)', async () => {
        mockPrismaClient.settings.delete.mockRejectedValue(new Error('DB Error'));

        const response = await request(app)
          .delete('/api/settings/max_file_size')
          .expect(500);

        expect(response.body.error).toBe('Failed to delete setting');
        expect(response.body.message).toBe('DB Error');
      });

      test('should handle Prisma unique constraint violation', async () => {
        const error = new Error('Constraint error');
        error.code = 'P2002';
        mockPrismaClient.settings.delete.mockRejectedValue(error);

        const response = await request(app)
          .delete('/api/settings/max_file_size')
          .expect(500);

        expect(response.body.error).toBe('Failed to delete setting');
      });
    });
  });

  describe('Integration Tests', () => {
    describe('Settings Workflow', () => {
      test('should create, retrieve, and delete setting', async () => {
        const newSetting = {
          id: 7,
          key: 'test_workflow',
          value: 'workflow_value',
          category: 'test',
          updatedAt: new Date(),
        };

        // Create
        mockPrismaClient.settings.upsert.mockResolvedValueOnce(newSetting);
        let response = await request(app)
          .put('/api/settings')
          .send({
            key: 'test_workflow',
            value: 'workflow_value',
            category: 'test',
          })
          .expect(200);

        expect(response.body.setting.key).toBe('test_workflow');

        // Retrieve
        mockPrismaClient.settings.findUnique.mockResolvedValueOnce(newSetting);
        response = await request(app)
          .get('/api/settings/test_workflow')
          .expect(200);

        expect(response.body.setting.value).toBe('workflow_value');

        // Delete
        mockPrismaClient.settings.delete.mockResolvedValueOnce(newSetting);
        response = await request(app)
          .delete('/api/settings/test_workflow')
          .expect(200);

        expect(response.body.key).toBe('test_workflow');
      });

      test('should update setting multiple times', async () => {
        const updatedSettings = [
          { ...mockSettings[0], value: '100000' },
          { ...mockSettings[0], value: '200000' },
          { ...mockSettings[0], value: '300000' },
        ];

        mockPrismaClient.settings.upsert
          .mockResolvedValueOnce(updatedSettings[0])
          .mockResolvedValueOnce(updatedSettings[1])
          .mockResolvedValueOnce(updatedSettings[2]);

        let response = await request(app)
          .put('/api/settings')
          .send({ key: 'max_file_size', value: '100000' })
          .expect(200);
        expect(response.body.setting.value).toBe('100000');

        response = await request(app)
          .put('/api/settings')
          .send({ key: 'max_file_size', value: '200000' })
          .expect(200);
        expect(response.body.setting.value).toBe('200000');

        response = await request(app)
          .put('/api/settings')
          .send({ key: 'max_file_size', value: '300000' })
          .expect(200);
        expect(response.body.setting.value).toBe('300000');
      });

      test('should handle bulk operations with retrieval', async () => {
        const bulkSettings = mockSettings.slice(0, 2);

        // Bulk update
        mockPrismaClient.settings.upsert
          .mockResolvedValueOnce(bulkSettings[0])
          .mockResolvedValueOnce(bulkSettings[1]);

        let response = await request(app)
          .put('/api/settings/bulk')
          .send({
            settings: [
              { key: 'max_file_size', value: '52428800' },
              { key: 'max_files_per_user', value: '50' },
            ],
          })
          .expect(200);

        expect(response.body.count).toBe(2);

        // Retrieve all
        mockPrismaClient.settings.findMany.mockResolvedValueOnce(bulkSettings);
        response = await request(app)
          .get('/api/settings?category=file_limits')
          .expect(200);

        expect(response.body.count).toBe(2);
      });
    });
  });
});

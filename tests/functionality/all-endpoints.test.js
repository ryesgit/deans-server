import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../../index.js';
import { mockPrismaClient } from '../utils/prismaMock.js';

vi.mock('../../prismaClient.js', () => ({
  default: mockPrismaClient,
}));

describe('Authentication Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrismaClient.user.findUnique.mockClear();
    mockPrismaClient.user.create.mockClear();
  });

  describe('Login Functionality', () => {
    it('should successfully login with valid credentials', async () => {
      const existingUser = {
        id: 1,
        userId: 'PUP001',
        password: '$2b$10$hashedpassword',
        name: 'Test User',
      };

      mockPrismaClient.user.findUnique.mockResolvedValue(existingUser);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          userId: 'PUP001',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('token');
      expect(mockPrismaClient.user.findUnique).toHaveBeenCalled();
    });

    it('should reject login with missing userId', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'password123',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject login with missing password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          userId: 'PUP001',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject login with nonexistent user', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          userId: 'UNKNOWN',
          password: 'password123',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should not expose password in response', async () => {
      const existingUser = {
        id: 1,
        userId: 'PUP001',
        password: '$2b$10$hashedpassword',
        name: 'Test User',
      };

      mockPrismaClient.user.findUnique.mockResolvedValue(existingUser);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          userId: 'PUP001',
          password: 'password123',
        });

      expect(response.body).not.toHaveProperty('password');
      expect(response.body.user).not.toHaveProperty('password');
    });
  });

  describe('Registration Functionality', () => {
    it('should successfully register new user with all fields', async () => {
      const newUser = {
        id: 1,
        userId: 'NEWUSER001',
        name: 'New User',
        department: 'Engineering',
        email: 'newuser@pup.edu.ph',
        password: '$2b$10$hashedpassword',
      };

      mockPrismaClient.user.create.mockResolvedValue(newUser);

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          userId: 'NEWUSER001',
          password: 'password123',
          name: 'New User',
          department: 'Engineering',
          email: 'newuser@pup.edu.ph',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.user.userId).toBe('NEWUSER001');
      expect(mockPrismaClient.user.create).toHaveBeenCalled();
    });

    it('should register user with only required fields', async () => {
      const newUser = {
        id: 1,
        userId: 'NEWUSER002',
        name: 'New User',
        department: null,
        email: null,
        password: '$2b$10$hashedpassword',
      };

      mockPrismaClient.user.create.mockResolvedValue(newUser);

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          userId: 'NEWUSER002',
          password: 'password123',
          name: 'New User',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    it('should reject registration with missing userId', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          password: 'password123',
          name: 'New User',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject registration with duplicate userId', async () => {
      mockPrismaClient.user.create.mockRejectedValue({
        code: 'P2002',
        meta: { target: ['userId'] },
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          userId: 'PUP001',
          password: 'password123',
          name: 'Duplicate User',
        });

      expect(response.status).toBe(409);
    });
  });

  describe('Token Verification', () => {
    it('should verify existing user', async () => {
      const user = {
        id: 1,
        userId: 'PUP001',
        name: 'Test User',
        department: 'Engineering',
      };

      mockPrismaClient.user.findUnique.mockResolvedValue(user);

      const response = await request(app)
        .get('/api/auth/verify/PUP001');

      expect(response.status).toBe(200);
      expect(response.body.user.userId).toBe('PUP001');
      expect(response.body).not.toHaveProperty('password');
    });

    it('should return 404 for nonexistent user', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/auth/verify/UNKNOWN');

      expect(response.status).toBe(404);
    });
  });
});

describe('File Management Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrismaClient.file.findMany.mockClear();
    mockPrismaClient.file.findUnique.mockClear();
    mockPrismaClient.file.create.mockClear();
    mockPrismaClient.file.update.mockClear();
    mockPrismaClient.file.delete.mockClear();
  });

  describe('Get Files', () => {
    it('should retrieve all files for user', async () => {
      const userFiles = [
        { id: 1, userId: 'PUP001', filename: 'Doc1.pdf', status: 'AVAILABLE' },
        { id: 2, userId: 'PUP001', filename: 'Doc2.pdf', status: 'RETRIEVED' },
      ];

      mockPrismaClient.file.findMany.mockResolvedValue(userFiles);

      const response = await request(app)
        .get('/api/files')
        .query({ userId: 'PUP001' });

      expect(response.status).toBe(200);
      expect(response.body.files).toHaveLength(2);
      expect(response.body.count).toBe(2);
    });

    it('should return empty array when user has no files', async () => {
      mockPrismaClient.file.findMany.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/files')
        .query({ userId: 'NEWUSER'});

      expect(response.status).toBe(200);
      expect(response.body.files).toHaveLength(0);
    });

    it('should search files by filename', async () => {
      const searchResults = [
        { id: 1, filename: 'Engineering_Report.pdf', status: 'AVAILABLE' },
      ];

      mockPrismaClient.file.findMany.mockResolvedValue(searchResults);

      const response = await request(app)
        .get('/api/files/search')
        .query({ q: 'Engineering' });

      expect(response.status).toBe(200);
      expect(response.body.results).toHaveLength(1);
      expect(response.body.results[0].filename).toContain('Engineering');
    });
  });

  describe('File Status Updates', () => {
    it('should update file status from AVAILABLE to RETRIEVED', async () => {
      const updatedFile = {
        id: 1,
        filename: 'Document.pdf',
        status: 'RETRIEVED',
        userId: 'PUP001',
      };

      mockPrismaClient.file.update.mockResolvedValue(updatedFile);

      const response = await request(app)
        .patch('/api/files/1/status')
        .send({ status: 'RETRIEVED' });

      expect(response.status).toBe(200);
      expect(response.body.file.status).toBe('RETRIEVED');
    });

    it('should return error for invalid status', async () => {
      const response = await request(app)
        .patch('/api/files/1/status')
        .send({ status: 'INVALID_STATUS' });

      expect(response.status).toBe(400);
    });
  });
});

describe('Door Control Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Lock/Unlock Operations', () => {
    it('should unlock door with valid row and column', async () => {
      const response = await request(app)
        .post('/api/door/unlock')
        .send({
          row: 1,
          column: 3,
          userId: 'PUP001',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('unlocked');
    });

    it('should lock door with valid parameters', async () => {
      const response = await request(app)
        .post('/api/door/lock')
        .send({
          row: 1,
          column: 3,
          userId: 'PUP001',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('locked');
    });

    it('should reject unlock without row', async () => {
      const response = await request(app)
        .post('/api/door/unlock')
        .send({
          column: 3,
          userId: 'PUP001',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject unlock without column', async () => {
      const response = await request(app)
        .post('/api/door/unlock')
        .send({
          row: 1,
          userId: 'PUP001',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Door Status', () => {
    it('should return door status', async () => {
      const response = await request(app)
        .get('/api/door/status');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('esp32Status');
      expect(response.body).toHaveProperty('serverStatus');
    });
  });
});

describe('QR Code Scanning Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrismaClient.file.findMany.mockClear();
    mockPrismaClient.accessLog.create.mockClear();
  });

  describe('QR Scan Processing', () => {
    it('should process QR scan and retrieve available files', async () => {
      const availableFiles = [
        { id: 1, filename: 'Doc1.pdf', status: 'AVAILABLE', rowPosition: 1, columnPosition: 1 },
        { id: 2, filename: 'Doc2.pdf', status: 'AVAILABLE', rowPosition: 2, columnPosition: 2 },
      ];

      mockPrismaClient.file.findMany.mockResolvedValue(availableFiles);

      const response = await request(app)
        .post('/api/qr/scan')
        .send({ userId: 'PUP001' });

      expect(response.status).toBe(200);
      expect(response.body.filesProcessed).toBe(2);
      expect(response.body.unlocks).toBeDefined();
    });

    it('should return error for nonexistent user on QR scan', async () => {
      mockPrismaClient.file.findMany.mockResolvedValue([]);

      const response = await request(app)
        .post('/api/qr/scan')
        .send({ userId: 'UNKNOWN' });

      expect(response.status).toBe(404);
    });

    it('should handle user with no available files', async () => {
      mockPrismaClient.file.findMany.mockResolvedValue([]);

      const response = await request(app)
        .post('/api/qr/scan')
        .send({ userId: 'PUP002' });

      expect([404, 200]).toContain(response.status);
    });
  });
});

describe('Notifications Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrismaClient.notification.findMany.mockClear();
    mockPrismaClient.notification.update.mockClear();
  });

  describe('Get Notifications', () => {
    it('should retrieve all notifications for user', async () => {
      const notifications = [
        { id: 1, userId: 'PUP001', message: 'File ready', read: false },
        { id: 2, userId: 'PUP001', message: 'Request approved', read: false },
      ];

      mockPrismaClient.notification.findMany.mockResolvedValue(notifications);

      const response = await request(app)
        .get('/api/notifications')
        .query({ userId: 'PUP001' });

      expect(response.status).toBe(200);
      expect(response.body.notifications).toHaveLength(2);
    });

    it('should mark notification as read', async () => {
      const updatedNotification = {
        id: 1,
        userId: 'PUP001',
        message: 'File ready',
        read: true,
      };

      mockPrismaClient.notification.update.mockResolvedValue(updatedNotification);

      const response = await request(app)
        .put('/api/notifications/1/read');

      expect(response.status).toBe(200);
      expect(response.body.notification.read).toBe(true);
    });
  });
});

describe('Reports Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrismaClient.accessLog.findMany.mockClear();
  });

  describe('Generate Reports', () => {
    it('should generate access report', async () => {
      const accessLogs = [
        { id: 1, userId: 'PUP001', action: 'RETRIEVED', timestamp: new Date() },
        { id: 2, userId: 'PUP001', action: 'RETURNED', timestamp: new Date() },
      ];

      mockPrismaClient.accessLog.findMany.mockResolvedValue(accessLogs);

      const response = await request(app)
        .get('/api/reports/access')
        .query({ userId: 'PUP001' });

      expect(response.status).toBe(200);
      expect(response.body.logs).toBeDefined();
    });

    it('should filter reports by date range', async () => {
      const filteredLogs = [];

      mockPrismaClient.accessLog.findMany.mockResolvedValue(filteredLogs);

      const response = await request(app)
        .get('/api/reports/access')
        .query({
          startDate: '2025-01-01',
          endDate: '2025-12-31',
        });

      expect(response.status).toBe(200);
    });
  });
});

describe('Settings Management Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrismaClient.settings.findMany.mockClear();
    mockPrismaClient.settings.findUnique.mockClear();
    mockPrismaClient.settings.upsert.mockClear();
    mockPrismaClient.settings.delete.mockClear();
  });

  describe('Get Settings', () => {
    it('should retrieve all settings', async () => {
      const settings = [
        { id: 1, key: 'max_file_size', value: '52428800', category: 'file_limits' },
        { id: 2, key: 'max_files_per_user', value: '50', category: 'file_limits' },
      ];

      mockPrismaClient.settings.findMany.mockResolvedValue(settings);

      const response = await request(app)
        .get('/api/settings');

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(2);
      expect(response.body.settings).toBeDefined();
    });

    it('should get setting by key', async () => {
      const setting = {
        id: 1,
        key: 'max_file_size',
        value: '52428800',
        category: 'file_limits',
      };

      mockPrismaClient.settings.findUnique.mockResolvedValue(setting);

      const response = await request(app)
        .get('/api/settings/max_file_size');

      expect(response.status).toBe(200);
      expect(response.body.setting.key).toBe('max_file_size');
      expect(response.body.setting.value).toBe('52428800');
    });

    it('should return 404 for nonexistent setting', async () => {
      mockPrismaClient.settings.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/settings/nonexistent');

      expect(response.status).toBe(404);
    });
  });

  describe('Create/Update Settings', () => {
    it('should create new setting', async () => {
      const newSetting = {
        id: 5,
        key: 'new_setting',
        value: 'new_value',
        category: 'custom',
      };

      mockPrismaClient.settings.upsert.mockResolvedValue(newSetting);

      const response = await request(app)
        .put('/api/settings')
        .send({
          key: 'new_setting',
          value: 'new_value',
          category: 'custom',
        });

      expect(response.status).toBe(200);
      expect(response.body.setting.key).toBe('new_setting');
    });

    it('should update existing setting', async () => {
      const updatedSetting = {
        id: 1,
        key: 'max_file_size',
        value: '104857600',
        category: 'file_limits',
      };

      mockPrismaClient.settings.upsert.mockResolvedValue(updatedSetting);

      const response = await request(app)
        .put('/api/settings')
        .send({
          key: 'max_file_size',
          value: '104857600',
          category: 'file_limits',
        });

      expect(response.status).toBe(200);
      expect(response.body.setting.value).toBe('104857600');
    });

    it('should reject setting without key', async () => {
      const response = await request(app)
        .put('/api/settings')
        .send({
          value: 'test_value',
        });

      expect(response.status).toBe(400);
    });

    it('should reject setting without value', async () => {
      const response = await request(app)
        .put('/api/settings')
        .send({
          key: 'test_key',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Delete Settings', () => {
    it('should delete existing setting', async () => {
      mockPrismaClient.settings.delete.mockResolvedValue({
        id: 1,
        key: 'max_file_size',
      });

      const response = await request(app)
        .delete('/api/settings/max_file_size');

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deleted');
    });

    it('should return 404 when deleting nonexistent setting', async () => {
      mockPrismaClient.settings.delete.mockRejectedValue({
        code: 'P2025',
      });

      const response = await request(app)
        .delete('/api/settings/nonexistent');

      expect(response.status).toBe(404);
    });
  });

  describe('Bulk Settings Operations', () => {
    it('should bulk update multiple settings', async () => {
      mockPrismaClient.settings.upsert
        .mockResolvedValueOnce({ id: 1, key: 'setting1', value: 'value1' })
        .mockResolvedValueOnce({ id: 2, key: 'setting2', value: 'value2' });

      const response = await request(app)
        .put('/api/settings/bulk')
        .send({
          settings: [
            { key: 'setting1', value: 'value1' },
            { key: 'setting2', value: 'value2' },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(2);
    });

    it('should validate bulk settings array', async () => {
      const response = await request(app)
        .put('/api/settings/bulk')
        .send({
          settings: 'not_an_array',
        });

      expect(response.status).toBe(400);
    });
  });
});

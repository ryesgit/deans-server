import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import { mockPrismaClient, mockUsers, resetPrismaMocks } from '../utils/prismaMock.js';

jest.unstable_mockModule('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrismaClient),
}));

const createTestApp = async () => {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const authRoutes = await import('../../routes/auth.js');
  app.use('/api/auth', authRoutes.default);

  app.use((err, req, res, next) => {
    res.status(500).json({
      error: 'Something went wrong!',
      message: err.message,
    });
  });

  return app;
};

describe('Authentication API', () => {
  let app;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(() => {
    resetPrismaMocks();
  });

  describe('POST /api/auth/register', () => {
    describe('Successful Registration', () => {
      test('should register a new user with all fields', async () => {
        mockPrismaClient.user.findUnique.mockResolvedValue(null);
        mockPrismaClient.user.create.mockResolvedValue({
          id: 5,
          userId: 'NEWUSER001',
          password: '$2a$10$hashedpassword',
          name: 'New User',
          department: 'Engineering',
          email: 'newuser@pup.edu.ph',
          createdAt: new Date(),
        });

        const response = await request(app)
          .post('/api/auth/register')
          .send({
            userId: 'NEWUSER001',
            password: 'password123',
            name: 'New User',
            department: 'Engineering',
            email: 'newuser@pup.edu.ph',
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('User registered successfully');
        expect(response.body.user).toEqual({
          userId: 'NEWUSER001',
          name: 'New User',
          department: 'Engineering',
          email: 'newuser@pup.edu.ph',
        });

        expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
          where: { userId: 'NEWUSER001' },
        });
        expect(mockPrismaClient.user.create).toHaveBeenCalled();
      });

      test('should register a user with only required fields', async () => {
        mockPrismaClient.user.findUnique.mockResolvedValue(null);
        mockPrismaClient.user.create.mockResolvedValue({
          id: 6,
          userId: 'NEWUSER002',
          password: '$2a$10$hashedpassword',
          name: 'Another User',
          department: null,
          email: null,
          createdAt: new Date(),
        });

        const response = await request(app)
          .post('/api/auth/register')
          .send({
            userId: 'NEWUSER002',
            password: 'password123',
            name: 'Another User',
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.user.userId).toBe('NEWUSER002');
        expect(response.body.user.name).toBe('Another User');
      });

      test('should hash the password before storing', async () => {
        mockPrismaClient.user.findUnique.mockResolvedValue(null);

        let capturedPassword;
        mockPrismaClient.user.create.mockImplementation(async ({ data }) => {
          capturedPassword = data.password;
          return {
            id: 7,
            userId: data.userId,
            password: data.password,
            name: data.name,
            department: data.department,
            email: data.email,
            createdAt: new Date(),
          };
        });

        await request(app)
          .post('/api/auth/register')
          .send({
            userId: 'SECUREUSER',
            password: 'plaintextpassword',
            name: 'Secure User',
          })
          .expect(201);

        expect(capturedPassword).not.toBe('plaintextpassword');
        expect(capturedPassword).toMatch(/^\$2[ayb]\$.{56}$/);

        const isValidHash = await bcrypt.compare('plaintextpassword', capturedPassword);
        expect(isValidHash).toBe(true);
      });
    });

    describe('Validation Errors', () => {
      test('should return 400 when userId is missing', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            password: 'password123',
            name: 'User Name',
          })
          .expect(400);

        expect(response.body.error).toBe('Missing required fields');
        expect(response.body.required).toContain('userId');
      });

      test('should return 400 when password is missing', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            userId: 'TESTUSER',
            name: 'User Name',
          })
          .expect(400);

        expect(response.body.error).toBe('Missing required fields');
        expect(response.body.required).toContain('password');
      });

      test('should return 400 when name is missing', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            userId: 'TESTUSER',
            password: 'password123',
          })
          .expect(400);

        expect(response.body.error).toBe('Missing required fields');
        expect(response.body.required).toContain('name');
      });

      test('should return 400 when all required fields are missing', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({})
          .expect(400);

        expect(response.body.error).toBe('Missing required fields');
      });
    });

    describe('Duplicate User Errors', () => {
      test('should return 409 when userId already exists', async () => {
        mockPrismaClient.user.findUnique.mockResolvedValue(mockUsers[0]);

        const response = await request(app)
          .post('/api/auth/register')
          .send({
            userId: 'PUP001',
            password: 'password123',
            name: 'Duplicate User',
          })
          .expect(409);

        expect(response.body.error).toBe('User already exists');
        expect(response.body.message).toContain('already exists');
        expect(mockPrismaClient.user.create).not.toHaveBeenCalled();
      });
    });

    describe('Database Errors', () => {
      test('should return 500 when database create fails', async () => {
        mockPrismaClient.user.findUnique.mockResolvedValue(null);
        mockPrismaClient.user.create.mockRejectedValue(new Error('Database connection failed'));

        const response = await request(app)
          .post('/api/auth/register')
          .send({
            userId: 'NEWUSER',
            password: 'password123',
            name: 'Test User',
          })
          .expect(500);

        expect(response.body.error).toBe('Registration failed');
      });
    });
  });

  describe('POST /api/auth/login', () => {
    describe('Successful Login', () => {
      test('should login with valid credentials', async () => {
        const hashedPassword = await bcrypt.hash('password123', 10);
        const mockUser = {
          ...mockUsers[0],
          password: hashedPassword,
        };

        mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);

        const response = await request(app)
          .post('/api/auth/login')
          .send({
            userId: 'PUP001',
            password: 'password123',
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Login successful');
        expect(response.body.user).toEqual({
          userId: 'PUP001',
          name: 'Juan Dela Cruz',
          department: 'Engineering',
          email: 'juan.delacruz@pup.edu.ph',
        });
        expect(response.body.user.password).toBeUndefined();
      });

      test('should not expose password in response', async () => {
        const hashedPassword = await bcrypt.hash('password123', 10);
        mockPrismaClient.user.findUnique.mockResolvedValue({
          ...mockUsers[1],
          password: hashedPassword,
        });

        const response = await request(app)
          .post('/api/auth/login')
          .send({
            userId: 'PUP002',
            password: 'password123',
          })
          .expect(200);

        expect(response.body.user.password).toBeUndefined();
        expect(Object.keys(response.body.user)).not.toContain('password');
      });
    });

    describe('Validation Errors', () => {
      test('should return 400 when userId is missing', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            password: 'password123',
          })
          .expect(400);

        expect(response.body.error).toBe('Missing credentials');
        expect(response.body.message).toContain('userId and password');
      });

      test('should return 400 when password is missing', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            userId: 'PUP001',
          })
          .expect(400);

        expect(response.body.error).toBe('Missing credentials');
      });

      test('should return 400 when both fields are missing', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({})
          .expect(400);

        expect(response.body.error).toBe('Missing credentials');
      });
    });

    describe('Authentication Errors', () => {
      test('should return 401 when user does not exist', async () => {
        mockPrismaClient.user.findUnique.mockResolvedValue(null);

        const response = await request(app)
          .post('/api/auth/login')
          .send({
            userId: 'NONEXISTENT',
            password: 'password123',
          })
          .expect(401);

        expect(response.body.error).toBe('Invalid credentials');
        expect(response.body.message).toContain('incorrect');
      });

      test('should return 401 when password is incorrect', async () => {
        const hashedPassword = await bcrypt.hash('correctpassword', 10);
        mockPrismaClient.user.findUnique.mockResolvedValue({
          ...mockUsers[0],
          password: hashedPassword,
        });

        const response = await request(app)
          .post('/api/auth/login')
          .send({
            userId: 'PUP001',
            password: 'wrongpassword',
          })
          .expect(401);

        expect(response.body.error).toBe('Invalid credentials');
        expect(response.body.message).toContain('incorrect');
      });

      test('should not reveal whether user exists or password is wrong', async () => {
        mockPrismaClient.user.findUnique.mockResolvedValue(null);

        const responseNoUser = await request(app)
          .post('/api/auth/login')
          .send({
            userId: 'NONEXISTENT',
            password: 'password123',
          })
          .expect(401);

        const hashedPassword = await bcrypt.hash('correctpassword', 10);
        mockPrismaClient.user.findUnique.mockResolvedValue({
          ...mockUsers[0],
          password: hashedPassword,
        });

        const responseWrongPass = await request(app)
          .post('/api/auth/login')
          .send({
            userId: 'PUP001',
            password: 'wrongpassword',
          })
          .expect(401);

        expect(responseNoUser.body.message).toBe(responseWrongPass.body.message);
      });
    });

    describe('Database Errors', () => {
      test('should return 500 when database query fails', async () => {
        mockPrismaClient.user.findUnique.mockRejectedValue(new Error('Database error'));

        const response = await request(app)
          .post('/api/auth/login')
          .send({
            userId: 'PUP001',
            password: 'password123',
          })
          .expect(500);

        expect(response.body.error).toBe('Login failed');
      });
    });
  });

  describe('GET /api/auth/verify/:userId', () => {
    describe('Successful Verification', () => {
      test('should verify existing user', async () => {
        const mockUser = {
          userId: 'PUP001',
          name: 'Juan Dela Cruz',
          department: 'Engineering',
          email: 'juan.delacruz@pup.edu.ph',
          createdAt: new Date('2024-01-01'),
        };

        mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);

        const response = await request(app)
          .get('/api/auth/verify/PUP001')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.user.userId).toBe('PUP001');
        expect(response.body.user.name).toBe('Juan Dela Cruz');
        expect(response.body.user.department).toBe('Engineering');
        expect(response.body.user.email).toBe('juan.delacruz@pup.edu.ph');
        expect(response.body.user.createdAt).toBe('2024-01-01T00:00:00.000Z');
        expect(response.body.user.password).toBeUndefined();
      });

      test('should not expose password in verification response', async () => {
        mockPrismaClient.user.findUnique.mockResolvedValue({
          userId: 'USER001',
          name: 'John Doe',
          department: 'Computer Science',
          email: 'john.doe@pup.edu.ph',
          createdAt: new Date('2024-01-01'),
        });

        const response = await request(app)
          .get('/api/auth/verify/USER001')
          .expect(200);

        expect(response.body.user.password).toBeUndefined();
      });
    });

    describe('User Not Found', () => {
      test('should return 404 when user does not exist', async () => {
        mockPrismaClient.user.findUnique.mockResolvedValue(null);

        const response = await request(app)
          .get('/api/auth/verify/NONEXISTENT')
          .expect(404);

        expect(response.body.error).toBe('User not found');
        expect(response.body.message).toContain('No user exists');
      });
    });

    describe('Database Errors', () => {
      test('should return 500 when database query fails', async () => {
        mockPrismaClient.user.findUnique.mockRejectedValue(new Error('Database error'));

        const response = await request(app)
          .get('/api/auth/verify/PUP001')
          .expect(500);

        expect(response.body.error).toBe('Verification failed');
      });
    });
  });

  describe('Integration Tests', () => {
    test('should be able to register and then login', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValueOnce(null);

      const hashedPassword = await bcrypt.hash('newpass123', 10);
      const createdUser = {
        id: 10,
        userId: 'INTEGRATION001',
        password: hashedPassword,
        name: 'Integration User',
        department: 'Testing',
        email: 'integration@test.com',
        createdAt: new Date(),
      };

      mockPrismaClient.user.create.mockResolvedValue(createdUser);

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          userId: 'INTEGRATION001',
          password: 'newpass123',
          name: 'Integration User',
          department: 'Testing',
          email: 'integration@test.com',
        })
        .expect(201);

      expect(registerResponse.body.success).toBe(true);

      mockPrismaClient.user.findUnique.mockResolvedValue(createdUser);

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          userId: 'INTEGRATION001',
          password: 'newpass123',
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.user.userId).toBe('INTEGRATION001');
    });

    test('should verify user after registration', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValueOnce(null);

      const createdUser = {
        id: 11,
        userId: 'VERIFY001',
        password: await bcrypt.hash('password', 10),
        name: 'Verify User',
        department: 'Testing',
        email: 'verify@test.com',
        createdAt: new Date(),
      };

      mockPrismaClient.user.create.mockResolvedValue(createdUser);

      await request(app)
        .post('/api/auth/register')
        .send({
          userId: 'VERIFY001',
          password: 'password',
          name: 'Verify User',
          department: 'Testing',
          email: 'verify@test.com',
        })
        .expect(201);

      mockPrismaClient.user.findUnique.mockResolvedValue({
        userId: createdUser.userId,
        name: createdUser.name,
        department: createdUser.department,
        email: createdUser.email,
        createdAt: createdUser.createdAt,
      });

      const verifyResponse = await request(app)
        .get('/api/auth/verify/VERIFY001')
        .expect(200);

      expect(verifyResponse.body.success).toBe(true);
      expect(verifyResponse.body.user.userId).toBe('VERIFY001');
    });
  });
});

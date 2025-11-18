import express from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../prismaClient.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { userId, password, name, department, email } = req.body;

    if (!userId || !password || !name) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['userId', 'password', 'name']
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { userId }
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'User already exists',
        message: 'A user with this ID already exists'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        userId,
        password: hashedPassword,
        name,
        department: department || null,
        email: email || null
      }
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        userId: user.userId,
        name: user.name,
        department: user.department,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Registration failed',
      message: error.message
    });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { userId, password } = req.body;

    if (!userId || !password) {
      return res.status(400).json({
        error: 'Missing credentials',
        message: 'Please provide both userId and password'
      });
    }

    const user = await prisma.user.findUnique({
      where: { userId }
    });

    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'User ID or password is incorrect'
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'User ID or password is incorrect'
      });
    }

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        userId: user.userId,
        name: user.name,
        department: user.department,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: error.message
    });
  }
});

router.get('/verify/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { userId },
      select: {
        userId: true,
        name: true,
        department: true,
        email: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'No user exists with this ID'
      });
    }

    res.json({
      success: true,
      user: user
    });

  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({
      error: 'Verification failed',
      message: error.message
    });
  }
});

export default router;

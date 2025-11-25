import express from 'express';
import bcrypt from 'bcryptjs';
import QRCode from 'qrcode';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from '../prismaClient.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { readLimiter, userOperationsLimiter } from '../middleware/rateLimiter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

async function generateUserQRCode(userId) {
  const qrDir = path.join(__dirname, '..', 'uploads', 'qrcodes');
  await fs.mkdir(qrDir, { recursive: true });

  const qrPath = path.join(qrDir, `${userId}.png`);
  await QRCode.toFile(qrPath, userId, {
    width: 300,
    margin: 2,
    errorCorrectionLevel: 'H'
  });

  return `/qrcodes/${userId}.png`;
}

// Get all users (Admin/Staff only)
router.get('/', readLimiter, authenticateToken, authorizeRoles('ADMIN', 'STAFF'), async (req, res) => {
  try {
    const { role, status, department, search, page = 1, limit = 50 } = req.query;

    const whereClause = {};
    
    if (role) whereClause.role = role;
    if (status) whereClause.status = status;
    if (department) whereClause.department = { contains: department, mode: 'insensitive' };
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { userId: { contains: search, mode: 'insensitive' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          userId: true,
          idNumber: true,
          name: true,
          email: true,
          role: true,
          department: true,
          contactNumber: true,
          gender: true,
          dateOfBirth: true,
          status: true,
          avatar: true,
          lastLogin: true,
          createdAt: true,
          _count: {
            select: {
              files: true,
              transactions: true,
              requests: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.user.count({ where: whereClause })
    ]);

    res.json({
      message: 'Users retrieved successfully',
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      error: 'Failed to retrieve users',
      message: error.message
    });
  }
});

// Get user by ID
router.get('/:id', readLimiter, authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Allow users to view their own profile or admins/staff to view any profile
    const isOwnProfile = req.user.userId === id;
    const isAuthorized = isOwnProfile || ['ADMIN', 'STAFF'].includes(req.user.role);

    if (!isAuthorized) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only view your own profile'
      });
    }

    const user = await prisma.user.findUnique({
      where: { userId: id },
      select: {
        id: true,
        userId: true,
        idNumber: true,
        name: true,
        email: true,
        role: true,
        department: true,
        contactNumber: true,
        gender: true,
        dateOfBirth: true,
        status: true,
        avatar: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            files: true,
            transactions: true,
            requests: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'No user found with that ID'
      });
    }

    res.json({
      message: 'User retrieved successfully',
      user
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Failed to retrieve user',
      message: error.message
    });
  }
});

// Create new user (Admin only)
router.post('/', userOperationsLimiter, authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const {
      userId,
      name,
      email,
      password,
      role = 'STUDENT',
      department,
      contactNumber,
      gender,
      dateOfBirth,
      status = 'ACTIVE'
    } = req.body;

    // Validation
    if (!userId || !name) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'userId and name are required'
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { userId },
          ...(email ? [{ email }] : [])
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({
        error: 'User already exists',
        message: 'A user with that ID or email already exists'
      });
    }

    // Hash password if provided
    let hashedPassword = null;
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({
          error: 'Invalid password',
          message: 'Password must be at least 6 characters long'
        });
      }
      hashedPassword = await bcrypt.hash(password, 10);
    }

    let finalAvatar = await generateUserQRCode(userId);
    if (req.body.avatar) {
      finalAvatar = req.body.avatar;
    }

    const newUser = await prisma.user.create({
      data: {
        userId,
        idNumber: req.body.idNumber || null,
        name,
        email,
        password: hashedPassword,
        role,
        department,
        contactNumber,
        gender,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        status,
        avatar: finalAvatar
      },
      select: {
        id: true,
        userId: true,
        idNumber: true,
        name: true,
        email: true,
        role: true,
        department: true,
        contactNumber: true,
        gender: true,
        dateOfBirth: true,
        status: true,
        avatar: true,
        createdAt: true
      }
    });

    res.status(201).json({
      message: 'User created successfully',
      user: newUser
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      error: 'Failed to create user',
      message: error.message
    });
  }
});

// Update user (Admin or own profile)
router.put('/:id', userOperationsLimiter, authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const numericId = !isNaN(id) ? parseInt(id) : null;
    const whereClause = numericId ? { id: numericId } : { userId: id };

    const existingUser = await prisma.user.findFirst({ where: whereClause });

    if (!existingUser) {
      return res.status(404).json({
        error: 'User not found',
        message: 'No user found with that ID'
      });
    }

    const isOwnProfile = req.user.userId === existingUser.userId;
    const isAdmin = req.user.role === 'ADMIN';

    if (!isOwnProfile && !isAdmin) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only update your own profile'
      });
    }

    const {
      name,
      email,
      role,
      department,
      contactNumber,
      gender,
      dateOfBirth,
      status,
      avatar,
      idNumber,
      profilePicture
    } = req.body;

    const updateData = {};

    if (name) updateData.name = name;
    if (contactNumber !== undefined) updateData.contactNumber = contactNumber;
    if (gender) updateData.gender = gender;
    if (dateOfBirth) updateData.dateOfBirth = new Date(dateOfBirth);
    if (avatar !== undefined) updateData.avatar = avatar;
    if (profilePicture !== undefined) updateData.avatar = profilePicture;
    if (idNumber !== undefined) updateData.idNumber = idNumber;

    if (isAdmin) {
      if (email !== undefined) updateData.email = email;
      if (role) updateData.role = role;
      if (department !== undefined) updateData.department = department;
      if (status) updateData.status = status;
    }

    const updatedUser = await prisma.user.update({
      where: whereClause,
      data: updateData,
      select: {
        id: true,
        userId: true,
        name: true,
        email: true,
        role: true,
        department: true,
        contactNumber: true,
        gender: true,
        dateOfBirth: true,
        status: true,
        avatar: true,
        idNumber: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      message: 'User updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Update user error:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({
        error: 'User not found',
        message: 'No user found with that ID'
      });
    }

    res.status(500).json({
      error: 'Failed to update user',
      message: error.message
    });
  }
});

// Delete user (Admin only)
router.delete('/:id', userOperationsLimiter, authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (req.user.userId === id) {
      return res.status(400).json({
        error: 'Cannot delete own account',
        message: 'You cannot delete your own account'
      });
    }

    await prisma.user.delete({
      where: { userId: id }
    });

    res.json({
      message: 'User deleted successfully',
      userId: id
    });

  } catch (error) {
    console.error('Delete user error:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({
        error: 'User not found',
        message: 'No user found with that ID'
      });
    }

    res.status(500).json({
      error: 'Failed to delete user',
      message: error.message
    });
  }
});

export default router;

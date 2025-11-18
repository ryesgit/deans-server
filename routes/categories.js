import express from 'express';
import { prisma } from '../prismaClient.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { readLimiter, apiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Get all categories
router.get('/', readLimiter, async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { files: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json({
      message: 'Categories retrieved successfully',
      count: categories.length,
      categories: categories.map(c => ({
        id: c.id,
        name: c.name,
        description: c.description,
        color: c.color,
        icon: c.icon,
        fileCount: c._count.files,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt
      }))
    });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      error: 'Failed to retrieve categories',
      message: error.message
    });
  }
});

// Get category by ID
router.get('/:id', readLimiter, async (req, res) => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id: parseInt(id) },
      include: {
        files: {
          include: {
            user: {
              select: {
                name: true,
                department: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!category) {
      return res.status(404).json({
        error: 'Category not found',
        message: 'No category found with that ID'
      });
    }

    res.json({
      message: 'Category retrieved successfully',
      category
    });

  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({
      error: 'Failed to retrieve category',
      message: error.message
    });
  }
});

// Create category (Admin/Staff only)
router.post('/', apiLimiter, authenticateToken, authorizeRoles('ADMIN', 'STAFF'), async (req, res) => {
  try {
    const { name, description, color, icon } = req.body;

    if (!name) {
      return res.status(400).json({
        error: 'Name required',
        message: 'Category name is required'
      });
    }

    // Check if category already exists
    const existing = await prisma.category.findUnique({
      where: { name }
    });

    if (existing) {
      return res.status(400).json({
        error: 'Category exists',
        message: 'A category with that name already exists'
      });
    }

    const category = await prisma.category.create({
      data: {
        name,
        description,
        color,
        icon
      }
    });

    res.status(201).json({
      message: 'Category created successfully',
      category
    });

  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({
      error: 'Failed to create category',
      message: error.message
    });
  }
});

// Update category (Admin/Staff only)
router.put('/:id', apiLimiter, authenticateToken, authorizeRoles('ADMIN', 'STAFF'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, color, icon } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (color !== undefined) updateData.color = color;
    if (icon !== undefined) updateData.icon = icon;

    const category = await prisma.category.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    res.json({
      message: 'Category updated successfully',
      category
    });

  } catch (error) {
    console.error('Update category error:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({
        error: 'Category not found',
        message: 'No category found with that ID'
      });
    }

    res.status(500).json({
      error: 'Failed to update category',
      message: error.message
    });
  }
});

// Delete category (Admin only)
router.delete('/:id', apiLimiter, authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category has files
    const category = await prisma.category.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: { files: true }
        }
      }
    });

    if (!category) {
      return res.status(404).json({
        error: 'Category not found',
        message: 'No category found with that ID'
      });
    }

    if (category._count.files > 0) {
      return res.status(400).json({
        error: 'Category in use',
        message: `Cannot delete category with ${category._count.files} files. Please reassign files first.`
      });
    }

    await prisma.category.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      message: 'Category deleted successfully',
      categoryId: parseInt(id)
    });

  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      error: 'Failed to delete category',
      message: error.message
    });
  }
});

export default router;

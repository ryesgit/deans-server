import express from 'express';
import { prisma } from '../prismaClient.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { readLimiter, apiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

const parseOptionalInteger = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsedValue = parseInt(value, 10);
  return Number.isNaN(parsedValue) ? NaN : parsedValue;
};

const serializeCategory = (category) => {
  const fallbackFile = Array.isArray(category.files) ? category.files[0] : null;
  const row = category.rowPosition ?? fallbackFile?.rowPosition ?? null;
  const column = category.columnPosition ?? fallbackFile?.columnPosition ?? null;
  const folderNumber = category.folderNumber ?? fallbackFile?.folderNumber ?? null;

  return {
    id: category.id,
    name: category.name,
    description: category.description,
    color: category.color,
    icon: category.icon,
    folderNumber,
    row,
    column,
    fileCount: category._count?.files ?? category.files?.length ?? 0,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
    ...(category.files ? { files: category.files } : {})
  };
};

// Get all categories
router.get('/', readLimiter, async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { files: true }
        },
        files: {
          select: {
            folderNumber: true,
            rowPosition: true,
            columnPosition: true
          },
          orderBy: { createdAt: 'asc' },
          take: 1
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json({
      message: 'Categories retrieved successfully',
      count: categories.length,
      categories: categories.map(serializeCategory)
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
      category: serializeCategory(category)
    });

  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({
      error: 'Failed to retrieve category',
      message: error.message
    });
  }
});

// Create category (Admin/Staff/Faculty only)
router.post('/', apiLimiter, authenticateToken, authorizeRoles('ADMIN', 'STAFF', 'FACULTY'), async (req, res) => {
  try {
    const { name, description, color, icon, folderNumber, row, column } = req.body;

    if (!name) {
      return res.status(400).json({
        error: 'Name required',
        message: 'Category name is required'
      });
    }

    const parsedRow = parseOptionalInteger(row);
    const parsedColumn = parseOptionalInteger(column);

    if (Number.isNaN(parsedRow) || Number.isNaN(parsedColumn)) {
      return res.status(400).json({
        error: 'Invalid location',
        message: 'Row and column must be whole numbers'
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
        icon,
        folderNumber: folderNumber || null,
        rowPosition: parsedRow,
        columnPosition: parsedColumn
      }
    });

    res.status(201).json({
      message: 'Category created successfully',
      category: serializeCategory(category)
    });

  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({
      error: 'Failed to create category',
      message: error.message
    });
  }
});

// Update category (Admin/Staff/Faculty only)
router.put('/:id', apiLimiter, authenticateToken, authorizeRoles('ADMIN', 'STAFF', 'FACULTY'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, color, icon, folderNumber, row, column } = req.body;

    const parsedRow = parseOptionalInteger(row);
    const parsedColumn = parseOptionalInteger(column);

    if (Number.isNaN(parsedRow) || Number.isNaN(parsedColumn)) {
      return res.status(400).json({
        error: 'Invalid location',
        message: 'Row and column must be whole numbers'
      });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (color !== undefined) updateData.color = color;
    if (icon !== undefined) updateData.icon = icon;
    if (folderNumber !== undefined) updateData.folderNumber = folderNumber || null;
    if (row !== undefined) updateData.rowPosition = parsedRow;
    if (column !== undefined) updateData.columnPosition = parsedColumn;

    const category = await prisma.category.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    res.json({
      message: 'Category updated successfully',
      category: serializeCategory(category)
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

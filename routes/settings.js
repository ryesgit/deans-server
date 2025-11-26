import express from 'express';
import { prisma } from '../prismaClient.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { readLimiter, apiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Get all settings
router.get('/', readLimiter, authenticateToken, authorizeRoles('ADMIN', 'STAFF', 'FACULTY'), async (req, res) => {
  try {
    const { category } = req.query;

    const whereClause = category ? { category } : {};

    const settings = await prisma.settings.findMany({
      where: whereClause,
      orderBy: { key: 'asc' }
    });

    // Convert to key-value object for easier frontend consumption
    const settingsObject = settings.reduce((acc, setting) => {
      acc[setting.key] = {
        value: setting.value,
        category: setting.category,
        updatedAt: setting.updatedAt
      };
      return acc;
    }, {});

    res.json({
      message: 'Settings retrieved successfully',
      count: settings.length,
      settings: settingsObject,
      raw: settings
    });

  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      error: 'Failed to retrieve settings',
      message: error.message
    });
  }
});

// Get setting by key
router.get('/:key', readLimiter, authenticateToken, authorizeRoles('ADMIN', 'STAFF', 'FACULTY'), async (req, res) => {
  try {
    const { key } = req.params;

    const setting = await prisma.settings.findUnique({
      where: { key }
    });

    if (!setting) {
      return res.status(404).json({
        error: 'Setting not found',
        message: 'No setting found with that key'
      });
    }

    res.json({
      message: 'Setting retrieved successfully',
      setting
    });

  } catch (error) {
    console.error('Get setting error:', error);
    res.status(500).json({
      error: 'Failed to retrieve setting',
      message: error.message
    });
  }
});

// Create or update setting (upsert)
router.put('/', apiLimiter, authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const { key, value, category } = req.body;

    if (!key || !value) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'key and value are required'
      });
    }

    const setting = await prisma.settings.upsert({
      where: { key },
      update: {
        value,
        category
      },
      create: {
        key,
        value,
        category
      }
    });

    res.json({
      message: 'Setting saved successfully',
      setting
    });

  } catch (error) {
    console.error('Save setting error:', error);
    res.status(500).json({
      error: 'Failed to save setting',
      message: error.message
    });
  }
});

// Bulk update settings
router.put('/bulk', apiLimiter, authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const { settings } = req.body;

    if (!settings || !Array.isArray(settings)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'settings array is required'
      });
    }

    const results = await Promise.all(
      settings.map(({ key, value, category }) =>
        prisma.settings.upsert({
          where: { key },
          update: { value, category },
          create: { key, value, category }
        })
      )
    );

    res.json({
      message: 'Settings updated successfully',
      count: results.length,
      settings: results
    });

  } catch (error) {
    console.error('Bulk update settings error:', error);
    res.status(500).json({
      error: 'Failed to update settings',
      message: error.message
    });
  }
});

// Delete setting
router.delete('/:key', apiLimiter, authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const { key } = req.params;

    await prisma.settings.delete({
      where: { key }
    });

    res.json({
      message: 'Setting deleted successfully',
      key
    });

  } catch (error) {
    console.error('Delete setting error:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({
        error: 'Setting not found',
        message: 'No setting found with that key'
      });
    }

    res.status(500).json({
      error: 'Failed to delete setting',
      message: error.message
    });
  }
});

export default router;

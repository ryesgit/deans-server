import express from 'express';
import { prisma } from '../prismaClient.js';
import { authenticateToken } from '../middleware/auth.js';
import { readLimiter, apiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Get user notifications
router.get('/', readLimiter, authenticateToken, async (req, res) => {
  try {
    const { unreadOnly, page = 1, limit = 50 } = req.query;

    const whereClause = { userId: req.user.userId };
    
    if (unreadOnly === 'true') {
      whereClause.isRead = false;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.notification.count({ where: whereClause }),
      prisma.notification.count({
        where: {
          userId: req.user.userId,
          isRead: false
        }
      })
    ]);

    res.json({
      message: 'Notifications retrieved successfully',
      notifications,
      unreadCount,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      error: 'Failed to retrieve notifications',
      message: error.message
    });
  }
});

// Get notification by ID
router.get('/:id', readLimiter, authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.findUnique({
      where: { id: parseInt(id) }
    });

    if (!notification) {
      return res.status(404).json({
        error: 'Notification not found',
        message: 'No notification found with that ID'
      });
    }

    // Check if notification belongs to user
    if (notification.userId !== req.user.userId) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only view your own notifications'
      });
    }

    res.json({
      message: 'Notification retrieved successfully',
      notification
    });

  } catch (error) {
    console.error('Get notification error:', error);
    res.status(500).json({
      error: 'Failed to retrieve notification',
      message: error.message
    });
  }
});

// Mark notification as read
router.put('/:id/read', apiLimiter, authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.findUnique({
      where: { id: parseInt(id) }
    });

    if (!notification) {
      return res.status(404).json({
        error: 'Notification not found',
        message: 'No notification found with that ID'
      });
    }

    if (notification.userId !== req.user.userId) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only update your own notifications'
      });
    }

    const updatedNotification = await prisma.notification.update({
      where: { id: parseInt(id) },
      data: { isRead: true }
    });

    res.json({
      message: 'Notification marked as read',
      notification: updatedNotification
    });

  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({
      error: 'Failed to mark notification as read',
      message: error.message
    });
  }
});

// Mark all notifications as read
router.put('/read-all', apiLimiter, authenticateToken, async (req, res) => {
  try {
    const result = await prisma.notification.updateMany({
      where: {
        userId: req.user.userId,
        isRead: false
      },
      data: { isRead: true }
    });

    res.json({
      message: 'All notifications marked as read',
      count: result.count
    });

  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({
      error: 'Failed to mark all notifications as read',
      message: error.message
    });
  }
});

// Delete notification
router.delete('/:id', apiLimiter, authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.findUnique({
      where: { id: parseInt(id) }
    });

    if (!notification) {
      return res.status(404).json({
        error: 'Notification not found',
        message: 'No notification found with that ID'
      });
    }

    if (notification.userId !== req.user.userId) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only delete your own notifications'
      });
    }

    await prisma.notification.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      message: 'Notification deleted successfully',
      notificationId: parseInt(id)
    });

  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      error: 'Failed to delete notification',
      message: error.message
    });
  }
});

// Delete all read notifications
router.delete('/clear-read', apiLimiter, authenticateToken, async (req, res) => {
  try {
    const result = await prisma.notification.deleteMany({
      where: {
        userId: req.user.userId,
        isRead: true
      }
    });

    res.json({
      message: 'Read notifications cleared successfully',
      count: result.count
    });

  } catch (error) {
    console.error('Clear read notifications error:', error);
    res.status(500).json({
      error: 'Failed to clear read notifications',
      message: error.message
    });
  }
});

export default router;

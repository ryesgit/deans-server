import express from 'express';
import { prisma } from '../prismaClient.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { readLimiter, apiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Get all requests
router.get('/', readLimiter, authenticateToken, async (req, res) => {
  try {
    const { status, type, userId, page = 1, limit = 50 } = req.query;
    
    const isAdminOrStaff = ['ADMIN', 'STAFF'].includes(req.user.role);
    
    const whereClause = {};
    
    // Regular users can only see their own requests
    if (!isAdminOrStaff) {
      whereClause.userId = req.user.userId;
    } else if (userId) {
      // Admin/Staff can filter by userId
      whereClause.userId = userId;
    }
    
    if (status) whereClause.status = status;
    if (type) whereClause.type = type;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [requests, total] = await Promise.all([
      prisma.request.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              name: true,
              email: true,
              department: true,
              role: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.request.count({ where: whereClause })
    ]);

    res.json({
      message: 'Requests retrieved successfully',
      requests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({
      error: 'Failed to retrieve requests',
      message: error.message
    });
  }
});

// Get request by ID
router.get('/:id', readLimiter, authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const request = await prisma.request.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            department: true,
            role: true
          }
        }
      }
    });

    if (!request) {
      return res.status(404).json({
        error: 'Request not found',
        message: 'No request found with that ID'
      });
    }

    // Check authorization
    const isOwner = request.userId === req.user.userId;
    const isAdminOrStaff = ['ADMIN', 'STAFF'].includes(req.user.role);

    if (!isOwner && !isAdminOrStaff) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only view your own requests'
      });
    }

    res.json({
      message: 'Request retrieved successfully',
      request
    });

  } catch (error) {
    console.error('Get request error:', error);
    res.status(500).json({
      error: 'Failed to retrieve request',
      message: error.message
    });
  }
});

// Create new request
router.post('/', apiLimiter, authenticateToken, async (req, res) => {
  try {
    const {
      type = 'FILE_ACCESS',
      title,
      description,
      fileId,
      priority = 'normal'
    } = req.body;

    if (!title) {
      return res.status(400).json({
        error: 'Title required',
        message: 'Request title is required'
      });
    }

    const request = await prisma.request.create({
      data: {
        userId: req.user.userId,
        type,
        title,
        description,
        fileId: fileId ? parseInt(fileId) : null,
        priority,
        status: 'PENDING'
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            department: true
          }
        }
      }
    });

    // Create notification for admins/staff
    const adminUsers = await prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'STAFF'] },
        status: 'ACTIVE'
      },
      select: { userId: true }
    });

    if (adminUsers.length > 0) {
      await prisma.notification.createMany({
        data: adminUsers.map(admin => ({
          userId: admin.userId,
          type: 'REQUEST',
          title: 'New Request',
          message: `${req.user.name} submitted a new request: ${title}`,
          link: `/requests/${request.id}`
        }))
      });
    }

    res.status(201).json({
      message: 'Request created successfully',
      request
    });

  } catch (error) {
    console.error('Create request error:', error);
    res.status(500).json({
      error: 'Failed to create request',
      message: error.message
    });
  }
});

// Update request (owner can update if pending, admin/staff can always update)
router.put('/:id', apiLimiter, authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, type, priority } = req.body;

    const request = await prisma.request.findUnique({
      where: { id: parseInt(id) }
    });

    if (!request) {
      return res.status(404).json({
        error: 'Request not found',
        message: 'No request found with that ID'
      });
    }

    const isOwner = request.userId === req.user.userId;
    const isAdminOrStaff = ['ADMIN', 'STAFF'].includes(req.user.role);

    if (!isOwner && !isAdminOrStaff) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only update your own requests'
      });
    }

    // Owner can only update if status is PENDING
    if (isOwner && !isAdminOrStaff && request.status !== 'PENDING') {
      return res.status(400).json({
        error: 'Cannot update',
        message: 'Cannot update request after it has been processed'
      });
    }

    const updateData = {};
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (type && isAdminOrStaff) updateData.type = type;
    if (priority && isAdminOrStaff) updateData.priority = priority;

    const updatedRequest = await prisma.request.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        user: {
          select: {
            name: true,
            email: true,
            department: true
          }
        }
      }
    });

    res.json({
      message: 'Request updated successfully',
      request: updatedRequest
    });

  } catch (error) {
    console.error('Update request error:', error);
    res.status(500).json({
      error: 'Failed to update request',
      message: error.message
    });
  }
});

// Approve request (Admin/Staff only)
router.put('/:id/approve', apiLimiter, authenticateToken, authorizeRoles('ADMIN', 'STAFF'), async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const request = await prisma.request.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: {
          select: {
            userId: true,
            name: true
          }
        }
      }
    });

    if (!request) {
      return res.status(404).json({
        error: 'Request not found',
        message: 'No request found with that ID'
      });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({
        error: 'Invalid status',
        message: 'Only pending requests can be approved'
      });
    }

    const updatedRequest = await prisma.request.update({
      where: { id: parseInt(id) },
      data: {
        status: 'APPROVED',
        approvedBy: req.user.userId,
        approvedAt: new Date()
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            department: true
          }
        }
      }
    });

    // Create notification for request owner
    await prisma.notification.create({
      data: {
        userId: request.user.userId,
        type: 'SUCCESS',
        title: 'Request Approved',
        message: `Your request "${request.title}" has been approved by ${req.user.name}${notes ? `: ${notes}` : ''}`,
        link: `/requests/${request.id}`
      }
    });

    res.json({
      message: 'Request approved successfully',
      request: updatedRequest
    });

  } catch (error) {
    console.error('Approve request error:', error);
    res.status(500).json({
      error: 'Failed to approve request',
      message: error.message
    });
  }
});

// Decline request (Admin/Staff only)
router.put('/:id/decline', apiLimiter, authenticateToken, authorizeRoles('ADMIN', 'STAFF'), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const request = await prisma.request.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: {
          select: {
            userId: true,
            name: true
          }
        }
      }
    });

    if (!request) {
      return res.status(404).json({
        error: 'Request not found',
        message: 'No request found with that ID'
      });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({
        error: 'Invalid status',
        message: 'Only pending requests can be declined'
      });
    }

    const updatedRequest = await prisma.request.update({
      where: { id: parseInt(id) },
      data: {
        status: 'DECLINED',
        approvedBy: req.user.userId,
        approvedAt: new Date()
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            department: true
          }
        }
      }
    });

    // Create notification for request owner
    await prisma.notification.create({
      data: {
        userId: request.user.userId,
        type: 'WARNING',
        title: 'Request Declined',
        message: `Your request "${request.title}" has been declined by ${req.user.name}${reason ? `: ${reason}` : ''}`,
        link: `/requests/${request.id}`
      }
    });

    res.json({
      message: 'Request declined successfully',
      request: updatedRequest
    });

  } catch (error) {
    console.error('Decline request error:', error);
    res.status(500).json({
      error: 'Failed to decline request',
      message: error.message
    });
  }
});

// Delete request
router.delete('/:id', apiLimiter, authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const request = await prisma.request.findUnique({
      where: { id: parseInt(id) }
    });

    if (!request) {
      return res.status(404).json({
        error: 'Request not found',
        message: 'No request found with that ID'
      });
    }

    const isOwner = request.userId === req.user.userId;
    const isAdmin = req.user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only delete your own requests'
      });
    }

    await prisma.request.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      message: 'Request deleted successfully',
      requestId: parseInt(id)
    });

  } catch (error) {
    console.error('Delete request error:', error);
    res.status(500).json({
      error: 'Failed to delete request',
      message: error.message
    });
  }
});

export default router;

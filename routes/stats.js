import express from 'express';
import { prisma } from '../prismaClient.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { readLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Get dashboard statistics
router.get('/dashboard', readLimiter, authenticateToken, async (req, res) => {
  try {
    const isAdminOrStaff = ['ADMIN', 'STAFF'].includes(req.user.role);
    const userId = isAdminOrStaff ? null : req.user.userId;

    // Get counts
    const [
      totalUsers,
      totalFiles,
      availableFiles,
      retrievedFiles,
      totalRequests,
      pendingRequests,
      approvedRequests,
      totalTransactions,
      departments,
      recentActivity,
      userStats
    ] = await Promise.all([
      // Total users (admin/staff only)
      isAdminOrStaff ? prisma.user.count() : 0,
      
      // Total files
      userId 
        ? prisma.file.count({ where: { userId } })
        : prisma.file.count(),
      
      // Available files
      userId
        ? prisma.file.count({ where: { userId, status: 'AVAILABLE' } })
        : prisma.file.count({ where: { status: 'AVAILABLE' } }),
      
      // Retrieved files
      userId
        ? prisma.file.count({ where: { userId, status: 'RETRIEVED' } })
        : prisma.file.count({ where: { status: 'RETRIEVED' } }),
      
      // Total requests
      userId
        ? prisma.request.count({ where: { userId } })
        : prisma.request.count(),
      
      // Pending requests
      userId
        ? prisma.request.count({ where: { userId, status: 'PENDING' } })
        : prisma.request.count({ where: { status: 'PENDING' } }),
      
      // Approved requests
      userId
        ? prisma.request.count({ where: { userId, status: 'APPROVED' } })
        : prisma.request.count({ where: { status: 'APPROVED' } }),
      
      // Total transactions
      userId
        ? prisma.transaction.count({ where: { userId } })
        : prisma.transaction.count(),
      
      // Unique departments (admin/staff only)
      isAdminOrStaff
        ? prisma.user.groupBy({
            by: ['department'],
            _count: { department: true },
            where: { department: { not: null } }
          })
        : [],
      
      // Recent activity (last 10 transactions)
      prisma.transaction.findMany({
        where: userId ? { userId } : {},
        include: {
          file: {
            select: { filename: true }
          },
          user: {
            select: { name: true, department: true, avatar: true }
          }
        },
        orderBy: { timestamp: 'desc' },
        take: 10
      }),

      // User-specific stats
      userId
        ? prisma.user.findUnique({
            where: { userId },
            select: {
              name: true,
              role: true,
              department: true,
              lastLogin: true
            }
          })
        : null
    ]);

    // Calculate today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayFiles, todayReturns] = await Promise.all([
      prisma.file.count({
        where: {
          ...(userId ? { userId } : {}),
          createdAt: { gte: today }
        }
      }),
      prisma.transaction.count({
        where: {
          ...(userId ? { userId } : {}),
          type: 'RETURN',
          timestamp: { gte: today }
        }
      })
    ]);

    // Get overdue requests (requests that were approved but not returned by due date)
    const overdueRequests = await prisma.request.count({
      where: {
        ...(userId ? { userId } : {}),
        status: 'APPROVED',
        // Add logic for overdue check if you have a dueDate field
      }
    });

    // Get resolved overdue (could be declined or cancelled after being overdue)
    const resolvedOverdue = await prisma.request.count({
      where: {
        ...(userId ? { userId } : {}),
        status: { in: ['DECLINED', 'CANCELLED'] }
      }
    });

    // Get recent requests (exclude cancelled)
    const recentRequests = await prisma.request.findMany({
      where: {
        ...(userId ? { userId } : {}),
        status: { not: 'CANCELLED' }
      },
      include: {
        user: {
          select: { name: true, department: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Format response to match frontend expectations
    const stats = {
      // Frontend expects these exact property names
      files: {
        total: totalFiles,
        newlyAdded: todayFiles
      },
      borrowing: {
        activeBorrowed: retrievedFiles,
        returnedToday: todayReturns
      },
      approvals: {
        pending: pendingRequests,
        approved: approvedRequests
      },
      overdueFiles: {
        overdue: overdueRequests,
        resolved: resolvedOverdue
      },
      // Legacy structure for compatibility
      overview: {
        totalUsers: isAdminOrStaff ? totalUsers : null,
        totalFiles,
        availableFiles,
        retrievedFiles,
        totalRequests,
        pendingRequests,
        approvedRequests,
        totalTransactions
      },
      today: {
        newFiles: todayFiles,
        returns: todayReturns
      },
      filesByStatus: {
        available: availableFiles,
        retrieved: retrievedFiles,
        checkedOut: await prisma.file.count({
          where: {
            ...(userId ? { userId } : {}),
            status: 'CHECKED_OUT'
          }
        }),
        maintenance: await prisma.file.count({
          where: {
            ...(userId ? { userId } : {}),
            status: 'MAINTENANCE'
          }
        }),
        missing: await prisma.file.count({
          where: {
            ...(userId ? { userId } : {}),
            status: 'MISSING'
          }
        })
      },
      requestsByStatus: {
        pending: pendingRequests,
        approved: approvedRequests,
        declined: await prisma.request.count({
          where: {
            ...(userId ? { userId } : {}),
            status: 'DECLINED'
          }
        }),
        cancelled: await prisma.request.count({
          where: {
            ...(userId ? { userId } : {}),
            status: 'CANCELLED'
          }
        })
      },
      departments: isAdminOrStaff ? departments.map(d => ({
        name: d.department,
        count: d._count.department
      })) : null,
      recentActivity: recentActivity.map(t => ({
        id: t.id,
        type: t.type,
        filename: t.file?.filename,
        userName: t.user?.name,
        department: t.user?.department,
        avatar: t.user?.avatar,
        timestamp: t.timestamp,
        notes: t.notes
      })),
      recentRequests: recentRequests.map(r => ({
        id: r.id,
        title: r.title,
        description: r.description,
        type: r.type,
        status: r.status,
        priority: r.priority,
        userName: r.user?.name,
        department: r.user?.department,
        createdAt: r.createdAt,
        approvedAt: r.approvedAt,
        approvedBy: r.approvedBy
      })),
      user: userStats
    };

    res.json({
      message: 'Dashboard statistics retrieved successfully',
      stats
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      error: 'Failed to retrieve dashboard statistics',
      message: error.message
    });
  }
});

// Get recent activity log
router.get('/activity-log', readLimiter, authenticateToken, async (req, res) => {
  try {
    const isAdminOrStaff = ['ADMIN', 'STAFF'].includes(req.user.role);
    const userId = isAdminOrStaff ? null : req.user.userId;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;

    const recentActivity = await prisma.transaction.findMany({
      where: userId ? { userId } : {},
      include: {
        file: {
          select: { filename: true }
        },
        user: {
          select: { name: true, department: true, avatar: true }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: limit
    });

    res.json({
      message: 'Activity log retrieved successfully',
      activityLog: recentActivity.map(t => ({
        id: t.id,
        type: t.type,
        filename: t.file?.filename,
        userName: t.user?.name,
        department: t.user?.department,
        avatar: t.user?.avatar,
        timestamp: t.timestamp,
        notes: t.notes
      }))
    });

  } catch (error) {
    console.error('Activity log error:', error);
    res.status(500).json({
      error: 'Failed to retrieve activity log',
      message: error.message
    });
  }
});

// Get file statistics
router.get('/files', readLimiter, authenticateToken, authorizeRoles('ADMIN', 'STAFF'), async (req, res) => {
  try {
    const filesByStatus = await prisma.file.groupBy({
      by: ['status'],
      _count: { status: true }
    });

    const filesByCategory = await prisma.file.groupBy({
      by: ['categoryId'],
      _count: { categoryId: true }
    });

    const filesByDepartment = await prisma.file.groupBy({
      by: ['userId'],
      _count: { userId: true },
      _max: { createdAt: true }
    });

    res.json({
      message: 'File statistics retrieved successfully',
      stats: {
        byStatus: filesByStatus.map(f => ({
          status: f.status,
          count: f._count.status
        })),
        byCategory: filesByCategory,
        totalDepartments: filesByDepartment.length
      }
    });

  } catch (error) {
    console.error('File stats error:', error);
    res.status(500).json({
      error: 'Failed to retrieve file statistics',
      message: error.message
    });
  }
});

// Get user statistics
router.get('/users', readLimiter, authenticateToken, authorizeRoles('ADMIN', 'STAFF'), async (req, res) => {
  try {
    const usersByRole = await prisma.user.groupBy({
      by: ['role'],
      _count: { role: true }
    });

    const usersByStatus = await prisma.user.groupBy({
      by: ['status'],
      _count: { status: true }
    });

    const usersByDepartment = await prisma.user.groupBy({
      by: ['department'],
      _count: { department: true },
      where: { department: { not: null } }
    });

    res.json({
      message: 'User statistics retrieved successfully',
      stats: {
        byRole: usersByRole.map(u => ({
          role: u.role,
          count: u._count.role
        })),
        byStatus: usersByStatus.map(u => ({
          status: u.status,
          count: u._count.status
        })),
        byDepartment: usersByDepartment.map(u => ({
          department: u.department,
          count: u._count.department
        }))
      }
    });

  } catch (error) {
    console.error('User stats error:', error);
    res.status(500).json({
      error: 'Failed to retrieve user statistics',
      message: error.message
    });
  }
});

export default router;
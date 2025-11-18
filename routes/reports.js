import express from 'express';
import { prisma } from '../prismaClient.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Generate comprehensive report
router.get('/generate', authenticateToken, authorizeRoles('ADMIN', 'STAFF'), async (req, res) => {
  try {
    const {
      reportType = 'all',
      startDate,
      endDate,
      department,
      userId,
      fileStatus,
      requestStatus
    } = req.query;

    const dateFilter = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    const report = {
      generatedAt: new Date().toISOString(),
      generatedBy: req.user.name,
      filters: {
        reportType,
        startDate,
        endDate,
        department,
        userId,
        fileStatus,
        requestStatus
      },
      data: {}
    };

    // User statistics
    if (reportType === 'all' || reportType === 'users') {
      const userFilter = {};
      if (department) userFilter.department = department;

      report.data.users = {
        total: await prisma.user.count({ where: userFilter }),
        byRole: await prisma.user.groupBy({
          by: ['role'],
          _count: { role: true },
          where: userFilter
        }),
        byStatus: await prisma.user.groupBy({
          by: ['status'],
          _count: { status: true },
          where: userFilter
        }),
        byDepartment: await prisma.user.groupBy({
          by: ['department'],
          _count: { department: true },
          where: { ...userFilter, department: { not: null } }
        }),
        recent: await prisma.user.findMany({
          where: {
            ...userFilter,
            ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
          },
          select: {
            userId: true,
            name: true,
            email: true,
            role: true,
            department: true,
            status: true,
            createdAt: true,
            lastLogin: true
          },
          orderBy: { createdAt: 'desc' },
          take: 20
        })
      };
    }

    // File statistics
    if (reportType === 'all' || reportType === 'files') {
      const fileFilter = {};
      if (userId) fileFilter.userId = userId;
      if (fileStatus) fileFilter.status = fileStatus;
      if (department) {
        fileFilter.user = { department };
      }

      report.data.files = {
        total: await prisma.file.count({ where: fileFilter }),
        byStatus: await prisma.file.groupBy({
          by: ['status'],
          _count: { status: true },
          where: fileFilter
        }),
        byCategory: await prisma.file.groupBy({
          by: ['categoryId'],
          _count: { categoryId: true },
          where: fileFilter
        }),
        recent: await prisma.file.findMany({
          where: {
            ...fileFilter,
            ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
          },
          include: {
            user: {
              select: {
                name: true,
                department: true
              }
            },
            category: {
              select: {
                name: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 50
        })
      };
    }

    // Transaction statistics
    if (reportType === 'all' || reportType === 'transactions') {
      const transactionFilter = {};
      if (userId) transactionFilter.userId = userId;
      if (Object.keys(dateFilter).length > 0) {
        transactionFilter.timestamp = dateFilter;
      }

      report.data.transactions = {
        total: await prisma.transaction.count({ where: transactionFilter }),
        byType: await prisma.transaction.groupBy({
          by: ['type'],
          _count: { type: true },
          where: transactionFilter
        }),
        recent: await prisma.transaction.findMany({
          where: transactionFilter,
          include: {
            file: {
              select: {
                filename: true
              }
            },
            user: {
              select: {
                name: true,
                department: true
              }
            }
          },
          orderBy: { timestamp: 'desc' },
          take: 100
        })
      };
    }

    // Request statistics
    if (reportType === 'all' || reportType === 'requests') {
      const requestFilter = {};
      if (userId) requestFilter.userId = userId;
      if (requestStatus) requestFilter.status = requestStatus;
      if (Object.keys(dateFilter).length > 0) {
        requestFilter.createdAt = dateFilter;
      }

      report.data.requests = {
        total: await prisma.request.count({ where: requestFilter }),
        byStatus: await prisma.request.groupBy({
          by: ['status'],
          _count: { status: true },
          where: requestFilter
        }),
        byType: await prisma.request.groupBy({
          by: ['type'],
          _count: { type: true },
          where: requestFilter
        }),
        recent: await prisma.request.findMany({
          where: requestFilter,
          include: {
            user: {
              select: {
                name: true,
                email: true,
                department: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 50
        })
      };
    }

    // Activity summary
    if (reportType === 'all' || reportType === 'activity') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const thisWeek = new Date();
      thisWeek.setDate(thisWeek.getDate() - 7);

      const thisMonth = new Date();
      thisMonth.setMonth(thisMonth.getMonth() - 1);

      report.data.activity = {
        today: {
          files: await prisma.file.count({
            where: { createdAt: { gte: today } }
          }),
          transactions: await prisma.transaction.count({
            where: { timestamp: { gte: today } }
          }),
          requests: await prisma.request.count({
            where: { createdAt: { gte: today } }
          })
        },
        thisWeek: {
          files: await prisma.file.count({
            where: { createdAt: { gte: thisWeek } }
          }),
          transactions: await prisma.transaction.count({
            where: { timestamp: { gte: thisWeek } }
          }),
          requests: await prisma.request.count({
            where: { createdAt: { gte: thisWeek } }
          })
        },
        thisMonth: {
          files: await prisma.file.count({
            where: { createdAt: { gte: thisMonth } }
          }),
          transactions: await prisma.transaction.count({
            where: { timestamp: { gte: thisMonth } }
          }),
          requests: await prisma.request.count({
            where: { createdAt: { gte: thisMonth } }
          })
        }
      };
    }

    res.json({
      message: 'Report generated successfully',
      report
    });

  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({
      error: 'Failed to generate report',
      message: error.message
    });
  }
});

// Get file activity report
router.get('/file-activity', authenticateToken, authorizeRoles('ADMIN', 'STAFF'), async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const transactions = await prisma.transaction.findMany({
      where: {
        timestamp: { gte: startDate }
      },
      include: {
        file: {
          select: {
            filename: true,
            status: true
          }
        },
        user: {
          select: {
            name: true,
            department: true
          }
        }
      },
      orderBy: { timestamp: 'desc' }
    });

    const summary = {
      totalTransactions: transactions.length,
      byType: transactions.reduce((acc, t) => {
        acc[t.type] = (acc[t.type] || 0) + 1;
        return acc;
      }, {}),
      byDepartment: transactions.reduce((acc, t) => {
        const dept = t.user.department || 'Unknown';
        acc[dept] = (acc[dept] || 0) + 1;
        return acc;
      }, {}),
      transactions
    };

    res.json({
      message: 'File activity report generated successfully',
      period: `Last ${days} days`,
      summary
    });

  } catch (error) {
    console.error('File activity report error:', error);
    res.status(500).json({
      error: 'Failed to generate file activity report',
      message: error.message
    });
  }
});

// Get user activity report
router.get('/user-activity/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { days = 30 } = req.query;

    // Check authorization
    const isOwnReport = req.user.userId === userId;
    const isAuthorized = isOwnReport || ['ADMIN', 'STAFF'].includes(req.user.role);

    if (!isAuthorized) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only view your own activity report'
      });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const [user, files, transactions, requests] = await Promise.all([
      prisma.user.findUnique({
        where: { userId },
        select: {
          userId: true,
          name: true,
          email: true,
          role: true,
          department: true
        }
      }),
      prisma.file.findMany({
        where: { userId }
      }),
      prisma.transaction.findMany({
        where: {
          userId,
          timestamp: { gte: startDate }
        },
        include: {
          file: {
            select: {
              filename: true
            }
          }
        },
        orderBy: { timestamp: 'desc' }
      }),
      prisma.request.findMany({
        where: {
          userId,
          createdAt: { gte: startDate }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'No user found with that ID'
      });
    }

    const report = {
      user,
      period: `Last ${days} days`,
      summary: {
        totalFiles: files.length,
        filesByStatus: files.reduce((acc, f) => {
          acc[f.status] = (acc[f.status] || 0) + 1;
          return acc;
        }, {}),
        totalTransactions: transactions.length,
        transactionsByType: transactions.reduce((acc, t) => {
          acc[t.type] = (acc[t.type] || 0) + 1;
          return acc;
        }, {}),
        totalRequests: requests.length,
        requestsByStatus: requests.reduce((acc, r) => {
          acc[r.status] = (acc[r.status] || 0) + 1;
          return acc;
        }, {})
      },
      recentTransactions: transactions.slice(0, 20),
      recentRequests: requests.slice(0, 10)
    };

    res.json({
      message: 'User activity report generated successfully',
      report
    });

  } catch (error) {
    console.error('User activity report error:', error);
    res.status(500).json({
      error: 'Failed to generate user activity report',
      message: error.message
    });
  }
});

export default router;

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

export const initializeDatabase = async () => {
  try {
    await prisma.$connect();
    console.log('✅ PostgreSQL connected successfully');

    await seedDatabase();
    console.log('✅ Database seeded successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
};

const seedDatabase = async () => {
  try {
    const existingUsers = await prisma.user.count();
    if (existingUsers > 0) {
      console.log('📊 Database already seeded, skipping...');
      return;
    }

    // Create admin user with password
    const adminPassword = await bcrypt.hash('admin123', 10);

    const users = await prisma.user.createMany({
      data: [
        {
          userId: 'ADMIN001',
          name: 'Admin User',
          department: 'Administration',
          email: 'admin@pup.edu.ph',
          password: adminPassword,
          role: 'ADMIN',
          status: 'ACTIVE'
        },
        {
          userId: 'PUP001',
          name: 'Juan Dela Cruz',
          department: 'Engineering',
          email: 'juan.delacruz@pup.edu.ph',
          role: 'STUDENT',
          status: 'ACTIVE'
        },
        {
          userId: 'PUP002',
          name: 'Maria Santos',
          department: 'Business Administration',
          email: 'maria.santos@pup.edu.ph',
          role: 'STUDENT',
          status: 'ACTIVE'
        },
        {
          userId: 'PUP003',
          name: 'Jose Rizal',
          department: 'Computer Science',
          email: 'jose.rizal@pup.edu.ph',
          role: 'STUDENT',
          status: 'ACTIVE'
        },
        {
          userId: 'USER001',
          name: 'John Doe',
          department: 'Computer Science',
          email: 'john.doe@pup.edu.ph',
          role: 'STUDENT',
          status: 'ACTIVE'
        },
        {
          userId: 'USER002',
          name: 'Jane Smith',
          department: 'Information Technology',
          email: 'jane.smith@pup.edu.ph',
          role: 'STAFF',
          status: 'ACTIVE'
        },
        {
          userId: 'USER003',
          name: 'Bob Wilson',
          department: 'Computer Engineering',
          email: 'bob.wilson@pup.edu.ph',
          role: 'STUDENT',
          status: 'ACTIVE'
        }
      ],
      skipDuplicates: true
    });

    const files = await prisma.file.createMany({
      data: [
        {
          userId: 'PUP001',
          filename: 'Engineering_Thesis_2024.pdf',
          rowPosition: 1,
          columnPosition: 3,
          shelfNumber: 1
        },
        {
          userId: 'PUP001',
          filename: 'Project_Documentation.pdf',
          rowPosition: 2,
          columnPosition: 1,
          shelfNumber: 1
        },
        {
          userId: 'PUP002',
          filename: 'Business_Plan_Final.pdf',
          rowPosition: 1,
          columnPosition: 5,
          shelfNumber: 1
        },
        {
          userId: 'PUP002',
          filename: 'Marketing_Research.pdf',
          rowPosition: 3,
          columnPosition: 2,
          shelfNumber: 1
        },
        {
          userId: 'PUP003',
          filename: 'Capstone_Project.pdf',
          rowPosition: 2,
          columnPosition: 4,
          shelfNumber: 1
        },
        {
          userId: 'PUP003',
          filename: 'Algorithm_Analysis.pdf',
          rowPosition: 1,
          columnPosition: 1,
          shelfNumber: 1
        },
        {
          userId: 'USER001',
          filename: 'John_Thesis_2024.pdf',
          rowPosition: 2,
          columnPosition: 2,
          shelfNumber: 1
        },
        {
          userId: 'USER003',
          filename: 'Bob_Project_Report.pdf',
          rowPosition: 1,
          columnPosition: 4,
          shelfNumber: 1
        },
        {
          userId: 'USER003',
          filename: 'Bob_Research_Paper.pdf',
          rowPosition: 3,
          columnPosition: 1,
          shelfNumber: 1
        },
        {
          userId: 'ADMIN001',
          filename: 'Administrative_Records.pdf',
          rowPosition: 2,
          columnPosition: 5,
          shelfNumber: 1
        }
      ],
      skipDuplicates: true
    });

    console.log(`👥 Created ${users.count} users`);
    console.log(`📁 Created ${files.count} files`);

  } catch (error) {
    console.error('Seeding error:', error);
  }
};

export const getUserFiles = async (userId) => {
  try {
    const files = await prisma.file.findMany({
      where: { userId },
      include: {
        user: {
          select: {
            name: true,
            department: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return files.map(file => ({
      id: file.id,
      user_id: file.userId,
      filename: file.filename,
      file_path: file.filePath,
      row_position: file.rowPosition,
      column_position: file.columnPosition,
      shelf_number: file.shelfNumber,
      status: file.status,
      created_at: file.createdAt.toISOString(),
      accessed_at: file.accessedAt?.toISOString() || null,
      name: file.user.name,
      department: file.user.department
    }));
  } catch (error) {
    console.error('getUserFiles error:', error);
    throw error;
  }
};

export const checkUserExists = async (userId) => {
  try {
    const user = await prisma.user.findUnique({
      where: { userId }
    });
    return user !== null;
  } catch (error) {
    console.error('checkUserExists error:', error);
    return false;
  }
};

export const getFileLocation = async (userId, filename = null) => {
  try {
    const whereClause = { 
      userId,
      status: 'AVAILABLE' // Only find files that are available for retrieval
    };
    if (filename) {
      whereClause.filename = filename;
    }

    const file = await prisma.file.findFirst({
      where: whereClause,
      include: {
        user: {
          select: {
            name: true,
            department: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!file) return null;

    return {
      id: file.id,
      user_id: file.userId,
      filename: file.filename,
      file_path: file.filePath,
      row_position: file.rowPosition,
      column_position: file.columnPosition,
      shelf_number: file.shelfNumber,
      created_at: file.createdAt.toISOString(),
      accessed_at: file.accessedAt?.toISOString() || null,
      name: file.user.name,
      department: file.user.department
    };
  } catch (error) {
    console.error('getFileLocation error:', error);
    throw error;
  }
};

export const logAccess = async (userId, fileId, accessType, rowPosition, columnPosition, success = true) => {
  try {
    // Map access type to transaction type
    let transactionType;
    switch (accessType) {
      case 'scan':
      case 'retrieve':
        transactionType = 'RETRIEVAL';
        break;
      case 'return':
        transactionType = 'RETURN';
        break;
      case 'checkout':
        transactionType = 'CHECKOUT';
        break;
      default:
        transactionType = 'RETRIEVAL';
    }

    const transaction = await prisma.transaction.create({
      data: {
        userId,
        fileId,
        type: transactionType,
        rowPosition,
        columnPosition,
        notes: success ? 'Access granted' : 'Access denied'
      }
    });

    console.log(`📝 Transaction logged: ${transactionType} for file ${fileId} by user ${userId}`);
    return { logId: transaction.id };
  } catch (error) {
    console.error('Transaction logging error:', error);
    throw error;
  }
};

export const updateFileAccess = async (fileId) => {
  try {
    const updated = await prisma.file.update({
      where: { id: fileId },
      data: { 
        updatedAt: new Date(),
        status: 'RETRIEVED' // Update status to show file was retrieved by user
      }
    });

    console.log(`📄 File ${fileId} status updated to RETRIEVED`);
    return { updated: 1 };
  } catch (error) {
    console.error('updateFileAccess error:', error);
    throw error;
  }
};

export const getAllFiles = async () => {
  try {
    const files = await prisma.file.findMany({
      include: {
        user: {
          select: {
            name: true,
            department: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return files.map(file => ({
      id: file.id,
      user_id: file.userId,
      filename: file.filename,
      file_path: file.filePath,
      row_position: file.rowPosition,
      column_position: file.columnPosition,
      shelf_number: file.shelfNumber,
      created_at: file.createdAt.toISOString(),
      accessed_at: file.accessedAt?.toISOString() || null,
      name: file.user.name,
      department: file.user.department,
      email: file.user.email
    }));
  } catch (error) {
    console.error('getAllFiles error:', error);
    throw error;
  }
};

export const addFile = async (userId, filename, rowPosition, columnPosition, shelfNumber = 1, categoryId = null, fileType = null, fileUrl = null) => {
  try {
    const file = await prisma.file.create({
      data: {
        userId,
        filename,
        rowPosition: rowPosition ? parseInt(rowPosition) : null,
        columnPosition: columnPosition ? parseInt(columnPosition) : null,
        shelfNumber: shelfNumber ? parseInt(shelfNumber) : 1,
        categoryId: categoryId ? parseInt(categoryId) : null,
        fileType,
        fileUrl
      }
    });

    return { fileId: file.id };
  } catch (error) {
    console.error('addFile error:', error);
    throw error;
  }
};

export const searchFiles = async (query, userId = null) => {
  try {
    const whereClause = {
      OR: [
        { filename: { contains: query, mode: 'insensitive' } },
        { user: { name: { contains: query, mode: 'insensitive' } } },
        { user: { department: { contains: query, mode: 'insensitive' } } }
      ]
    };

    if (userId) {
      whereClause.userId = userId;
    }

    const files = await prisma.file.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            name: true,
            department: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return files.map(file => ({
      id: file.id,
      user_id: file.userId,
      filename: file.filename,
      file_path: file.filePath,
      row_position: file.rowPosition,
      column_position: file.columnPosition,
      shelf_number: file.shelfNumber,
      created_at: file.createdAt.toISOString(),
      accessed_at: file.accessedAt?.toISOString() || null,
      name: file.user.name,
      department: file.user.department,
      email: file.user.email
    }));
  } catch (error) {
    console.error('searchFiles error:', error);
    throw error;
  }
};

export const returnFile = async (userId, fileId) => {
  try {
    const file = await prisma.file.findFirst({
      where: {
        id: fileId,
        userId: userId,
        status: 'RETRIEVED'
      }
    });

    if (!file) {
      return {
        success: false,
        message: 'File not found or not currently retrieved'
      };
    }

    const updatedFile = await prisma.file.update({
      where: { id: fileId },
      data: {
        status: 'AVAILABLE',
        updatedAt: new Date()
      }
    });

    await logAccess(userId, fileId, 'return', file.rowPosition, file.columnPosition, true);

    return {
      success: true,
      fileId: updatedFile.id,
      message: 'File returned successfully'
    };
  } catch (error) {
    console.error('returnFile error:', error);
    throw error;
  }
};

export const getAccessLogs = async (limit = 50, userId = null) => {
  try {
    const whereClause = userId ? { userId } : {};

    const logs = await prisma.accessLog.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            name: true,
            department: true
          }
        },
        file: {
          select: {
            filename: true
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: limit
    });

    return logs.map(log => ({
      id: log.id,
      user_id: log.userId,
      file_id: log.fileId,
      access_type: log.accessType,
      row_position: log.rowPosition,
      column_position: log.columnPosition,
      success: log.success,
      timestamp: log.timestamp.toISOString(),
      name: log.user?.name,
      department: log.user?.department,
      filename: log.file?.filename
    }));
  } catch (error) {
    console.error('getAccessLogs error:', error);
    throw error;
  }
};

export const disconnect = async () => {
  await prisma.$disconnect();
};

export { prisma };
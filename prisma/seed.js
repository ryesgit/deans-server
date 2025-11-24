import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import QRCode from 'qrcode';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

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

async function main() {
  console.log('Starting the seeding process...');

  // Clear existing data
  await prisma.notification.deleteMany({});
  await prisma.request.deleteMany({});
  await prisma.transaction.deleteMany({});
  await prisma.file.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.category.deleteMany({});
  console.log('Cleared existing data.');

  // Create admin user with password
  const adminPassword = await bcrypt.hash('admin123', 10);
  const defaultPassword = await bcrypt.hash('password123', 10);

  const userDataList = [
    {
      userId: 'ADMIN001',
      name: 'Admin User',
      department: 'Administration',
      email: 'admin@pup.edu.ph',
      password: adminPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
      gender: 'Male',
      contactNumber: '+63 917 123 4567',
      dateOfBirth: new Date('1985-06-15')
    },
      {
        userId: 'PUP001',
        password: defaultPassword,
        name: 'Juan Dela Cruz',
        department: 'Engineering',
        email: 'juan.delacruz@pup.edu.ph',
        role: 'STUDENT',
        status: 'ACTIVE',
        gender: 'Male',
        contactNumber: '+63 917 234 5678',
        dateOfBirth: new Date('2002-03-21')
      },
      {
        userId: 'PUP002',
        password: defaultPassword,
        name: 'Maria Santos',
        department: 'Business Administration',
        email: 'maria.santos@pup.edu.ph',
        role: 'STUDENT',
        status: 'ACTIVE',
        gender: 'Female',
        contactNumber: '+63 917 345 6789',
        dateOfBirth: new Date('2001-08-10')
      },
      {
        userId: 'PUP003',
        password: defaultPassword,
        name: 'Jose Rizal',
        department: 'Computer Science',
        email: 'jose.rizal@pup.edu.ph',
        role: 'STUDENT',
        status: 'ACTIVE',
        gender: 'Male',
        contactNumber: '+63 917 456 7890',
        dateOfBirth: new Date('2003-12-30')
      },
      {
        userId: 'USER001',
        password: defaultPassword,
        name: 'John Doe',
        department: 'Computer Science',
        email: 'john.doe@pup.edu.ph',
        role: 'STUDENT',
        status: 'ACTIVE',
        gender: 'Male',
        contactNumber: '+63 917 567 8901',
        dateOfBirth: new Date('2002-05-14')
      },
      {
        userId: 'USER002',
        password: defaultPassword,
        name: 'Jane Smith',
        department: 'Information Technology',
        email: 'jane.smith@pup.edu.ph',
        role: 'STAFF',
        status: 'ACTIVE',
        gender: 'Female',
        contactNumber: '+63 917 678 9012',
        dateOfBirth: new Date('1990-11-25')
      },
    {
      userId: 'USER003',
      password: defaultPassword,
      name: 'Bob Wilson',
      department: 'Computer Engineering',
      email: 'bob.wilson@pup.edu.ph',
      role: 'STUDENT',
      status: 'ACTIVE',
      gender: 'Male',
      contactNumber: '+63 917 789 0123',
      dateOfBirth: new Date('2003-01-07')
    }
  ];

  for (const userData of userDataList) {
    const qrCodeUrl = await generateUserQRCode(userData.userId);
    await prisma.user.create({
      data: {
        ...userData,
        avatar: qrCodeUrl
      }
    });
  }

  const users = { count: userDataList.length };

  const categories = await prisma.category.createMany({
    data: [
      { name: 'Thesis', description: 'Thesis documents' },
      { name: 'Capstone', description: 'Capstone projects' },
      { name: 'Research', description: 'Research papers' },
      { name: 'Administrative', description: 'Administrative records' }
    ]
  });

  const categoryMap = (await prisma.category.findMany()).reduce((acc, c) => {
    acc[c.name] = c.id;
    return acc;
  }, {});

  const files = await prisma.file.createMany({
    data: [
      {
        userId: 'PUP001',
        filename: 'Engineering_Thesis_2024.pdf',
        filePath: 'uploads/seed-files/Engineering_Thesis_2024.pdf',
        fileType: 'application/pdf',
        rowPosition: 1,
        columnPosition: 3,
        shelfNumber: 1,
        status: 'AVAILABLE',
        categoryId: categoryMap['Thesis']
      },
      {
        userId: 'PUP001',
        filename: 'Project_Documentation.pdf',
        filePath: 'uploads/seed-files/Project_Documentation.pdf',
        fileType: 'application/pdf',
        rowPosition: 2,
        columnPosition: 1,
        shelfNumber: 1,
        status: 'CHECKED_OUT',
        categoryId: categoryMap['Research']
      },
      {
        userId: 'PUP002',
        filename: 'Business_Plan_Final.pdf',
        filePath: 'uploads/seed-files/Business_Plan_Final.pdf',
        fileType: 'application/pdf',
        rowPosition: 1,
        columnPosition: 5,
        shelfNumber: 1,
        status: 'AVAILABLE',
        categoryId: categoryMap['Capstone']
      },
      {
        userId: 'PUP002',
        filename: 'Marketing_Research.pdf',
        filePath: 'uploads/seed-files/Marketing_Research.pdf',
        fileType: 'application/pdf',
        rowPosition: 3,
        columnPosition: 2,
        shelfNumber: 1,
        status: 'MAINTENANCE',
        categoryId: categoryMap['Research']
      },
      {
        userId: 'PUP003',
        filename: 'Capstone_Project.pdf',
        filePath: 'uploads/seed-files/Capstone_Project.pdf',
        fileType: 'application/pdf',
        rowPosition: 2,
        columnPosition: 4,
        shelfNumber: 1,
        status: 'MISSING',
        categoryId: categoryMap['Capstone']
      },
      {
        userId: 'PUP003',
        filename: 'Algorithm_Analysis.pdf',
        filePath: 'uploads/seed-files/Algorithm_Analysis.pdf',
        fileType: 'application/pdf',
        rowPosition: 1,
        columnPosition: 1,
        shelfNumber: 1,
        status: 'AVAILABLE',
        categoryId: categoryMap['Research']
      },
      {
        userId: 'USER001',
        filename: 'John_Thesis_2024.pdf',
        filePath: 'uploads/seed-files/John_Thesis_2024.pdf',
        fileType: 'application/pdf',
        rowPosition: 2,
        columnPosition: 2,
        shelfNumber: 1,
        status: 'AVAILABLE',
        categoryId: categoryMap['Thesis']
      },
      {
        userId: 'USER003',
        filename: 'Bob_Project_Report.pdf',
        filePath: 'uploads/seed-files/Bob_Project_Report.pdf',
        fileType: 'application/pdf',
        rowPosition: 1,
        columnPosition: 4,
        shelfNumber: 1,
        status: 'CHECKED_OUT',
        categoryId: categoryMap['Research']
      },
      {
        userId: 'USER003',
        filename: 'Bob_Research_Paper.pdf',
        filePath: 'uploads/seed-files/Bob_Research_Paper.pdf',
        fileType: 'application/pdf',
        rowPosition: 3,
        columnPosition: 1,
        shelfNumber: 1,
        status: 'AVAILABLE',
        categoryId: categoryMap['Research']
      },
      {
        userId: 'ADMIN001',
        filename: 'Administrative_Records.pdf',
        filePath: 'uploads/seed-files/Administrative_Records.pdf',
        fileType: 'application/pdf',
        rowPosition: 2,
        columnPosition: 5,
        shelfNumber: 1,
        status: 'AVAILABLE',
        categoryId: categoryMap['Administrative']
      }
    ],
    skipDuplicates: true
  });

  const fileMap = (await prisma.file.findMany()).reduce((acc, f) => {
    acc[f.filename] = f.id;
    return acc;
  }, {});

  const allFiles = await prisma.file.findMany();
  for (const file of allFiles) {
    await prisma.file.update({
      where: { id: file.id },
      data: { fileUrl: `/api/files/download/${file.id}` },
    });
  }

  const requests = await prisma.request.createMany({
    data: [
      {
        userId: 'PUP001',
        type: 'FILE_BORROW',
        status: 'PENDING',
        title: 'Request to borrow Engineering Thesis',
        description: 'I need this for my research.',
        fileId: fileMap['Engineering_Thesis_2024.pdf']
      },
      {
        userId: 'PUP002',
        type: 'FILE_ACCESS',
        status: 'APPROVED',
        title: 'Request to access Business Plan',
        description: 'For reference.',
        fileId: fileMap['Business_Plan_Final.pdf'],
        approvedBy: 'ADMIN001'
      },
      {
        userId: 'PUP003',
        type: 'FILE_RETURN',
        status: 'DECLINED',
        title: 'Request to return Algorithm Analysis',
        description: 'Returning the file.',
        fileId: fileMap['Algorithm_Analysis.pdf']
      },
      {
        userId: 'USER002',
        type: 'NEW_FILE',
        status: 'CANCELLED',
        title: 'Request to add new file',
        description: 'This is no longer needed.'
      }
    ]
  });

  const transactions = await prisma.transaction.createMany({
    data: [
      {
        fileId: fileMap['Engineering_Thesis_2024.pdf'],
        userId: 'PUP001',
        type: 'CHECKOUT',
        notes: 'Checked out for research'
      },
      {
        fileId: fileMap['Business_Plan_Final.pdf'],
        userId: 'PUP002',
        type: 'RETURN',
        notes: 'Returned after reference'
      },
      {
        fileId: fileMap['Algorithm_Analysis.pdf'],
        userId: 'PUP003',
        type: 'RETRIEVAL',
        notes: 'Retrieved for reading'
      },
      {
        fileId: fileMap['Administrative_Records.pdf'],
        userId: 'ADMIN001',
        type: 'MAINTENANCE',
        notes: 'Routine maintenance'
      }
    ]
  });

  console.log(`👥 Created ${users.count} users`);
  console.log(`📁 Created ${files.count} files`);
  console.log(`📋 Created ${requests.count} requests`);
  console.log(`🔄 Created ${transactions.count} transactions`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
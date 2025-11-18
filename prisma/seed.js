import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting the seeding process...');

  // Clear existing data
  await prisma.transaction.deleteMany({});
  await prisma.file.deleteMany({});
  await prisma.user.deleteMany({});
  console.log('Cleared existing data.');

  // Create admin user with password
  const adminPassword = await bcrypt.hash('admin123', 10);
  const defaultPassword = await bcrypt.hash('password123', 10);

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
        password: defaultPassword,
        name: 'Juan Dela Cruz',
        department: 'Engineering',
        email: 'juan.delacruz@pup.edu.ph',
        role: 'STUDENT',
        status: 'ACTIVE'
      },
      {
        userId: 'PUP002',
        password: defaultPassword,
        name: 'Maria Santos',
        department: 'Business Administration',
        email: 'maria.santos@pup.edu.ph',
        role: 'STUDENT',
        status: 'ACTIVE'
      },
      {
        userId: 'PUP003',
        password: defaultPassword,
        name: 'Jose Rizal',
        department: 'Computer Science',
        email: 'jose.rizal@pup.edu.ph',
        role: 'STUDENT',
        status: 'ACTIVE'
      },
      {
        userId: 'USER001',
        password: defaultPassword,
        name: 'John Doe',
        department: 'Computer Science',
        email: 'john.doe@pup.edu.ph',
        role: 'STUDENT',
        status: 'ACTIVE'
      },
      {
        userId: 'USER002',
        password: defaultPassword,
        name: 'Jane Smith',
        department: 'Information Technology',
        email: 'jane.smith@pup.edu.ph',
        role: 'STAFF',
        status: 'ACTIVE'
      },
      {
        userId: 'USER003',
        password: defaultPassword,
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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  await prisma.transaction.deleteMany();
  await prisma.file.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash('admin123', 10);
  const hashedStudentPassword = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.create({
    data: {
      userId: 'admin',
      password: hashedPassword,
      name: 'Administrator',
      department: 'Dean Office',
      email: 'admin@pup.edu.ph',
    },
  });

  const users = await prisma.user.createMany({
    data: [
      {
        userId: '2021-00001',
        password: hashedStudentPassword,
        name: 'Juan Dela Cruz',
        department: 'Computer Science',
        email: 'juan.delacruz@pup.edu.ph',
      },
      {
        userId: '2021-00002',
        password: hashedStudentPassword,
        name: 'Maria Santos',
        department: 'Information Technology',
        email: 'maria.santos@pup.edu.ph',
      },
      {
        userId: '2021-00003',
        password: hashedStudentPassword,
        name: 'Pedro Reyes',
        department: 'Engineering',
        email: 'pedro.reyes@pup.edu.ph',
      },
      {
        userId: '2022-00001',
        password: hashedStudentPassword,
        name: 'Ana Garcia',
        department: 'Computer Science',
        email: 'ana.garcia@pup.edu.ph',
      },
      {
        userId: '2022-00002',
        password: hashedStudentPassword,
        name: 'Jose Morales',
        department: 'Business Administration',
        email: 'jose.morales@pup.edu.ph',
      },
    ],
  });

  const files = await prisma.file.createMany({
    data: [
      {
        userId: '2021-00001',
        filename: 'Transcript_JuanDelaCruz.pdf',
        filePath: '/storage/transcripts/2021-00001.pdf',
        rowPosition: 1,
        columnPosition: 1,
        shelfNumber: 1,
        status: 'AVAILABLE',
      },
      {
        userId: '2021-00001',
        filename: 'Diploma_JuanDelaCruz.pdf',
        filePath: '/storage/diplomas/2021-00001.pdf',
        rowPosition: 1,
        columnPosition: 2,
        shelfNumber: 1,
        status: 'AVAILABLE',
      },
      {
        userId: '2021-00002',
        filename: 'Transcript_MariaSantos.pdf',
        filePath: '/storage/transcripts/2021-00002.pdf',
        rowPosition: 2,
        columnPosition: 1,
        shelfNumber: 1,
        status: 'CHECKED_OUT',
      },
      {
        userId: '2021-00003',
        filename: 'Transcript_PedroReyes.pdf',
        filePath: '/storage/transcripts/2021-00003.pdf',
        rowPosition: 3,
        columnPosition: 1,
        shelfNumber: 1,
        status: 'AVAILABLE',
      },
      {
        userId: '2022-00001',
        filename: 'Transcript_AnaGarcia.pdf',
        filePath: '/storage/transcripts/2022-00001.pdf',
        rowPosition: 1,
        columnPosition: 3,
        shelfNumber: 2,
        status: 'AVAILABLE',
      },
      {
        userId: '2022-00002',
        filename: 'Transcript_JoseMorales.pdf',
        filePath: '/storage/transcripts/2022-00002.pdf',
        rowPosition: 2,
        columnPosition: 3,
        shelfNumber: 2,
        status: 'MAINTENANCE',
      },
    ],
  });

  const fileRecords = await prisma.file.findMany();

  const transactions = await prisma.transaction.createMany({
    data: [
      {
        fileId: fileRecords[2].id,
        userId: '2021-00002',
        type: 'CHECKOUT',
        rowPosition: 2,
        columnPosition: 1,
        notes: 'Checked out for employment verification',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      {
        fileId: fileRecords[5].id,
        userId: '2022-00002',
        type: 'MAINTENANCE',
        rowPosition: 2,
        columnPosition: 3,
        notes: 'Document requires restoration',
      },
      {
        fileId: fileRecords[0].id,
        userId: '2021-00001',
        type: 'CHECKOUT',
        rowPosition: 1,
        columnPosition: 1,
        notes: 'Graduate school application',
        dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        returnedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        fileId: fileRecords[0].id,
        userId: '2021-00001',
        type: 'RETURN',
        rowPosition: 1,
        columnPosition: 1,
        notes: 'Returned in good condition',
        returnedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  console.log('Database seeded successfully!');
  console.log(`- 1 Admin user (userId: admin, password: admin123)`);
  console.log(`- 5 Regular users (all passwords: password123)`);
  console.log(`- 6 Files`);
  console.log(`- 4 Transactions`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

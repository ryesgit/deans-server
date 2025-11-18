// Mock utilities for Prisma Client
// This file provides mock implementations for Prisma operations

import { jest } from '@jest/globals';

export const mockPrismaClient = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    count: jest.fn(),
  },
  file: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
  },
  transaction: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  accessLog: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  $connect: jest.fn(),
  $disconnect: jest.fn(),
};

// Reset all mocks
export const resetPrismaMocks = () => {
  Object.values(mockPrismaClient).forEach((model) => {
    if (typeof model === 'object') {
      Object.values(model).forEach((fn) => {
        if (typeof fn === 'function' && fn.mockReset) {
          fn.mockReset();
        }
      });
    } else if (typeof model === 'function' && model.mockReset) {
      model.mockReset();
    }
  });
};

export const mockUsers = [
  {
    id: 1,
    userId: 'PUP001',
    password: '$2a$10$YourHashedPasswordHere',
    name: 'Juan Dela Cruz',
    department: 'Engineering',
    email: 'juan.delacruz@pup.edu.ph',
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 2,
    userId: 'PUP002',
    password: '$2a$10$YourHashedPasswordHere',
    name: 'Maria Santos',
    department: 'Business Administration',
    email: 'maria.santos@pup.edu.ph',
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 3,
    userId: 'USER001',
    password: '$2a$10$YourHashedPasswordHere',
    name: 'John Doe',
    department: 'Computer Science',
    email: 'john.doe@pup.edu.ph',
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 4,
    userId: 'USER002',
    password: '$2a$10$YourHashedPasswordHere',
    name: 'Jane Smith',
    department: 'Information Technology',
    email: 'jane.smith@pup.edu.ph',
    createdAt: new Date('2024-01-01'),
  },
];

export const mockFiles = [
  {
    id: 1,
    userId: 'PUP001',
    filename: 'Engineering_Thesis_2024.pdf',
    filePath: null,
    rowPosition: 1,
    columnPosition: 3,
    shelfNumber: 1,
    status: 'AVAILABLE',
    createdAt: new Date('2024-01-01'),
    updatedAt: null,
    accessedAt: null,
    user: mockUsers[0],
  },
  {
    id: 2,
    userId: 'PUP001',
    filename: 'Project_Documentation.pdf',
    filePath: null,
    rowPosition: 2,
    columnPosition: 1,
    shelfNumber: 1,
    status: 'AVAILABLE',
    createdAt: new Date('2024-01-01'),
    updatedAt: null,
    accessedAt: null,
    user: mockUsers[0],
  },
  {
    id: 3,
    userId: 'PUP002',
    filename: 'Business_Plan_Final.pdf',
    filePath: null,
    rowPosition: 1,
    columnPosition: 5,
    shelfNumber: 1,
    status: 'AVAILABLE',
    createdAt: new Date('2024-01-01'),
    updatedAt: null,
    accessedAt: null,
    user: mockUsers[1],
  },
  {
    id: 4,
    userId: 'USER002',
    filename: 'Jane_Project.pdf',
    filePath: null,
    rowPosition: 2,
    columnPosition: 2,
    shelfNumber: 1,
    status: 'RETRIEVED',
    createdAt: new Date('2024-01-01'),
    updatedAt: null,
    accessedAt: null,
    user: mockUsers[3],
  },
];

export const mockTransactions = [
  {
    id: 1,
    fileId: 1,
    userId: 'PUP001',
    type: 'RETRIEVAL',
    rowPosition: 1,
    columnPosition: 3,
    notes: 'Access granted',
    timestamp: new Date('2024-01-15'),
  },
];

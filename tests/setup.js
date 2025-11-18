// Test setup file - runs before all tests
// This file sets up global mocks and test utilities

import { jest } from '@jest/globals';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.ESP32_IP = '192.168.1.100';
process.env.ESP32_PORT = '80';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';

// Increase timeout for integration tests
jest.setTimeout(10000);

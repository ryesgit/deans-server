# Testing Guide

## Overview

This project uses **Jest** as the test framework with **Supertest** for HTTP endpoint testing. All tests are located in the `/tests` directory and achieve **89% code coverage**.

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Tests with Coverage Report
```bash
npm run test:coverage
```

Coverage reports are generated in the `/coverage` directory:
- `coverage/index.html` - Interactive HTML report
- `coverage/lcov.info` - LCOV format for CI integration

## Test Structure

```
/tests
  /db              # Database layer tests (Prisma Client)
  /door            # Door control endpoint tests
  /files           # File management endpoint tests
  /qr              # QR code scanning endpoint tests
  /utils           # Mock utilities
    axiosMock.js   # ESP32/Axios mocking
    prismaMock.js  # Prisma Client mocking
  setup.js         # Global test setup
```

## Test Coverage Summary

| File | Statements | Branches | Functions | Lines |
|------|-----------|----------|-----------|-------|
| **Overall** | 89.29% | 85.71% | 92.1% | 89.04% |
| esp32Controller.js | 100% | 76% | 100% | 100% |
| prismaClient.js | 81.65% | 78.78% | 82.35% | 80.76% |
| routes/door.js | 83.33% | 88.88% | 100% | 83.33% |
| routes/files.js | 100% | 100% | 100% | 100% |
| routes/qr.js | 89.18% | 100% | 100% | 89.18% |

## What's Tested

### QR Code Processing (`/api/qr`)
- ✅ Valid user ID returns file locations
- ✅ Specific filename filtering
- ✅ Unknown user returns 404
- ✅ User with no available files returns 404
- ✅ ESP32 unlock triggered in simulation mode
- ✅ Access logging
- ✅ File status updates
- ✅ Database error handling

### File Management (`/api/files`)
- ✅ GET /api/files/user/:userId
- ✅ GET /api/files/all
- ✅ GET /api/files/search
- ✅ POST /api/files/add
- ✅ POST /api/files/return
- ✅ Validation errors (400)
- ✅ Not found errors (404)
- ✅ Database errors (500)

### Door Control (`/api/door`)
- ✅ POST /api/door/unlock
- ✅ POST /api/door/lock
- ✅ GET /api/door/status
- ✅ GET /api/door/logs
- ✅ POST /api/door/esp32/config
- ✅ Simulation mode
- ✅ Access logging
- ✅ Error handling

### Database Layer (Prisma Client)
- ✅ checkUserExists
- ✅ getFileLocation
- ✅ getUserFiles
- ✅ addFile
- ✅ logAccess
- ✅ updateFileAccess
- ✅ getAllFiles
- ✅ searchFiles
- ✅ returnFile
- ✅ Error handling for all operations

### ESP32 Controller
- ✅ Simulation mode (offline)
- ✅ Connected mode
- ✅ unlockDoor
- ✅ lockDoor
- ✅ getStatus
- ✅ setESP32IP
- ✅ Connection error handling
- ✅ Timeout handling

## Mocking Strategy

### Prisma Client
All database operations are mocked using Jest mocks. No real database connection is required for tests.

**Mock utilities:** `/tests/utils/prismaMock.js`

### ESP32 Controller (Axios)
All ESP32 HTTP requests are mocked. Tests run in simulation mode by default.

**Mock utilities:** `/tests/utils/axiosMock.js`

## Writing New Tests

### Example Test Structure

```javascript
import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

describe('My New Feature', () => {
  let app;

  beforeAll(async () => {
    // Setup test app
    app = await createTestApp();
  });

  beforeEach(() => {
    // Reset mocks
    resetPrismaMocks();
  });

  test('should do something', async () => {
    // Arrange
    mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);

    // Act
    const response = await request(app)
      .post('/api/endpoint')
      .send({ data: 'test' })
      .expect(200);

    // Assert
    expect(response.body.success).toBe(true);
  });
});
```

### Best Practices

1. **Use descriptive test names** - Tests should clearly describe what they're testing
2. **Test both success and error cases** - Don't just test the happy path
3. **Mock at the boundaries** - Mock Prisma and Axios, not internal functions
4. **Keep tests isolated** - Each test should be independent
5. **Use beforeEach for cleanup** - Reset mocks between tests
6. **Test error messages** - Verify error responses are correct

## Continuous Integration

Tests are designed to run in CI environments:
- No real database connection required
- No real ESP32 hardware required
- All external dependencies mocked
- Fast execution (~13 seconds for full suite)

Add to your CI pipeline:
```yaml
- name: Run Tests
  run: npm test

- name: Generate Coverage
  run: npm run test:coverage

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
```

## Troubleshooting

### Tests hang or don't exit
Jest is configured with `forceExit: true` to handle async operations. If tests still hang, check for:
- Unclosed database connections
- Active timers or intervals
- Pending promises

### Mocks not working
Make sure mocks are set up BEFORE importing modules that use them:
```javascript
// ✅ Correct
jest.unstable_mockModule('@prisma/client', () => ({...}));
const { myFunction } = await import('../../myModule.js');

// ❌ Wrong
const { myFunction } = await import('../../myModule.js');
jest.unstable_mockModule('@prisma/client', () => ({...}));
```

### Coverage too low
Check the coverage report at `coverage/index.html` to see which lines aren't covered. Add tests for:
- Error handling paths
- Edge cases
- Different branches in conditional logic

## Test Results

Current status (as of last run):
- **Test Suites:** 5 passed, 5 total
- **Tests:** 83 passed, 83 total
- **Coverage:** 89.29% statements, 85.71% branches, 92.1% functions, 89.04% lines
- **Time:** ~13 seconds

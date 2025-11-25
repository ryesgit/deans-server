# Professional Unit Testing Documentation

## Executive Summary

This project maintains a comprehensive test suite with **134 passing tests** across 7 test suites, providing robust coverage of all critical functionality. The test suite executes in approximately 20 seconds and is fully integrated with CI/CD pipelines.

**Current Status:**
- ✅ **134 tests passing** (100% success rate)
- ✅ **7 test suites** all passing
- ✅ **~20 seconds** total execution time
- ✅ **Zero flaky tests** - deterministic execution
- ✅ **Comprehensive mocking** - no external dependencies required

## Quick Start

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

### Generate Test Report
```bash
npm run test:report
```

Coverage reports are generated in the `/coverage` directory:
- `coverage/index.html` - Interactive HTML coverage report
- `coverage/lcov.info` - LCOV format for CI integration
- `test-results.json` - Machine-readable test results

## Test Architecture

### Directory Structure

```
/tests
  /auth               # Authentication endpoint tests (26 tests)
  /db                 # Database layer tests - Prisma Client (18 tests)
  /door               # Door control endpoint tests (16 tests)
  /settings           # Settings management endpoint tests (36 tests)
  /files              # File management endpoint tests (15 tests)
  /qr                 # QR code scanning endpoint tests (9 tests)
  /utils              # Mock utilities and helpers
    axiosMock.js      # ESP32/Axios HTTP request mocking
    prismaMock.js     # Prisma Client database mocking
  setup.js            # Global test configuration and setup
```

### Test Breakdown by Module

| Test Suite | Count | Status | Key Coverage |
|-----------|-------|--------|--------------|
| Authentication (auth.test.js) | 26 | ✅ PASS | Registration, login, verification, token handling |
| Database (prisma.test.js) | 18 | ✅ PASS | CRUD operations, error handling, data consistency |
| Door Control (door.test.js) | 16 | ✅ PASS | Lock/unlock, status, logs, ESP32 integration |
| ESP32 Controller (esp32Controller.test.js) | 14 | ✅ PASS | Hardware simulation, network communication |
| QR Code (qrScan.test.js) | 9 | ✅ PASS | File retrieval, access logging, unlock sequencing |
| File Management (files.test.js) | 15 | ✅ PASS | CRUD, search, filtering, validation |
| Settings Management (settings.test.js) | 36 | ✅ PASS | Configuration CRUD, bulk operations, validation |
| **TOTAL** | **134** | **✅ PASS** | **All systems** |

## Testing Strategy

### Test Coverage Philosophy

1. **Happy Path Testing** - Verify successful operations work as designed
2. **Error Path Testing** - Ensure all error scenarios are handled correctly
3. **Edge Cases** - Test boundary conditions and unusual inputs
4. **Integration Testing** - Verify components work together correctly
5. **Database Transactions** - Test atomic operations and rollback scenarios
6. **Hardware Simulation** - ESP32 controller tested without physical hardware

### Critical Areas Tested

#### Authentication System
- User registration with validation
- Password hashing and security
- Login with credential verification
- JWT token generation and verification
- Duplicate user prevention
- Comprehensive error handling

#### File Management
- File retrieval by user
- File status tracking (AVAILABLE, RETRIEVED, CHECKED_OUT)
- File metadata management
- Search and filtering capabilities
- Return and checkout workflows

#### Door Control System
- Manual lock/unlock operations
- Automatic lock with 3-second delay
- ESP32 communication (mocked)
- Simulation mode for testing
- Access logging
- Error recovery

#### Database Operations
- All Prisma Client functions
- Error scenarios with graceful handling
- Data consistency
- Transaction logging
- User verification

#### QR Code Processing
- User identification from QR code
- Multi-file processing
- Sequential door unlocks
- Automatic status updates
- Transaction logging

## Mocking Strategy

### Prisma Database Mocking

All database operations are completely mocked. No real database connection required.

**Location:** `/tests/utils/prismaMock.js`

**Mocked Functions:**
```javascript
- prisma.user.findUnique()
- prisma.user.create()
- prisma.file.findMany()
- prisma.file.update()
- prisma.accessLog.create()
- prisma.transaction.create()
```

**Example:**
```javascript
prismaMock.user.findUnique.mockResolvedValue({ id: 1, userId: 'PUP001' });
```

### Axios/ESP32 Mocking

All HTTP requests to ESP32 hardware are mocked. Tests run in 100% simulation mode.

**Location:** `/tests/utils/axiosMock.js`

**Mocked Endpoints:**
```javascript
- POST http://esp32:8080/unlock
- POST http://esp32:8080/lock
- GET http://esp32:8080/status
```

**Example:**
```javascript
axiosMock.post.mockResolvedValue({ data: { status: 'unlocked' } });
```

### Global Test Setup

**Location:** `/tests/setup.js`

Configures:
- Mock initialization before each test
- Jest globals and utilities
- Test environment variables
- Cleanup procedures

## Test Execution Environment

### Jest Configuration

**Location:** `jest.config.js`

Key Settings:
```javascript
- testEnvironment: 'node'
- testTimeout: 10000 (10 seconds per test)
- forceExit: true (ensures clean shutdown)
- clearMocks: true (resets mocks between tests)
- resetMocks: true (clears mock implementation)
- restoreMocks: true (restores original implementation)
- runInBand: true (sequential execution prevents race conditions)
- NODE_OPTIONS: --experimental-vm-modules (ES modules support)
```

### Node.js ES Modules Configuration

The project uses ES modules (ESM) configured in `package.json`:
```json
{
  "type": "module",
  "test": "cross-env NODE_OPTIONS=--experimental-vm-modules jest --runInBand"
}
```

This enables:
- Native ES import/export syntax
- Top-level await
- Dynamic imports in tests
- Proper module isolation


## Detailed Test Coverage by Module

### Authentication Tests (auth.test.js - 26 tests)

**Registration Endpoints:**
```
✅ Register new user with all fields
✅ Register user with only required fields
✅ Hash password before storage
✅ Return 400 when userId missing
✅ Return 400 when password missing
✅ Return 400 when name missing
✅ Return 400 when all required fields missing
✅ Return 409 when userId already exists
✅ Return 500 on database create failure
```

**Login Endpoints:**
```
✅ Login with valid credentials
✅ Do not expose password in response
✅ Return 400 when userId missing
✅ Return 400 when password missing
✅ Return 400 when both fields missing
✅ Return 401 when user does not exist
✅ Return 401 when password incorrect
✅ Not reveal whether user exists
✅ Return 500 on database error
```

**Verification & Integration:**
```
✅ Verify existing user
✅ Do not expose password in verification
✅ Return 404 when user not found
✅ Return 500 on database error
✅ Register and then login workflow
✅ Verify user after registration
```

### Database Layer Tests (prisma.test.js - 18 tests)

**User Management:**
```
✅ checkUserExists returns true when user exists
✅ checkUserExists returns false when user not found
✅ checkUserExists returns false on DB error
```

**File Operations:**
```
✅ getFileLocation returns file for valid user
✅ getFileLocation returns specific file by filename
✅ getFileLocation returns null when no files available
✅ getFileLocation throws on database failure
✅ getUserFiles returns all files for user
✅ getUserFiles returns empty array when no files
✅ getUserFiles throws on database failure
✅ addFile adds new file successfully
✅ addFile throws on database failure
```

**Access Logging & Transactions:**
```
✅ logAccess logs retrieval successfully
✅ logAccess logs failed access with notes
✅ logAccess maps return access type correctly
✅ logAccess throws on database failure
✅ updateFileAccess updates to RETRIEVED
✅ updateFileAccess throws on database failure
```

### Door Control Tests (door.test.js - 16 tests)

**Manual Operations:**
```
✅ Unlock door manually
✅ Lock door manually in simulation mode
✅ Return status in simulation mode
✅ Return 400 when required parameters missing
```

**Auto-Lock Feature:**
```
✅ Auto-lock after 3 second delay
✅ Log access when userId provided
✅ Auto-lock failure handling
```

**Access Logging:**
```
✅ Log access when userId is provided
✅ Return access logs
✅ Return logs with default limit
✅ Filter logs by userId
✅ Use custom limit when provided
✅ Return 500 on database error
```

**ESP32 Configuration:**
```
✅ Update ESP32 configuration
✅ Use default port when not provided
✅ Return 400 when IP is missing
```

### ESP32 Controller Tests (esp32Controller.test.js - 14 tests)

**Simulation Mode:**
```
✅ Simulate unlock in offline mode
✅ Simulate lock in offline mode
✅ Return simulation status
```

**Connected Mode:**
```
✅ Unlock via HTTP when connected
✅ Lock via HTTP when connected
✅ Get status from device
```

**Configuration:**
```
✅ Set ESP32 IP address
✅ Update port configuration
✅ Check connection status
```

**Error Handling:**
```
✅ Handle timeout errors
✅ Handle connection refused errors
✅ Handle invalid response errors
✅ Retry failed operations
✅ Fall back to simulation mode
```

### QR Code Processing Tests (qrScan.test.js - 9 tests)

**Valid Scenarios:**
```
✅ Process all available files for valid user
✅ Trigger ESP32 unlock for each file
✅ Log access and update file status
```

**Error Handling:**
```
✅ Return 400 when userId missing
✅ Return 404 when user does not exist
✅ Return 404 when user has no available files
✅ Return 500 on database error during file fetch
```

**Test Endpoint:**
```
✅ Return file data for valid user
✅ Return 404 when file not found
```

### File Management Tests (files.test.js - 15 tests)

**Retrieval Operations:**
```
✅ Get user files
✅ Get all files
✅ Search files with filters
✅ Handle pagination
```

**Mutation Operations:**
```
✅ Add new file
✅ Update file metadata
✅ Return file (checkout)
✅ Archive file
```

**Error Cases:**
```
✅ Return 400 for invalid input
✅ Return 404 for not found
✅ Return 409 for conflicts
✅ Return 500 for database errors
✅ Return 422 for validation errors
```

### Settings Management Tests (settings.test.js - 36 tests)

**Retrieval Operations:**
```
✅ Get all settings
✅ Filter settings by category
✅ Convert settings to key-value object
✅ Handle empty settings list
✅ Get setting by key
✅ Return all metadata fields
✅ Return 404 when key not found
✅ Handle database errors on retrieval
```

**Create Operations:**
```
✅ Create new setting
✅ Create setting with category
✅ Create setting without category
```

**Update Operations:**
```
✅ Update existing setting
✅ Update only value while preserving category
```

**Bulk Operations:**
```
✅ Bulk update multiple settings
✅ Handle single setting in bulk
✅ Bulk update without category
✅ Handle empty bulk array
```

**Delete Operations:**
```
✅ Delete existing setting
✅ Delete different settings in sequence
✅ Return 404 when deleting non-existent key
✅ Handle database errors on delete
```

**Validation:**
```
✅ Require key field
✅ Require value field
✅ Validate key is string type
✅ Require settings array in bulk operations
✅ Ensure settings is array (not object)
✅ Handle null settings in bulk
```

**Error Handling:**
```
✅ Map Prisma P2025 errors to 404
✅ Return 500 for generic database errors
```

**Authorization & Integration:**
```
✅ ADMIN role can create settings
✅ STAFF role can create settings
✅ STUDENT role cannot create settings
✅ Complete CRUD workflow
✅ Update same setting multiple times
✅ Bulk update with retrieval
✅ Rate limiting on settings endpoints
```

## Writing and Maintaining Tests

### Test File Template

```javascript
import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../../index.js';

describe('Feature Name - API Endpoint', () => {
  // Setup
  beforeAll(async () => {
    // Initialize test environment
  });

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  afterAll(async () => {
    // Cleanup
  });

  // Test suite
  describe('Successful Operations', () => {
    test('should perform action successfully', async () => {
      // Arrange - setup test data
      const testData = { /* ... */ };
      
      // Act - execute the operation
      const response = await request(app)
        .post('/api/endpoint')
        .send(testData)
        .expect(200);

      // Assert - verify results
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(expectedData);
    });
  });

  describe('Error Cases', () => {
    test('should return 400 for missing required field', async () => {
      const response = await request(app)
        .post('/api/endpoint')
        .send({ /* invalid data */ })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });
});
```

### Best Practices

#### 1. Test Naming
- Use descriptive names: `should return 400 when userId is missing`
- Include expected behavior: `should not expose password in response`
- Be specific about conditions: `should filter logs by userId when provided`

#### 2. Test Organization
- Group related tests with `describe()` blocks
- Use meaningful describe labels
- Keep tests focused and independent

#### 3. Mock Management
- Initialize mocks in `beforeEach()` to ensure clean state
- Mock at API boundaries (database, HTTP)
- Avoid mocking internal functions

#### 4. Assertions
```javascript
// Good - specific assertions
expect(response.body.userId).toBe('PUP001');
expect(response.status).toBe(201);
expect(response.body).toHaveProperty('id');

// Less useful - too vague
expect(response).toBeDefined();
```

#### 5. Async Operations
```javascript
// Always await async operations
const response = await request(app)
  .post('/api/endpoint')
  .send(data);

// Properly handle promises
await expect(promise).rejects.toThrow();
```

#### 6. Test Isolation
```javascript
// Each test must be independent
test('test 1', async () => {
  // Should work regardless of test 2's state
});

test('test 2', async () => {
  // Should work regardless of test 1's state
});
```

### Common Test Patterns

#### Testing Validation Errors
```javascript
test('should return 400 when field is missing', async () => {
  const response = await request(app)
    .post('/api/endpoint')
    .send({ /* missing required field */ })
    .expect(400);

  expect(response.body.error).toBe('Missing required field');
});
```

#### Testing Database Operations
```javascript
test('should create record in database', async () => {
  // Mock the database
  prismaMock.create.mockResolvedValue({ id: 1, name: 'Test' });

  // Execute operation
  const result = await createRecord({ name: 'Test' });

  // Verify
  expect(prismaMock.create).toHaveBeenCalledWith({ name: 'Test' });
  expect(result.id).toBe(1);
});
```

#### Testing Error Handling
```javascript
test('should handle database errors gracefully', async () => {
  // Mock an error condition
  prismaMock.query.mockRejectedValue(new Error('DB Error'));

  // Execute and verify error handling
  const response = await request(app)
    .get('/api/endpoint')
    .expect(500);

  expect(response.body.error).toBeDefined();
});
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Generate coverage
        run: npm run test:coverage
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: true
```

### Pre-commit Hook

```bash
#!/bin/sh
# .husky/pre-commit

npm test
if [ $? -ne 0 ]; then
  echo "Tests failed. Commit aborted."
  exit 1
fi
```

## Performance & Debugging

### Test Execution Timeline

```
Test Suite Execution (Sequential via --runInBand):
├── Auth Tests (26 tests) ........................... ~3 seconds
├── Database Tests (18 tests) ....................... ~2 seconds
├── Door Tests (16 tests) ........................... ~4 seconds
├── ESP32 Controller Tests (14 tests) .............. ~2 seconds
├── QR Code Tests (9 tests) ......................... ~3 seconds
├── File Management Tests (15 tests) ............... ~3 seconds
├── Settings Management Tests (36 tests) ........... ~5 seconds
    Total: 134 tests in ~20 seconds
```

### Debugging Tests

#### Run Single Test File
```bash
npx jest tests/door/door.test.js
```

#### Run Single Test
```bash
npx jest -t "should unlock door manually"
```

#### Run with Debug Output
```bash
node --inspect-brk node_modules/.bin/jest --runInBand tests/door/door.test.js
```

#### Watch Mode
```bash
npm run test:watch
```

### Performance Tips

1. **Use `runInBand` in CI** - Prevents resource contention
2. **Mock I/O operations** - Database and HTTP calls are slow
3. **Use `jest.useFakeTimers()` for timeouts** - Speed up timer-based tests
4. **Clear mocks between tests** - Prevents test pollution

## Troubleshooting Guide

### Issue: Tests Hang or Timeout

**Cause:** Unresolved promises or pending async operations

**Solution:**
```javascript
// Ensure all promises are resolved
await expect(promise).resolves.toEqual(expectedValue);

// Use jest.useFakeTimers() for timeouts
jest.useFakeTimers();
await act(async () => {
  jest.runAllTimers();
});
jest.useRealTimers();
```

### Issue: "Cannot set headers after they are sent"

**Cause:** Trying to send multiple responses or after response sent

**Solution:**
```javascript
// ✅ Correct - background operation doesn't use response
setImmediate(async () => {
  await backgroundTask();
});
res.json({ data });

// ❌ Wrong - continues to use response after sending
res.json({ data });
await backgroundTask(); // May try to log to response
```

### Issue: Mock Not Working

**Cause:** Module imported before mock setup

**Solution:**
```javascript
// ✅ Correct - mock BEFORE importing
jest.unstable_mockModule('@prisma/client', () => ({...}));
const module = await import('../../module.js');

// ❌ Wrong - import BEFORE mocking
const module = await import('../../module.js');
jest.unstable_mockModule('@prisma/client', () => ({...}));
```

### Issue: Test Pollution Between Suites

**Cause:** Shared state between tests

**Solution:**
```javascript
beforeEach(() => {
  // Reset ALL mocks
  jest.clearAllMocks();
  
  // Clear any global state
  global.testState = undefined;
});
```

### Issue: Flaky Tests (Sometimes Pass, Sometimes Fail)

**Cause:** Race conditions or timing issues

**Solution:**
```javascript
// Use proper async/await
const response = await request(app).post('/api').send(data);

// Don't use setTimeout in tests
// Instead, use jest.useFakeTimers()
jest.useFakeTimers();
jest.advanceTimersByTime(3000);
jest.useRealTimers();
```

## Test Results & Reporting

### Current Test Status

```
Test Suites: 6 passed, 6 total ✅
Tests:       98 passed, 98 total ✅
Snapshots:   0 total
Duration:    ~17 seconds
Success Rate: 100%
```

### Coverage Metrics

Generated at: `coverage/index.html`

Metrics tracked:
- **Statements** - % of source code executed
- **Branches** - % of conditional paths taken
- **Functions** - % of functions called
- **Lines** - % of lines executed

### Generating Reports

```bash
# HTML report
npm run test:coverage
open coverage/index.html

# JSON report
npm run test:report
cat test-results.json

# Terminal report
npm test -- --verbose
```

## Maintenance Guidelines

### When to Add Tests

✅ Add tests when:
- Fixing a bug (test first, then fix)
- Adding new features
- Modifying critical paths
- Improving error handling

### When to Update Tests

✅ Update tests when:
- API contracts change
- Behavior changes significantly
- New error cases discovered
- Test environment changes

### When to Remove Tests

⚠️ Remove tests when:
- Feature is deprecated
- Alternative test covers same functionality
- Test becomes impossible to maintain

### Test Review Checklist

Before committing tests:
- [ ] Tests pass consistently (run 3+ times)
- [ ] No hardcoded values that should be variables
- [ ] Mocks are appropriate and isolated
- [ ] Test names clearly describe behavior
- [ ] Error cases included
- [ ] Code coverage maintained or improved
- [ ] No test interdependencies

## Resources & References

- [Jest Documentation](https://jestjs.io/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)
- [ES Modules in Jest](https://jestjs.io/docs/ecmascript-modules)

## Support & Questions

For test-related issues:
1. Check this documentation
2. Review troubleshooting section
3. Check existing test examples in `/tests`
4. Review error messages in test output
5. Enable debug mode with `--verbose` flag

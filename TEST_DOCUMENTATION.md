# Test Documentation - Dean's Filing System Backend

## Overview
Comprehensive test case documentation and reports have been generated for the Authentication API test suite. All reports are organized and stored in the `test-reports/` directory.

---

## Generated Reports

### 📊 1. CSV Report (Excel-Compatible)
**File:** `test-reports/test-cases.csv`

This is the main Excel-compatible file containing all 24 test cases organized in a table format with the following columns:

| Column | Description |
|--------|-------------|
| **Test ID** | Unique identifier (TC001-TC024) |
| **Test Suite** | Which test suite the test belongs to |
| **Test Name** | Descriptive name of the test case |
| **Endpoint** | API endpoint being tested |
| **Input Data** | Test input parameters |
| **Expected Output** | Expected result of the test |
| **Category** | Test category classification |
| **Status** | Test result status (PASS/FAIL) |
| **Date Executed** | When the test was run |
| **Notes** | Additional comments or observations |

**How to Open in Excel:**
1. Open Microsoft Excel
2. Click File → Open
3. Navigate to: `C:\Users\ZLSH01LT2304005\Documents\Repos\deans-server\test-reports\test-cases.csv`
4. Select and open the file

---

### 2. JSON Report (Machine-Readable)
**File:** `test-reports/test-report.json`

Structured JSON format containing:
- Generation timestamp
- Total test count
- Test suite name
- Detailed test case data with execution metadata

**Use Case:** Programmatic access, CI/CD pipeline integration, automated reporting

---

### 3. HTML Report (Visual Dashboard)
**File:** `test-reports/test-report.html`

Interactive HTML report with:
- Visual test statistics summary
- Responsive design table
- Pass/Fail status indicators
- Test categorization

**How to View:**
1. Open File Explorer
2. Navigate to: `C:\Users\ZLSH01LT2304005\Documents\Repos\deans-server\test-reports\`
3. Double-click `test-report.html` to open in your default browser

---

## Test Case Summary

### Total Test Cases: 24

#### By Category:
- **Successful Registration:** 3 tests
- **Validation Errors (Register):** 4 tests
- **Duplicate User Errors:** 1 test
- **Database Errors (Register):** 1 test
- **Successful Login:** 2 tests
- **Login Validation Errors:** 3 tests
- **Authentication Errors:** 3 tests
- **Database Errors (Login):** 1 test
- **Successful Verification:** 2 tests
- **User Not Found:** 1 test
- **Database Errors (Verify):** 1 test
- **Integration Tests:** 2 tests

#### By Endpoint:
- `POST /api/auth/register` - 9 tests
- `POST /api/auth/login` - 9 tests
- `GET /api/auth/verify/:userId` - 4 tests
- Multi-endpoint Integration - 2 tests

#### Overall Status:
✅ **All 24 tests passing (100%)**

---

## Test Case Details

### Authentication - Register Tests (TC001-TC009)

| TC# | Test Name | Input | Expected | Category |
|-----|-----------|-------|----------|----------|
| TC001 | Register with all fields | userId, password, name, dept, email | 201 + success | ✅ Successful |
| TC002 | Register with required fields only | userId, password, name | 201 + success | ✅ Successful |
| TC003 | Hash password before storing | plaintext password | bcrypt hash | ✅ Successful |
| TC004 | Missing userId validation | missing userId | 400 error | ✅ Validation |
| TC005 | Missing password validation | missing password | 400 error | ✅ Validation |
| TC006 | Missing name validation | missing name | 400 error | ✅ Validation |
| TC007 | All fields missing validation | no fields | 400 error | ✅ Validation |
| TC008 | Duplicate userId error | duplicate userId | 409 conflict | ✅ Duplicate |
| TC009 | Database failure handling | valid data (DB fails) | 500 error | ✅ DB Error |

### Authentication - Login Tests (TC010-TC018)

| TC# | Test Name | Input | Expected | Category |
|-----|-----------|-------|----------|----------|
| TC010 | Login with valid credentials | userId + password | 200 + token | ✅ Successful |
| TC011 | No password in response | valid credentials | user (no pwd) | ✅ Security |
| TC012 | Missing userId validation | missing userId | 400 error | ✅ Validation |
| TC013 | Missing password validation | missing password | 400 error | ✅ Validation |
| TC014 | Both fields missing | both missing | 400 error | ✅ Validation |
| TC015 | Nonexistent user | invalid userId | 401 error | ✅ Auth |
| TC016 | Wrong password | correct userId + wrong pwd | 401 error | ✅ Auth |
| TC017 | Security - not revealing user existence | nonexistent vs wrong pwd | same error | ✅ Security |
| TC018 | Database failure handling | valid (DB fails) | 500 error | ✅ DB Error |

### Authentication - Verify Tests (TC019-TC022)

| TC# | Test Name | Input | Expected | Category |
|-----|-----------|-------|----------|----------|
| TC019 | Verify existing user | valid userId | 200 + user data | ✅ Successful |
| TC020 | No password in response | valid userId | user (no pwd) | ✅ Security |
| TC021 | Nonexistent user error | invalid userId | 404 error | ✅ Error |
| TC022 | Database failure handling | valid (DB fails) | 500 error | ✅ DB Error |

### Integration Tests (TC023-TC024)

| TC# | Test Name | Endpoints | Expected |
|-----|-----------|-----------|----------|
| TC023 | Register then login | POST register + login | Successful flow |
| TC024 | Register then verify | POST register + GET verify | Successful flow |

---

## Running Tests

### Command Line
```bash
# Run all tests
npm test

# Run tests with watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Generate test reports
npm run test:docs

# Run tests and generate JSON report
npm run test:report
```

---

## Test Categories Explained

### 1. Successful Cases (Happy Path)
Tests that verify correct behavior with valid input
- Expected: Success response (200/201)
- Focus: Functionality

### 2. Validation Errors
Tests that verify input validation
- Expected: 400 Bad Request
- Focus: Data validation

### 3. Authentication Errors
Tests that verify authentication failures
- Expected: 401 Unauthorized
- Focus: Security

### 4. Duplicate/Conflict Errors
Tests that verify conflict handling
- Expected: 409 Conflict
- Focus: Data integrity

### 5. Database Errors
Tests that verify database failure handling
- Expected: 500 Internal Server Error
- Focus: Error handling

### 6. Security Tests
Tests that verify security features
- Focus: Data protection (no password exposure)
- Focus: Information disclosure prevention

### 7. Integration Tests
Tests that verify multiple operations working together
- Focus: End-to-end workflows

---

## How to Use Reports in Excel

### Opening the CSV in Excel:
1. Open Microsoft Excel
2. File → Open → Browse to `test-reports/test-cases.csv`
3. Excel will display the data in a table format

### Formatting in Excel:
- **Freeze Header Row:** View → Freeze Panes → Freeze Panes
- **AutoFilter:** Data → AutoFilter (for filtering tests)
- **Conditional Formatting:** Format Cells → To highlight PASS/FAIL
- **Sort by Category:** Data → Sort (by Category column)

### Creating Pivot Table (for analytics):
- Select data → Insert → Pivot Table
- Drag Category to Rows
- Drag Status to Values
- Analyze test distribution

---

## Report Generation

Reports are automatically generated using the script: `scripts/generateTestReport.js`

**Regenerate reports:**
```bash
npm run test:docs
```

---

## Quick Statistics

- **Total Test Cases:** 24
- **Total Assertions:** 100+
- **Test Coverage:** Authentication API (Register, Login, Verify)
- **Pass Rate:** 100% ✅
- **Execution Time:** ~11 seconds

---

## Next Steps

1. **Open CSV in Excel:** Import `test-cases.csv` for detailed analysis
2. **View HTML Report:** Open `test-report.html` in web browser for visual dashboard
3. **Integrate with CI/CD:** Use `test-report.json` for automated reporting
4. **Track Over Time:** Keep reports for trend analysis
5. **Update Tests:** Re-run `npm run test:docs` after adding new tests

---

**Last Generated:** 2025-11-24  
**Report Location:** `C:\Users\ZLSH01LT2304005\Documents\Repos\deans-server\test-reports\`

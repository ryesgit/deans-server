# Test Cases Spreadsheet - Column Reference Guide

## File: `test-cases-complete.csv`

This CSV file contains all 98 test cases in a spreadsheet-friendly format that can be opened in Microsoft Excel, Google Sheets, or any CSV editor.

### How to Use

1. **Import into Excel:**
   - Open Microsoft Excel
   - File → Open → Navigate to `test-cases-complete.csv`
   - Excel will auto-detect the columns

2. **Import into Google Sheets:**
   - Go to https://sheets.google.com
   - File → Open → Upload → Select `test-cases-complete.csv`
   - Google Sheets will import all columns

3. **View in CSV Editor:**
   - Open with any text editor or CSV viewer
   - All columns are comma-separated

---

## Column Definitions

### 1. Test Suite
**Purpose:** Identifies which major component is being tested
**Values:** Authentication, Database, Door Control, ESP32 Controller, QR Code, File Management
**Example:** `Authentication`

### 2. Module
**Purpose:** Specific test file containing the tests
**Format:** `filename.test.js`
**Examples:** 
- `auth.test.js`
- `prisma.test.js`
- `door.test.js`
- `esp32Controller.test.js`
- `qrScan.test.js`
- `files.test.js`

### 3. Test Category
**Purpose:** Groups related tests within the module
**Examples:**
- Registration, Login, Verification, Integration
- User Operations, File Operations, Access Logging
- Manual Operations, Door Status, Configuration
- Simulation Mode, Connected Mode, Configuration
- Valid Scenarios, Error Cases, Test Endpoint

### 4. Test ID
**Purpose:** Unique identifier for quick reference
**Format:** `{SUITE-ABBR}-{SEQUENCE}`
**Examples:**
- `AUTH-001` - First authentication test
- `DB-018` - 18th database test
- `DOOR-016` - 16th door control test

### 5. Test Name
**Purpose:** Clear, concise description of test behavior
**Format:** Short phrase starting with verb
**Examples:**
- "Register with all fields"
- "Check user exists - found"
- "Manual unlock"
- "Initialize in simulation mode"

### 6. Description
**Purpose:** Detailed explanation of what the test validates
**Format:** Complete sentence or phrase
**Example:** "User registration with complete information including name department and email"

### 7. Expected Input
**Purpose:** Data or parameters passed to the test
**Format:** Parameter names and values (semicolon-separated)
**Example:** `userId: 'NEWUSER001'; password: 'password123'; name: 'New User'`

### 8. Expected Output
**Purpose:** Result or assertion the test verifies
**Format:** Response status and body details
**Example:** `Status 201 success: true user created without password exposure`

### 9. Status
**Purpose:** Current test execution status
**Values:** 
- `✅ PASS` - Test currently passing
- `❌ FAIL` - Test currently failing (if any)
- `⚠️ SKIP` - Test skipped (if any)
**Current:** All 98 tests show `✅ PASS`

### 10. Priority
**Purpose:** Importance level for test execution order
**Values:**
- `Critical` - Essential functionality or security (20 tests)
- `High` - Important features and error handling (78 tests)

### 11. Notes
**Purpose:** Additional context about the test
**Format:** Brief comments or caveats
**Examples:**
- "All optional fields provided"
- "Security validation"
- "Minimum required fields validation"
- "Default behavior"

---

## Data Structure Examples

### Full Row Example (Authentication Test)
```
Test Suite:         Authentication
Module:             auth.test.js
Test Category:      Registration
Test ID:            AUTH-001
Test Name:          Register with all fields
Description:        User registration with complete information including name department and email
Expected Input:     userId: 'NEWUSER001' password: 'password123' name: 'New User' department: 'Engineering' email: 'newuser@pup.edu.ph'
Expected Output:    Status 201 success: true user created without password exposure
Status:             ✅ PASS
Priority:           High
Notes:              All optional fields provided
```

### Full Row Example (Database Test)
```
Test Suite:         Database
Module:             prisma.test.js
Test Category:      User Operations
Test ID:            DB-001
Test Name:          Check user exists - found
Description:        checkUserExists returns true for existing user
Expected Input:     userId: 'PUP001'
Expected Output:    Returns: true calls findUnique with userId
Status:             ✅ PASS
Priority:           High
Notes:              Core functionality
```

---

## Filtering & Analysis Guide

### By Test Suite
Filter to see only tests for a specific component:
- **Authentication:** 26 tests (AUTH-001 to AUTH-026)
- **Database:** 18 tests (DB-001 to DB-018)
- **Door Control:** 16 tests (DOOR-001 to DOOR-016)
- **ESP32 Controller:** 14 tests (ESP32-001 to ESP32-014)
- **QR Code:** 9 tests (QR-001 to QR-009)
- **File Management:** 15 tests (FILES-001 to FILES-015)

### By Priority
- **Critical (20 tests):** Essential security and functionality
- **High (78 tests):** Standard features and error handling

### By Category
Common categories across all tests:
- **Successful Operations:** Happy path scenarios
- **Error Cases:** Validation and error handling
- **Integration:** Multi-component workflows
- **Configuration:** System settings and management
- **Logging:** Audit trails and state tracking

---

## Test Mapping to Source Files

### Test Source Locations
```
tests/
├── auth/
│   └── auth.test.js                    → AUTH-001 to AUTH-026 (26 tests)
├── db/
│   └── prisma.test.js                  → DB-001 to DB-018 (18 tests)
├── door/
│   ├── door.test.js                    → DOOR-001 to DOOR-016 (16 tests)
│   └── esp32Controller.test.js         → ESP32-001 to ESP32-014 (14 tests)
├── qr/
│   └── qrScan.test.js                  → QR-001 to QR-009 (9 tests)
├── files/
│   └── files.test.js                   → FILES-001 to FILES-015 (15 tests)
└── utils/
    ├── prismaMock.js                   (Database mocking)
    └── axiosMock.js                    (HTTP mocking)
```

---

## Analysis Metrics

### Test Count by Suite
```
File Management .......... 15 tests (15.3%)
Authentication ........... 26 tests (26.5%)
Database ................. 18 tests (18.4%)
Door Control ............. 16 tests (16.3%)
ESP32 Controller ......... 14 tests (14.3%)
QR Code Processing ....... 9 tests (9.2%)
─────────────────────────────────────
TOTAL ..................... 98 tests (100%)
```

### Priority Distribution
```
Critical Priority ......... 20 tests (20.4%)
High Priority ............ 78 tests (79.6%)
─────────────────────────────────────
TOTAL ..................... 98 tests (100%)
```

### Status Distribution
```
✅ PASS ................... 98 tests (100%)
❌ FAIL ................... 0 tests (0%)
⚠️ SKIP ................... 0 tests (0%)
─────────────────────────────────────
TOTAL ..................... 98 tests (100%)
```

---

## Quick Reference Queries

### Find all security-related tests:
Look for tests with descriptions containing:
- "password"
- "authentication"
- "credential"
- "authorization"
- "permission"

### Find all validation tests:
Look for test names containing:
- "missing"
- "invalid"
- "validation"
- "error"

### Find all integration tests:
Look for test names containing:
- "workflow"
- "register then"
- "integration"
- "multi-step"

---

## Converting CSV to Other Formats

### Excel (.xlsx)
1. Open `test-cases-complete.csv` in Excel
2. File → Save As
3. Choose "Excel Workbook (.xlsx)"

### Google Sheets
1. Upload CSV to Google Drive
2. Right-click → Open with → Google Sheets
3. File → Save to keep as Google Sheet

### JSON
```bash
# Using csvtojson tool
csvtojson test-cases-complete.csv > test-cases.json
```

### PDF Report
```bash
# Using LibreOffice
libreoffice --headless --convert-to pdf test-cases-complete.csv
```

---

## Updating the Spreadsheet

When adding new tests:

1. **Increment the Test ID:**
   - Last AUTH test: AUTH-026
   - Next AUTH test: AUTH-027

2. **Follow the format:**
   - Maintain consistent column order
   - Use existing values as templates
   - Keep semicolon-separated values in input/output columns

3. **Update priority:**
   - Use "Critical" sparingly (security/core functionality)
   - Most tests are "High" priority

4. **Add meaningful notes:**
   - Mention any dependencies
   - Note edge cases
   - Reference related tests

---

## Statistics & Reports

### Generating Reports from CSV

**Excel Pivot Table:**
1. Select all data
2. Insert → Pivot Table
3. Drag "Test Suite" to Rows
4. Drag "Status" to Values
5. View count by suite

**Excel Charts:**
1. Create pivot table (above)
2. Insert → Chart
3. Choose Pie or Bar chart
4. Visualize distribution

**Google Sheets Query:**
```
=QUERY(A:K, "SELECT A, COUNT(A) WHERE J='✅ PASS' GROUP BY A")
```

---

## Troubleshooting

### CSV Won't Open in Excel
- Right-click file → Open with → Excel
- Or drag file to Excel window
- Check file extension is `.csv`

### Characters Look Strange
- Open in Notepad first
- Confirm encoding is UTF-8
- Try importing with comma delimiter

### Data Misaligned
- Verify commas separate columns
- Check for special characters in values
- Re-download fresh copy

---

## Related Documentation

- **TESTING.md** - Complete testing guide
- **TEST_CASES_SUMMARY.md** - Summary and reference guide
- **jest.config.js** - Jest configuration
- **tests/setup.js** - Global test setup

---

**Last Updated:** November 25, 2025
**Total Tests:** 98 (all passing ✅)
**File Format:** CSV (import to Excel, Google Sheets, etc.)

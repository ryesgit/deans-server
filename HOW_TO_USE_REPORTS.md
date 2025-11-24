# How to Use the Test Documentation

## 📁 Files Generated

```
deans-server/
├── test-reports/
│   ├── test-cases.csv          ← Open in Excel
│   ├── test-report.json        ← Machine-readable format
│   └── test-report.html        ← Visual dashboard
├── TEST_DOCUMENTATION.md       ← This document
└── scripts/
    └── generateTestReport.js   ← Report generator script
```

---

## 🎯 Opening Files

### Option 1: CSV in Excel (Recommended for spreadsheet work)

**Windows:**
```
1. Right-click test-cases.csv
2. Open with → Microsoft Excel
```

**Or:**
```
1. Open Excel
2. File → Open
3. Navigate to: test-reports/test-cases.csv
4. Click Open
```

### Option 2: HTML Report (Best for viewing)

**Windows:**
```
1. Double-click test-report.html
2. Opens in default web browser
```

**Or:**
```
1. Right-click test-report.html
2. Open with → Your preferred browser (Chrome, Edge, Firefox)
```

### Option 3: JSON Report (For automation)

```bash
# View in terminal
cat test-reports/test-report.json

# Or use any text editor
code test-reports/test-report.json
```

---

## 📊 Excel Features

### Make Spreadsheet Look Professional

**Step 1: Add Table Formatting**
```
1. Select all data (Ctrl+A)
2. Home → Format as Table
3. Choose a table style
```

**Step 2: Freeze Header Row**
```
1. Click on row 2 (first data row)
2. View → Freeze Panes
3. Now headers stay visible when scrolling
```

**Step 3: Apply AutoFilter**
```
1. Select header row
2. Data → AutoFilter
3. Click dropdown arrows to filter by Status, Category, etc.
```

**Step 4: Conditional Formatting (Color by Status)**
```
1. Select Status column (column H)
2. Home → Conditional Formatting → New Rule
3. Format only cells that contain:
   - "PASS" → Green fill
   - "FAIL" → Red fill
```

**Step 5: Adjust Column Width**
```
1. Double-click column separator to auto-fit
2. Or drag to manually resize
```

---

## 📈 Creating Analysis in Excel

### Pivot Table for Summary

```
1. Select all data
2. Insert → Pivot Table
3. New Worksheet
4. Setup:
   - Row Labels: Category
   - Values: Count of Test ID
5. Shows: How many tests per category
```

### Chart for Visualization

```
1. Create a pivot table (see above)
2. Select pivot table
3. Insert → Chart
4. Choose: Pie Chart or Bar Chart
5. Shows: Test distribution visually
```

### Summary Statistics Row

```
1. At bottom of data, add:
   - "TOTAL TESTS:" = COUNTA(A2:A25)
   - "PASSED TESTS:" = COUNTIF(H2:H25,"PASS")
   - "PASS RATE:" = COUNTIF(H2:H25,"PASS")/COUNTA(A2:A25)
```

---

## 🔄 Regenerating Reports

### When to Regenerate

- After adding new tests
- After updating test cases
- For creating fresh reports
- Before reporting to stakeholders

### How to Regenerate

```bash
# Option 1: Using npm script
npm run test:docs

# Option 2: Run directly
node scripts/generateTestReport.js

# Option 3: Run tests and generate reports
npm run test:report
```

---

## 📝 Customizing Reports

### Edit the Report Generator Script

File: `scripts/generateTestReport.js`

**Add more test cases:**
```javascript
{ 
  id: 'TC025', 
  suite: 'Authentication API', 
  name: 'your new test name',
  endpoint: 'GET /api/auth/something',
  input: 'test input',
  expected: 'expected output',
  category: 'New Category' 
},
```

**Change report output:**
```javascript
// Modify CSV headers
const headers = ['Your', 'Custom', 'Headers'];

// Modify HTML styling
// Update CSS in generateHTML() function
```

---

## 💾 Saving Your Excel Report

### Save as Different Formats

```
File → Save As → test-cases

Choose format:
- Excel Workbook (.xlsx)  ← Most compatible
- Excel 97-2003 (.xls)   ← Old Excel format
- CSV UTF-8 (.csv)       ← For importing to other tools
```

### Creating a Template

```
1. Format your CSV nicely in Excel
2. File → Save As
3. Save as: test-template.xlsx
4. Use this template for future reports
```

---

## 🎨 HTML Report Customization

### Editing HTML Report

File: `test-reports/test-report.html`

**Change colors:**
```css
/* In the <style> section */
.pass-badge { background: #28a745; }  /* Green */
.fail-badge { background: #dc3545; }  /* Red */
th { background: #007bff; }           /* Blue */
```

**Change title:**
```html
<title>My Custom Test Report - Authentication API</title>
<h1>My Custom Report Title</h1>
```

**View in browser:**
```
Double-click the HTML file
Or right-click → Open with Browser
```

---

## 📤 Sharing Reports

### Email Reports

```
1. Attach test-cases.csv for Excel users
2. Attach test-report.html for web view
3. Include TEST_DOCUMENTATION.md for reference
```

### Team Sharing

```
Option 1: Store in Git
- Commit test-reports/ folder
- Team members pull reports

Option 2: Share via Cloud
- Upload to OneDrive/SharePoint
- Share link with team

Option 3: GitHub Pages
- Commit HTML report to GitHub
- Enable GitHub Pages
- Access via: username.github.io/repo/test-report.html
```

---

## 🔍 Interpreting Results

### Test Status Legend

```
✅ PASS     = Test executed successfully
❌ FAIL     = Test did not meet expectations
⚠️  SKIP    = Test was not executed
🔄 RETRY   = Test is retrying
```

### Status Codes

```
200/201 = Success (HTTP)
400     = Bad Request (Input Error)
401     = Unauthorized (Auth Error)
404     = Not Found (Resource Error)
409     = Conflict (Duplicate Error)
500     = Server Error (System Error)
```

### Category Breakdown

```
Successful Cases      = Should always PASS (happy path)
Validation Errors    = Should return 400
Authentication Errors= Should return 401
Database Errors      = Should return 500
Integration Tests    = Multiple operations flowing together
Security Tests       = Testing protection mechanisms
```

---

## 🛠️ Troubleshooting

### CSV Opens in Text Editor Instead of Excel

```
1. Right-click test-cases.csv
2. Open with → Choose another app
3. Select: Microsoft Excel
4. Check: Always use this app
```

### HTML Report Looks Broken

```
1. Ensure file is saved in: test-reports/ folder
2. Try opening in different browser
3. Check if JavaScript is enabled
4. Regenerate with: npm run test:docs
```

### Can't Generate Reports

```
1. Check Node.js is installed: node --version
2. Check you're in project root: ls package.json
3. Run: npm run test:docs
4. If error, check test-output.txt for details
```

---

## 📚 Examples

### Example 1: Filter by Category

```
Excel Steps:
1. Select Status column
2. Data → AutoFilter
3. Click dropdown in Category column
4. Select: "Successful Registration"
5. Now see only registration success tests
```

### Example 2: Find All Failed Tests

```
Excel Steps:
1. Data → AutoFilter
2. Click dropdown in Status column
3. Uncheck: "PASS"
4. Keep checked: "FAIL"
5. Now see only failing tests
```

### Example 3: Count Tests by Category

```
Excel Formula:
=COUNTIF(G:G,"Validation Errors")

Returns: Number of validation error tests
```

---

## 📋 Quick Reference

| Task | Command |
|------|---------|
| View CSV | `Open test-reports/test-cases.csv` |
| View HTML | `Double-click test-reports/test-report.html` |
| Regenerate | `npm run test:docs` |
| Run Tests | `npm test` |
| View JSON | `code test-reports/test-report.json` |
| Edit Generator | `code scripts/generateTestReport.js` |

---

## ✅ Next Steps

1. **Open CSV in Excel** → test-reports/test-cases.csv
2. **Format nicely** → Apply table style, freeze header
3. **Add filters** → Data → AutoFilter
4. **Share with team** → Email or upload to cloud
5. **Track progress** → Regenerate reports weekly

---

**Happy Testing! 🚀**

For more info, see: `TEST_DOCUMENTATION.md`

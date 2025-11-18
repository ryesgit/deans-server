# Backend-Frontend Integration Report
## PUP Dean's Filing System

**Report Date:** November 18, 2025  
**Backend Repository:** [ryesgit/deans-server](https://github.com/ryesgit/deans-server)  
**Frontend Repository:** [ryesgit/deans-filing-system](https://github.com/ryesgit/deans-filing-system)

---

## Executive Summary

This report analyzes the gap between the PUP Dean's Filing System backend (Node.js/Express with PostgreSQL) and its React frontend. The backend provides a QR code-based file retrieval system with ESP32 door control integration, while the frontend is a comprehensive administrative dashboard for managing files, users, and requests.

**Key Finding:** The frontend and backend serve different but complementary purposes and require significant integration work to connect them. The backend focuses on QR-based file retrieval and physical access control, while the frontend provides a complete administrative interface currently using mock data.

---

## 1. System Architecture Overview

### Backend Architecture
- **Framework:** Node.js with Express.js
- **Database:** PostgreSQL with Prisma ORM
- **Key Features:**
  - QR code scanning for file retrieval
  - ESP32 microcontroller integration for door locks
  - File location tracking (row/column/shelf)
  - Access logging and transaction history
  - User and file management

### Frontend Architecture
- **Framework:** React 18 with Vite
- **Routing:** React Router v6
- **Styling:** Tailwind CSS
- **Key Features:**
  - Dashboard with statistics
  - File management with folders
  - User management
  - Request system with QR code generation
  - Reports and settings
  - Authentication system

---

## 2. API Endpoint Analysis

### 2.1 Backend API Endpoints

#### QR Code Routes (`/api/qr`)
| Endpoint | Method | Purpose | Response |
|----------|--------|---------|----------|
| `/api/qr/scan` | POST | Process QR code scan and unlock door | File location, user info, ESP32 status |
| `/api/qr/test/:userId` | GET | Test file lookup | File data for user |

#### File Routes (`/api/files`)
| Endpoint | Method | Purpose | Response |
|----------|--------|---------|----------|
| `/api/files/user/:userId` | GET | Get all files for a user | Array of files with locations |
| `/api/files/all` | GET | Get all files in system | All files with user info |
| `/api/files/search?q=query` | GET | Search files | Filtered files array |
| `/api/files/add` | POST | Add new file location | File ID confirmation |
| `/api/files/return` | POST | Return a file | Success status, lock confirmation |

#### Door Control Routes (`/api/door`)
| Endpoint | Method | Purpose | Response |
|----------|--------|---------|----------|
| `/api/door/unlock` | POST | Manual door unlock | Success status, ESP32 response |
| `/api/door/lock` | POST | Manual door lock | Success status, ESP32 response |
| `/api/door/status` | GET | Check ESP32 status | Connection status |
| `/api/door/logs` | GET | Get access logs | Transaction history |
| `/api/door/esp32/config` | POST | Configure ESP32 IP | Configuration confirmation |

#### Health Check
| Endpoint | Method | Purpose | Response |
|----------|--------|---------|----------|
| `/api/health` | GET | Server health check | Status, timestamp, ESP32 status |

### 2.2 Frontend Requirements (Currently Using Mock Data)

#### Dashboard Page
**Data Needed:**
- User profile information (name, email, role, department)
- Statistics:
  - Total files count
  - Newly added files count
  - Active borrowed files count
  - Files returned today count
  - Pending approvals count
  - Approved requests count
  - Overdue files count
  - Resolved overdue count
- Recent activity log (borrowing, returns, requests)
- Recent requests with status
- Notifications

**Current Implementation:** Uses `mockData.js` with hardcoded values

#### File Management Page
**Data Needed:**
- Folder structure with categories
- Files organized by folders
- File metadata:
  - File ID
  - File name
  - Date added
  - Department
  - Category
  - Physical location (optional for frontend)
- File upload capability
- File CRUD operations

**Current Implementation:** Uses local state with mock folders and files

#### Request Page
**Data Needed:**
- Request submission endpoint
- Request status tracking
- File request history
- User's QR code data
- Files assigned to user
- Files to be returned
- PDF viewing capability

**Current Implementation:** Uses localStorage for persistence, hardcoded user data

#### User Management Page
**Data Needed:**
- User list with filtering
- User profile data:
  - Name, role, department
  - Date joined
  - Status (active/inactive)
- User CRUD operations
- User statistics

**Current Implementation:** Uses local state with mock user data

#### Reports Page
**Data Needed:**
- Statistical reports
- Activity reports
- User reports
- File circulation reports
- Export capabilities

**Current Implementation:** Not yet analyzed in detail

#### Settings Page
**Data Needed:**
- System configuration
- User preferences
- ESP32 configuration
- Notification settings

**Current Implementation:** Not yet analyzed in detail

---

## 3. Data Model Comparison

### 3.1 Backend Database Schema

#### Users Table (Prisma)
```javascript
{
  id: Int (auto-increment)
  userId: String (unique, e.g., "PUP001")
  name: String
  department: String?
  email: String?
  createdAt: DateTime
  files: File[] (relation)
  transactions: Transaction[] (relation)
}
```

#### Files Table (Prisma)
```javascript
{
  id: Int (auto-increment)
  userId: String
  filename: String
  filePath: String? (path to actual file)
  rowPosition: Int
  columnPosition: Int
  shelfNumber: Int
  status: FileStatus (AVAILABLE, CHECKED_OUT, RETRIEVED, MAINTENANCE, MISSING)
  createdAt: DateTime
  updatedAt: DateTime?
  user: User (relation)
  transactions: Transaction[] (relation)
}
```

#### Transactions Table (Prisma)
```javascript
{
  id: Int (auto-increment)
  fileId: Int
  userId: String
  type: TransactionType (CHECKOUT, RETURN, RETRIEVAL, MAINTENANCE, LOST_REPORT)
  rowPosition: Int?
  columnPosition: Int?
  notes: String?
  dueDate: DateTime?
  returnedAt: DateTime?
  timestamp: DateTime
  file: File (relation)
  user: User (relation)
}
```

### 3.2 Frontend Data Expectations

#### User Data (mockData.js)
```javascript
{
  name: String
  email: String
  idNumber: String (e.g., "ADM-001")
  role: String ("Admin", "Faculty Member", "Department Head")
  department: String
  gender: String
  contactNumber: String
  dateOfBirth: String
  accountStatus: String
  lastLogin: String
  avatar: String (URL)
}
```

#### File Data (FileManagementPage)
```javascript
{
  id: String (e.g., "0001")
  name: String (filename)
  dateAdded: String
  department: String
  category: String (Research, Academics, Administrative, Student Records)
  folder: String (optional grouping)
}
```

#### Request Data (RequestPage)
```javascript
{
  id: String (e.g., "REQ-0001")
  fileName: String
  dateRequested: String
  returnDue: String
  status: String (Pending, Approved, Borrowed, Returned, Declined, View PDF)
  copyType: String (soft, original)
  priority: String (Low, Medium, High)
  department: String
  category: String
  purpose: String
}
```

---

## 4. Integration Gaps and Mismatches

### 4.1 Data Structure Gaps

#### User Data Mismatch
- **Backend has:** `userId`, `name`, `department`, `email`, `createdAt`
- **Frontend needs:** `idNumber`, `role`, `gender`, `contactNumber`, `dateOfBirth`, `accountStatus`, `lastLogin`, `avatar`
- **Gap:** Backend missing role, gender, contact info, DOB, account status, last login, avatar

#### File Data Mismatch
- **Backend has:** `id`, `userId`, `filename`, `rowPosition`, `columnPosition`, `shelfNumber`, `status`, `createdAt`, `updatedAt`
- **Frontend needs:** `id`, `name`, `dateAdded`, `department`, `category`, folder organization
- **Gap:** Backend missing file categories, folder grouping; Frontend doesn't use physical location data

#### Request/Transaction Mismatch
- **Backend has:** Transaction model with `type`, `fileId`, `userId`, `notes`, `dueDate`, `returnedAt`
- **Frontend needs:** Request model with `requestId`, `status`, `copyType`, `priority`, `purpose`
- **Gap:** Completely different models - backend tracks transactions, frontend needs approval workflow

### 4.2 Missing Backend Features

1. **Authentication & Authorization**
   - Frontend has login page and protected routes
   - Backend has no authentication endpoints
   - No JWT or session management
   - No role-based access control

2. **Request/Approval System**
   - Frontend has full request submission workflow
   - Backend only has transaction logging
   - No approval workflow in backend
   - No request status tracking

3. **File Categories and Folders**
   - Frontend organizes files in folders with categories
   - Backend only tracks physical location
   - No folder or category concept in backend

4. **Dashboard Statistics**
   - Frontend needs aggregated statistics
   - Backend can provide raw data but no statistics endpoints
   - No endpoints for:
     - Total/new files count
     - Active borrowed count
     - Pending approvals
     - Overdue files

5. **User Profile Management**
   - Frontend allows editing user profiles
   - Backend only has basic user creation
   - No profile update endpoints
   - Missing user fields (role, gender, contact, etc.)

6. **Soft Copy vs Original Copy**
   - Frontend distinguishes between soft and original copies
   - Backend assumes all files are physical (with locations)
   - No digital file storage/retrieval in backend

7. **Notifications System**
   - Frontend has notification context and dropdown
   - Backend has no notification system
   - No real-time updates or alerts

8. **File Upload/Download**
   - Frontend allows file uploads (PDF)
   - Backend only tracks file metadata and location
   - No actual file storage or serving endpoints

### 4.3 Missing Frontend Integration

1. **QR Code Scanning Integration**
   - Frontend generates QR codes
   - No integration with backend QR scan endpoint
   - QR codes don't trigger backend actions

2. **Physical Location Usage**
   - Backend tracks row/column/shelf positions
   - Frontend doesn't display or use this data
   - No visual representation of file cabinet

3. **ESP32 Door Control**
   - Backend integrates with ESP32 for door locks
   - Frontend has no interface for this feature
   - No status display or manual control

4. **Real Transaction History**
   - Backend logs all transactions
   - Frontend doesn't fetch or display this data
   - Activity log is mock data only

5. **API Integration**
   - Frontend uses mock data throughout
   - No API calls to backend
   - No API service layer or HTTP client setup

---

## 5. Required Backend Changes

### 5.1 High Priority - Essential Integration

#### 1. Authentication System
**Task:** Implement JWT-based authentication
- [ ] Add authentication endpoints:
  - `POST /api/auth/login` - User login
  - `POST /api/auth/logout` - User logout
  - `POST /api/auth/refresh` - Refresh token
  - `GET /api/auth/me` - Get current user
- [ ] Extend User model with:
  - `password` (hashed)
  - `role` (Admin, Faculty, Department Head)
  - `refreshToken`
  - `lastLogin`
- [ ] Add middleware for JWT verification
- [ ] Implement role-based access control (RBAC)
- [ ] Add password hashing (bcrypt)

#### 2. User Profile Management
**Task:** Extend user endpoints for full profile management
- [ ] Extend User model with:
  - `idNumber` (unique identifier like ADM-001)
  - `role` (enum: Admin, Faculty, Department Head, Staff)
  - `gender`
  - `contactNumber`
  - `dateOfBirth`
  - `accountStatus` (enum: Active, Inactive, Suspended)
  - `avatar` (URL or path)
- [ ] Add endpoints:
  - `GET /api/users` - List all users (with pagination, filtering)
  - `GET /api/users/:id` - Get user by ID
  - `POST /api/users` - Create new user
  - `PUT /api/users/:id` - Update user
  - `DELETE /api/users/:id` - Delete user
  - `GET /api/users/stats` - Get user statistics

#### 3. File Categories and Organization
**Task:** Add folder/category system to files
- [ ] Create new Folder model:
  ```javascript
  {
    id: Int
    name: String
    category: String (Research, Academics, Administrative, Student Records)
    fileCount: Int
    createdAt: DateTime
    updatedAt: DateTime
  }
  ```
- [ ] Extend File model with:
  - `folderId` (foreign key)
  - `category` (enum)
  - `fileType` (enum: SoftCopy, OriginalCopy)
  - `fileUrl` (for soft copies)
- [ ] Add folder endpoints:
  - `GET /api/folders` - List all folders
  - `POST /api/folders` - Create folder
  - `PUT /api/folders/:id` - Update folder
  - `DELETE /api/folders/:id` - Delete folder
- [ ] Update file endpoints to include folder filtering

#### 4. Request/Approval System
**Task:** Implement request workflow separate from transactions
- [ ] Create Request model:
  ```javascript
  {
    id: Int
    requestId: String (unique, e.g., "REQ-0001")
    userId: String
    fileName: String
    fileId: Int? (linked after approval)
    department: String
    category: String
    purpose: String
    copyType: String (soft, original)
    priority: String (Low, Medium, High)
    status: String (Pending, Approved, Declined)
    returnDue: DateTime?
    requestedAt: DateTime
    approvedAt: DateTime?
    approvedBy: String?
    notes: String?
  }
  ```
- [ ] Add request endpoints:
  - `POST /api/requests` - Submit new request
  - `GET /api/requests` - List requests (with filtering)
  - `GET /api/requests/:id` - Get request details
  - `PUT /api/requests/:id/approve` - Approve request
  - `PUT /api/requests/:id/decline` - Decline request
  - `GET /api/requests/stats` - Request statistics

#### 5. Dashboard Statistics
**Task:** Add aggregation endpoints for dashboard
- [ ] Create statistics endpoints:
  - `GET /api/stats/dashboard` - All dashboard stats
  - `GET /api/stats/files` - File statistics
  - `GET /api/stats/borrowing` - Borrowing statistics
  - `GET /api/stats/requests` - Request statistics
  - `GET /api/stats/users` - User statistics
- [ ] Implement queries for:
  - Total files count
  - Newly added files (last 30 days)
  - Active borrowed files
  - Files returned today
  - Pending approvals count
  - Approved requests count
  - Overdue files count
  - Resolved overdue count

#### 6. File Upload/Download
**Task:** Implement file storage for soft copies
- [ ] Add file upload endpoint:
  - `POST /api/files/upload` - Upload PDF file
- [ ] Add file download endpoint:
  - `GET /api/files/:id/download` - Download file
- [ ] Implement file storage:
  - Use local filesystem or cloud storage (AWS S3, Azure Blob)
  - Store file path in `filePath` field
- [ ] Add file validation:
  - PDF format validation
  - File size limits
  - Virus scanning (optional)

### 5.2 Medium Priority - Enhanced Features

#### 7. Activity Log Endpoint
**Task:** Provide activity feed for dashboard
- [ ] Create endpoint:
  - `GET /api/activity/recent` - Recent activity log
- [ ] Return formatted activity data:
  - User name, action type, file name, timestamp
  - Support pagination and filtering
  - Include avatar URLs

#### 8. Notifications System
**Task:** Implement notification system
- [ ] Create Notification model:
  ```javascript
  {
    id: Int
    userId: String
    message: String
    type: String (info, warning, error, success)
    read: Boolean
    createdAt: DateTime
  }
  ```
- [ ] Add notification endpoints:
  - `GET /api/notifications` - Get user notifications
  - `PUT /api/notifications/:id/read` - Mark as read
  - `POST /api/notifications` - Create notification (internal)
- [ ] Trigger notifications on:
  - New file request
  - Request approval/decline
  - File overdue
  - File returned

#### 9. Reports System
**Task:** Add report generation endpoints
- [ ] Create report endpoints:
  - `GET /api/reports/activity` - Activity report
  - `GET /api/reports/files` - File circulation report
  - `GET /api/reports/users` - User report
  - `GET /api/reports/overdue` - Overdue files report
- [ ] Support export formats:
  - JSON (default)
  - CSV
  - PDF (optional)

#### 10. Search Enhancement
**Task:** Improve search functionality
- [ ] Enhance `/api/files/search`:
  - Add advanced filtering (by category, folder, status, date range)
  - Add sorting options
  - Return highlighted search results
- [ ] Add search endpoints:
  - `GET /api/search/users` - Search users
  - `GET /api/search/requests` - Search requests
  - `GET /api/search/global` - Global search across all entities

### 5.3 Low Priority - Nice to Have

#### 11. Settings Management
**Task:** Add system configuration endpoints
- [ ] Create Settings model for system-wide configs
- [ ] Add endpoints:
  - `GET /api/settings` - Get all settings
  - `PUT /api/settings` - Update settings
- [ ] Configurable items:
  - Default return period
  - Email notifications
  - File size limits
  - ESP32 configuration

#### 12. Email Notifications
**Task:** Implement email notification system
- [ ] Integrate email service (SendGrid, AWS SES, Nodemailer)
- [ ] Send emails for:
  - Request approval/decline
  - Overdue file warnings
  - Password reset
  - Account creation

#### 13. Real-time Updates
**Task:** Add WebSocket support for real-time features
- [ ] Implement Socket.io
- [ ] Real-time notifications
- [ ] Live dashboard updates
- [ ] Activity log streaming

---

## 6. Required Frontend Changes

### 6.1 High Priority - Essential Integration

#### 1. API Service Layer
**Task:** Create centralized API service
- [ ] Create `src/services/api.js`:
  - Axios instance with base URL configuration
  - Request/response interceptors for auth tokens
  - Error handling middleware
- [ ] Create service modules:
  - `authService.js` - Authentication calls
  - `userService.js` - User management calls
  - `fileService.js` - File operations
  - `requestService.js` - Request operations
  - `dashboardService.js` - Dashboard data
  - `notificationService.js` - Notifications

#### 2. Environment Configuration
**Task:** Add backend URL configuration
- [ ] Create `.env` file:
  ```
  VITE_API_BASE_URL=http://localhost:3001
  VITE_WS_URL=ws://localhost:3001
  ```
- [ ] Update Vite config to expose env variables
- [ ] Create `src/config/api.js` for API configuration

#### 3. Authentication Integration
**Task:** Connect login to backend
- [ ] Update `AuthContext.jsx`:
  - Replace mock authentication with API calls
  - Store JWT token in localStorage/cookies
  - Implement token refresh logic
  - Add logout functionality
- [ ] Update `LoginPage.jsx`:
  - Call `POST /api/auth/login`
  - Handle authentication errors
  - Redirect on success
- [ ] Add token to all API requests via interceptor

#### 4. Dashboard Data Integration
**Task:** Fetch real dashboard data
- [ ] Update `DashboardPage.jsx`:
  - Fetch user profile from `GET /api/auth/me`
  - Fetch statistics from `GET /api/stats/dashboard`
  - Fetch activity log from `GET /api/activity/recent`
  - Fetch recent requests from `GET /api/requests?limit=5`
- [ ] Replace `mockData.js` imports with API calls
- [ ] Add loading states and error handling
- [ ] Implement data refresh intervals

#### 5. File Management Integration
**Task:** Connect file management to backend
- [ ] Update `FileManagementPage.jsx`:
  - Fetch folders from `GET /api/folders`
  - Fetch files from `GET /api/files/all` or by folder
  - Implement file upload to `POST /api/files/upload`
  - Connect file CRUD operations to API
- [ ] Add file upload progress indicators
- [ ] Handle upload errors and validation
- [ ] Update file display to show backend data structure

#### 6. Request System Integration
**Task:** Connect request submission to backend
- [ ] Update `RequestPage.jsx`:
  - Submit requests to `POST /api/requests`
  - Fetch request history from `GET /api/requests?userId=X`
  - Update request status display to match backend statuses
  - Poll for request updates or use WebSocket
- [ ] Handle soft copy vs original copy logic
- [ ] Integrate QR code with backend user data

#### 7. User Management Integration
**Task:** Connect user management to backend
- [ ] Update `UserManagementPage.jsx`:
  - Fetch users from `GET /api/users`
  - Implement user creation via `POST /api/users`
  - Implement user updates via `PUT /api/users/:id`
  - Implement user deletion via `DELETE /api/users/:id`
  - Fetch statistics from `GET /api/users/stats`
- [ ] Update user model to match backend schema
- [ ] Add validation for required fields

### 6.2 Medium Priority - Enhanced Features

#### 8. Notification Integration
**Task:** Connect notification system to backend
- [ ] Update `NotificationContext.jsx`:
  - Fetch notifications from `GET /api/notifications`
  - Mark notifications as read via API
  - Implement real-time updates (WebSocket or polling)
- [ ] Remove mock notification data
- [ ] Add notification preferences

#### 9. Physical Location Display
**Task:** Show physical file locations
- [ ] Add location display in file details
- [ ] Create visual cabinet layout component (optional)
- [ ] Show row/column/shelf in file list

#### 10. ESP32 Control Interface
**Task:** Add ESP32 management page (optional)
- [ ] Create `ESP32ControlPage.jsx`:
  - Display ESP32 connection status
  - Manual lock/unlock controls
  - View access logs
  - Configure ESP32 IP address
- [ ] Add to navigation if needed

#### 11. Reports Integration
**Task:** Connect reports to backend
- [ ] Update `ReportsPage.jsx`:
  - Fetch report data from backend endpoints
  - Implement report filtering and date ranges
  - Add export functionality (CSV, PDF)
- [ ] Remove mock report data

#### 12. Settings Integration
**Task:** Connect settings to backend
- [ ] Update `SettingsPage.jsx`:
  - Fetch settings from `GET /api/settings`
  - Update settings via `PUT /api/settings`
  - Add ESP32 configuration section
- [ ] Add user preferences management

### 6.3 Low Priority - Polish and Enhancement

#### 13. Error Handling and User Feedback
**Task:** Improve error handling
- [ ] Create global error boundary component
- [ ] Add toast notifications for success/error messages
- [ ] Implement retry logic for failed requests
- [ ] Add offline detection and messaging

#### 14. Loading States
**Task:** Add proper loading indicators
- [ ] Create reusable loading components
- [ ] Add skeleton screens for data loading
- [ ] Implement optimistic UI updates

#### 15. Data Caching
**Task:** Implement caching strategy
- [ ] Use React Query or SWR for data fetching
- [ ] Cache frequently accessed data
- [ ] Implement cache invalidation strategies

---

## 7. Database Schema Updates

### 7.1 New Models Required

#### 1. Enhanced User Model
```prisma
model User {
  id              Int              @id @default(autoincrement())
  userId          String           @unique @map("user_id")
  idNumber        String?          @unique @map("id_number")  // NEW
  name            String
  email           String?          @unique
  password        String?                                      // NEW
  role            UserRole         @default(FACULTY)          // NEW
  department      String?
  gender          String?                                      // NEW
  contactNumber   String?          @map("contact_number")     // NEW
  dateOfBirth     DateTime?        @map("date_of_birth")      // NEW
  accountStatus   AccountStatus    @default(ACTIVE)           // NEW
  avatar          String?                                      // NEW
  lastLogin       DateTime?        @map("last_login")         // NEW
  refreshToken    String?          @map("refresh_token")      // NEW
  createdAt       DateTime         @default(now()) @map("created_at")
  updatedAt       DateTime?        @updatedAt @map("updated_at")
  
  files           File[]
  transactions    Transaction[]
  requests        Request[]        // NEW
  notifications   Notification[]   // NEW
  
  @@map("users")
}

enum UserRole {
  ADMIN
  FACULTY
  DEPARTMENT_HEAD
  STAFF
  
  @@map("user_role")
}

enum AccountStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
  
  @@map("account_status")
}
```

#### 2. Folder Model
```prisma
model Folder {
  id          Int       @id @default(autoincrement())
  name        String
  category    String
  fileCount   Int       @default(0) @map("file_count")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime? @updatedAt @map("updated_at")
  
  files       File[]
  
  @@map("folders")
}
```

#### 3. Enhanced File Model
```prisma
model File {
  id              Int           @id @default(autoincrement())
  userId          String        @map("user_id")
  folderId        Int?          @map("folder_id")              // NEW
  filename        String
  filePath        String?       @map("file_path")
  fileUrl         String?       @map("file_url")               // NEW
  fileType        FileType      @default(ORIGINAL_COPY)        // NEW
  category        FileCategory? @map("category")               // NEW
  rowPosition     Int?          @map("row_position")           // Now optional
  columnPosition  Int?          @map("column_position")        // Now optional
  shelfNumber     Int?          @default(1) @map("shelf_number") // Now optional
  status          FileStatus    @default(AVAILABLE)
  createdAt       DateTime      @default(now()) @map("created_at")
  updatedAt       DateTime?     @updatedAt @map("updated_at")
  
  user            User          @relation(fields: [userId], references: [userId], onDelete: Cascade)
  folder          Folder?       @relation(fields: [folderId], references: [id])  // NEW
  transactions    Transaction[]
  
  @@map("files")
}

enum FileType {
  SOFT_COPY
  ORIGINAL_COPY
  
  @@map("file_type")
}

enum FileCategory {
  RESEARCH
  ACADEMICS
  ADMINISTRATIVE
  STUDENT_RECORDS
  THESIS
  REPORTS
  GUIDELINES
  HANDBOOKS
  
  @@map("file_category")
}
```

#### 4. Request Model
```prisma
model Request {
  id            Int           @id @default(autoincrement())
  requestId     String        @unique @map("request_id")
  userId        String        @map("user_id")
  fileId        Int?          @map("file_id")
  fileName      String        @map("file_name")
  department    String
  category      String
  purpose       String
  copyType      String        @map("copy_type")
  priority      RequestPriority?
  status        RequestStatus @default(PENDING)
  returnDue     DateTime?     @map("return_due")
  requestedAt   DateTime      @default(now()) @map("requested_at")
  approvedAt    DateTime?     @map("approved_at")
  approvedBy    String?       @map("approved_by")
  declinedAt    DateTime?     @map("declined_at")
  notes         String?
  
  user          User          @relation(fields: [userId], references: [userId], onDelete: Cascade)
  
  @@map("requests")
}

enum RequestPriority {
  LOW
  MEDIUM
  HIGH
  
  @@map("request_priority")
}

enum RequestStatus {
  PENDING
  APPROVED
  DECLINED
  FULFILLED
  CANCELLED
  
  @@map("request_status")
}
```

#### 5. Notification Model
```prisma
model Notification {
  id          Int       @id @default(autoincrement())
  userId      String    @map("user_id")
  message     String
  type        NotificationType @default(INFO)
  read        Boolean   @default(false)
  createdAt   DateTime  @default(now()) @map("created_at")
  
  user        User      @relation(fields: [userId], references: [userId], onDelete: Cascade)
  
  @@map("notifications")
}

enum NotificationType {
  INFO
  WARNING
  ERROR
  SUCCESS
  
  @@map("notification_type")
}
```

#### 6. Settings Model
```prisma
model Setting {
  id          Int       @id @default(autoincrement())
  key         String    @unique
  value       String
  description String?
  updatedAt   DateTime  @updatedAt @map("updated_at")
  
  @@map("settings")
}
```

### 7.2 Migration Strategy

1. **Create migration for new models:**
   ```bash
   npx prisma migrate dev --name add_folders_requests_notifications
   ```

2. **Update existing models:**
   ```bash
   npx prisma migrate dev --name enhance_user_file_models
   ```

3. **Seed new data:**
   - Update seed script to include folders
   - Add sample requests
   - Create admin user with password

---

## 8. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
**Goal:** Establish basic connectivity between frontend and backend

1. **Backend:**
   - [ ] Implement authentication system (JWT)
   - [ ] Add CORS configuration for frontend origin
   - [ ] Extend User model with profile fields
   - [ ] Create basic user management endpoints
   - [ ] Add dashboard statistics endpoint

2. **Frontend:**
   - [ ] Create API service layer
   - [ ] Set up environment configuration
   - [ ] Integrate authentication with backend
   - [ ] Connect dashboard to real data
   - [ ] Add error handling framework

3. **Testing:**
   - [ ] Test login flow end-to-end
   - [ ] Verify dashboard data display
   - [ ] Test API error handling

### Phase 2: Core Features (Weeks 3-4)
**Goal:** Connect main features (files and requests)

1. **Backend:**
   - [ ] Create Folder and enhanced File models
   - [ ] Implement file upload/download
   - [ ] Create Request model and endpoints
   - [ ] Add file categories and organization
   - [ ] Implement request approval workflow

2. **Frontend:**
   - [ ] Integrate file management with backend
   - [ ] Connect request submission system
   - [ ] Implement file upload UI
   - [ ] Update file display to show categories
   - [ ] Add request status tracking

3. **Testing:**
   - [ ] Test file upload and retrieval
   - [ ] Test request submission and approval
   - [ ] Verify folder organization

### Phase 3: User Management (Week 5)
**Goal:** Complete user management integration

1. **Backend:**
   - [ ] Complete user CRUD endpoints
   - [ ] Add user filtering and search
   - [ ] Implement role-based permissions
   - [ ] Add user statistics endpoint

2. **Frontend:**
   - [ ] Connect user management to backend
   - [ ] Implement user creation/editing
   - [ ] Add user filtering
   - [ ] Display user statistics

3. **Testing:**
   - [ ] Test user CRUD operations
   - [ ] Verify role-based access
   - [ ] Test user search and filtering

### Phase 4: Notifications & Activity (Week 6)
**Goal:** Add real-time features and activity tracking

1. **Backend:**
   - [ ] Create Notification model and endpoints
   - [ ] Implement activity log endpoint
   - [ ] Add notification triggers
   - [ ] Optional: Add WebSocket support

2. **Frontend:**
   - [ ] Integrate notification system
   - [ ] Connect activity log
   - [ ] Add real-time updates
   - [ ] Implement notification preferences

3. **Testing:**
   - [ ] Test notification delivery
   - [ ] Verify activity log accuracy
   - [ ] Test real-time updates

### Phase 5: Reports & Settings (Week 7)
**Goal:** Complete administrative features

1. **Backend:**
   - [ ] Implement report generation endpoints
   - [ ] Create Settings model and endpoints
   - [ ] Add export functionality (CSV, PDF)
   - [ ] Enhance search capabilities

2. **Frontend:**
   - [ ] Connect reports to backend
   - [ ] Integrate settings management
   - [ ] Add export UI
   - [ ] Improve search interface

3. **Testing:**
   - [ ] Test report generation
   - [ ] Verify export functionality
   - [ ] Test settings management

### Phase 6: Polish & Optimization (Week 8)
**Goal:** Refine and optimize the integrated system

1. **Backend:**
   - [ ] Add email notifications
   - [ ] Optimize database queries
   - [ ] Add caching where appropriate
   - [ ] Improve error messages

2. **Frontend:**
   - [ ] Implement data caching (React Query)
   - [ ] Add loading states throughout
   - [ ] Improve error messages
   - [ ] Add success feedback

3. **Testing:**
   - [ ] End-to-end testing of all flows
   - [ ] Performance testing
   - [ ] User acceptance testing

---

## 9. Technical Considerations

### 9.1 CORS Configuration
Backend needs to allow frontend origin:
```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
```

### 9.2 File Storage
Recommendations for file storage:
- **Development:** Local filesystem in `/uploads` directory
- **Production:** Cloud storage (AWS S3, Azure Blob, Google Cloud Storage)
- Consider file size limits and virus scanning

### 9.3 Authentication Security
- Use bcrypt for password hashing
- Implement JWT with short expiration (15 minutes)
- Use refresh tokens for extended sessions
- Store tokens securely (httpOnly cookies for refresh token)
- Implement rate limiting on auth endpoints

### 9.4 Database Performance
- Add indexes on frequently queried fields:
  - `users.userId`, `users.email`, `users.idNumber`
  - `files.userId`, `files.folderId`, `files.status`
  - `requests.userId`, `requests.status`
  - `transactions.userId`, `transactions.fileId`
- Consider pagination for all list endpoints
- Implement query result caching for statistics

### 9.5 API Versioning
Consider adding API versioning:
```javascript
app.use('/api/v1/qr', qrRoutes);
app.use('/api/v1/files', fileRoutes);
// etc.
```

### 9.6 Environment Variables
Backend `.env` should include:
```
DATABASE_URL=postgresql://user:password@localhost:5432/filing_system
JWT_SECRET=your-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-here
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
ESP32_IP=192.168.1.100
ESP32_PORT=80
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
```

---

## 10. Testing Strategy

### 10.1 Backend Testing
- Maintain existing 89% test coverage
- Add tests for new endpoints:
  - Authentication flow
  - User CRUD operations
  - Request workflow
  - File upload/download
  - Statistics calculations
- Test authorization middleware
- Test validation and error cases

### 10.2 Frontend Testing
- Add unit tests for services
- Component testing with React Testing Library
- Integration tests for forms and workflows
- E2E tests with Playwright/Cypress for critical paths:
  - Login → Dashboard
  - Submit request flow
  - File upload flow
  - User management flow

### 10.3 Integration Testing
- Test complete workflows end-to-end:
  - User registration → Login → File request → Approval
  - File upload → Categorization → Search → Download
  - QR code scan → Door unlock → Transaction log
- Test error scenarios:
  - Network failures
  - Invalid tokens
  - Missing data
  - Concurrent requests

---

## 11. Security Considerations

### 11.1 Backend Security
- [x] Helmet.js already implemented
- [x] CORS already configured
- [ ] Add rate limiting (express-rate-limit)
- [ ] Input validation on all endpoints (express-validator)
- [ ] SQL injection prevention (Prisma handles this)
- [ ] File upload validation (file type, size, content)
- [ ] Implement CSRF protection for state-changing operations
- [ ] Add logging for security events

### 11.2 Frontend Security
- [ ] Sanitize user input before display
- [ ] Store tokens securely (avoid localStorage for sensitive tokens)
- [ ] Implement CSP (Content Security Policy)
- [ ] Add XSS protection
- [ ] Validate file uploads client-side
- [ ] Implement request timeout handling

### 11.3 Data Privacy
- [ ] Encrypt sensitive data in database
- [ ] Implement data retention policies
- [ ] Add GDPR compliance features (data export, deletion)
- [ ] Audit logging for sensitive operations
- [ ] Implement user consent management

---

## 12. Deployment Considerations

### 12.1 Backend Deployment
**Recommendations:**
- **Platform:** Heroku, AWS Elastic Beanstalk, DigitalOcean, Railway
- **Database:** Heroku Postgres, AWS RDS, DigitalOcean Managed Database
- **File Storage:** AWS S3, Cloudinary, Azure Blob Storage
- **Environment:** Ensure all env variables are set
- **Health Check:** `/api/health` endpoint for monitoring

### 12.2 Frontend Deployment
**Recommendations:**
- **Platform:** Vercel, Netlify, AWS Amplify, GitHub Pages
- **Build:** `npm run build` creates production bundle
- **Environment:** Set `VITE_API_BASE_URL` to production backend URL
- **CDN:** Use platform's CDN for optimal performance

### 12.3 CI/CD Pipeline
**Recommended setup:**
- **Backend:**
  - Run tests on every push
  - Run Prisma migrations on deployment
  - Deploy on merge to main
  - Health check after deployment
  
- **Frontend:**
  - Run linting and tests
  - Build and deploy on merge to main
  - Preview deployments for PRs

---

## 13. Documentation Needs

### 13.1 Backend Documentation
- [ ] Update README with new endpoints
- [ ] Add API documentation (Swagger/OpenAPI)
- [ ] Document authentication flow
- [ ] Add database schema diagram
- [ ] Document deployment process
- [ ] Add troubleshooting guide

### 13.2 Frontend Documentation
- [ ] Update README with setup instructions
- [ ] Document component structure
- [ ] Add API service usage guide
- [ ] Document state management approach
- [ ] Add contribution guidelines
- [ ] Create user manual (optional)

### 13.3 Integration Documentation
- [ ] Create this integration guide (done)
- [ ] Add sequence diagrams for key workflows
- [ ] Document data flow between systems
- [ ] Add troubleshooting for common integration issues

---

## 14. Summary and Recommendations

### 14.1 Key Takeaways

1. **Significant Integration Work Required:** The frontend and backend serve complementary purposes but require substantial work to connect properly.

2. **Backend Gaps:** The backend lacks authentication, request management, file categories, user profiles, and statistics endpoints that the frontend needs.

3. **Frontend Gaps:** The frontend uses all mock data and has no API integration whatsoever.

4. **Data Model Mismatches:** Significant differences exist between backend database schema and frontend expectations, requiring schema updates.

5. **Feature Misalignment:** Backend focuses on QR-based physical file retrieval while frontend provides comprehensive administrative management.

### 14.2 Recommended Approach

**Option 1: Full Integration (Recommended)**
- Follow the 8-week implementation roadmap
- Update backend to support all frontend features
- Connect frontend to all backend endpoints
- Results in a complete, production-ready system

**Option 2: Phased Approach**
- Start with Phase 1-3 (6 weeks)
- Get basic functionality working
- Evaluate and iterate
- Complete remaining phases as needed

**Option 3: Hybrid System**
- Keep QR/ESP32 backend as-is for file retrieval
- Build separate admin backend for frontend
- Connect systems via shared database
- More complex but separates concerns

### 14.3 Effort Estimation

**Backend Development:** 120-160 hours
- Authentication: 16 hours
- User management: 24 hours
- File system enhancement: 32 hours
- Request system: 24 hours
- Statistics and reports: 16 hours
- Notifications: 12 hours
- Testing and refinement: 16-36 hours

**Frontend Development:** 80-120 hours
- API integration layer: 16 hours
- Authentication integration: 12 hours
- Dashboard integration: 16 hours
- File management integration: 20 hours
- Request system integration: 16 hours
- User management integration: 12 hours
- Testing and refinement: 8-28 hours

**Total Estimated Effort:** 200-280 hours (5-7 weeks for one developer, 3-4 weeks for a team)

### 14.4 Critical Success Factors

1. **Clear Communication:** Ensure frontend and backend teams align on data models and APIs
2. **API Contract:** Define and document API contracts before implementation
3. **Incremental Testing:** Test integration at each phase, don't wait until the end
4. **Version Control:** Use feature branches and PR reviews
5. **User Feedback:** Get user feedback early and often
6. **Documentation:** Keep documentation updated as you build

---

## 15. Next Steps

### Immediate Actions

1. **Review and Prioritize:**
   - Review this report with the team
   - Prioritize features based on business needs
   - Decide on integration approach (Option 1, 2, or 3)

2. **Setup:**
   - Create GitHub Projects or Jira board for tracking
   - Set up development environments
   - Configure CI/CD pipelines

3. **Phase 1 Kickoff:**
   - Implement authentication (backend)
   - Create API service layer (frontend)
   - Establish basic connectivity
   - Test login flow

4. **Weekly Sprints:**
   - Follow the implementation roadmap
   - Hold weekly demos
   - Adjust plan based on progress and feedback

### Long-term Considerations

- **Scalability:** Plan for growth in users and files
- **Mobile App:** Consider mobile app for QR scanning
- **Analytics:** Add usage analytics and insights
- **Backup and Recovery:** Implement robust backup strategy
- **Performance Monitoring:** Add APM tools (New Relic, Datadog)

---

## 16. Conclusion

The PUP Dean's Filing System has a solid foundation with a working backend for QR-based file retrieval and a polished React frontend for administrative management. However, these two systems are currently disconnected and require significant integration work to function as a unified application.

The primary gaps are:
- Missing authentication and authorization
- Incomplete user and file management in backend
- No request/approval workflow in backend
- Complete lack of API integration in frontend
- Data model mismatches

By following the recommended 8-week implementation roadmap and addressing the identified gaps systematically, the project can be transformed into a production-ready, fully integrated filing system that serves both administrative users and end-users effectively.

The effort is substantial but manageable, with clear tasks and priorities outlined in this report. Success will require collaboration between frontend and backend teams, disciplined execution of the roadmap, and continuous testing and validation.

---

**Report prepared by:** GitHub Copilot  
**Date:** November 18, 2025  
**Version:** 1.0  
**Status:** Ready for Review

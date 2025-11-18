# PUP Dean's Filing System Backend

Backend server for the PUP Filing System with comprehensive authentication, file management, QR code scanning, and ESP32 door control integration.

## Features

- **🔐 JWT Authentication**: Secure login with role-based access control
- **👥 User Management**: Complete CRUD operations with roles (Admin, Staff, Student, Faculty)
- **📁 File Management**: Upload, download, categorize, and track files
- **📊 Dashboard Statistics**: Real-time analytics and reporting
- **📋 Request System**: File access requests with approval workflow
- **🔔 Notifications**: User notifications for important events
- **📱 QR Code Processing**: Scan QR codes for automated file retrieval
- **🗂️ Categories**: Organize files with customizable categories
- **📈 Reports**: Generate comprehensive system reports
- **🚪 ESP32 Integration**: Automated door control for physical file access
- **⚙️ System Settings**: Configurable system parameters
- **PostgreSQL Database**: Robust data storage with Prisma ORM

## Table of Contents

- [API Endpoints](#api-endpoints)
- [Database Schema](#database-schema)
- [Authentication](#authentication)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Testing](#testing)
- [Security](#security)
- [Frontend Integration](#frontend-integration)

## API Endpoints

### Authentication (`/api/auth`)

#### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "userId": "ADMIN001",    # Or use email instead
  "password": "admin123"
}

# Response
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "userId": "ADMIN001",
    "name": "Admin User",
    "email": "admin@pup.edu.ph",
    "role": "ADMIN",
    "department": "Administration",
    "status": "ACTIVE"
  }
}
```

#### Get Current User
```bash
GET /api/auth/me
Authorization: Bearer <token>

# Response
{
  "message": "Profile retrieved successfully",
  "user": { ... }
}
```

#### Update Profile
```bash
PUT /api/auth/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Name",
  "contactNumber": "09123456789",
  "gender": "Male",
  "avatar": "https://example.com/avatar.jpg"
}
```

#### Change Password
```bash
PUT /api/auth/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "oldpass123",
  "newPassword": "newpass456"
}
```

#### Logout
```bash
POST /api/auth/logout
Authorization: Bearer <token>
```

---

### User Management (`/api/users`)

All user endpoints require authentication. Most require ADMIN or STAFF role.

#### List All Users
```bash
GET /api/users?page=1&limit=50&role=STUDENT&status=ACTIVE&search=john
Authorization: Bearer <token>

# Response
{
  "message": "Users retrieved successfully",
  "users": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "pages": 3
  }
}
```

#### Get User by ID
```bash
GET /api/users/:userId
Authorization: Bearer <token>
```

#### Create User (Admin only)
```bash
POST /api/users
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "USER004",
  "name": "New User",
  "email": "newuser@pup.edu.ph",
  "password": "password123",
  "role": "STUDENT",
  "department": "Computer Science",
  "contactNumber": "09123456789",
  "gender": "Male",
  "status": "ACTIVE"
}
```

#### Update User
```bash
PUT /api/users/:userId
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Name",
  "department": "Engineering"
}
```

#### Delete User (Admin only)
```bash
DELETE /api/users/:userId
Authorization: Bearer <token>
```

---

### Statistics & Dashboard (`/api/stats`)

#### Dashboard Statistics
```bash
GET /api/stats/dashboard
Authorization: Bearer <token>

# Response - Comprehensive dashboard data
{
  "message": "Dashboard statistics retrieved successfully",
  "stats": {
    "overview": {
      "totalUsers": 100,
      "totalFiles": 500,
      "availableFiles": 400,
      "retrievedFiles": 50,
      "totalRequests": 75,
      "pendingRequests": 10,
      "approvedRequests": 60,
      "totalTransactions": 200
    },
    "today": {
      "newFiles": 5,
      "returns": 3
    },
    "filesByStatus": { ... },
    "requestsByStatus": { ... },
    "departments": [ ... ],
    "recentActivity": [ ... ]
  }
}
```

#### File Statistics (Admin/Staff)
```bash
GET /api/stats/files
Authorization: Bearer <token>
```

#### User Statistics (Admin/Staff)
```bash
GET /api/stats/users
Authorization: Bearer <token>
```

---

### File Management (`/api/files`)

#### Upload File
```bash
POST /api/files/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

# Form Data:
file: <binary file data>
userId: USER001
filename: "My Document.pdf"
categoryId: 1
rowPosition: 2
columnPosition: 3
shelfNumber: 1
fileType: "pdf"
```

#### Download File
```bash
GET /api/files/download/:filename

# No authentication required for download
# File is served with proper content-type
```

#### Get All Files
```bash
GET /api/files/all

# Response
{
  "message": "All files retrieved successfully",
  "count": 100,
  "files": [...]
}
```

#### Get User Files
```bash
GET /api/files/user/:userId
```

#### Search Files
```bash
GET /api/files/search?q=thesis&userId=USER001
```

#### Add File Metadata
```bash
POST /api/files/add
Content-Type: application/json

{
  "userId": "USER001",
  "filename": "Document.pdf",
  "rowPosition": 1,
  "columnPosition": 2,
  "shelfNumber": 1,
  "categoryId": 1,
  "fileType": "pdf",
  "fileUrl": "/uploads/file.pdf"
}
```

#### Return File
```bash
POST /api/files/return
Content-Type: application/json

{
  "userId": "USER001",
  "fileId": 5,
  "rowPosition": 1,
  "columnPosition": 2
}
```

---

### Categories (`/api/categories`)

#### List Categories
```bash
GET /api/categories

# Response
{
  "message": "Categories retrieved successfully",
  "count": 5,
  "categories": [
    {
      "id": 1,
      "name": "Thesis",
      "description": "Thesis documents",
      "color": "#3B82F6",
      "icon": "📚",
      "fileCount": 25
    }
  ]
}
```

#### Get Category
```bash
GET /api/categories/:id
```

#### Create Category (Admin/Staff)
```bash
POST /api/categories
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Research Papers",
  "description": "Academic research papers",
  "color": "#10B981",
  "icon": "📄"
}
```

#### Update Category (Admin/Staff)
```bash
PUT /api/categories/:id
Authorization: Bearer <token>
```

#### Delete Category (Admin)
```bash
DELETE /api/categories/:id
Authorization: Bearer <token>
```

---

### Requests (`/api/requests`)

#### List Requests
```bash
GET /api/requests?status=PENDING&page=1&limit=50
Authorization: Bearer <token>

# Response
{
  "message": "Requests retrieved successfully",
  "requests": [...],
  "pagination": { ... }
}
```

#### Get Request
```bash
GET /api/requests/:id
Authorization: Bearer <token>
```

#### Create Request
```bash
POST /api/requests
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "FILE_ACCESS",
  "title": "Request access to thesis file",
  "description": "I need to access my thesis for review",
  "fileId": 10,
  "priority": "high"
}
```

#### Update Request
```bash
PUT /api/requests/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated title",
  "description": "Updated description"
}
```

#### Approve Request (Admin/Staff)
```bash
PUT /api/requests/:id/approve
Authorization: Bearer <token>
Content-Type: application/json

{
  "notes": "Approved for access"
}
```

#### Decline Request (Admin/Staff)
```bash
PUT /api/requests/:id/decline
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Insufficient information"
}
```

#### Delete Request
```bash
DELETE /api/requests/:id
Authorization: Bearer <token>
```

---

### Notifications (`/api/notifications`)

#### Get Notifications
```bash
GET /api/notifications?unreadOnly=true&page=1&limit=50
Authorization: Bearer <token>

# Response
{
  "message": "Notifications retrieved successfully",
  "notifications": [...],
  "unreadCount": 5,
  "pagination": { ... }
}
```

#### Mark as Read
```bash
PUT /api/notifications/:id/read
Authorization: Bearer <token>
```

#### Mark All as Read
```bash
PUT /api/notifications/read-all
Authorization: Bearer <token>
```

#### Delete Notification
```bash
DELETE /api/notifications/:id
Authorization: Bearer <token>
```

#### Clear Read Notifications
```bash
DELETE /api/notifications/clear-read
Authorization: Bearer <token>
```

---

### Settings (`/api/settings`)

Admin-only endpoints for system configuration.

#### Get All Settings
```bash
GET /api/settings?category=general
Authorization: Bearer <token>
```

#### Get Setting by Key
```bash
GET /api/settings/:key
Authorization: Bearer <token>
```

#### Update Setting
```bash
PUT /api/settings
Authorization: Bearer <token>
Content-Type: application/json

{
  "key": "max_file_size",
  "value": "10485760",
  "category": "files"
}
```

#### Bulk Update
```bash
PUT /api/settings/bulk
Authorization: Bearer <token>
Content-Type: application/json

{
  "settings": [
    { "key": "key1", "value": "value1", "category": "cat1" },
    { "key": "key2", "value": "value2", "category": "cat2" }
  ]
}
```

---

### Reports (`/api/reports`)

Admin/Staff only endpoints.

#### Generate Report
```bash
GET /api/reports/generate?reportType=all&startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer <token>

# reportType options: all, users, files, transactions, requests, activity
# Optional filters: department, userId, fileStatus, requestStatus

# Response - Comprehensive report with all requested data
{
  "message": "Report generated successfully",
  "report": {
    "generatedAt": "2024-11-18T...",
    "generatedBy": "Admin User",
    "filters": { ... },
    "data": {
      "users": { ... },
      "files": { ... },
      "transactions": { ... },
      "requests": { ... },
      "activity": { ... }
    }
  }
}
```

#### File Activity Report
```bash
GET /api/reports/file-activity?days=30
Authorization: Bearer <token>
```

#### User Activity Report
```bash
GET /api/reports/user-activity/:userId?days=30
Authorization: Bearer <token>
```

---

### QR Code Scanning (`/api/qr`)

#### Scan QR Code
```bash
POST /api/qr/scan
Content-Type: application/json

{
  "userId": "PUP001",
  "filename": "optional_specific_file.pdf"
}

# Response - Unlocks door and retrieves file
{
  "success": true,
  "message": "Door unlocked successfully",
  "user": {
    "id": "PUP001",
    "name": "Juan Dela Cruz",
    "department": "Engineering"
  },
  "file": {
    "filename": "Engineering_Thesis_2024.pdf",
    "row": 1,
    "column": 3,
    "shelf": 1
  },
  "esp32Response": { ... },
  "timestamp": "2024-11-18T..."
}
```

#### Test Lookup
```bash
GET /api/qr/test/:userId?filename=file.pdf
```

---

### Door Control (`/api/door`)

#### Manual Unlock
```bash
POST /api/door/unlock
Content-Type: application/json

{
  "row": 1,
  "column": 3,
  "userId": "ADMIN001"  # Optional, for logging
}
```

#### Manual Lock
```bash
POST /api/door/lock
Content-Type: application/json

{
  "row": 1,
  "column": 3,
  "userId": "ADMIN001"
}
```

#### Get ESP32 Status
```bash
GET /api/door/status

# Response
{
  "esp32": {
    "connected": true,
    "ip": "192.168.1.100",
    "mode": "connected"
  },
  "server": {
    "status": "running",
    "timestamp": "2024-11-18T..."
  }
}
```

#### Configure ESP32
```bash
POST /api/door/esp32/config
Content-Type: application/json

{
  "ip": "192.168.1.100",
  "port": 80
}
```

#### Get Access Logs
```bash
GET /api/door/logs?limit=50&userId=USER001
```

---

### Health Check

```bash
GET /api/health

# Response
{
  "status": "healthy",
  "timestamp": "2024-11-18T05:35:00.000Z",
  "esp32Connected": true
}
```

---

## Database Schema

### Users
- `id`: Auto-increment primary key
- `userId`: Unique string identifier (e.g., "PUP001", "ADMIN001")
- `name`: Full name
- `email`: Unique email address
- `password`: Hashed password (bcrypt)
- `role`: Enum (ADMIN, STAFF, STUDENT, FACULTY)
- `department`: Department name
- `contactNumber`: Contact number
- `gender`: Gender
- `dateOfBirth`: Date of birth
- `status`: Enum (ACTIVE, INACTIVE, SUSPENDED)
- `avatar`: Avatar URL
- `lastLogin`: Last login timestamp
- `createdAt`, `updatedAt`: Timestamps

### Files
- `id`: Auto-increment primary key
- `userId`: Foreign key to Users
- `filename`: File name
- `filePath`: Local file path
- `fileUrl`: URL for download
- `fileType`: File extension/type
- `categoryId`: Foreign key to Categories (optional)
- `rowPosition`, `columnPosition`, `shelfNumber`: Physical location (optional)
- `status`: Enum (AVAILABLE, CHECKED_OUT, RETRIEVED, MAINTENANCE, MISSING)
- `createdAt`, `updatedAt`: Timestamps

### Categories
- `id`: Auto-increment primary key
- `name`: Unique category name
- `description`: Category description
- `color`: Display color (hex)
- `icon`: Icon/emoji
- `createdAt`, `updatedAt`: Timestamps

### Requests
- `id`: Auto-increment primary key
- `userId`: Foreign key to Users
- `type`: Enum (FILE_ACCESS, FILE_BORROW, FILE_RETURN, NEW_FILE, OTHER)
- `status`: Enum (PENDING, APPROVED, DECLINED, CANCELLED)
- `title`: Request title
- `description`: Request description
- `fileId`: Related file ID (optional)
- `priority`: Priority level
- `approvedBy`: User ID who approved/declined
- `approvedAt`: Approval timestamp
- `createdAt`, `updatedAt`: Timestamps

### Notifications
- `id`: Auto-increment primary key
- `userId`: Foreign key to Users
- `type`: Enum (INFO, WARNING, SUCCESS, ERROR, REQUEST)
- `title`: Notification title
- `message`: Notification message
- `isRead`: Read status
- `link`: Related link (optional)
- `createdAt`: Timestamp

### Transactions
- `id`: Auto-increment primary key
- `fileId`: Foreign key to Files
- `userId`: Foreign key to Users
- `type`: Enum (CHECKOUT, RETURN, RETRIEVAL, MAINTENANCE, LOST_REPORT)
- `rowPosition`, `columnPosition`: Location
- `notes`: Transaction notes
- `dueDate`, `returnedAt`: Timestamps
- `timestamp`: Transaction timestamp

### Settings
- `id`: Auto-increment primary key
- `key`: Unique setting key
- `value`: Setting value
- `category`: Setting category
- `updatedAt`: Timestamp

---

## Authentication

This API uses **JWT (JSON Web Tokens)** for authentication.

### Getting a Token

1. **Login** via `/api/auth/login` with userId/email and password
2. **Receive token** in the response
3. **Include token** in subsequent requests:
   ```
   Authorization: Bearer <your-token-here>
   ```

### Default Admin Account

- **User ID**: `ADMIN001`
- **Email**: `admin@pup.edu.ph`
- **Password**: `admin123`
- **Role**: ADMIN

**⚠️ Change the admin password after first login!**

### Roles & Permissions

- **ADMIN**: Full system access
- **STAFF**: Can manage users, files, approve requests
- **STUDENT/FACULTY**: Can view own data, submit requests

---

---

## Quick Start

### Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ryesgit/deans-server.git
   cd deans-server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   # Database Configuration
   DATABASE_URL="postgresql://postgres:password@localhost:5432/pup_filing_system?schema=public"

   # Server Configuration
   PORT=3001
   NODE_ENV=development

   # JWT Configuration
   JWT_SECRET="your-secret-key-change-in-production"
   JWT_EXPIRATION="7d"

   # ESP32 Configuration
   ESP32_IP="192.168.1.100"
   ESP32_PORT=80

   # File Upload Configuration
   MAX_FILE_SIZE=10485760
   UPLOAD_DIR="./uploads"
   ```

4. **Set up the database**
   ```bash
   # Create database and run migrations
   npx prisma migrate dev
   
   # Generate Prisma client
   npx prisma generate
   ```

5. **Start the server**
   ```bash
   # Development mode with auto-restart
   npm run dev
   
   # Production mode
   npm start
   ```

6. **Test the API**
   ```bash
   # Health check
   curl http://localhost:3001/api/health
   
   # Login
   curl -X POST http://localhost:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"userId": "ADMIN001", "password": "admin123"}'
   ```

### First Time Setup

1. **Login with default admin account**:
   - User ID: `ADMIN001`
   - Password: `admin123`

2. **Change admin password immediately**:
   ```bash
   curl -X PUT http://localhost:3001/api/auth/change-password \
     -H "Authorization: Bearer <your-token>" \
     -H "Content-Type: application/json" \
     -d '{"currentPassword": "admin123", "newPassword": "new-secure-password"}'
   ```

3. **Create additional users** via `/api/users` endpoint

4. **Set up categories** for file organization

5. **Configure ESP32** (if using physical hardware):
   ```bash
   curl -X POST http://localhost:3001/api/door/esp32/config \
     -H "Content-Type: application/json" \
     -d '{"ip": "192.168.1.100", "port": 80}'
   ```

---

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `PORT` | Server port | 3001 |
| `NODE_ENV` | Environment (development/production) | development |
| `JWT_SECRET` | Secret key for JWT tokens | Required |
| `JWT_EXPIRATION` | Token expiration time | 7d |
| `ESP32_IP` | ESP32 device IP address | 192.168.1.100 |
| `ESP32_PORT` | ESP32 device port | 80 |
| `MAX_FILE_SIZE` | Maximum file upload size in bytes | 10485760 (10MB) |
| `UPLOAD_DIR` | Directory for uploaded files | ./uploads |

### Database Configuration

The system uses **PostgreSQL** with **Prisma ORM** for type-safe database access.

**Connection String Format**:
```
postgresql://[user]:[password]@[host]:[port]/[database]?schema=public
```

**Example**:
```
postgresql://postgres:password@localhost:5432/pup_filing_system?schema=public
```

### CORS Configuration

By default, CORS is enabled for all origins. For production, update `index.js` to restrict origins:

```javascript
app.use(cors({
  origin: 'https://your-frontend-domain.com',
  credentials: true
}));
```

---

## ESP32 Integration

The system integrates with ESP32 microcontrollers to control physical door locks for automated file retrieval.

### ESP32 Requirements

The ESP32 should provide the following HTTP endpoints:

#### Unlock Endpoint
```
POST http://ESP32_IP:PORT/unlock
Content-Type: application/json

{
  "command": "unlock",
  "row": 1,
  "column": 3,
  "timestamp": "2024-11-18T05:35:00.000Z"
}
```

#### Lock Endpoint
```
POST http://ESP32_IP:PORT/lock
Content-Type: application/json

{
  "command": "lock",
  "row": 1,
  "column": 3
}
```

#### Health Check
```
GET http://ESP32_IP:PORT/health
```

#### Status Check
```
GET http://ESP32_IP:PORT/status
```

### Simulation Mode

If ESP32 is not connected, the system automatically runs in **simulation mode** for testing:

- All unlock/lock operations are simulated
- Success responses are returned
- No actual hardware control occurs
- Useful for development and testing

---

## Testing

This project includes comprehensive unit tests with **89% code coverage**.

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Test Coverage

- **83 passing tests**
- **89% statement coverage**
- **86% branch coverage**
- **92% function coverage**

### Test Files

- `tests/db/` - Database operations
- `tests/door/` - Door control and ESP32
- `tests/files/` - File management
- `tests/qr/` - QR code scanning
- `tests/utils/` - Utility functions

See [TESTING.md](TESTING.md) for detailed testing documentation.

---

## Security

### Security Features

1. **JWT Authentication**: Secure token-based authentication with configurable expiration
2. **Password Hashing**: Bcrypt with 10 salt rounds for secure password storage
3. **Role-Based Access Control**: Admin, Staff, Student, Faculty roles with granular permissions
4. **Rate Limiting**: Comprehensive protection against abuse and brute force attacks:
   - **Auth Limiter**: 5 failed attempts per 15 minutes (login, password change)
   - **Upload Limiter**: 10 file uploads per hour
   - **User Operations Limiter**: 20 operations per 15 minutes (create, update, delete users)
   - **Read Limiter**: 200 read requests per 15 minutes
   - **API Limiter**: 100 general API requests per 15 minutes
5. **Helmet.js**: Security headers protection (XSS, clickjacking, etc.)
6. **Input Validation**: All endpoints validate and sanitize input
7. **CORS**: Configurable cross-origin resource sharing
8. **Error Handling**: Comprehensive error handling without exposing internals
9. **SQL Injection Protection**: Prisma ORM with parameterized queries
10. **File Upload Security**: Type validation, size limits, secure storage

### Best Practices

1. **Change default credentials** immediately after installation
2. **Use strong JWT secrets** in production
3. **Enable HTTPS** in production
4. **Restrict CORS** to your frontend domain
5. **Regular security updates** - keep dependencies updated
6. **Database backups** - regular automated backups
7. **Environment variables** - never commit `.env` to version control
8. **Rate limiting** - consider adding rate limiting middleware

### Security Vulnerabilities

Run security audits regularly:

```bash
# Check for vulnerable dependencies
npm audit

# Fix vulnerabilities automatically
npm audit fix

# View detailed security report
npm audit --json
```

---

## Frontend Integration

This backend is designed to work with the [PUP Dean's Filing System Frontend](https://github.com/ryesgit/deans-filing-system).

### Integration Status

✅ **Backend Ready**: All endpoints implemented and tested
🔄 **Integration In Progress**: Frontend connection in development

### Key Integration Points

1. **Authentication**
   - Frontend should store JWT token (localStorage or httpOnly cookie)
   - Include token in Authorization header for all protected routes
   - Handle token expiration and refresh

2. **API Service Layer**
   - Create axios instance with base URL and interceptors
   - Add request interceptor to include auth token
   - Add response interceptor for error handling

3. **Environment Configuration**
   ```javascript
   // Frontend .env
   VITE_API_URL=http://localhost:3001/api
   ```

4. **Example Frontend Service**
   ```javascript
   import axios from 'axios';

   const api = axios.create({
     baseURL: process.env.VITE_API_URL,
   });

   // Add auth token to requests
   api.interceptors.request.use((config) => {
     const token = localStorage.getItem('token');
     if (token) {
       config.headers.Authorization = `Bearer ${token}`;
     }
     return config;
   });

   // Handle errors
   api.interceptors.response.use(
     (response) => response,
     (error) => {
       if (error.response?.status === 401) {
         // Redirect to login
         window.location.href = '/login';
       }
       return Promise.reject(error);
     }
   );

   export default api;
   ```

### Integration Documentation

- **[INTEGRATION_SUMMARY.md](INTEGRATION_SUMMARY.md)** - Quick reference guide
- **[INTEGRATION_REPORT.md](INTEGRATION_REPORT.md)** - Comprehensive technical analysis

---

## Sample Data

The system seeds the database with sample data on first run:

### Sample Users

| User ID | Name | Role | Department | Password |
|---------|------|------|------------|----------|
| ADMIN001 | Admin User | ADMIN | Administration | admin123 |
| USER001 | John Doe | STUDENT | Computer Science | - |
| USER002 | Jane Smith | STAFF | Information Technology | - |
| PUP001 | Juan Dela Cruz | STUDENT | Engineering | - |
| PUP002 | Maria Santos | STUDENT | Business Administration | - |
| PUP003 | Jose Rizal | STUDENT | Computer Science | - |

### Sample Files

- Engineering_Thesis_2024.pdf (PUP001)
- Project_Documentation.pdf (PUP001)
- Business_Plan_Final.pdf (PUP002)
- Marketing_Research.pdf (PUP002)
- Capstone_Project.pdf (PUP003)
- Algorithm_Analysis.pdf (PUP003)

---

## API Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "message": "Operation successful",
  "data": { ... },
  "additionalInfo": { ... }
}
```

### Error Response
```json
{
  "error": "Error type",
  "message": "Detailed error message"
}
```

### Pagination Response
```json
{
  "message": "Data retrieved successfully",
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "pages": 3
  }
}
```

---

## Deployment

### Production Deployment

1. **Set production environment variables**
   ```env
   NODE_ENV=production
   DATABASE_URL=<production-database-url>
   JWT_SECRET=<strong-random-secret>
   ```

2. **Build and start**
   ```bash
   npm install --production
   npx prisma generate
   npx prisma migrate deploy
   npm start
   ```

3. **Use a process manager** (PM2, forever, etc.)
   ```bash
   npm install -g pm2
   pm2 start index.js --name pup-filing-backend
   pm2 save
   pm2 startup
   ```

4. **Set up reverse proxy** (nginx, Apache)
   ```nginx
   server {
     listen 80;
     server_name api.yourdomaincom;

     location / {
       proxy_pass http://localhost:3001;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection 'upgrade';
       proxy_set_header Host $host;
       proxy_cache_bypass $http_upgrade;
     }
   }
   ```

5. **Enable HTTPS** with Let's Encrypt
   ```bash
   sudo certbot --nginx -d api.yourdomain.com
   ```

---

## Troubleshooting

### Common Issues

**Database connection failed**
- Check PostgreSQL is running
- Verify DATABASE_URL is correct
- Ensure database exists

**Port already in use**
- Change PORT in .env
- Or stop the process using the port

**JWT token expired**
- Login again to get a new token
- Adjust JWT_EXPIRATION if needed

**File upload fails**
- Check MAX_FILE_SIZE setting
- Ensure UPLOAD_DIR exists and is writable
- Verify file type is allowed

**ESP32 not connecting**
- Verify ESP32 IP and port
- Check network connectivity
- System will use simulation mode if ESP32 unavailable

---

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## License

ISC License - See LICENSE file for details

---

## Support

For issues and questions:
- Create an issue on [GitHub](https://github.com/ryesgit/deans-server/issues)
- Contact: PUP Filing System Team

---

## Changelog

### Version 2.0.0 (2024-11-18)
- ✨ Added JWT authentication system
- ✨ Implemented complete user management
- ✨ Added file upload/download functionality
- ✨ Created category system for file organization
- ✨ Built request/approval workflow
- ✨ Implemented notification system
- ✨ Added dashboard statistics
- ✨ Created comprehensive reporting system
- ✨ Added system settings management
- 🔒 Enhanced security with role-based access control
- 📚 Complete API documentation
- 🧪 Maintained 89% test coverage

### Version 1.0.0
- Initial release with QR scanning and ESP32 integration
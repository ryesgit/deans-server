# PUP Dean's Filing System Backend

Backend server for the PUP Filing System with QR code scanning and ESP32 door control integration.

## Features

- **QR Code Processing**: Receives user ID from QR codes and finds associated files
- **File Location Lookup**: Maps users to their file storage positions (row/column)
- **ESP32 Integration**: Sends unlock signals to ESP32 for automated door control
- **PostgreSQL Database with Prisma ORM**: Stores user data, file locations, and access logs
- **Access Logging**: Tracks all door unlock attempts and file access

## API Endpoints

### QR Code Scanning
```bash
POST /api/qr/scan
{
  "userId": "PUP001",
  "filename": "optional_specific_file.pdf"
}
```

### File Management
```bash
GET /api/files/user/:userId          # Get all files for a user
GET /api/files/all                   # Get all files in system
GET /api/files/search?q=query        # Search files
POST /api/files/add                  # Add new file location
```

### Door Control
```bash
POST /api/door/unlock                # Manual door unlock
POST /api/door/lock                  # Manual door lock
GET /api/door/status                 # ESP32 status check
GET /api/door/logs                   # Access logs
```

## Database Schema

### Users Table
- `user_id`: Unique identifier (e.g., "PUP001")
- `name`: Full name
- `department`: Department name
- `email`: Email address

### Files Table
- `user_id`: Links to users table
- `filename`: File name
- `row_position`: Physical row in filing cabinet
- `column_position`: Physical column in filing cabinet
- `shelf_number`: Cabinet shelf number

### Access Logs
- Tracks all access attempts with timestamps
- Records success/failure status
- Links users to file access events

## ESP32 Integration

The system communicates with an ESP32 microcontroller to control physical door locks.

### ESP32 Expected Endpoints
```bash
POST http://ESP32_IP/unlock
{
  "command": "unlock",
  "row": 1,
  "column": 3,
  "timestamp": "2024-01-01T00:00:00.000Z"
}

GET http://ESP32_IP/health          # Health check
GET http://ESP32_IP/status          # Device status
```

### Simulation Mode
If ESP32 is not connected, the system runs in simulation mode for testing.

## Quick Start

1. **Prerequisites**:
   - PostgreSQL server running on localhost:5432
   - Database user: `postgres` with password: `password`

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Database Setup**:
   ```bash
   npx prisma migrate dev    # Create database and run migrations
   npx prisma generate       # Generate Prisma client
   ```

4. **Start Server**:
   ```bash
   npm start          # Production
   npm run dev        # Development with auto-restart
   ```

5. **Test QR Code Scan**:
   ```bash
   curl -X POST http://localhost:3001/api/qr/scan \
     -H "Content-Type: application/json" \
     -d '{"userId": "PUP001"}'
   ```

## Sample Data

The system comes with sample users and files:

- **PUP001**: Juan Dela Cruz (Engineering) - Files at Row 1 Col 3, Row 2 Col 1
- **PUP002**: Maria Santos (Business Admin) - Files at Row 1 Col 5, Row 3 Col 2  
- **PUP003**: Jose Rizal (Computer Science) - Files at Row 2 Col 4, Row 1 Col 1

## Configuration

- **Port**: Default 3001 (set via PORT environment variable)
- **ESP32 IP**: Default 192.168.1.100 (configurable via API)
- **Database**: PostgreSQL connection via DATABASE_URL environment variable
- **Prisma**: Modern ORM with type safety and migrations

## Security Features

- CORS enabled for frontend integration
- Helmet.js for security headers
- Input validation on all endpoints
- Comprehensive error handling and logging
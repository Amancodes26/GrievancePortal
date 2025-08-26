# 🚀 DSEU Grievance Portal API - Complete Setup Guide

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Server Setup](#server-setup)
5. [Postman Collection Setup](#postman-collection-setup)
6. [API Testing Guide](#api-testing-guide)
7. [Common Issues & Solutions](#common-issues--solutions)

---

## 🔧 Prerequisites

### Required Software:
- **Node.js** (v18.0.0 or later)
- **npm** (comes with Node.js)
- **PostgreSQL** (v13.0 or later)
- **Postman** (for API testing)
- **VS Code** (recommended IDE)

### Check if Prerequisites are Installed:
```bash
node --version    # Should show v18.0.0+
npm --version     # Should show npm version
psql --version    # Should show PostgreSQL version
```

---

## 🌍 Environment Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd grievance-backend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Create Environment File
Create a `.env` file in the root directory:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=grievance_portal
DB_USER=your_db_username
DB_PASSWORD=your_db_password

# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-make-it-complex
JWT_EXPIRES_IN=24h

# Admin JWT Configuration
ADMIN_JWT_SECRET=your-admin-jwt-secret-key
ADMIN_JWT_EXPIRES_IN=12h

# Email Configuration (Optional for notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# File Upload Configuration
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760  # 10MB in bytes
ALLOWED_FILE_TYPES=jpg,jpeg,png,pdf,doc,docx
```

---

## 🗄️ Database Setup

### 1. Create PostgreSQL Database
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE grievance_portal;

# Create user (optional)
CREATE USER grievance_admin WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE grievance_portal TO grievance_admin;

# Exit PostgreSQL
\q
```

### 2. Run Database Schema
```bash
# Navigate to database directory
cd Database

# Run the schema file
psql -U your_username -d grievance_portal -f scheme.sql

# Run initialization data
psql -U your_username -d grievance_portal -f init.sql

# (Optional) Run sample data
psql -U your_username -d grievance_portal -f sample-data.sql
```

### 3. Verify Database Setup
```bash
# Connect to your database
psql -U your_username -d grievance_portal

# List all tables
\dt

# You should see: academicinfo, admin, attachment, campusinfo, grievance, issuelist, programinfo, PersonalInfo, tracking
```

---

## 🖥️ Server Setup

### 1. Development Mode
```bash
# Start the development server with auto-reload
npm run dev
```

### 2. Production Mode
```bash
# Build the application
npm run build

# Start production server
npm start
```

### 3. Verify Server is Running
- Open your browser and go to: `http://localhost:5000/api/health`
- You should see a health check response with database status

### 4. Check Database Connection
- Go to: `http://localhost:5000/api/pool-status`
- Should show database pool information

---

## 📮 Postman Collection Setup

### 1. Import Collection
1. Open Postman
2. Click **Import** button
3. Select **File** tab
4. Choose `DSEU-Grievance-API-Updated.postman_collection.json`
5. Click **Import**

### 2. Set Up Environment
1. Click the **Environment** dropdown (top right)
2. Click **+ Create Environment**
3. Name it "DSEU Grievance Local"
4. Add these variables:
   - `base_url` = `http://localhost:5000`
   - `student_token` = (will be auto-populated after login)
   - `admin_token` = (will be auto-populated after admin login)

### 3. Select Environment
- Make sure "DSEU Grievance Local" environment is selected before running requests

---

## 🧪 API Testing Guide

### Phase 1: System Health Checks
1. **API Health Check** - Verify server is running
2. **Database Pool Status** - Check database connectivity
3. **Test Endpoint** - Basic functionality test

### Phase 2: Authentication Testing

#### Student Authentication Flow:
1. **Check Roll Number Exists**
   - Test with existing roll number: `2024CS001`
   - Test with non-existing roll number: `9999XX999`

2. **Verify Partial Email**
   - Format: `/api/v1/users/auth/verify-partial-email/{rollNumber}/{partialEmail}`

3. **Set Student Password**
   - Required for first-time users
   - Password must be strong (8+ chars, uppercase, lowercase, number, special char)

4. **Student Login**
   - Successfully logs in and stores token automatically
   - Token is saved to `{{student_token}}` variable

#### Admin Authentication:
1. **Admin Login**
   - Use admin credentials from your database
   - Token automatically saved to `{{admin_token}}` variable

### Phase 3: Grievance Management Testing

#### Student Operations:
1. **Create Grievance**
   ```json
   {
     "Subject": "Library Issue - Book Not Available",
     "Description": "The required textbook for Computer Science is not available in the library despite being listed in the syllabus.",
     "IssueCode": "LIB001",
     "CampusId": "CAM001"
   }
   ```

2. **Get My Grievances**
   - Shows all grievances created by authenticated student

#### Public Operations (No Auth Required):
3. **Get Grievance by Grievance ID**
   - Use format: `GRV-2024-123456`
   - Public endpoint for tracking

4. **Search Grievance by Issue ID**
   - Alternative search method

#### Admin Operations:
5. **Get All Grievances** (Admin view)
6. **Get Grievances by Roll Number**
7. **Get Grievance Statistics**

### Phase 4: Admin Response Testing
1. **Add Admin Response**
2. **Redirect Grievance** (to different admin)
3. **Update Student Status**

### Phase 5: Attachment Testing
1. **Upload Attachment**
   - Select a file (PDF, JPG, PNG, DOC, DOCX)
   - Provide grievance ID
2. **Get Attachments by Grievance**
3. **Download Attachment**
4. **Delete Attachment**

### Phase 6: Admin Dashboard Testing
1. **Admin Dashboard** - Overview data
2. **Department Admin Dashboard**
3. **Campus Admin Dashboard**
4. **Super Admin Operations**

---

## 🔧 Sample Test Data

### Sample Student Data:
```json
{
  "rollNumber": "2024CS001",
  "password": "Student123!",
  "email": "student@dseu.ac.in"
}
```

### Sample Admin Data:
```json
{
  "email": "admin@dseu.ac.in",
  "password": "Admin123!"
}
```

### Sample Grievance Data:
```json
{
  "Subject": "Hostel Facility Issue",
  "Description": "The hostel room heating system is not working properly during winter.",
  "IssueCode": "HOS001",
  "CampusId": "CAM001"
}
```

---

## 🚨 Common Issues & Solutions

### Issue 1: Database Connection Error
**Error**: `ECONNREFUSED` or `database connection failed`
**Solution**:
1. Ensure PostgreSQL is running: `sudo service postgresql start`
2. Check connection details in `.env` file
3. Verify database exists: `psql -l`

### Issue 2: JWT Token Issues
**Error**: `Invalid token` or `Token expired`
**Solution**:
1. Re-login to get fresh token
2. Check JWT_SECRET in `.env` file
3. Ensure token is being passed in Authorization header

### Issue 3: File Upload Issues
**Error**: `File upload failed` or `File too large`
**Solution**:
1. Check file size (max 10MB by default)
2. Verify file type is allowed (jpg, jpeg, png, pdf, doc, docx)
3. Ensure uploads directory exists

### Issue 4: CORS Issues
**Error**: `CORS policy error`
**Solution**:
1. Server has CORS enabled by default
2. If testing from frontend, ensure correct origin
3. Check if preflight OPTIONS requests are working

### Issue 5: Port Already in Use
**Error**: `EADDRINUSE: address already in use :::5000`
**Solution**:
1. Kill existing process: `lsof -ti:5000 | xargs kill -9`
2. Or change PORT in `.env` file
3. Restart the server

---

## 📊 API Response Formats

### Success Response:
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response:
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

### Health Check Response:
```json
{
  "status": "healthy",
  "database": true,
  "pool": {
    "available": true,
    "totalConnections": 10,
    "activeConnections": 2
  },
  "timestamp": "2025-08-24T00:00:00.000Z"
}
```

---

## 🔄 Development Workflow

### 1. Daily Development:
```bash
# Start development server
npm run dev

# Run tests (if available)
npm test

# Check linting
npm run lint
```

### 2. Adding New Features:
1. Create feature branch: `git checkout -b feature/new-feature`
2. Implement changes
3. Test with Postman collection
4. Update API documentation if needed
5. Commit and push changes

### 3. Deployment:
1. Build application: `npm run build`
2. Test production build: `npm start`
3. Deploy to server (follow deployment guide)

---

## 📞 Support

For issues or questions:
1. Check this documentation first
2. Review error logs in terminal
3. Test with Postman collection
4. Check database connectivity
5. Verify environment variables

---

## 🎯 Quick Start Checklist

- [ ] Install Node.js and PostgreSQL
- [ ] Clone repository
- [ ] Run `npm install`
- [ ] Create `.env` file with database credentials
- [ ] Set up PostgreSQL database
- [ ] Run database schema (`scheme.sql`)
- [ ] Start server with `npm run dev`
- [ ] Verify health endpoint: `http://localhost:5000/api/health`
- [ ] Import Postman collection
- [ ] Set up Postman environment
- [ ] Test authentication endpoints
- [ ] Create sample grievance
- [ ] Test admin responses
- [ ] Test file uploads

**🎉 You're ready to start developing with the DSEU Grievance Portal API!**

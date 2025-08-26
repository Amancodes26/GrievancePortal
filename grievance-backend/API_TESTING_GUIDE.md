# DSEU Grievance Portal API Testing Guide

## Prerequisites

1. **Database Setup**: Make sure your PostgreSQL database is running and configured
2. **Sample Data**: Load the sample data to test with realistic data
3. **Postman**: Import the provided Postman collection
4. **Environment**: Set up your local development environment

## Database Setup & Sample Data

### 1. Run Database Schema
```bash
# Make sure PostgreSQL is running
psql -U postgres -d your_database_name -f Database/init.sql
```

### 2. Load Sample Data
```bash
# Load sample data for testing
psql -U postgres -d your_database_name -f Database/sample-data.sql
```

### 3. Verify Database Setup
```sql
-- Check if all tables exist and have data
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Check sample data
SELECT COUNT(*) as students FROM PersonalInfo;
SELECT COUNT(*) as admins FROM AdminInfo; 
SELECT COUNT(*) as grievances FROM Grievance;
SELECT COUNT(*) as issues FROM IssueList;
```

## Running the Application

### 1. Install Dependencies
```bash
cd grievance-backend
npm install
```

### 2. Environment Variables
Create `.env` file with:
```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/grievance_db

# JWT Secrets  
JWT_SECRET=your-jwt-secret-key-here
ADMIN_JWT_SECRET=your-admin-jwt-secret-key-here

# Server
PORT=3000
NODE_ENV=development

# Email (Optional for testing)
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads
```

### 3. Start Development Server
```bash
npm run dev
```

The server should start on `http://localhost:3000`

## Testing with Postman

### 1. Import Collection
- Open Postman
- Click "Import" → "File" → Select `DSEU-Grievance-API.postman_collection.json`
- Set the `base_url` variable to `http://localhost:3000`

### 2. Test Sample Users

#### Sample Students:
- **Roll No**: `2024CS001`, **Email**: `rahul.sharma@student.dseu.ac.in`
- **Roll No**: `2024CS002`, **Email**: `priya.singh@student.dseu.ac.in`  
- **Roll No**: `2024EC001`, **Email**: `amit.kumar@student.dseu.ac.in`
- **Roll No**: `2024BBA001`, **Email**: `sneha.gupta@student.dseu.ac.in`
- **Roll No**: `2024BCA001`, **Email**: `vikash.yadav@student.dseu.ac.in`

#### Sample Admins:
- **Admin ID**: `ADMIN001`, **Email**: `rajesh.verma@dseu.ac.in` (SUPER_ADMIN)
- **Admin ID**: `ADMIN002`, **Email**: `sunita.mishra@dseu.ac.in` (CAMPUS_ADMIN)
- **Admin ID**: `ADMIN003`, **Email**: `arun.joshi@dseu.ac.in` (DEPT_ADMIN)

## Testing Flow

### Phase 1: Authentication Testing

1. **Set Student Password**
   - Use "Set Student Password" request
   - Set password for `2024CS001` as `student123`

2. **Student Login**
   - Use "Student Login" request
   - Login with `2024CS001` and `student123`
   - Token will be automatically saved to `student_token` variable

3. **Set Admin Password**
   - Use "Set Admin Password" request  
   - Set password for `ADMIN001` as `admin123`

4. **Admin Login**
   - Use "Admin Login" request
   - Login with `rajesh.verma@dseu.ac.in` and `admin123`
   - Token will be automatically saved to `admin_token` variable

### Phase 2: Grievance Management Testing

5. **Create Grievance** (Student)
   - Use student token
   - Create a new grievance with sample data
   - Note the returned `grievance_id`

6. **View My Grievances** (Student)
   - See all grievances for logged-in student

7. **View All Grievances** (Admin)
   - Use admin token
   - See all grievances with filtering options

8. **Add Admin Response** (Admin)
   - Respond to a student grievance
   - Update status to IN_PROGRESS

9. **Redirect Grievance** (Admin)
   - Transfer grievance to different admin
   - Add reason for redirection

### Phase 3: Attachment Testing

10. **Upload Attachment** (Student)
    - Upload a test PDF/image file
    - Attach to existing grievance

11. **View Attachments** (Student/Admin)
    - List all attachments for a grievance

12. **Download Attachment** (Student/Admin)
    - Download the uploaded file

13. **Delete Attachment** (Admin)
    - Remove attachment from system

### Phase 4: Statistics & Dashboard

14. **Grievance Statistics** (Admin)
    - Get dashboard overview data
    - View counts by status, priority, etc.

15. **Admin Dashboard** (Admin)
    - Get admin-specific dashboard data

## Sample Test Data for Requests

### Create Grievance Request Body:
```json
{
  "issueId": 1,
  "subject": "Laboratory Equipment Malfunction",
  "description": "The computers in Lab 301 are not working properly. Half of the systems are showing blue screen errors and the other half are extremely slow. This is affecting our practical sessions.",
  "priority": "HIGH"
}
```

### Add Response Request Body:
```json
{
  "responseText": "We have received your complaint about the laboratory equipment. Our technical team has been notified and will inspect the systems tomorrow. We expect to resolve this issue within 2-3 working days.",
  "status": "IN_PROGRESS", 
  "estimatedResolutionDate": "2024-08-26"
}
```

### Redirect Grievance Request Body:
```json
{
  "newAdminId": "ADMIN003",
  "reason": "This issue requires department-level technical expertise. Redirecting to IT Department Admin."
}
```

## Troubleshooting

### Common Issues:

1. **Database Connection Error**
   - Check if PostgreSQL is running
   - Verify DATABASE_URL in .env file
   - Ensure database exists and is accessible

2. **Authentication Errors**
   - Make sure JWT_SECRET is set in .env
   - Check if tokens are properly saved in Postman globals
   - Verify password was set before attempting login

3. **File Upload Issues**
   - Ensure uploads directory exists and is writable
   - Check MAX_FILE_SIZE environment variable
   - Verify file types are supported (PDF, JPG, PNG)

4. **Permission Errors**
   - Check user/admin roles match endpoint requirements
   - Verify token is included in Authorization header
   - Ensure user owns the resource they're trying to access

### Debug Endpoints:

```bash
# Check server health
GET http://localhost:3000/api/v1/admin/migrate

# Check database connectivity
# Look at server logs when making requests
```

### Database Queries for Debugging:

```sql
-- Check grievances
SELECT * FROM Grievance ORDER BY SubmissionDate DESC;

-- Check tracking history  
SELECT * FROM Tracking ORDER BY Timestamp DESC;

-- Check attachments
SELECT * FROM Attachment;

-- Check students
SELECT RollNo, FirstName, LastName, Email FROM PersonalInfo;

-- Check admins
SELECT AdminId, FirstName, LastName, Email, Role FROM AdminInfo;
```

## Success Criteria

After completing all tests, you should have:

✅ Successfully authenticated both student and admin users  
✅ Created new grievances as a student  
✅ Viewed and filtered grievances appropriately based on user role  
✅ Added admin responses and updated grievance status  
✅ Uploaded, viewed, and downloaded attachments  
✅ Redirected grievances between admins  
✅ Generated statistics and dashboard data  
✅ All endpoints returning proper HTTP status codes  
✅ All responses following the consistent JSON format  
✅ Proper error handling for invalid requests  

## Performance Testing

For load testing, consider:
- Multiple concurrent grievance creations
- Large file uploads  
- Bulk data retrieval with pagination
- Database connection pooling under load

The API is designed to handle production workloads with proper database indexing and connection management.

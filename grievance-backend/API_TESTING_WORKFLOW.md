# 🧪 DSEU Grievance Portal API - Step-by-Step Testing Workflow

## 🚀 Pre-Testing Setup

### 1. Ensure Server is Running
```bash
npm run dev
```
✅ **Expected**: Server running on http://localhost:5000

### 2. Import Postman Collection
- Import: `DSEU-Grievance-API-Updated.postman_collection.json`
- Set Environment: `base_url = http://localhost:5000`

---

## 📝 Testing Workflow

### STEP 1: System Health Verification 🔧

#### 1.1 API Health Check
- **Endpoint**: `GET {{base_url}}/api/health`
- **Expected Status**: 200 OK
- **Expected Response**:
```json
{
  "status": "healthy",
  "database": true,
  "pool": { "available": true },
  "timestamp": "2025-08-24T..."
}
```

#### 1.2 Database Pool Status
- **Endpoint**: `GET {{base_url}}/api/pool-status`
- **Expected Status**: 200 OK
- **Expected Response**: Pool statistics

#### 1.3 Basic Test Endpoint
- **Endpoint**: `GET {{base_url}}/api/test`
- **Expected Status**: 200 OK

**✅ CHECKPOINT**: All system health checks should pass before proceeding.

---

### STEP 2: Student Authentication Flow 👨‍🎓

#### 2.1 Check Roll Number Exists
- **Endpoint**: `GET {{base_url}}/api/v1/users/auth/rollNumber-exist/2024CS001`
- **Expected Status**: 200 OK or 400 (if doesn't exist)
- **Note**: Use an existing roll number from your database

#### 2.2 Verify Partial Email (Optional)
- **Endpoint**: `GET {{base_url}}/api/v1/users/auth/verify-partial-email/2024CS001/john.doe`
- **Expected Status**: 200 OK or 400
- **Use Case**: Password recovery

#### 2.3 Set Student Password (First-time users)
- **Endpoint**: `POST {{base_url}}/api/v1/users/auth/set-password`
- **Body**:
```json
{
  "rollNumber": "2024CS001",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!"
}
```
- **Expected Status**: 201 Created

#### 2.4 Student Login ⭐ CRITICAL
- **Endpoint**: `POST {{base_url}}/api/v1/users/auth/login`
- **Body**:
```json
{
  "rollNumber": "2024CS001",
  "password": "SecurePass123!"
}
```
- **Expected Status**: 200 OK
- **Expected Response**:
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```
- **Auto-Action**: Token automatically saved to `{{student_token}}`

**✅ CHECKPOINT**: Student token should be saved in Postman globals.

---

### STEP 3: Admin Authentication Flow 👨‍💼

#### 3.1 Admin Login ⭐ CRITICAL
- **Endpoint**: `POST {{base_url}}/api/v1/admin/login`
- **Body**:
```json
{
  "email": "admin@dseu.ac.in",
  "password": "Admin123!"
}
```
- **Expected Status**: 200 OK
- **Auto-Action**: Token automatically saved to `{{admin_token}}`

**✅ CHECKPOINT**: Admin token should be saved in Postman globals.

---

### STEP 4: Grievance Management Testing 📝

#### 4.1 Create Grievance (Student) ⭐ CRITICAL
- **Endpoint**: `POST {{base_url}}/api/v1/grievances`
- **Headers**: `Authorization: Bearer {{student_token}}`
- **Body**:
```json
{
  "Subject": "Library Issue - Book Not Available",
  "Description": "The required textbook for Computer Science is not available in the library despite being listed in the syllabus.",
  "IssueCode": "LIB001",
  "CampusId": "CAM001"
}
```
- **Expected Status**: 201 Created
- **Expected Response**: Grievance object with generated ID (e.g., GRV-2024-123456)
- **📝 NOTE**: Copy the `grievance_id` from response for next steps

#### 4.2 Get My Grievances (Student)
- **Endpoint**: `GET {{base_url}}/api/v1/grievances/my-grievances`
- **Headers**: `Authorization: Bearer {{student_token}}`
- **Expected Status**: 200 OK
- **Expected**: List containing the grievance created in 4.1

#### 4.3 Get Grievance by Grievance ID (Public)
- **Endpoint**: `GET {{base_url}}/api/v1/grievances/grievance/GRV-2024-123456`
- **Headers**: None (public endpoint)
- **Expected Status**: 200 OK
- **Use Case**: Public grievance tracking

#### 4.4 Search Grievance by Issue ID (Public)
- **Endpoint**: `GET {{base_url}}/api/v1/grievances/search/GRV-2024-123456`
- **Headers**: None (public endpoint)
- **Expected Status**: 200 OK

#### 4.5 Get All Grievances (Admin View)
- **Endpoint**: `GET {{base_url}}/api/v1/grievances`
- **Headers**: `Authorization: Bearer {{admin_token}}`
- **Expected Status**: 200 OK
- **Expected**: List of all grievances (admin view)

#### 4.6 Get Grievance Statistics (Admin)
- **Endpoint**: `GET {{base_url}}/api/v1/grievances/stats/overview`
- **Headers**: `Authorization: Bearer {{admin_token}}`
- **Expected Status**: 200 OK
- **Expected**: Statistics dashboard data

**✅ CHECKPOINT**: Grievance creation and retrieval working properly.

---

### STEP 5: Admin Response Testing 💬

#### 5.1 Add Admin Response ⭐ CRITICAL
- **Endpoint**: `POST {{base_url}}/api/v1/grievances/GRV-2024-123456/response`
- **Headers**: `Authorization: Bearer {{admin_token}}`
- **Body**:
```json
{
  "response": "We have noted your concern about library resources. The book has been ordered and will be available within 3-5 business days.",
  "status": "in_progress",
  "category": "library"
}
```
- **Expected Status**: 200 OK

#### 5.2 Redirect Grievance to Different Admin
- **Endpoint**: `PUT {{base_url}}/api/v1/grievances/GRV-2024-123456/redirect`
- **Headers**: `Authorization: Bearer {{admin_token}}`
- **Body**:
```json
{
  "newAdminId": "admin123",
  "reason": "Redirecting to Library Department for better assistance"
}
```
- **Expected Status**: 200 OK

#### 5.3 Update Student Status
- **Endpoint**: `PUT {{base_url}}/api/v1/grievances/GRV-2024-123456/student-status`
- **Headers**: `Authorization: Bearer {{admin_token}}`
- **Body**:
```json
{
  "status": "resolved",
  "studentFeedback": "Issue has been resolved successfully"
}
```
- **Expected Status**: 200 OK

**✅ CHECKPOINT**: Admin can respond to and manage grievances.

---

### STEP 6: Attachment Testing 📎

#### 6.1 Upload Attachment (Student)
- **Endpoint**: `POST {{base_url}}/api/v1/attachments/upload`
- **Headers**: `Authorization: Bearer {{student_token}}`
- **Body**: `form-data`
  - `file`: Select a file (PDF, JPG, PNG, DOC, DOCX)
  - `grievanceId`: `GRV-2024-123456`
- **Expected Status**: 201 Created

#### 6.2 Get Attachments by Grievance
- **Endpoint**: `GET {{base_url}}/api/v1/attachments/grievance/GRV-2024-123456`
- **Headers**: `Authorization: Bearer {{student_token}}`
- **Expected Status**: 200 OK
- **Expected**: List of attachments for the grievance

#### 6.3 Download Attachment
- **Endpoint**: `GET {{base_url}}/api/v1/attachments/download/1`
- **Headers**: `Authorization: Bearer {{student_token}}`
- **Expected Status**: 200 OK
- **Expected**: File download

#### 6.4 Delete Attachment
- **Endpoint**: `DELETE {{base_url}}/api/v1/attachments/1`
- **Headers**: `Authorization: Bearer {{student_token}}`
- **Expected Status**: 200 OK

**✅ CHECKPOINT**: File upload/download system working.

---

### STEP 7: Admin Dashboard Testing 🏢

#### 7.1 Admin Dashboard
- **Endpoint**: `GET {{base_url}}/api/v1/admin/dashboard`
- **Headers**: `Authorization: Bearer {{admin_token}}`
- **Expected Status**: 200 OK

#### 7.2 Department Admin Dashboard
- **Endpoint**: `GET {{base_url}}/api/v1/dept-admin/dashboard`
- **Headers**: `Authorization: Bearer {{admin_token}}`
- **Expected Status**: 200 OK

#### 7.3 Campus Admin Dashboard
- **Endpoint**: `GET {{base_url}}/api/v1/campus-admin/dashboard`
- **Headers**: `Authorization: Bearer {{admin_token}}`
- **Expected Status**: 200 OK

#### 7.4 Super Admin - Get All Admins
- **Endpoint**: `GET {{base_url}}/api/v1/super-admin/admins`
- **Headers**: `Authorization: Bearer {{admin_token}}`
- **Expected Status**: 200 OK (if super admin) or 403 (if not)

**✅ CHECKPOINT**: Admin dashboards accessible and functional.

---

## 🎯 Complete Testing Checklist

### ✅ System Health
- [ ] API Health Check (200 OK)
- [ ] Database Pool Status (200 OK)
- [ ] Test Endpoint (200 OK)

### ✅ Authentication
- [ ] Student Login (saves token)
- [ ] Admin Login (saves token)
- [ ] Invalid credentials rejected (401)

### ✅ Grievance Operations
- [ ] Create Grievance (201)
- [ ] Get My Grievances (200)
- [ ] Public Grievance Search (200)
- [ ] Admin View All Grievances (200)

### ✅ Admin Operations
- [ ] Add Admin Response (200)
- [ ] Redirect Grievance (200)
- [ ] Update Student Status (200)

### ✅ Attachment System
- [ ] Upload File (201)
- [ ] Get Attachments (200)
- [ ] Download File (200)
- [ ] Delete Attachment (200)

### ✅ Admin Dashboards
- [ ] Admin Dashboard (200)
- [ ] Department Dashboard (200)
- [ ] Campus Dashboard (200)

---

## 🚨 Common Test Failures & Solutions

### 501 Not Implemented
- **Cause**: Function placeholder (expected during development)
- **Solution**: Implement the actual function logic

### 401 Unauthorized
- **Cause**: Missing or invalid token
- **Solution**: Ensure login was successful and token is saved

### 500 Internal Server Error
- **Cause**: Database connection, missing data, or server error
- **Solution**: Check server logs and database connectivity

### 400 Bad Request
- **Cause**: Invalid request data or missing required fields
- **Solution**: Verify request body matches expected format

---

## 📊 Expected Development Status

### ✅ Currently Working:
- System health endpoints
- Authentication (login/token generation)
- Basic routing structure
- Database connectivity

### 🚧 Currently Placeholder (501):
- All grievance CRUD operations
- Admin response system
- File upload/attachment system
- Dashboard analytics

### 🎯 Next Development Steps:
1. Implement grievance creation logic
2. Implement admin response system
3. Implement file upload system
4. Implement dashboard analytics
5. Add comprehensive error handling

**📝 Note**: Many endpoints currently return "501 Not Implemented" - this is expected during development phase. Focus on testing the authentication flow and system health first.**

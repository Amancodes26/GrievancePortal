## High-Quality Grievance API Implementation

This document describes the production-grade Grievance API implementation that follows FAANG-level engineering standards.

## 📋 Implementation Overview

### Architecture
- **Controller Layer**: `grievance.controller.new.ts` - Handles HTTP requests, validation, and responses
- **Service Layer**: `grievance.service.new.ts` - Business logic and orchestration
- **Repository Layer**: `grievance.repository.ts` - Data access and persistence
- **Validation Layer**: `grievance.validator.ts` - Schema validation using Zod
- **Routes**: `grievance.routes.new.ts` - Express router configuration

### Key Features Implemented

✅ **Clean Architecture**: Proper separation of concerns with controller → service → repository pattern  
✅ **Strong Typing**: Full TypeScript integration with compile-time safety  
✅ **Schema Validation**: Runtime validation using Zod with detailed error messages  
✅ **Error Handling**: Comprehensive error handling with proper HTTP status codes  
✅ **Security**: Role-based access control with authentication/authorization middleware  
✅ **Logging**: Structured logging for audit trails and debugging  
✅ **Database Transactions**: ACID compliance for data integrity  
✅ **Pagination**: Efficient pagination with metadata  
✅ **Filtering & Sorting**: Flexible query capabilities  
✅ **Auto-generated IDs**: Unique grievance ID generation (GRV-YYYY-NNNNNN format)  
✅ **Soft Deletes**: Audit trail preservation  
✅ **Business Validation**: Campus, issue code, and student validation  

## 🚀 API Endpoints

### 1. Create Grievance
```http
POST /api/v1/grievances
Authorization: Bearer <student_jwt_token>
Content-Type: application/json

{
  "subject": "Internet not working in hostel",
  "description": "WiFi has been down for 3 days affecting my studies.",
  "issueCode": 1003,
  "campusId": 1,
  "hasAttachments": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Grievance created successfully",
  "data": {
    "id": 12,
    "grievanceId": "GRV-2025-001234",
    "rollno": "41522063",
    "campusId": 1,
    "issueCode": 1003,
    "subject": "Internet not working in hostel",
    "description": "WiFi has been down for 3 days affecting my studies.",
    "hasAttachments": false,
    "createdAt": "2025-08-24T10:15:00Z",
    "updatedAt": "2025-08-24T10:15:00Z"
  },
  "meta": {
    "timestamp": "2025-08-24T10:15:00Z",
    "version": "1.0"
  }
}
```

### 2. Get Specific Grievance
```http
GET /api/v1/grievances/GRV-2025-001234
Authorization: Bearer <jwt_token>
```

**Student Response (own grievance):**
```json
{
  "success": true,
  "data": {
    "id": 12,
    "grievanceId": "GRV-2025-001234",
    "rollno": "41522063",
    "campusId": 1,
    "issueCode": 1003,
    "subject": "Internet not working in hostel",
    "description": "WiFi has been down for 3 days affecting my studies.",
    "hasAttachments": false,
    "createdAt": "2025-08-24T10:15:00Z",
    "updatedAt": "2025-08-24T10:15:00Z"
  },
  "meta": {
    "timestamp": "2025-08-24T10:15:00Z",
    "requestorType": "student"
  }
}
```

**Admin Response (additional metadata):**
```json
{
  "success": true,
  "data": {
    "id": 12,
    "grievanceId": "GRV-2025-001234",
    "rollno": "41522063",
    "campusId": 1,
    "issueCode": 1003,
    "subject": "Internet not working in hostel",
    "description": "WiFi has been down for 3 days affecting my studies.",
    "hasAttachments": false,
    "createdAt": "2025-08-24T10:15:00Z",
    "updatedAt": "2025-08-24T10:15:00Z",
    "studentName": "Surbhi Gupta",
    "campusName": "Main Campus",
    "issueTitle": "Library Book Unavailable"
  },
  "meta": {
    "timestamp": "2025-08-24T10:15:00Z",
    "requestorType": "admin"
  }
}
```

### 3. Get Grievances List
```http
GET /api/v1/grievances?page=1&limit=10&sortBy=createdAt&sortOrder=DESC
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)
- `rollno`: Filter by roll number (admin only)
- `issueCode`: Filter by issue code
- `campusId`: Filter by campus ID
- `sortBy`: Sort field (createdAt, updatedAt, subject)
- `sortOrder`: Sort order (ASC, DESC)

**Response:**
```json
{
  "success": true,
  "data": {
    "grievances": [
      {
        "id": 12,
        "grievanceId": "GRV-2025-001234",
        "rollno": "41522063",
        "campusId": 1,
        "issueCode": 1003,
        "subject": "Internet not working in hostel",
        "description": "WiFi has been down for 3 days.",
        "hasAttachments": false,
        "createdAt": "2025-08-24T10:15:00Z",
        "updatedAt": "2025-08-24T10:15:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 42,
      "itemsPerPage": 10,
      "hasNextPage": true,
      "hasPreviousPage": false
    }
  },
  "meta": {
    "timestamp": "2025-08-24T10:15:00Z",
    "requestorType": "student",
    "filters": {
      "page": 1,
      "limit": 10,
      "sortBy": "createdAt",
      "sortOrder": "DESC"
    }
  }
}
```

### 4. Update Grievance (Admin Only)
```http
PUT /api/v1/grievances/GRV-2025-001234
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json

{
  "subject": "Updated: Internet connectivity issues in hostel",
  "description": "Updated description with more details about the connectivity issues.",
  "hasAttachments": true
}
```

### 5. Soft Delete Grievance (Admin Only)
```http
DELETE /api/v1/grievances/GRV-2025-001234
Authorization: Bearer <admin_jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Grievance has been marked as resolved/closed",
  "data": {
    "grievanceId": "GRV-2025-001234",
    "status": "RESOLVED",
    "closedAt": "2025-08-24T10:30:00Z"
  },
  "meta": {
    "timestamp": "2025-08-24T10:30:00Z",
    "closedBy": "ADMIN001",
    "note": "This is a soft delete - grievance data is preserved for audit purposes"
  }
}
```

## 🔒 Security Features

### Authentication & Authorization
- **Student Authentication**: `verifyJWT` middleware validates student JWT tokens
- **Admin Authentication**: `verifyAdminJWT` middleware validates admin JWT tokens
- **Flexible Access**: `verifyUserOrAdminJWT` supports both user types
- **Access Control**: Students can only view/create their own grievances
- **Admin Privileges**: Admins can view all grievances and perform updates/deletes

### Input Validation
- **Zod Schema Validation**: Compile-time and runtime type safety
- **Parameter Validation**: Grievance ID format validation (GRV-YYYY-NNNNNN)
- **Query Validation**: Pagination, sorting, and filter parameters
- **Business Validation**: Campus, issue code, and student verification

## 📊 Error Handling

### Validation Errors (400)
```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "errors": [
      {
        "field": "subject",
        "message": "Subject is required",
        "code": "invalid_type"
      }
    ]
  }
}
```

### Authentication Errors (401)
```json
{
  "success": false,
  "error": "Authentication required",
  "code": "AUTHENTICATION_REQUIRED"
}
```

### Authorization Errors (403)
```json
{
  "success": false,
  "error": "Access denied to this grievance",
  "code": "ACCESS_DENIED"
}
```

### Not Found Errors (404)
```json
{
  "success": false,
  "error": "Grievance not found",
  "code": "GRIEVANCE_NOT_FOUND"
}
```

## 🗄️ Database Design

### Transaction Management
- **ACID Compliance**: Uses database transactions for data integrity
- **Rollback Support**: Automatic rollback on errors
- **Connection Pooling**: Efficient database connection management

### Audit Trail
- **Soft Deletes**: Preserves data for compliance
- **Tracking System**: Comprehensive history tracking
- **Logging**: Structured logs for audit purposes

## 🚀 Usage Integration

To integrate the new high-quality controller into your existing system:

1. **Install Dependencies:**
   ```bash
   npm install zod
   ```

2. **Update Route Registration:**
   ```typescript
   // In src/routes/v1/index.ts
   import grievanceRoutesNew from "./grievance.routes.new";
   router.use("/grievances-v2", grievanceRoutesNew); // New endpoint
   // Or replace existing route:
   // router.use("/grievances", grievanceRoutesNew);
   ```

3. **Environment Configuration:**
   - Ensure JWT secrets are properly configured
   - Database connection parameters are set
   - Proper middleware registration

## 🧪 Testing Examples

### PowerShell Testing Script
```powershell
# Admin Login
$adminBody = @{
    email = "admin@dseu.ac.in"
    password = "qwertyuiop"
} | ConvertTo-Json -Compress

$adminResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/admin/auth/login" -Method POST -Body $adminBody -ContentType "application/json"
$adminToken = $adminResponse.token

# Student Login  
$studentBody = @{
    rollNumber = "41522063"
    password = "qwertyuiop"
} | ConvertTo-Json -Compress

$studentResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/users/login" -Method POST -Body $studentBody -ContentType "application/json"
$studentToken = $studentResponse.token

# Create Grievance
$grievanceBody = @{
    subject = "Test High-Quality API"
    description = "Testing the new production-grade grievance API implementation"
    issueCode = 1003
    campusId = 1
    hasAttachments = $false
} | ConvertTo-Json -Compress

$headers = @{
    "Authorization" = "Bearer $studentToken"
    "Content-Type" = "application/json"
}

$grievanceResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/grievances" -Method POST -Body $grievanceBody -Headers $headers
Write-Host "Created Grievance: $($grievanceResponse.data.grievanceId)"

# Get Grievances List
$grievancesList = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/grievances?page=1&limit=5" -Method GET -Headers $headers
Write-Host "Total Grievances: $($grievancesList.data.pagination.totalItems)"
```

## 🎯 Production Readiness Checklist

✅ **Code Quality**: FAANG-level code standards with comprehensive comments  
✅ **Error Handling**: Production-grade error handling with proper HTTP codes  
✅ **Security**: Authentication, authorization, and input validation  
✅ **Performance**: Optimized queries with pagination and connection pooling  
✅ **Scalability**: Stateless design with proper separation of concerns  
✅ **Maintainability**: Clean architecture with strong typing  
✅ **Observability**: Structured logging and audit trails  
✅ **Documentation**: Comprehensive API documentation and examples  
✅ **Testing**: Ready for unit and integration testing  
✅ **Compliance**: GDPR-ready with soft deletes and audit preservation  

This implementation represents a production-ready, enterprise-grade Grievance API that can be deployed in high-scale environments with confidence.

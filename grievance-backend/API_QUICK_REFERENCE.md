# 📋 DSEU Grievance Portal API - Quick Reference

## 🌐 Base URL
```
Local Development: http://localhost:5000
```

## 🔧 System Endpoints
| Endpoint | Method | Description | Auth Required |
|----------|---------|-------------|---------------|
| `/api/health` | GET | API & Database health check | ❌ |
| `/api/pool-status` | GET | Database connection pool status | ❌ |
| `/api/test` | GET | Basic API test | ❌ |

## 👨‍🎓 Student Authentication
| Endpoint | Method | Description | Auth Required |
|----------|---------|-------------|---------------|
| `/api/v1/users/auth/rollNumber-exist/{rollNumber}` | GET | Check if roll number exists | ❌ |
| `/api/v1/users/auth/verify-partial-email/{rollNumber}/{email}` | GET | Verify partial email | ❌ |
| `/api/v1/users/auth/set-password` | POST | Set password for first-time users | ❌ |
| `/api/v1/users/auth/login` | POST | Student login | ❌ |

## 👨‍💼 Admin Authentication
| Endpoint | Method | Description | Auth Required |
|----------|---------|-------------|---------------|
| `/api/v1/admin/login` | POST | Admin login | ❌ |

## 📝 Grievance Management
| Endpoint | Method | Description | Auth Required |
|----------|---------|-------------|---------------|
| `/api/v1/grievances` | POST | Create new grievance | 🔒 Student |
| `/api/v1/grievances` | GET | Get all grievances | 🔒 Admin |
| `/api/v1/grievances/my-grievances` | GET | Get student's own grievances | 🔒 Student |
| `/api/v1/grievances/{id}` | GET | Get grievance by database ID | 🔒 Student |
| `/api/v1/grievances/grievance/{grievanceId}` | GET | Get by grievance ID (public) | ❌ |
| `/api/v1/grievances/search/{issueId}` | GET | Search by issue ID (public) | ❌ |
| `/api/v1/grievances/by-rollno/{rollno}` | GET | Get by roll number | 🔒 Admin |
| `/api/v1/grievances/stats/overview` | GET | Get statistics | 🔒 Admin |

## 💬 Admin Responses
| Endpoint | Method | Description | Auth Required |
|----------|---------|-------------|---------------|
| `/api/v1/grievances/{grievanceId}/response` | POST | Add admin response | 🔒 Admin |
| `/api/v1/grievances/{grievanceId}/redirect` | PUT | Redirect to different admin | 🔒 Admin |
| `/api/v1/grievances/{grievanceId}/student-status` | PUT | Update student status | 🔒 Admin |

## 📎 Attachments
| Endpoint | Method | Description | Auth Required |
|----------|---------|-------------|---------------|
| `/api/v1/attachments/upload` | POST | Upload file attachment | 🔒 Student |
| `/api/v1/attachments/grievance/{grievanceId}` | GET | Get attachments by grievance | 🔒 Student |
| `/api/v1/attachments/download/{id}` | GET | Download attachment | 🔒 Student |
| `/api/v1/attachments/{id}` | DELETE | Delete attachment | 🔒 Student |

## 🏢 Admin Management
| Endpoint | Method | Description | Auth Required |
|----------|---------|-------------|---------------|
| `/api/v1/admin/dashboard` | GET | Admin dashboard | 🔒 Admin |
| `/api/v1/dept-admin/dashboard` | GET | Department admin dashboard | 🔒 Admin |
| `/api/v1/campus-admin/dashboard` | GET | Campus admin dashboard | 🔒 Admin |
| `/api/v1/super-admin/admins` | GET | Get all admins | 🔒 Super Admin |

## 🔐 Authentication Headers
```
Student Auth: Authorization: Bearer {{student_token}}
Admin Auth: Authorization: Bearer {{admin_token}}
```

## 📋 Sample Request Bodies

### Student Login:
```json
{
  "rollNumber": "2024CS001",
  "password": "Student123!"
}
```

### Admin Login:
```json
{
  "email": "admin@dseu.ac.in",
  "password": "Admin123!"
}
```

### Create Grievance:
```json
{
  "Subject": "Library Issue - Book Not Available",
  "Description": "The required textbook is not available in the library.",
  "IssueCode": "LIB001",
  "CampusId": "CAM001"
}
```

### Add Admin Response:
```json
{
  "response": "We have noted your concern. The book will be available within 3-5 business days.",
  "status": "in_progress",
  "category": "library"
}
```

### Set Student Password:
```json
{
  "rollNumber": "2024CS001",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!"
}
```

## 🚦 HTTP Status Codes
- `200` - Success
- `201` - Created successfully
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate data)
- `500` - Internal Server Error
- `501` - Not Implemented (placeholder endpoints)

## 📁 File Upload Specifications
- **Max Size**: 10MB
- **Allowed Types**: JPG, JPEG, PNG, PDF, DOC, DOCX
- **Upload Method**: multipart/form-data
- **Required Fields**: `file` (file), `grievanceId` (text)

## ⚡ Quick Test Sequence
1. Health Check: `GET /api/health`
2. Student Login: `POST /api/v1/users/auth/login`
3. Create Grievance: `POST /api/v1/grievances`
4. Get My Grievances: `GET /api/v1/grievances/my-grievances`
5. Admin Login: `POST /api/v1/admin/login`
6. Add Response: `POST /api/v1/grievances/{grievanceId}/response`

## 🔄 Development URLs
```
Health Check: http://localhost:5000/api/health
Pool Status: http://localhost:5000/api/pool-status
Test Endpoint: http://localhost:5000/api/test
```

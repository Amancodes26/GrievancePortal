# Simplified Attachment System

## Overview
The attachment system has been simplified to remove temporary attachment workflows. Now attachments are uploaded directly to existing grievances only.

## New Workflow

### 1. Student Creates Grievance
```http
POST /api/v1/grievances/create
Content-Type: application/json
Authorization: Bearer <user_jwt>

{
  "subject": "Fee payment issue",
  "description": "Unable to pay fees online",
  "issueCode": 123,
  "campusId": 1
}
```

**Response:**
```json
{
  "message": "Grievance created successfully. You can now upload attachments using the grievance ID.",
  "data": {
    "id": 1,
    "grievanceId": "GRV-2025-123456",
    "subject": "Fee payment issue",
    "attachmentUploadUrl": "/api/v1/attachments/grievance/GRV-2025-123456"
  },
  "success": true
}
```

### 2. Student Uploads Attachments (Optional)
```http
POST /api/v1/attachments/grievance/GRV-2025-123456
Content-Type: multipart/form-data
Authorization: Bearer <user_jwt>

Form Data:
- attachment: [PDF/Image file, max 5MB]
```

**Response:**
```json
{
  "message": "Attachment uploaded successfully",
  "success": true,
  "data": {
    "id": 15,
    "filename": "fee_receipt.pdf", 
    "mimeType": "application/pdf",
    "size": 245760,
    "uploadedAt": "2025-08-10T10:30:45.123Z",
    "uploadedBy": "41522026"
  }
}
```

## API Endpoints

### Upload Attachment to Grievance
- **URL:** `POST /api/v1/attachments/grievance/:grievanceId`
- **Auth:** User or Admin
- **Body:** FormData with 'attachment' file
- **File Types:** PDF, JPG, JPEG, PNG
- **Max Size:** 5MB

### Get Grievance Attachments
- **URL:** `GET /api/v1/attachments/grievance/:grievanceId`
- **Auth:** User (owner) or Admin
- **Response:** Array of attachment details

### Download Attachment
- **URL:** `GET /api/v1/attachments/:attachmentId/download`
- **Auth:** User (owner) or Admin
- **Response:** File stream

### Get Attachment Details
- **URL:** `GET /api/v1/attachments/:attachmentId`
- **Auth:** User (owner) or Admin
- **Response:** Attachment metadata

### Delete Attachment
- **URL:** `DELETE /api/v1/attachments/:attachmentId`
- **Auth:** User (owner) or Admin
- **Response:** Success message

### Admin Endpoints

#### System Health
- **URL:** `GET /api/v1/attachments/health`
- **Auth:** Admin only
- **Response:** System statistics and health info

#### Cleanup Orphaned Files
- **URL:** `DELETE /api/v1/attachments/cleanup`
- **Auth:** Admin only
- **Response:** Cleanup results

## Database Schema

```sql
CREATE TABLE IF NOT EXISTS Attachment (
    Id SERIAL PRIMARY KEY,
    GrievanceId VARCHAR(50) NOT NULL,
    FileName VARCHAR(255) NOT NULL,         -- Original filename
    FilePath TEXT NOT NULL,                 -- Server file path
    MimeType VARCHAR(100) NOT NULL,         -- File MIME type
    FileSize INTEGER NOT NULL,              -- Size in bytes
    UploadedAt TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata'),
    UploadedBy VARCHAR(50) NOT NULL,        -- User roll number or admin ID
    CONSTRAINT fk_attachment_grievance FOREIGN KEY (GrievanceId) REFERENCES Grievance(GrievanceId) ON DELETE CASCADE
);
```

## Security Features

1. **File Validation**
   - MIME type checking
   - File extension validation
   - File size limits (5MB)
   - Secure filename generation

2. **Access Control**
   - Users can only access their own grievance attachments
   - Admins can access all attachments
   - JWT authentication required

3. **File Storage**
   - Secure file paths with random names
   - Files stored outside web root
   - Proper error handling and cleanup

## File Organization

- **Controller:** `src/controllers/attachment.controller.ts`
- **Routes:** `src/routes/v1/attachment.routes.ts`
- **Queries:** `src/db/queries.ts` (AttachmentQueries)
- **Upload Directory:** `/uploads/grievances/` (dev) or `/tmp/uploads/` (production)

## Benefits of Simplified System

1. **Cleaner Architecture** - Single controller for all attachment operations
2. **Better Security** - Direct attachment-to-grievance relationship
3. **Easier Maintenance** - No temporary file management
4. **Clearer User Flow** - Create grievance first, then upload files
5. **Reduced Complexity** - No pre-upload validation or linking logic

## Migration Notes

- Removed temporary attachment controllers and routes
- Simplified grievance creation (no attachment_ids parameter)
- Updated database queries to match schema
- Consolidated all attachment functionality into single controller

# Pre-Grievance Attachment Upload API

This API allows users to upload attachments before creating a grievance. The attachments are stored temporarily and linked to the grievance when it's created.

## Base URL
```
/api/v1/pre-grievance
```

## Authentication
All endpoints require JWT authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Endpoints

### 1. Upload Attachment

Upload a file that can be attached to a grievance during creation.

**Endpoint:** `POST /api/v1/pre-grievance/upload-attachment`

**Headers:**
- `Authorization: Bearer <jwt_token>`
- `Content-Type: multipart/form-data`

**Body:**
- `attachment` (file): The file to upload

**Supported File Types:**
- PDF (.pdf)
- Images (.jpg, .jpeg, .png, .gif)

**File Size Limit:** 5MB

**Response:**
```json
{
  "success": true,
  "message": "Attachment uploaded successfully. Use the attachment_id when creating your grievance.",
  "data": {
    "attachment_id": 123,
    "filename": "pre_grievance_41522026_1703123456789_abc123_document.pdf",
    "original_filename": "my_document.pdf",
    "mimetype": "application/pdf",
    "size": 245760,
    "uploaded_at": "2023-12-21T10:30:45.123Z",
    "uploaded_by": "41522026",
    "user_name": "John Doe"
  }
}
```

**Error Responses:**
```json
// No file uploaded
{
  "success": false,
  "message": "No file uploaded. Please select a file to upload"
}

// Invalid file type
{
  "success": false,
  "message": "File validation failed: File type not allowed. Allowed: application/pdf, image/jpeg, image/jpg, image/png, image/gif"
}

// File too large
{
  "success": false,
  "message": "File validation failed: File is too large"
}

// Rate limit exceeded
{
  "success": false,
  "message": "Too many upload attempts. Please wait before trying again"
}
```

### 2. Get Temporary Attachment Details

Retrieve details of a temporary attachment.

**Endpoint:** `GET /api/v1/pre-grievance/attachment/:attachment_id`

**Headers:**
- `Authorization: Bearer <jwt_token>`

**Parameters:**
- `attachment_id` (path): The ID of the temporary attachment

**Response:**
```json
{
  "success": true,
  "message": "Temporary attachment details retrieved",
  "data": {
    "attachment_id": 123,
    "filename": "pre_grievance_41522026_1703123456789_abc123_document.pdf",
    "original_filename": "my_document.pdf",
    "mimetype": "application/pdf",
    "size": 245760,
    "uploaded_at": "2023-12-21T10:30:45.123Z",
    "uploaded_by": "41522026",
    "file_exists": true,
    "status": "temporary"
  }
}
```

### 3. List All Temporary Attachments

Get all temporary attachments for the authenticated user.

**Endpoint:** `GET /api/v1/pre-grievance/attachments`

**Headers:**
- `Authorization: Bearer <jwt_token>`

**Response:**
```json
{
  "success": true,
  "message": "Temporary attachments retrieved successfully",
  "data": {
    "attachments": [
      {
        "attachment_id": 123,
        "filename": "pre_grievance_41522026_1703123456789_abc123_document.pdf",
        "original_filename": "my_document.pdf",
        "mimetype": "application/pdf",
        "size": 245760,
        "uploaded_at": "2023-12-21T10:30:45.123Z",
        "file_exists": true,
        "status": "temporary"
      },
      {
        "attachment_id": 124,
        "filename": "pre_grievance_41522026_1703123456790_def456_image.jpg",
        "original_filename": "evidence.jpg",
        "mimetype": "image/jpeg",
        "size": 512000,
        "uploaded_at": "2023-12-21T11:15:30.456Z",
        "file_exists": true,
        "status": "temporary"
      }
    ],
    "total_count": 2
  }
}
```

### 4. Delete Temporary Attachment

Delete a temporary attachment.

**Endpoint:** `DELETE /api/v1/pre-grievance/attachment/:attachment_id`

**Headers:**
- `Authorization: Bearer <jwt_token>`

**Parameters:**
- `attachment_id` (path): The ID of the temporary attachment to delete

**Response:**
```json
{
  "success": true,
  "message": "Temporary attachment deleted successfully",
  "data": {
    "deleted_attachment_id": 123,
    "filename": "pre_grievance_41522026_1703123456789_abc123_document.pdf"
  }
}
```

### 5. Cleanup Orphaned Attachments

Clean up temporary attachments older than 24 hours (maintenance endpoint).

**Endpoint:** `DELETE /api/v1/pre-grievance/cleanup`

**Headers:**
- `Authorization: Bearer <jwt_token>`

**Response:**
```json
{
  "success": true,
  "message": "Cleanup completed successfully"
}
```

## Usage Flow

### Complete Workflow: Upload Attachments → Create Grievance

1. **Upload Attachments First:**
```bash
curl -X POST "http://localhost:3000/api/v1/pre-grievance/upload-attachment" \
  -H "Authorization: Bearer <your_jwt_token>" \
  -F "attachment=@/path/to/your/document.pdf"
```

Response:
```json
{
  "success": true,
  "data": {
    "attachment_id": 123,
    "filename": "pre_grievance_41522026_1703123456789_abc123_document.pdf",
    "original_filename": "document.pdf"
  }
}
```

2. **Upload Another Attachment (Optional):**
```bash
curl -X POST "http://localhost:3000/api/v1/pre-grievance/upload-attachment" \
  -H "Authorization: Bearer <your_jwt_token>" \
  -F "attachment=@/path/to/your/image.jpg"
```

Response:
```json
{
  "success": true,
  "data": {
    "attachment_id": 124,
    "filename": "pre_grievance_41522026_1703123456790_def456_image.jpg",
    "original_filename": "image.jpg"
  }
}
```

3. **Create Grievance with Attachments:**
```bash
curl -X POST "http://localhost:3000/api/v1/grievances" \
  -H "Authorization: Bearer <your_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Exam Schedule Issue",
    "description": "There is a conflict in the exam schedule...",
    "issue_type": "academic",
    "attachment_ids": [123, 124]
  }'
```

The system will automatically:
- Validate that the attachment IDs belong to the authenticated user
- Link the temporary attachments to the created grievance
- Update the grievance record to indicate it has attachments

## Error Handling

### Common Error Responses

**Authentication Required:**
```json
{
  "success": false,
  "message": "Authentication required. Please provide valid JWT token"
}
```

**Attachment Not Found:**
```json
{
  "success": false,
  "message": "Temporary attachment not found or access denied"
}
```

**File Validation Errors:**
```json
{
  "success": false,
  "message": "File validation failed: Invalid PDF file format"
}
```

**Rate Limiting:**
```json
{
  "success": false,
  "message": "Too many upload attempts. Please wait before trying again"
}
```

## Security Features

1. **JWT Authentication:** All endpoints require valid JWT tokens
2. **File Type Validation:** Only allowed file types are accepted
3. **File Size Limits:** Maximum 5MB per file
4. **Malicious Content Detection:** Files are scanned for suspicious patterns
5. **Rate Limiting:** Maximum 10 uploads per 15 minutes per user
6. **Access Control:** Users can only access their own attachments
7. **Secure File Names:** Generated filenames prevent path traversal attacks
8. **Automatic Cleanup:** Orphaned attachments are automatically removed after 24 hours

## File Storage

- **Development:** Files are stored in `uploads/pre-grievance/` directory
- **Production (Vercel):** Files are converted to base64 and stored in the database
- **Temporary Storage:** Attachments are marked as temporary (Issuse_Id = -1) until linked to a grievance

## Integration with Grievance Creation

When creating a grievance, include the `attachment_ids` field with an array of attachment IDs from the upload response:

```json
{
  "subject": "My Grievance Subject",
  "description": "Detailed description...",
  "issue_type": "academic",
  "attachment_ids": [123, 124, 125]
}
```

The grievance creation endpoint will:
1. Validate all attachment IDs belong to the authenticated user
2. Link the attachments to the created grievance
3. Update the grievance attachment flag
4. Return the grievance details with linked attachment information

## Rate Limits

- **Upload Endpoint:** 10 uploads per 15 minutes per user
- **Other Endpoints:** No specific limits (general API rate limiting applies)

## File Cleanup

Temporary attachments are automatically cleaned up:
- **Manual Cleanup:** Use the `/cleanup` endpoint
- **Automatic Cleanup:** Attachments older than 24 hours are removed
- **Grievance Creation:** Successfully linked attachments are no longer temporary

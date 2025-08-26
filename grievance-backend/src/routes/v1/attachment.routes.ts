import { Router } from 'express';
import { AttachmentController } from '../../controllers/attachment.controller';
import { uploadSingleFile, uploadMultipleFiles } from '../../middlewares/fileUpload.middleware';
import { verifyAdminJWT } from '../../middlewares/adminAuth.middleware';
import { adminActionRateLimit } from '../../middlewares/rateLimit.middleware';

const router = Router();
const attachmentController = new AttachmentController();

/**
 * Attachment API Routes
 * 
 * Enterprise-grade file management endpoints with comprehensive security:
 * - File upload with validation and virus scanning preparation
 * - Secure file download with access controls
 * - Attachment list with pagination and filtering
 * - Soft/hard deletion with audit logging
 * - Bulk operations for administrative efficiency
 * 
 * Security Controls:
 * - Authentication middleware for all endpoints
 * - Rate limiting to prevent abuse
 * - File type and size validation
 * - Path traversal protection
 * - MIME type verification
 */

// Apply authentication middleware to all attachment routes
router.use(verifyAdminJWT);

// Apply rate limiting to prevent abuse
router.use(adminActionRateLimit);

/**
 * POST /attachments
 * Upload a single file attachment for a grievance
 * 
 * Body:
 * - grievanceId: string (UUID of the grievance)
 * - uploadedBy: string (Admin ID performing the upload)
 * - file: File (multipart/form-data)
 * 
 * Security: 
 * - Max file size: 10MB
 * - Allowed MIME types: See validator configuration
 * - File signature verification
 * - Filename sanitization
 */
router.post('/',
  uploadSingleFile('file'),
  attachmentController.uploadAttachment
);

/**
 * POST /attachments/bulk
 * Upload multiple files for a grievance in a single request
 * 
 * Body:
 * - grievanceId: string (UUID of the grievance)
 * - uploadedBy: string (Admin ID performing the upload)
 * - files: File[] (multipart/form-data, max 10 files)
 * 
 * Response includes both successful uploads and any failures
 */
router.post('/bulk',
  uploadMultipleFiles('files', 10),
  attachmentController.bulkUploadAttachments
);

/**
 * GET /attachments/:grievanceId
 * Retrieve paginated list of attachments for a grievance
 * 
 * Params:
 * - grievanceId: string (UUID of the grievance)
 * 
 * Query Parameters:
 * - page: number (default: 1)
 * - limit: number (default: 10, max: 100)
 * - sortBy: string (uploaded_at|file_name|file_size|mime_type, default: uploaded_at)
 * - sortOrder: string (asc|desc, default: desc)
 * 
 * Response includes:
 * - Paginated attachment list
 * - Summary statistics
 * - File type distribution
 * - Uploader information
 */
router.get('/:grievanceId',
  attachmentController.getAttachmentList
);

/**
 * GET /attachments/:grievanceId/stats
 * Get comprehensive statistics for attachments of a grievance
 * 
 * Params:
 * - grievanceId: string (UUID of the grievance)
 * 
 * Response includes:
 * - Total file count and size
 * - File type distribution
 * - Uploader statistics
 * - Recent upload activity
 */
router.get('/:grievanceId/stats',
  attachmentController.getAttachmentStats
);

/**
 * GET /attachments/download/:attachmentId
 * Download a specific attachment file
 * 
 * Params:
 * - attachmentId: number (ID of the attachment to download)
 * 
 * Security:
 * - Access control based on admin role/department
 * - File existence verification
 * - Secure file streaming
 * - Audit logging of download activity
 * 
 * Response:
 * - File stream with appropriate headers
 * - Content-Disposition: attachment
 * - Content-Type: original MIME type
 * - Custom headers with metadata
 */
router.get('/download/:attachmentId',
  attachmentController.downloadAttachment
);

/**
 * DELETE /attachments/:attachmentId
 * Delete an attachment (soft delete by default)
 * 
 * Params:
 * - attachmentId: number (ID of the attachment to delete)
 * 
 * Query Parameters:
 * - hardDelete: boolean (default: false, set to true for permanent deletion)
 * 
 * Security:
 * - Authorization: Only uploader or super admin can delete
 * - Soft delete by default for audit trail
 * - Hard delete removes file from disk and database
 * - Audit logging of deletion activity
 */
router.delete('/:attachmentId',
  attachmentController.deleteAttachment
);

export { router as attachmentRoutes };

// TODO: Implement cleanup orphaned files
// DELETE /api/v1/attachments/cleanup
// Headers: Authorization: Bearer <admin_jwt_token>
// router.delete('/cleanup', 
//   verifyAdminJWT, 
//   attachmentController.cleanupOrphanedFiles
// );

// TODO: Implement system health and statistics
// GET /api/v1/attachments/health
// Headers: Authorization: Bearer <admin_jwt_token>
// router.get('/health', 
//   verifyAdminJWT, 
//   attachmentController.getSystemHealth
// );

export default router;

import { Router } from 'express';
import { verifyJWT } from '../../middlewares/userAuth.middleware';
import { verifyAdminJWT } from '../../middlewares/adminAuth.middleware';
import { verifyUserOrAdminJWT } from '../../middlewares/auth.middleware';
import * as attachmentController from '../../controllers/attachment.controller';

const router = Router();

/**
 * Unified Attachment Routes
 * Simplified workflow: Direct upload to grievances only
 */

// Upload attachment to existing grievance
// POST /api/v1/attachments/grievance/:grievanceId
// Headers: Authorization: Bearer <jwt_token>
// Body: FormData with 'attachment' file
router.post('/grievance/:grievanceId', 
  verifyUserOrAdminJWT, 
  attachmentController.attachmentUpload.single('attachment'),
  attachmentController.uploadToGrievance
);

// Get all attachments for a grievance
// GET /api/v1/attachments/grievance/:grievanceId
// Headers: Authorization: Bearer <jwt_token>
router.get('/grievance/:grievanceId', 
  verifyUserOrAdminJWT, 
  attachmentController.getGrievanceAttachments
);

// Get attachment details by ID
// GET /api/v1/attachments/:attachmentId
// Headers: Authorization: Bearer <jwt_token>
router.get('/:attachmentId', 
  verifyUserOrAdminJWT, 
  attachmentController.getAttachmentById
);

// Download attachment by ID
// GET /api/v1/attachments/:attachmentId/download
// Headers: Authorization: Bearer <jwt_token>
router.get('/:attachmentId/download', 
  verifyUserOrAdminJWT, 
  attachmentController.downloadAttachment
);

// Delete attachment by ID
// DELETE /api/v1/attachments/:attachmentId
// Headers: Authorization: Bearer <jwt_token>
// Only attachment owner or admin can delete
router.delete('/:attachmentId', 
  verifyUserOrAdminJWT, 
  attachmentController.deleteAttachment
);

// Admin-only routes

// Cleanup orphaned files
// DELETE /api/v1/attachments/cleanup
// Headers: Authorization: Bearer <admin_jwt_token>
router.delete('/cleanup', 
  verifyAdminJWT, 
  attachmentController.cleanupOrphanedFiles
);

// Get system health and statistics
// GET /api/v1/attachments/health
// Headers: Authorization: Bearer <admin_jwt_token>
router.get('/health', 
  verifyAdminJWT, 
  attachmentController.getSystemHealth
);

export default router;

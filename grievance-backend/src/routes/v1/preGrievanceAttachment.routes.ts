import { Router } from 'express';
import * as preGrievanceAttachmentController from '../../controllers/preGrievanceAttachment.controller';
import { verifyJWT } from '../../middlewares/userAuth.middleware';

const router = Router();

/**
 * Pre-Grievance Attachment Routes
 * These routes allow users to upload attachments before creating a grievance
 * All routes require JWT authentication
 */

// Upload attachment for future grievance creation
// POST /api/v1/pre-grievance/upload-attachment
// Headers: Authorization: Bearer <jwt_token>
// Body: FormData with 'attachment' file field
// Returns: { attachment_id, filename, size, etc. } - use attachment_id when creating grievance
router.post('/upload-attachment', 
  verifyJWT, 
  preGrievanceAttachmentController.preGrievanceUpload.single('attachment'), 
  preGrievanceAttachmentController.uploadPreGrievanceAttachment
);

// Get temporary attachment details (to verify upload before creating grievance)
// GET /api/v1/pre-grievance/attachment/:attachment_id
// Headers: Authorization: Bearer <jwt_token>
// Returns: attachment details if it belongs to the authenticated user
router.get('/attachment/:attachment_id', 
  verifyJWT, 
  preGrievanceAttachmentController.getTemporaryAttachment
);

// Delete temporary attachment
// DELETE /api/v1/pre-grievance/attachment/:attachment_id
// Headers: Authorization: Bearer <jwt_token>
// Returns: success message
router.delete('/attachment/:attachment_id', 
  verifyJWT, 
  preGrievanceAttachmentController.deleteTemporaryAttachment
);

// List all temporary attachments for the authenticated user
// GET /api/v1/pre-grievance/attachments
// Headers: Authorization: Bearer <jwt_token>
// Returns: list of temporary attachments
router.get('/attachments', 
  verifyJWT, 
  preGrievanceAttachmentController.listTemporaryAttachments
);

// Cleanup endpoint for orphaned attachments (for maintenance)
// DELETE /api/v1/pre-grievance/cleanup
// Headers: Authorization: Bearer <jwt_token>
// This should be called periodically to clean up temporary attachments older than 24 hours
router.delete('/cleanup', 
  verifyJWT, 
  async (req, res) => {
    try {
      await preGrievanceAttachmentController.cleanupOrphanedAttachments();
      res.status(200).json({
        success: true,
        message: 'Cleanup completed successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Cleanup failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

export default router;

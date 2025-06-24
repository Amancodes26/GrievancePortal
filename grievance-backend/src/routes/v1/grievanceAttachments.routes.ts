import { Router } from 'express';
import * as grievanceCreateAttachmentController from '../../controllers/grievanceCreateAttachment.controller';
import { verifyJWT } from '../../middlewares/userAuth.middleware';
import { verifyUserOrAdminJWT } from '../../middlewares/auth.middleware';

const router = Router();

// Upload attachment for grievance creation (before creating the grievance)
// POST /api/v1/grievance-attachments/upload
// Headers: Authorization: Bearer <jwt_token>
// Body: FormData with 'attachment' file
// Returns: { attachment_id, filename, size, etc. } - use attachment_id when creating grievance
router.post('/upload', 
  verifyJWT, 
  grievanceCreateAttachmentController.grievanceUpload.single('attachment'), 
  grievanceCreateAttachmentController.uploadGrievanceAttachment
);

// Get temporary attachment info (to verify upload before creating grievance)
// GET /api/v1/grievance-attachments/temp/:attachment_id
// Headers: Authorization: Bearer <jwt_token>
// Returns: attachment details if it belongs to the authenticated user
router.get('/temp/:attachment_id', 
  verifyJWT, 
  grievanceCreateAttachmentController.getTemporaryAttachment
);

// Admin endpoint to clean up orphaned attachments (for maintenance)
// DELETE /api/v1/grievance-attachments/cleanup
// Headers: Authorization: Bearer <admin_jwt_token>
// This should be called periodically to clean up temporary attachments that were never linked to grievances
router.delete('/cleanup', 
  verifyUserOrAdminJWT, 
  async (req, res) => {
    try {
      await grievanceCreateAttachmentController.cleanupOrphanedAttachments();
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

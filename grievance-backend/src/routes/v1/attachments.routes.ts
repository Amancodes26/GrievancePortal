import { Router } from 'express';
import { upload } from '../../middlewares/upload.middleware';
import * as attachmentController from '../../controllers/grievanceAttachment.controller';
import { verifyJWT } from '../../middlewares/userAuth.middleware';

const router = Router();

// Health check for attachment service
// GET /api/v1/attachments/health
router.get('/health', attachmentController.getAttachmentSystemHealth as any);

// Upload attachment to grievance (filepath-based, minimal)
// POST /api/v1/attachments/upload
// Body: FormData with 'attachment' file and 'issue_id', optional 'test_user_rollno'
router.post('/upload', verifyJWT, upload.single('attachment'), attachmentController.uploadAttachment);

// Get all attachments for a grievance (authentication required for security)
// GET /api/v1/attachments/grievance/:issue_id
// router.get('/grievance/:issue_id', verifyJWT, attachmentController.listAttachments as any);

// Download attachment file (now serves from database) - Auth required for security
// GET /api/v1/attachments/:attachment_id/download
router.get('/:attachment_id/download', verifyJWT, attachmentController.downloadAttachment as any);

// Delete attachment (user can only delete their own) - Auth required
// DELETE /api/v1/attachments/:attachment_id
// Body: optional 'test_user_rollno' for testing
router.delete('/:attachment_id', verifyJWT, attachmentController.deleteAttachment as any);

export default router;

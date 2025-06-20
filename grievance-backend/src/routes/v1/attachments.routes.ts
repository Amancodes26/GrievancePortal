import { Router } from 'express';
// Use the new memory-based controller for Vercel compatibility
import * as attachmentController from '../../controllers/grievanceAttachment.memory.controller';

const router = Router();

// Health check for attachment service
// GET /api/v1/attachments/health
router.get('/health', attachmentController.getAttachmentSystemHealth as any);

// Upload attachment to grievance (now uses memory storage + database)
// POST /api/v1/attachments/upload
// Body: FormData with 'attachment' file and 'issue_id', optional 'test_user_rollno'
router.post('/upload', ...attachmentController.uploadAttachment as any);

// Get all attachments for a grievance
// GET /api/v1/attachments/grievance/:issue_id
router.get('/grievance/:issue_id', attachmentController.listAttachments as any);

// Download attachment file (now serves from database)
// GET /api/v1/attachments/:attachment_id/download
router.get('/:attachment_id/download', attachmentController.downloadAttachment as any);

// Delete attachment (user can only delete their own)
// DELETE /api/v1/attachments/:attachment_id
// Body: optional 'test_user_rollno' for testing
router.delete('/:attachment_id', attachmentController.deleteAttachment as any);

export default router;

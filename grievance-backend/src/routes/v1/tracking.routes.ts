import { Router } from 'express';
import { TrackingController } from '../../controllers/tracking.controller';
import { verifyAdminJWT } from '../../middlewares/adminAuth.middleware';

/**
 * Tracking API Routes
 * Provides comprehensive grievance tracking functionality
 * 
 * Routes:
 * - POST   /tracking           - Create new tracking entry
 * - GET    /tracking/:id       - Get tracking history for grievance
 * - GET    /tracking/:id/status - Get current status for grievance
 */

const router = Router();
const trackingController = new TrackingController();

// All tracking routes require admin authentication
router.use(verifyAdminJWT);

/**
 * @route POST /api/v1/tracking
 * @desc Create new tracking entry for a grievance
 * @access Private (Admin only)
 * @body {
 *   grievanceId: string,
 *   responseText: string,
 *   adminStatus: 'NEW' | 'PENDING' | 'REDIRECTED' | 'RESOLVED' | 'REJECTED',
 *   studentStatus: 'SUBMITTED' | 'UNDER_REVIEW' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED',
 *   responseBy: string,
 *   redirectTo?: string,
 *   isRedirect?: boolean,
 *   hasAttachments?: boolean
 * }
 */
router.post('/', trackingController.createTrackingEntry);

/**
 * @route GET /api/v1/tracking/:grievanceId
 * @desc Get complete tracking history for a grievance
 * @access Private (Admin only)
 * @param grievanceId - Unique grievance identifier (format: GRV-YYYY-NNNNNN)
 */
router.get('/:grievanceId', trackingController.getTrackingHistory);

/**
 * @route GET /api/v1/tracking/:grievanceId/status
 * @desc Get current tracking status for a grievance (lightweight)
 * @access Private (Admin only)
 * @param grievanceId - Unique grievance identifier (format: GRV-YYYY-NNNNNN)
 */
router.get('/:grievanceId/status', trackingController.getCurrentStatus);

/**
 * @route POST /api/v1/tracking/redirect/:grievanceId
 * @desc Redirect a grievance to another admin
 * @access Private (Admin only)
 * @param grievanceId - Unique grievance identifier (format: GRV-YYYY-NNNNNN)
 * @body {
 *   redirectTo: string,     // Target admin ID (format: ADMIN123)
 *   comment: string         // Redirect reason/comment (required)
 * }
 */
router.post('/redirect/:grievanceId', trackingController.redirectGrievance);

export default router;

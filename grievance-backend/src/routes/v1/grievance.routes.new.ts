import { Router } from 'express';
import {
  createGrievance,
  getGrievanceById,
  getGrievances,
  updateGrievance,
  deleteGrievance
} from '../../controllers/grievance.controller.minimal';
import { verifyJWT } from '../../middlewares/userAuth.middleware';
import { verifyAdminJWT } from '../../middlewares/adminAuth.middleware';
import { verifyUserOrAdminJWT } from '../../middlewares/auth.middleware';

/**
 * High-Quality Grievance Routes with Production-Grade Security
 * 
 * Route Structure:
 * - POST   /grievances        -> Create grievance (students only)
 * - GET    /grievances/:id    -> Get specific grievance (user/admin with access control)
 * - GET    /grievances        -> Get grievances list (user/admin with filtering)
 * - PUT    /grievances/:id    -> Update grievance metadata (admin only)
 * - DELETE /grievances/:id    -> Soft delete grievance (admin only)
 */
const router = Router();

/**
 * @route POST /grievances
 * @desc Create a new grievance
 * @access Private (Students only)
 * @middleware verifyJWT - Ensures student authentication
 * 
 * Expected request body:
 * {
 *   "subject": "Internet not working in hostel",
 *   "description": "WiFi has been down for 3 days.",
 *   "issueCode": 1003,
 *   "campusId": 1,
 *   "hasAttachments": false
 * }
 * 
 * Response format:
 * {
 *   "success": true,
 *   "message": "Grievance created successfully",
 *   "data": {
 *     "id": 12,
 *     "grievanceId": "GRV-2025-001234",
 *     "rollno": "CS2025001",
 *     "campusId": 1,
 *     "issueCode": 1003,
 *     "subject": "Internet not working in hostel",
 *     "description": "WiFi has been down for 3 days.",
 *     "hasAttachments": false,
 *     "createdAt": "2025-08-24T10:15:00Z",
 *     "updatedAt": "2025-08-24T10:15:00Z"
 *   }
 * }
 */
router.post('/', verifyJWT, createGrievance);

/**
 * @route GET /grievances/:id
 * @desc Get a specific grievance by ID
 * @access Private (Student can view own, Admin can view any)
 * @middleware verifyUserOrAdminJWT - Supports both student and admin access
 * 
 * Path parameters:
 * - id: Grievance ID in format GRV-YYYY-NNNNNN
 * 
 * Response includes additional metadata for admin users:
 * - studentName, campusName, issueTitle
 */
router.get('/:id', verifyUserOrAdminJWT, getGrievanceById);

/**
 * @route GET /grievances
 * @desc Get grievances with filtering and pagination
 * @access Private (Student sees own, Admin sees filtered results)
 * @middleware verifyUserOrAdminJWT - Supports both student and admin access
 * 
 * Query parameters (all optional):
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10, max: 100)
 * - rollno: Filter by roll number (admin only)
 * - issueCode: Filter by issue code
 * - campusId: Filter by campus ID
 * - sortBy: Sort field (createdAt, updatedAt, subject)
 * - sortOrder: Sort order (ASC, DESC)
 * 
 * Examples:
 * - GET /grievances?page=1&limit=20
 * - GET /grievances?issueCode=1003&sortBy=createdAt&sortOrder=DESC
 * - GET /grievances?rollno=CS2025001 (admin only)
 */
router.get('/', verifyUserOrAdminJWT, getGrievances);

/**
 * @route PUT /grievances/:id
 * @desc Update grievance metadata
 * @access Private (Admin only)
 * @middleware verifyAdminJWT - Ensures admin authentication
 * 
 * Path parameters:
 * - id: Grievance ID in format GRV-YYYY-NNNNNN
 * 
 * Request body (all fields optional):
 * {
 *   "subject": "Updated subject",
 *   "description": "Updated description",
 *   "hasAttachments": true
 * }
 * 
 * Note: This endpoint should be used carefully as it modifies core grievance data.
 * Status updates should be handled through tracking system, not this endpoint.
 */
router.put('/:id', verifyAdminJWT, updateGrievance);

/**
 * @route DELETE /grievances/:id
 * @desc Soft delete a grievance (mark as resolved/closed)
 * @access Private (Admin only)
 * @middleware verifyAdminJWT - Ensures admin authentication
 * 
 * Path parameters:
 * - id: Grievance ID in format GRV-YYYY-NNNNNN
 * 
 * Note: This is a soft delete that maintains audit trail.
 * The grievance is marked as resolved/closed in the tracking system
 * but the original data is preserved for compliance and audit purposes.
 */
router.delete('/:id', verifyAdminJWT, deleteGrievance);

export default router;

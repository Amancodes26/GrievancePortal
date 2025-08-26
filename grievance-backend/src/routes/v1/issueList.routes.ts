import express from 'express';
import { IssueListController } from '../../controllers/issueList.controller';
import { verifyAdminJWT } from '../../middlewares/adminAuth.middleware';
import { optionalAuth } from '../../middlewares/optionalAuth.middleware';

/**
 * Router configuration for IssueList API endpoints
 * Implements comprehensive issue management routes with proper middleware
 * 
 * Principal Engineer Standards:
 * - Clear route organization
 * - Proper middleware application
 * - Role-based access control
 * - Comprehensive endpoint coverage
 * - RESTful API conventions
 * 
 * Route Structure:
 * - GET /api/v1/issues - List issues (students: active only, admins: all with filters)
 * - GET /api/v1/issues/:code - Get specific issue
 * - POST /api/v1/issues - Create issue (admin only)
 * - PUT /api/v1/issues/:code - Update issue (admin only)
 * - PATCH /api/v1/issues/:code/toggle - Toggle issue status (admin only)
 */

const router = express.Router();

// Initialize controller
const issueListController = new IssueListController();

/**
 * Issue List Routes Configuration
 */

/**
 * @route GET /api/v1/issues
 * @desc Get all issues with role-based filtering
 * @access Public (students get active only) / Admin (gets all with filters)
 * @middleware auth - Optional authentication to determine user type
 * 
 * Query Parameters:
 * - category?: string - Filter by category
 * - level?: IssueLevel - Filter by issue level
 * - active?: boolean - Admin only: filter by active status
 * - search?: string - Search in title/description
 * - limit?: number - Pagination limit (default: 10)
 * - offset?: number - Pagination offset (default: 0)
 * - sortBy?: string - Sort field (default: CreatedAt)
 * - sortOrder?: 'asc' | 'desc' - Sort direction (default: desc)
 */
router.get(
  '/',
  optionalAuth, // Optional auth middleware - will set admin context if authenticated
  issueListController.getIssues
);

/**
 * @route GET /api/v1/issues/:code
 * @desc Get specific issue by IssueCode
 * @access Public (students get active only) / Admin (gets any status)
 * @middleware auth - Optional authentication to determine access level
 * 
 * Path Parameters:
 * - code: string - IssueCode (3-20 uppercase alphanumeric characters)
 */
router.get(
  '/:code',
  optionalAuth, // Optional auth middleware
  issueListController.getIssueByCode
);

/**
 * @route POST /api/v1/issues
 * @desc Create new issue type
 * @access Private - Admin only
 * @middleware adminAuth - Required admin authentication
 * 
 * Request Body: CreateIssueListData
 * - IssueCode: string (3-20 chars, uppercase alphanumeric, unique)
 * - IssueTitle: string (3-100 chars)
 * - IssueDescription?: string (optional, max 500 chars)
 * - Category: string (max 50 chars)
 * - IssueLevel: IssueLevel enum
 * - RequiredAttachments: AttachmentRequirement[] (max 10)
 * - IsActive?: boolean (default: true)
 */
router.post(
  '/',
  verifyAdminJWT, // Required admin authentication
  issueListController.createIssue
);

/**
 * @route PUT /api/v1/issues/:code
 * @desc Update existing issue type
 * @access Private - Admin only
 * @middleware adminAuth - Required admin authentication
 * 
 * Path Parameters:
 * - code: string - IssueCode to update
 * 
 * Request Body: UpdateIssueListData (all fields optional)
 * - IssueTitle?: string (3-100 chars)
 * - IssueDescription?: string (max 500 chars)
 * - Category?: string (max 50 chars)
 * - IssueLevel?: IssueLevel enum
 * - RequiredAttachments?: AttachmentRequirement[] (max 10)
 * - IsActive?: boolean
 */
router.put(
  '/:code',
  verifyAdminJWT, // Required admin authentication
  issueListController.updateIssue
);

/**
 * @route PATCH /api/v1/issues/:code/toggle
 * @desc Toggle issue active status
 * @access Private - Admin only
 * @middleware adminAuth - Required admin authentication
 * 
 * Path Parameters:
 * - code: string - IssueCode to toggle
 * 
 * Request Body:
 * - IsActive: boolean - New active status
 */
router.patch(
  '/:code/toggle',
  verifyAdminJWT, // Required admin authentication
  issueListController.toggleIssueStatus
);

// Export router with comprehensive configuration
export default router;

/**
 * Route Summary:
 * 
 * Public Routes (Optional Auth):
 * - GET /api/v1/issues
 * - GET /api/v1/issues/:code
 * 
 * Admin Only Routes:
 * - POST /api/v1/issues
 * - PUT /api/v1/issues/:code
 * - PATCH /api/v1/issues/:code/toggle
 * 
 * Middleware Chain:
 * 1. Express Router
 * 2. Authentication Middleware (auth/adminAuth)
 * 3. Controller Method
 * 4. Response Handler
 * 
 * Authentication Behavior:
 * - auth middleware: Optional authentication, sets admin context if authenticated
 * - adminAuth middleware: Required admin authentication, rejects non-admin requests
 * 
 * Access Control:
 * - Students: Can view active issues only
 * - Admins: Full CRUD operations with complete filtering
 * - Unauthenticated: Same as students (active issues only)
 */

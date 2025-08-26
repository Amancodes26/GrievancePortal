import {Router} from 'express';
import { verifyJWT } from '../../middlewares/userAuth.middleware';
import { verifyAdminJWT } from '../../middlewares/adminAuth.middleware';
import { verifyUserOrAdminJWT } from '../../middlewares/auth.middleware';
import { 
  createGrievance,
  getGrievanceById,
  getAllGrievances,
  getMyGrievances,
  addResponse,
  redirectGrievance,
  getGrievancesByRollNo,
  getGrievanceByGrievanceId,
  getGrievanceStats,
  updateStudentStatus,
  updateGrievanceStatus
} from '../../controllers/grievance.controller';
// import { validateGrievance } from '../../middlewares/grievance.middleware';

const router = Router();

// Student routes (require authentication)
router.post('/', verifyJWT, createGrievance);
router.get('/my-grievances', verifyJWT, getMyGrievances);

// Search routes
router.get('/search/:issue_id', getGrievanceByGrievanceId);    // Search by issue_id (matches collection)
router.get('/issue/:issue_id', getGrievanceByGrievanceId);     // Search by issue_id (alternative)
router.get('/grievance/:grievanceId', getGrievanceByGrievanceId);  // Get by grievance_id
router.get('/:id', getGrievanceById);                      // Get by grievance id

// Admin/Response routes
router.post('/:grievanceId/response', verifyAdminJWT, addResponse);           // Add admin response
router.put('/:grievanceId/redirect', verifyAdminJWT, redirectGrievance);      // Redirect grievance to different admin
router.put('/:grievanceId/student-status', verifyAdminJWT, updateStudentStatus);  // Update student status

// Statistics routes
router.get('/stats/overview', verifyUserOrAdminJWT, getGrievanceStats);       // Get grievance statistics

// Admin/User routes (require authentication for data privacy)
router.get('/', verifyJWT, getAllGrievances);                          // Get all grievances (filtered by role) - Auth required
router.get('/by-rollno/:rollno', verifyJWT, getGrievancesByRollNo);    // Get grievances by roll number - Auth required for privacy
router.put('/:id', verifyJWT, updateGrievanceStatus);                  // Update grievance - Auth required
export default router;

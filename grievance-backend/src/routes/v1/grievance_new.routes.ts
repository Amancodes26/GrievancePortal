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

// Import controller functions using require to avoid module issues
// const grievanceController = require('../../controllers/grievance.controller');

const router = Router();

// Student routes (require authentication)
router.post('/', verifyJWT, createGrievance);
router.get('/my-grievances', verifyJWT, getMyGrievances);

// Search routes
router.get('/search/:issue_id', getGrievanceByGrievanceId);
router.get('/issue/:issue_id', getGrievanceByGrievanceId);
router.get('/grievance/:grievanceId', getGrievanceByGrievanceId);
router.get('/:id', getGrievanceById);

// Admin/Response routes
router.post('/:grievanceId/response', verifyAdminJWT, addResponse);
router.put('/:grievanceId/redirect', verifyAdminJWT, redirectGrievance);
router.put('/:grievanceId/student-status', verifyAdminJWT, updateStudentStatus);

// Statistics routes
router.get('/stats/overview', verifyUserOrAdminJWT, getGrievanceStats);

// Admin/User routes (require authentication for data privacy)
router.get('/', verifyJWT, getAllGrievances);
router.get('/by-rollno/:rollno', verifyJWT, getGrievancesByRollNo);
router.put('/:id', verifyJWT, updateGrievanceStatus);

export default router;

import {Router} from 'express';
import {
  createGrievance,
  getGrievanceById,
  getGrievanceByGrievanceId,
  getAllGrievances,
  getMyGrievances,
  getGrievancesByRollNo,
  updateGrievanceStatus
} from '../../controllers/grievance.controller';
import { verifyJWT } from '../../middlewares/userAuth.middleware';
import { verifyAdminJWT } from '../../middlewares/adminAuth.middleware';
// import { validateGrievance } from '../../middlewares/grievance.middleware';

const router = Router();


// Student routes (require authentication)
router.post('/', verifyJWT, createGrievance);
router.get('/my-grievances', verifyJWT, getMyGrievances);

// Search routes
router.get('/search/:issue_id', getGrievanceByGrievanceId);    // Search by issue_id (matches collection)
router.get('/issue/:issue_id', getGrievanceByGrievanceId);     // Search by issue_id (alternative)
router.get('/:id', getGrievanceById);                      // Get by grievance id

// Admin/User routes (require authentication for data privacy)
router.get('/', verifyAdminJWT, getAllGrievances);                          // Get all grievances (Admin only) - Auth required
router.get('/by-rollno/:rollno', verifyAdminJWT, getGrievancesByRollNo);    // Get grievances by roll number (Admin only) - Auth required for privacy
router.put('/:id', verifyAdminJWT, updateGrievanceStatus);                  // Update grievance (Admin only) - Auth required
export default router;

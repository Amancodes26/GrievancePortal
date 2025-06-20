import {Router} from 'express';
import {
  createGrievance,
  getGrievanceById,
  getGrievanceByIssueId,
  getAllGrievances,
  getMyGrievances,
  getGrievancesByRollNo,
  updateGrievanceStatus
} from '../../controllers/grievance.controller';
import { verifyJWT } from '../../middlewares/userAuth.middleware';
// import { validateGrievance } from '../../middlewares/grievance.middleware';

const router = Router();


// Student routes (require authentication)
router.post('/', verifyJWT, createGrievance);
router.get('/my-grievances', verifyJWT, getMyGrievances);

// Search routes
router.get('/issue/:issue_id', getGrievanceByIssueId);     // Search by issue_id
router.get('/:id', getGrievanceById);                      // Get by grievance id

// Admin/User routes
router.get('/', getAllGrievances);                          // Get all grievances (filtered by role)
router.get('/by-rollno/:rollno', getGrievancesByRollNo);    // Get grievances by roll number with complete details
router.put('/:id', updateGrievanceStatus);                  // Update grievance
export default router;

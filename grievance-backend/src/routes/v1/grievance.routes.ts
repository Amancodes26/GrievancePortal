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
router.get('/search/:issue_id', getGrievanceByIssueId);    // Search by issue_id (matches collection)
router.get('/issue/:issue_id', getGrievanceByIssueId);     // Search by issue_id (alternative)
router.get('/:id', getGrievanceById);                      // Get by grievance id

// Admin/User routes (require authentication for data privacy)
router.get('/', verifyJWT, getAllGrievances);                          // Get all grievances (filtered by role) - Auth required
router.get('/by-rollno/:rollno', verifyJWT, getGrievancesByRollNo);    // Get grievances by roll number - Auth required for privacy
router.put('/:id', verifyJWT, updateGrievanceStatus);                  // Update grievance - Auth required
export default router;

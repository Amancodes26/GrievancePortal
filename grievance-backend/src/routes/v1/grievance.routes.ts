import {Router} from 'express';
import {
  createGrievance,
  getGrievanceById,
  getAllGrievances,
  getMyGrievances,
  updateGrievanceStatus,
  deleteGrievance
} from '../../controllers/grievance.controller';
import { verifyJWT } from '../../middlewares/userAuth.middleware';
// import { validateGrievance } from '../../middlewares/grievance.middleware';

const router = Router();


// Student routes
router.post('/', createGrievance);
router.get('/my-grievances', getMyGrievances);
router.get('/:id', getGrievanceById);

// Admin/User routes
router.get('/', getAllGrievances);                          // Get all grievances (filtered by role)
router.put('/:id', updateGrievanceStatus);                  // Update grievance
router.delete('/:id', deleteGrievance); 
export default router;

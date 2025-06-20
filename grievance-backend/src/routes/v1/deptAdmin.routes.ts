import { Router } from 'express';
import {
  getDepartmentGrievances,
  addResponseToGrievance,
  rejectGrievance,
  redirectGrievance,
  updateGrievanceStatus,
  getDepartmentStats
} from '../../controllers/Admin/DeptAdmin.controller';

const router = Router();

// Department Admin routes - No authentication required for testing
router.get('/grievances', getDepartmentGrievances);                    // Get dept-specific grievances
router.post('/grievances/:grievanceId/response', addResponseToGrievance); // Add response/note
router.put('/grievances/:grievanceId/reject', rejectGrievance);           // Reject grievance
router.put('/grievances/:grievanceId/redirect', redirectGrievance);       // Redirect to other dept
router.put('/grievances/:grievanceId/status', updateGrievanceStatus);     // Update status
router.get('/stats', getDepartmentStats);                                 // Department statistics

export default router;

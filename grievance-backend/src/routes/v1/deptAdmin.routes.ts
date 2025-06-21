import { Router, Request, Response, NextFunction } from 'express';
import {
  getDepartmentGrievances,
  addResponseToGrievance,
  rejectGrievance,
  redirectGrievance,
  updateGrievanceStatus,
  getDepartmentStats
} from '../../controllers/Admin/DeptAdmin.controller';
import { verifyAdminJWT } from '../../middlewares/adminAuth.middleware';
import { permit } from '../../middlewares/role.middleware';

const router = Router();

// Async handler wrapper to properly handle promise-returning controller functions
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// All department admin routes require authentication and proper role
// Department Admin routes - JWT authentication required
router.get('/grievances', verifyAdminJWT, permit('deptadmin', 'superadmin'), asyncHandler(getDepartmentGrievances));                    
router.post('/grievances/:grievanceId/response', verifyAdminJWT, permit('deptadmin', 'superadmin'), asyncHandler(addResponseToGrievance)); 
router.put('/grievances/:grievanceId/reject', verifyAdminJWT, permit('deptadmin', 'superadmin'), asyncHandler(rejectGrievance));           
router.put('/grievances/:grievanceId/redirect', verifyAdminJWT, permit('deptadmin', 'superadmin'), asyncHandler(redirectGrievance));       
router.put('/grievances/:grievanceId/status', verifyAdminJWT, permit('deptadmin', 'superadmin'), asyncHandler(updateGrievanceStatus));     
router.get('/stats', verifyAdminJWT, permit('deptadmin', 'superadmin'), asyncHandler(getDepartmentStats));

export default router;

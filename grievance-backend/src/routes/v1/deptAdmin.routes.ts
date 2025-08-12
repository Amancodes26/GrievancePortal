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
import { adminActionRateLimit } from '../../middlewares/rateLimit.middleware';
import { 
  auditGrievanceResponse, 
  auditGrievanceRedirect,
  auditSystemAccess 
} from '../../middlewares/audit.middleware';

const router = Router();

// Async handler wrapper to properly handle promise-returning controller functions
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// All department admin routes require authentication and proper role
// Department Admin routes - JWT authentication required

// Grievance Management Routes
router.get('/grievances', 
  verifyAdminJWT, 
  permit('academic', 'exam', 'campus', 'superadmin'), 
  adminActionRateLimit,
  auditSystemAccess,
  asyncHandler(getDepartmentGrievances)
);

router.post('/grievances/:grievanceId/response', 
  verifyAdminJWT, 
  permit('academic', 'exam', 'campus', 'superadmin'), 
  adminActionRateLimit,
  auditGrievanceResponse,
  asyncHandler(addResponseToGrievance)
);

router.put('/grievances/:grievanceId/reject', 
  verifyAdminJWT, 
  permit('academic', 'exam', 'campus', 'superadmin'), 
  adminActionRateLimit,
  auditGrievanceResponse,
  asyncHandler(rejectGrievance)
);

router.put('/grievances/:grievanceId/redirect', 
  verifyAdminJWT, 
  permit('academic', 'exam', 'campus', 'superadmin'), 
  adminActionRateLimit,
  auditGrievanceRedirect,
  asyncHandler(redirectGrievance)
);

router.put('/grievances/:grievanceId/status', 
  verifyAdminJWT, 
  permit('academic', 'exam', 'campus', 'superadmin'), 
  adminActionRateLimit,
  auditGrievanceResponse,
  asyncHandler(updateGrievanceStatus)
);

// Statistics and Analytics Routes
router.get('/stats', 
  verifyAdminJWT, 
  permit('academic', 'exam', 'campus', 'superadmin'), 
  adminActionRateLimit,
  auditSystemAccess,
  asyncHandler(getDepartmentStats)
);

export default router;

import { Router, Request, Response, NextFunction } from 'express';
import {
  createAdmin,
  getAllAdmins,
  getAdminsByCampus,
  assignAdminToCampus,
  getCampusAdminStats,
  getSystemStats,
  getAdminAuditLogs,
  updateAdmin,
  deactivateAdmin,
  getAllCampusIssues,
  getAllDepartmentIssues,
  getAllIssues
} from '../../controllers/Admin/SuperAdmin.controller';
import { verifyAdminJWT } from '../../middlewares/adminAuth.middleware';
import { permit } from '../../middlewares/role.middleware';
import { superAdminRateLimit } from '../../middlewares/rateLimit.middleware';
import { 
  auditAdminCreation, 
  auditSystemAccess,
  auditAdminLogin 
} from '../../middlewares/audit.middleware';

const router = Router();

// Test route to verify routing (no auth needed for testing)
router.get('/test', (req: Request, res: Response) => {
  res.json({ message: 'SuperAdmin routes are working!' });
});

// Wrap async route handlers to catch errors and pass to next()
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// All super admin routes require authentication and superadmin role
// Admin Management Routes
router.post('/admins', 
  verifyAdminJWT, 
  permit('superadmin'), 
  superAdminRateLimit,
  auditAdminCreation,
  asyncHandler(createAdmin)
);

router.get('/admins', 
  verifyAdminJWT, 
  permit('superadmin'), 
  superAdminRateLimit,
  auditSystemAccess,
  asyncHandler(getAllAdmins)
);

router.get('/admins/campus/:campusId', 
  verifyAdminJWT, 
  permit('superadmin'), 
  superAdminRateLimit,
  auditSystemAccess,
  asyncHandler(getAdminsByCampus)
);

router.post('/admins/assign-campus', 
  verifyAdminJWT, 
  permit('superadmin'), 
  superAdminRateLimit,
  auditAdminCreation,
  asyncHandler(assignAdminToCampus)
);

router.put('/admins/:adminId', 
  verifyAdminJWT, 
  permit('superadmin'), 
  superAdminRateLimit,
  auditAdminCreation,
  asyncHandler(updateAdmin)
);

router.delete('/admins/:adminId', 
  verifyAdminJWT, 
  permit('superadmin'), 
  superAdminRateLimit,
  auditAdminCreation,
  asyncHandler(deactivateAdmin)
);

// Statistics and Analytics Routes
router.get('/stats/campus-admin', 
  verifyAdminJWT, 
  permit('superadmin'), 
  superAdminRateLimit,
  auditSystemAccess,
  asyncHandler(getCampusAdminStats)
);

router.get('/stats/system', 
  verifyAdminJWT, 
  permit('superadmin'), 
  superAdminRateLimit,
  auditSystemAccess,
  asyncHandler(getSystemStats)
);

// Audit Logs Route
router.get('/audit-logs', 
  verifyAdminJWT, 
  permit('superadmin'), 
  superAdminRateLimit,
  auditSystemAccess,
  asyncHandler(getAdminAuditLogs)
);

// Grievance Management Routes
router.get('/campus-issues', 
  verifyAdminJWT, 
  permit('superadmin'), 
  superAdminRateLimit,
  auditSystemAccess,
  asyncHandler(getAllCampusIssues)
);

router.get('/department-issues', 
  verifyAdminJWT, 
  permit('superadmin'), 
  superAdminRateLimit,
  auditSystemAccess,
  asyncHandler(getAllDepartmentIssues)
);

router.get('/all-issues', 
  verifyAdminJWT, 
  permit('superadmin'), 
  superAdminRateLimit,
  auditSystemAccess,
  asyncHandler(getAllIssues)
);

export default router;

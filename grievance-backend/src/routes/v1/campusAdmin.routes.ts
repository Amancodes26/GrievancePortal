import { Router } from 'express';
import {
  getCampusGrievances,
  updateGrievanceStatus,
  redirectToDepartment,
  resolveGrievance,
  getCampusDashboard
} from '../../controllers/Admin/CampusAdmin.controller';
import { verifyAdminJWT } from '../../middlewares/adminAuth.middleware';
import { permit } from '../../middlewares/role.middleware';
import { adminActionRateLimit } from '../../middlewares/rateLimit.middleware';
import { 
  auditGrievanceResponse,
  auditSystemAccess
} from '../../middlewares/audit.middleware';
import { 
  validateGrievance
} from '../../middlewares/validation.middleware';

const router = Router();

// Grievance Management Routes
router.get('/grievances', 
  verifyAdminJWT, 
  permit('campus'), 
  adminActionRateLimit,
  auditSystemAccess,
  getCampusGrievances
);

router.patch('/grievances/:id/status', 
  verifyAdminJWT, 
  permit('campus'), 
  adminActionRateLimit,
  validateGrievance,
  auditGrievanceResponse,
  updateGrievanceStatus
);

router.post('/grievances/:id/redirect', 
  verifyAdminJWT, 
  permit('campus'), 
  adminActionRateLimit,
  validateGrievance,
  auditGrievanceResponse,
  redirectToDepartment
);

router.post('/grievances/:id/resolve', 
  verifyAdminJWT, 
  permit('campus'), 
  adminActionRateLimit,
  validateGrievance,
  auditGrievanceResponse,
  resolveGrievance
);

// Dashboard Route
router.get('/dashboard', 
  verifyAdminJWT, 
  permit('campus'), 
  adminActionRateLimit,
  auditSystemAccess,
  getCampusDashboard
);

export default router;

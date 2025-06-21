import { Router, Request, Response, NextFunction } from 'express';
import {
  createAdmin,
  getAllCampusIssues,
  getAllDepartmentIssues,
  getAllIssues
} from '../../controllers/Admin/SuperAdmin.controller';
import { verifyAdminJWT } from '../../middlewares/adminAuth.middleware';
import { permit } from '../../middlewares/role.middleware';

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
// POST /api/v1/super-admin/admins
router.post('/admins', verifyAdminJWT, permit('superadmin'), asyncHandler(createAdmin));
// GET /api/v1/super-admin/campus-issues
router.get('/campus-issues', verifyAdminJWT, permit('superadmin'), asyncHandler(getAllCampusIssues));
// GET /api/v1/super-admin/department-issues
router.get('/department-issues', verifyAdminJWT, permit('superadmin'), asyncHandler(getAllDepartmentIssues));
// GET /api/v1/super-admin/all-issues
router.get('/all-issues', verifyAdminJWT, permit('superadmin'), asyncHandler(getAllIssues));

export default router;

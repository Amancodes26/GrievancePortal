import { Request, Response } from 'express';
import * as superAdminService from '../../services/superAdmin.service';
import * as grievanceService from '../../services/grievance.service';

// Allowed department roles for admin creation
const ALLOWED_DEPT_ROLES = ['academic', 'exam', 'campus'] as const;
type DeptRole = typeof ALLOWED_DEPT_ROLES[number];

// --- 1. Create a new admin (SuperAdmin only) ---
export const createAdmin = async (req: Request, res: Response): Promise<void> => {
  // TEMP: Allow testing without JWT
  if (!req.user) {
    req.user = { rollNumber: 'SUPERADMIN', name: 'Test SuperAdmin', email: 'super@admin.com', role: 'superadmin' };
  }
  try {
    if (!req.user || req.user.role !== 'superadmin') {
      res.status(403).json({ success: false, message: 'Only SuperAdmin can create admins.' });
      return;
    }
    const { name, email, phone, password, role } = req.body;
    if (!name || !email || !password || !role) {
      res.status(400).json({ success: false, message: 'Missing required fields.' });
      return;
    }
    if (!ALLOWED_DEPT_ROLES.includes(role)) {
      res.status(400).json({ success: false, message: `Role must be one of: ${ALLOWED_DEPT_ROLES.join(', ')}` });
      return;
    }
    await superAdminService.createAdmin({ name, email, phone, password, role });
    res.status(201).json({ success: true, message: 'Admin created.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- 2. View all campus issues (SuperAdmin only) ---
export const getAllCampusIssues = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    req.user = { rollNumber: 'SUPERADMIN', name: 'Test SuperAdmin', email: 'super@admin.com', role: 'superadmin' };
  }
  try {
    if (!req.user || req.user.role !== 'superadmin') {
      res.status(403).json({ success: false, message: 'Only SuperAdmin can view all campus issues.' });
      return;
    }
    const all = await grievanceService.getAllGrievancesWithCompleteDetails();
    const campusIssues = all.filter((g: any) =>
      ['FACILITY', 'TECHNICAL', 'ADMINISTRATIVE', 'OTHER'].includes(g.issue_type?.toUpperCase())
    );
    res.status(200).json({ success: true, data: campusIssues });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- 3. View all department issues (SuperAdmin only) ---
export const getAllDepartmentIssues = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    req.user = { rollNumber: 'SUPERADMIN', name: 'Test SuperAdmin', email: 'super@admin.com', role: 'superadmin' };
  }
  try {
    if (!req.user || req.user.role !== 'superadmin') {
      res.status(403).json({ success: false, message: 'Only SuperAdmin can view all department issues.' });
      return;
    }
    const all = await grievanceService.getAllGrievancesWithCompleteDetails();
    const deptIssues = all.filter((g: any) =>
      ['ACADEMIC', 'EXAM'].includes(g.issue_type?.toUpperCase())
    );
    res.status(200).json({ success: true, data: deptIssues });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- 4. (Optional) View all issues (SuperAdmin only) ---
export const getAllIssues = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    req.user = { rollNumber: 'SUPERADMIN', name: 'Test SuperAdmin', email: 'super@admin.com', role: 'superadmin' };
  }
  try {
    if (!req.user || req.user.role !== 'superadmin') {
      res.status(403).json({ success: false, message: 'Only SuperAdmin can view all issues.' });
      return;
    }
    const all = await grievanceService.getAllGrievancesWithCompleteDetails();
    res.status(200).json({ success: true, data: all });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- Export for router ---
export default {
  createAdmin,
  getAllCampusIssues,
  getAllDepartmentIssues,
  getAllIssues
};

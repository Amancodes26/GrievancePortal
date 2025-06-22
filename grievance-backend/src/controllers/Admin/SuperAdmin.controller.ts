import { Request, Response } from 'express';
import { SuperAdminService } from '../../services/superAdmin.service';
import { DeptAdminService } from '../../services/deptAdmin.service';
import * as grievanceService from '../../services/grievance.service';
import { AdminRole } from '../../types/common';

// Allowed department roles for admin creation
const ALLOWED_DEPT_ROLES: AdminRole[] = ['academic', 'exam', 'campus'];

// --- 1. Create a new admin (SuperAdmin only) ---
export const createAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate super admin access
    if (!req.admin || req.admin.Role !== 'superadmin') {
      res.status(403).json({ 
        success: false, 
        message: 'Only SuperAdmin can create admins.' 
      });
      return;
    }

    const { name, email, phone, password, role, campusId, isMainCampus } = req.body;
    
    // Validate required fields
    if (!name || !email || !password || !role) {
      res.status(400).json({ 
        success: false, 
        message: 'Name, email, password, and role are required.' 
      });
      return;
    }

    // Validate role
    if (!ALLOWED_DEPT_ROLES.includes(role)) {
      res.status(400).json({ 
        success: false, 
        message: `Role must be one of: ${ALLOWED_DEPT_ROLES.join(', ')}` 
      });
      return;
    }

    // Create admin with campus assignment
    const newAdmin = await SuperAdminService.createAdmin({ 
      name, 
      email, 
      phone, 
      password, 
      role, 
      campusId, 
      isMainCampus 
    });

    res.status(201).json({ 
      success: true, 
      message: 'Admin created successfully.',
      data: {
        adminId: newAdmin.AdminId,
        name: newAdmin.Name,
        email: newAdmin.Email,
        role: newAdmin.Role,
        campusId: newAdmin.CampusId
      }
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// --- 2. Get all admins with campus information ---
export const getAllAdmins = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.admin || req.admin.Role !== 'superadmin') {
      res.status(403).json({ 
        success: false, 
        message: 'Only SuperAdmin can view all admins.' 
      });
      return;
    }

    const admins = await SuperAdminService.getAllAdmins();
    
    res.status(200).json({ 
      success: true, 
      data: admins,
      message: 'All admins retrieved successfully'
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// --- 3. Get admins by campus ---
export const getAdminsByCampus = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.admin || req.admin.Role !== 'superadmin') {
      res.status(403).json({ 
        success: false, 
        message: 'Only SuperAdmin can view campus admins.' 
      });
      return;
    }

    const { campusId } = req.params;
    const campusIdNum = parseInt(campusId);
    
    if (isNaN(campusIdNum)) {
      res.status(400).json({ 
        success: false, 
        message: 'Invalid campus ID' 
      });
      return;
    }

    const admins = await SuperAdminService.getAdminsByCampus(campusIdNum);
    
    res.status(200).json({ 
      success: true, 
      data: admins,
      message: `Admins for campus ${campusId} retrieved successfully`
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// --- 4. Assign admin to campus ---
export const assignAdminToCampus = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.admin || req.admin.Role !== 'superadmin') {
      res.status(403).json({ 
        success: false, 
        message: 'Only SuperAdmin can assign admins to campuses.' 
      });
      return;
    }

    const { adminId, campusId, department, isPrimary } = req.body;
    
    if (!adminId || !campusId || !department) {
      res.status(400).json({ 
        success: false, 
        message: 'Admin ID, campus ID, and department are required.' 
      });
      return;
    }

    if (!ALLOWED_DEPT_ROLES.includes(department)) {
      res.status(400).json({ 
        success: false, 
        message: `Department must be one of: ${ALLOWED_DEPT_ROLES.join(', ')}` 
      });
      return;
    }

    const assignment = await SuperAdminService.assignAdminToCampus({
      adminId,
      campusId: parseInt(campusId),
      department,
      isPrimary: isPrimary || false
    });

    res.status(200).json({ 
      success: true, 
      data: assignment,
      message: 'Admin assigned to campus successfully'
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// --- 5. Get campus admin statistics ---
export const getCampusAdminStats = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.admin || req.admin.Role !== 'superadmin') {
      res.status(403).json({ 
        success: false, 
        message: 'Only SuperAdmin can view campus admin statistics.' 
      });
      return;
    }

    const stats = await SuperAdminService.getCampusAdminStats();
    
    res.status(200).json({ 
      success: true, 
      data: stats,
      message: 'Campus admin statistics retrieved successfully'
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// --- 6. Get system statistics ---
export const getSystemStats = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.admin || req.admin.Role !== 'superadmin') {
      res.status(403).json({ 
        success: false, 
        message: 'Only SuperAdmin can view system statistics.' 
      });
      return;
    }

    const stats = await SuperAdminService.getSystemStats();
    
    res.status(200).json({ 
      success: true, 
      data: stats,
      message: 'System statistics retrieved successfully'
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// --- 7. Get admin audit logs ---
export const getAdminAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.admin || req.admin.Role !== 'superadmin') {
      res.status(403).json({ 
        success: false, 
        message: 'Only SuperAdmin can view audit logs.' 
      });
      return;
    }

    const { adminId, limit = 100, offset = 0 } = req.query;
    const logs = await SuperAdminService.getAdminAuditLogs(
      adminId as string, 
      parseInt(limit as string), 
      parseInt(offset as string)
    );
    
    res.status(200).json({ 
      success: true, 
      data: logs,
      message: 'Admin audit logs retrieved successfully'
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// --- 8. Update admin information ---
export const updateAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.admin || req.admin.Role !== 'superadmin') {
      res.status(403).json({ 
        success: false, 
        message: 'Only SuperAdmin can update admin information.' 
      });
      return;
    }

    const { adminId } = req.params;
    const updates = req.body;
    
    // Remove sensitive fields that shouldn't be updated via this endpoint
    delete updates.password;
    delete updates.AdminId;
    
    const updatedAdmin = await SuperAdminService.updateAdmin(adminId, updates);
    
    res.status(200).json({ 
      success: true, 
      data: updatedAdmin,
      message: 'Admin updated successfully'
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// --- 9. Deactivate admin ---
export const deactivateAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.admin || req.admin.Role !== 'superadmin') {
      res.status(403).json({ 
        success: false, 
        message: 'Only SuperAdmin can deactivate admins.' 
      });
      return;
    }

    const { adminId } = req.params;
    
    await SuperAdminService.deactivateAdmin(adminId);
    
    res.status(200).json({ 
      success: true, 
      message: 'Admin deactivated successfully'
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// --- 10. View all campus issues (SuperAdmin only) ---
export const getAllCampusIssues = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.admin || req.admin.Role !== 'superadmin') {
      res.status(403).json({ 
        success: false, 
        message: 'Only SuperAdmin can view all campus issues.' 
      });
      return;
    }

    const all = await grievanceService.getAllGrievancesWithCompleteDetails();
    const campusIssues = all.filter((g: any) =>
      ['FACILITY', 'TECHNICAL', 'ADMINISTRATIVE', 'OTHER'].includes(g.issue_type?.toUpperCase())
    );
    
    res.status(200).json({ 
      success: true, 
      data: campusIssues,
      total: campusIssues.length,
      message: 'Campus issues retrieved successfully'
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// --- 11. View all department issues (SuperAdmin only) ---
export const getAllDepartmentIssues = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.admin || req.admin.Role !== 'superadmin') {
      res.status(403).json({ 
        success: false, 
        message: 'Only SuperAdmin can view all department issues.' 
      });
      return;
    }

    const all = await grievanceService.getAllGrievancesWithCompleteDetails();
    const deptIssues = all.filter((g: any) =>
      ['ACADEMIC', 'EXAM'].includes(g.issue_type?.toUpperCase())
    );
    
    res.status(200).json({ 
      success: true, 
      data: deptIssues,
      total: deptIssues.length,
      message: 'Department issues retrieved successfully'
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// --- 12. View all issues (SuperAdmin only) ---
export const getAllIssues = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.admin || req.admin.Role !== 'superadmin') {
      res.status(403).json({ 
        success: false, 
        message: 'Only SuperAdmin can view all issues.' 
      });
      return;
    }

    const all = await grievanceService.getAllGrievancesWithCompleteDetails();
    
    res.status(200).json({ 
      success: true, 
      data: all,
      total: all.length,
      message: 'All issues retrieved successfully'
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// --- Export for router ---
export default {
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
};

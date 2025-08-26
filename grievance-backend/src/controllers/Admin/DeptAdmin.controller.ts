import { Request, Response } from 'express';
import * as grievanceService from '../../services/grievance.service';
import { DeptAdminService } from '../../services/deptAdmin.service';
import { STATUS, PRIORITY, Priority, Status } from '../../constants/grievanceConstants';
import { DatabaseAdminRole, Department } from '../../types/common';
import ConnectionManager from '../../db/connectionManager';
import { TrackingQueries } from '../../db/queries';

interface AuthenticatedRequest extends Request {
  admin?: {
    AdminId: string;
    AdminID: string;  // Alternative field name for database compatibility
    Name: string;
    Email: string;
    Role: DatabaseAdminRole;
    Department: Department;
    CampusId?: number;
    IsActive: boolean;
  };
}

// Get department-specific grievances for dept admin
export const getDepartmentGrievances = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    let department: string;
    let campusId: number | undefined;
    
    if (req.admin) {
      // Authenticated admin flow
      const adminRole = req.admin.Role;
      const adminDept = req.admin.Department;
      campusId = req.admin.CampusId;
      
      // If superadmin, allow them to specify department via query param
      if (adminRole === 'SUPER_ADMIN') {
        department = (req.query.department as string) || 'CAMPUS';
      } else if (adminRole === 'DEPT_ADMIN') {
        department = adminDept || 'CAMPUS';
      } else {
        department = 'CAMPUS';
      }
    } else {
      // Testing mode - get from query params
      department = req.query.department as string;
      campusId = req.query.campusId ? parseInt(req.query.campusId as string) : undefined;
      
      if (!department) {
        res.status(400).json({
          message: 'Department parameter is required when testing without auth. Use ?department=EXAM|ACADEMIC|CAMPUS',
          success: false,
        });
        return;
      }
    }
    
    if (!department || !['EXAM', 'ACADEMIC', 'CAMPUS'].includes(department)) {
      res.status(400).json({
        message: 'Invalid or missing department. Must be: EXAM, ACADEMIC, or CAMPUS',
        success: false,
      });
      return;
    }

    // Get department grievances with campus filtering
    const departmentGrievances = await DeptAdminService.getDepartmentGrievances(req.admin?.AdminId || '');
    
    res.status(200).json({
      message: `${department.toUpperCase()} department grievances retrieved successfully`,
      department: department,
      campus_id: campusId,
      data: departmentGrievances,
      total_grievances: departmentGrievances.length,
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error retrieving department grievances',
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      success: false,
    });
  }
};

// Add response/note to grievance
export const addResponseToGrievance = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { grievanceId } = req.params;
    const { 
      response_text, 
      status, 
      note,
      test_admin_id // For testing without auth
    } = req.body;

    if (!grievanceId || !response_text) {
      res.status(400).json({
        message: 'Grievance ID and response text are required',
        success: false,
      });
      return;
    }

    // Get admin info
    const adminId = req.admin?.AdminId || test_admin_id || 'TEST_ADMIN';
    const userDepartment = req.admin?.Department || 'CAMPUS';

    // Validate status if provided
    if (status && !STATUS.includes(status)) {
      res.status(400).json({
        message: 'Invalid status. Must be one of: ' + STATUS.join(', '),
        success: false,
      });
      return;
    }

    // Get the grievance to check current status
    const grievance = await grievanceService.getGrievanceByGrievanceId(grievanceId);
    if (!grievance) {
      res.status(404).json({
        message: 'Grievance not found',
        success: false,
      });
      return;
    }

    // Update grievance status if provided and different
    if (status && status !== grievance.Status) {
      await grievanceService.updateGrievanceByGrievanceId(grievanceId, { Status: status });
    }

    // Create tracking entry for response
    const trackingData = [
      grievanceId,
      status || grievance.Status, // AdminStatus
      'updated', // StudentStatus
      'admin_response', // Stage
      adminId, // AdminId
      null, // AssignedTo
      `${response_text}${note ? ' - ' + note : ''}` // Comments
    ];

    await ConnectionManager.query(TrackingQueries.CREATE, trackingData);

    res.status(201).json({
      message: 'Response added successfully',
      data: {
        grievance_id: grievanceId,
        status_updated: status && status !== grievance.Status,
        department: userDepartment,
        responded_by: adminId,
        response: response_text
      },
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error adding response to grievance',
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      success: false,
    });
  }
};

// Reject grievance with note
export const rejectGrievance = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { grievanceId } = req.params;
    const { rejection_reason, note, test_admin_id } = req.body;

    if (!grievanceId || !rejection_reason) {
      res.status(400).json({
        message: 'Grievance ID and rejection reason are required',
        success: false,
      });
      return;
    }

    // Get admin info
    const adminId = req.admin?.AdminId || test_admin_id || 'TEST_ADMIN';
    const userDepartment = req.admin?.Department || 'CAMPUS';

    // Get the grievance
    const grievance = await grievanceService.getGrievanceByGrievanceId(grievanceId);
    if (!grievance) {
      res.status(404).json({
        message: 'Grievance not found',
        success: false,
      });
      return;
    }

    // Update status to REJECTED
    await grievanceService.updateGrievanceByGrievanceId(grievanceId, { Status: 'REJECTED' });

    // Create tracking entry for rejection
    const trackingData = [
      grievanceId,
      'REJECTED', // AdminStatus
      'rejected', // StudentStatus
      'final', // Stage
      adminId, // AdminId
      null, // AssignedTo
      `REJECTED: ${rejection_reason}${note ? ' - ' + note : ''}` // Comments
    ];

    await ConnectionManager.query(TrackingQueries.CREATE, trackingData);

    res.status(200).json({
      message: 'Grievance rejected successfully',
      data: {
        grievance_id: grievanceId,
        status: 'REJECTED',
        rejected_by: adminId,
        reason: rejection_reason
      },
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error rejecting grievance',
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      success: false,
    });
  }
};

// Redirect grievance to another department
export const redirectGrievance = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { grievanceId } = req.params;
    const { 
      target_department, 
      redirect_reason, 
      note,
      test_admin_id
    } = req.body;

    if (!grievanceId || !target_department || !redirect_reason) {
      res.status(400).json({
        message: 'Grievance ID, target department, and redirect reason are required',
        success: false,
      });
      return;
    }

    // Get admin info
    const adminId = req.admin?.AdminId || test_admin_id || 'TEST_ADMIN';

    // Validate target department
    if (!['EXAM', 'ACADEMIC', 'CAMPUS'].includes(target_department)) {
      res.status(400).json({
        message: 'Invalid target department. Must be: EXAM, ACADEMIC, or CAMPUS',
        success: false,
      });
      return;
    }

    // Get the grievance
    const grievance = await grievanceService.getGrievanceByGrievanceId(grievanceId);
    if (!grievance) {
      res.status(404).json({
        message: 'Grievance not found',
        success: false,
      });
      return;
    }

    // Update grievance status to REDIRECTED
    await grievanceService.updateGrievanceByGrievanceId(grievanceId, { Status: 'REDIRECTED' });

    // Create tracking entry for redirection
    const trackingData = [
      grievanceId,
      'REDIRECTED', // AdminStatus
      'redirected', // StudentStatus
      'redirect_to_dept', // Stage
      adminId, // AdminId
      target_department, // AssignedTo
      `Redirected to ${target_department} department: ${redirect_reason}${note ? ' - ' + note : ''}` // Comments
    ];

    await ConnectionManager.query(TrackingQueries.CREATE, trackingData);

    res.status(200).json({
      message: 'Grievance redirected successfully',
      data: {
        grievance_id: grievanceId,
        redirected_to: target_department,
        redirected_by: adminId,
        reason: redirect_reason
      },
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error redirecting grievance',
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      success: false,
    });
  }
};

// Update grievance status
export const updateGrievanceStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { grievanceId } = req.params;
    const { status, note, test_admin_id } = req.body;

    if (!grievanceId || !status) {
      res.status(400).json({
        message: 'Grievance ID and status are required',
        success: false,
      });
      return;
    }

    // Get admin info
    const adminId = req.admin?.AdminId || test_admin_id || 'TEST_ADMIN';
    const userDepartment = req.admin?.Department || 'CAMPUS';

    // Validate status
    if (!STATUS.includes(status)) {
      res.status(400).json({
        message: 'Invalid status. Must be one of: ' + STATUS.join(', '),
        success: false,
      });
      return;
    }

    // Get the grievance by grievance_id
    const grievance = await grievanceService.getGrievanceByGrievanceId(grievanceId);
    if (!grievance) {
      res.status(404).json({
        message: 'Grievance not found',
        success: false,
      });
      return;
    }

    // Update grievance status
    const updatedGrievance = await grievanceService.updateGrievanceByGrievanceId(grievanceId, { Status: status });

    // Create tracking entry if status changed
    if (status !== grievance.Status) {
      const trackingData = [
        grievanceId,
        status, // AdminStatus
        'updated', // StudentStatus
        'status_update', // Stage
        adminId, // AdminId
        null, // AssignedTo
        note || `Status updated by ${userDepartment} admin` // Comments
      ];

      await ConnectionManager.query(TrackingQueries.CREATE, trackingData);
    }

    res.status(200).json({
      message: 'Grievance status updated successfully',
      data: {
        grievance: updatedGrievance,
        status: status
      },
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error updating grievance status',
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      success: false,
    });
  }
};

// Get department statistics
export const getDepartmentStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    let department: string;
    let campusId: number | undefined;
    
    if (req.admin) {
      // Authenticated admin flow
      const adminRole = req.admin.Role;
      const adminDept = req.admin.Department;
      campusId = req.admin.CampusId;
      
      // If superadmin, allow them to specify department via query param
      if (adminRole === 'SUPER_ADMIN') {
        department = (req.query.department as string) || 'CAMPUS';
      } else if (adminRole === 'DEPT_ADMIN') {
        department = adminDept || 'CAMPUS';
      } else {
        department = 'CAMPUS';
      }
    } else {
      // Testing mode - get from query params
      department = req.query.department as string;
      campusId = req.query.campusId ? parseInt(req.query.campusId as string) : undefined;
      
      if (!department) {
        res.status(400).json({
          message: 'Department parameter is required. Use ?department=EXAM|ACADEMIC|CAMPUS',
          success: false,
        });
        return;
      }
    }
    
    if (!['EXAM', 'ACADEMIC', 'CAMPUS'].includes(department)) {
      res.status(400).json({
        message: 'Invalid or missing department. Must be: EXAM, ACADEMIC, or CAMPUS',
        success: false,
      });
      return;
    }

    // Get enhanced department statistics
    const stats = await DeptAdminService.getDepartmentStats(req.admin?.AdminId || '');

    res.status(200).json({
      message: 'Department statistics retrieved successfully',
      data: stats,
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error retrieving department statistics',
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      success: false,
    });
  }
};

export default {
  getDepartmentGrievances,
  addResponseToGrievance,
  rejectGrievance,
  redirectGrievance,
  updateGrievanceStatus,
  getDepartmentStats
};
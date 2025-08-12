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

// Get campus grievances (non-ACADEMIC/EXAM issues)
export const getCampusGrievances = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    let campusId: number | undefined;
    
    if (req.admin) {
      // Authenticated admin flow
      campusId = req.admin.CampusId;
      
      // Verify this is a campus admin or super admin
      if (req.admin.Role !== 'CAMPUS_ADMIN' && req.admin.Role !== 'SUPER_ADMIN') {
        res.status(403).json({
          message: 'Only Campus Admin or Super Admin can access campus grievances',
          success: false,
        });
        return;
      }
    } else {
      // Testing mode - get from query params
      campusId = req.query.campusId ? parseInt(req.query.campusId as string) : undefined;
    }

    // Get campus grievances (non-ACADEMIC/EXAM issues)
    const campusGrievances = await DeptAdminService.getDepartmentGrievances('CAMPUS', campusId);
    
    res.status(200).json({
      message: 'Campus grievances retrieved successfully',
      department: 'CAMPUS',
      campus_id: campusId,
      data: campusGrievances,
      total_grievances: campusGrievances.length,
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error retrieving campus grievances',
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      success: false,
    });
  }
};

// Update grievance status with tracking
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
    const adminId = req.admin?.AdminId || test_admin_id || 'TEST_CAMPUS_ADMIN';

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

    // Create tracking entry for status change
    const trackingData = [
      grievanceId,
      status, // AdminStatus
      status === 'RESOLVED' ? 'resolved' : 'updated', // StudentStatus
      'campus_action', // Stage
      adminId, // AdminId
      null, // AssignedTo
      note || `Status updated by Campus Admin to ${status}` // Comments
    ];

    await ConnectionManager.query(TrackingQueries.CREATE, trackingData);

    res.status(200).json({
      message: 'Grievance status updated successfully',
      data: {
        grievance: updatedGrievance,
        status: status,
        updated_by: adminId
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

// Redirect grievance to department admin (ACADEMIC/EXAM)
export const redirectToDepartment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
    const adminId = req.admin?.AdminId || test_admin_id || 'TEST_CAMPUS_ADMIN';

    // Validate target department (Campus can only redirect to ACADEMIC or EXAM)
    if (!['ACADEMIC', 'EXAM'].includes(target_department)) {
      res.status(400).json({
        message: 'Campus Admin can only redirect to ACADEMIC or EXAM departments',
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

// Resolve grievance (mark as completed)
export const resolveGrievance = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { grievanceId } = req.params;
    const { resolution_note, test_admin_id } = req.body;

    if (!grievanceId || !resolution_note) {
      res.status(400).json({
        message: 'Grievance ID and resolution note are required',
        success: false,
      });
      return;
    }

    // Get admin info
    const adminId = req.admin?.AdminId || test_admin_id || 'TEST_CAMPUS_ADMIN';

    // Get the grievance
    const grievance = await grievanceService.getGrievanceByGrievanceId(grievanceId);
    if (!grievance) {
      res.status(404).json({
        message: 'Grievance not found',
        success: false,
      });
      return;
    }

    // Update status to RESOLVED
    await grievanceService.updateGrievanceByGrievanceId(grievanceId, { Status: 'RESOLVED' });

    // Create tracking entry for resolution
    const trackingData = [
      grievanceId,
      'RESOLVED', // AdminStatus
      'resolved', // StudentStatus
      'final', // Stage
      adminId, // AdminId
      null, // AssignedTo
      `RESOLVED by Campus Admin: ${resolution_note}` // Comments
    ];

    await ConnectionManager.query(TrackingQueries.CREATE, trackingData);

    res.status(200).json({
      message: 'Grievance resolved successfully',
      data: {
        grievance_id: grievanceId,
        status: 'RESOLVED',
        resolved_by: adminId,
        resolution: resolution_note
      },
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error resolving grievance',
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      success: false,
    });
  }
};

// Get campus admin dashboard statistics
export const getCampusDashboard = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    let campusId: number | undefined;
    
    if (req.admin) {
      campusId = req.admin.CampusId;
    } else {
      campusId = req.query.campusId ? parseInt(req.query.campusId as string) : undefined;
    }

    // Get campus statistics
    const stats = await DeptAdminService.getDepartmentStats('CAMPUS', campusId);

    res.status(200).json({
      message: 'Campus dashboard data retrieved successfully',
      data: {
        department: 'CAMPUS',
        campus_id: campusId,
        statistics: stats
      },
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error retrieving campus dashboard data',
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      success: false,
    });
  }
};

// Default export for backward compatibility
export default {
  getCampusGrievances,
  updateGrievanceStatus,
  redirectToDepartment,
  resolveGrievance,
  getCampusDashboard
};

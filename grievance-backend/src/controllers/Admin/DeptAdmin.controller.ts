import { Request, Response, NextFunction } from 'express';
import * as grievanceService from '../../services/grievance.service';
import * as responseService from '../../services/response.service';
import * as historyService from '../../services/history.service';
import { STATUS, PRIORITY, Priority, Status } from '../../constants/grievanceConstants';
import { PersonalInfo } from '../../models/PersonalInfo';

// Department mapping based on issue types
const DEPARTMENT_MAPPING = {
  'ACADEMIC': 'academic',
  'EXAM': 'exam', 
  'FACILITY': 'campus',
  'TECHNICAL': 'campus',
  'ADMINISTRATIVE': 'campus',
  'OTHER': 'campus'
} as const;

type Department = typeof DEPARTMENT_MAPPING[keyof typeof DEPARTMENT_MAPPING];

interface AuthenticatedRequest extends Request {
  User?: PersonalInfo & {
    department?: Department;
  };
}

// Get department-specific grievances for dept admin
export const getDepartmentGrievances = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // For testing without auth - use mock user or query params
    let department: Department;
    
    if (req.User) {
      // Normal authenticated flow
      department = req.User.department || req.query.department as Department;
    } else {
      // Testing mode - get department from query params
      department = req.query.department as Department;
      
      if (!department) {
        res.status(400).json({
          message: 'Department parameter is required when testing without auth. Use ?department=exam|academic|campus',
          success: false,
        });
        return;
      }
    }
    
    if (!department || !['exam', 'academic', 'campus'].includes(department)) {
      res.status(400).json({
        message: 'Invalid or missing department. Must be: exam, academic, or campus',
        success: false,
      });
      return;
    }

    // Get all grievances
    const allGrievances = await grievanceService.getAllGrievancesWithCompleteDetails();
    
    // Filter grievances by department
    const departmentGrievances = allGrievances.filter((grievance: any) => {
      const issueType = grievance.issuse_type?.toUpperCase();
      
      // Map issue types to departments
      if (department === 'academic') {
        return issueType === 'ACADEMIC';
      } else if (department === 'exam') {
        return issueType === 'EXAM';
      } else if (department === 'campus') {
        return ['FACILITY', 'TECHNICAL', 'ADMINISTRATIVE', 'OTHER'].includes(issueType);
      }
      
      return false;
    });

    // Group by issue_id and format response
    const grievancesByIssueId: Record<string, any> = {};

    departmentGrievances.forEach((grievance: any) => {
      const issueId = grievance.issuse_id;
      
      if (!grievancesByIssueId[issueId]) {
        grievancesByIssueId[issueId] = {
          issue_id: issueId,
          department: department,
          grievance_details: {
            id: grievance.id,
            issue_id: grievance.issuse_id,
            rollno: grievance.rollno,
            campus: grievance.campus,
            subject: grievance.subject,
            description: grievance.description,
            issue_type: grievance.issuse_type,
            status: grievance.status,
            attachment: grievance.attachment,
            date_time: grievance.date
          },
          responses_and_work: {
            responses: grievance.responses?.map((response: any) => ({
              id: response.id,
              response_text: response.responsetext,
              response_by: response.responseby,
              response_at: response.responseat,
              status: response.status,
              stage: response.stage,
              attachment: response.attachment,
              redirect: response.redirect,
              date: response.date
            })) || [],
            history: grievance.history?.map((hist: any) => ({
              id: hist.id,
              from_status: hist.from_status,
              to_status: hist.to_status,
              action_by: hist.action_by,
              stage_type: hist.stage_type,
              note: hist.note,
              date: hist.date
            })) || [],
            attachments: grievance.attachments?.map((attachment: any) => ({
              id: attachment.id,
              file_name: attachment.filename,
              file_path: attachment.filepath,
              uploaded_by: attachment.uploadedby,
              uploaded_at: attachment.uploadedat,
              created_at: attachment.createdat,
              updated_at: attachment.updatedat
            })) || []
          }
        };
      }
    });

    // Convert to array and sort by date (most recent first)
    const formattedGrievances = Object.values(grievancesByIssueId).sort((a: any, b: any) => 
      new Date(b.grievance_details.date_time).getTime() - new Date(a.grievance_details.date_time).getTime()
    );

    res.status(200).json({
      message: `${department.toUpperCase()} department grievances retrieved successfully`,
      department: department,
      data: formattedGrievances,
      total_grievances: formattedGrievances.length,
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
      stage = 'FOLLOW_UP',
      attachment,
      note,
      test_user_rollno, // For testing without auth
      department // For testing without auth
    } = req.body;

    if (!grievanceId || !response_text) {
      res.status(400).json({
        message: 'Grievance ID and response text are required',
        success: false,
      });
      return;
    }

    // Get user rollno for response
    const userRollno = req.User?.rollno || test_user_rollno || 'TEST_ADMIN';
    const userDepartment = req.User?.department || department || 'dept';

    // Validate status if provided
    if (status && !STATUS.includes(status)) {
      res.status(400).json({
        message: 'Invalid status. Must be one of: ' + STATUS.join(', '),
        success: false,
      });
      return;
    }    // Get the grievance to check current status and verify department access
    const grievance = await grievanceService.getGrievanceByIssueId(grievanceId);
    if (!grievance) {
      res.status(404).json({
        message: 'Grievance not found',
        success: false,
      });
      return;
    }

    // Check if the grievance belongs to the department (for testing, allow override)
    if (req.User || department) {
      const issueType = grievance.issuse_type?.toUpperCase();
      const deptToCheck = userDepartment;
      let hasAccess = false;

      if (deptToCheck === 'academic' && issueType === 'ACADEMIC') {
        hasAccess = true;
      } else if (deptToCheck === 'exam' && issueType === 'EXAM') {
        hasAccess = true;
      } else if (deptToCheck === 'campus' && ['FACILITY', 'TECHNICAL', 'ADMINISTRATIVE', 'OTHER'].includes(issueType)) {
        hasAccess = true;
      }

      if (!hasAccess) {
        res.status(403).json({
          message: `This grievance (${issueType}) does not belong to ${deptToCheck} department`,
          success: false,
        });
        return;
      }
    }    // Create response
    const responseData = {
      issue_id: grievance.id, // Use database id for response table
      response_text: response_text,
      response_by: userRollno,
      status: status || 'pending',
      stage: stage,
      attachment: attachment || null,
      redirect: null
    };

    const newResponse = await responseService.createResponse(responseData);// Update grievance status if provided and different
    if (status && status !== grievance.status) {
      await grievanceService.updateGrievanceByIssueId(grievanceId, { status: status });

      // Create history entry for status change
      const historyData = {
        grievance_id: grievance.id, // Use database id for history table
        from_status: grievance.status,
        to_status: status,
        action_by: userRollno,
        action_type: 'STATUS_UPDATED',
        note: note || `Status updated by ${userDepartment} admin: ${response_text}`,
        date_time: Date.now()
      };

      await historyService.createHistory(historyData);
    }

    res.status(201).json({
      message: 'Response added successfully',
      data: {
        response: newResponse,
        status_updated: status && status !== grievance.status,
        department: userDepartment,
        responded_by: userRollno
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
    const { rejection_reason, note, test_user_rollno, department } = req.body;

    if (!grievanceId || !rejection_reason) {
      res.status(400).json({
        message: 'Grievance ID and rejection reason are required',
        success: false,
      });
      return;
    }

    // Get user rollno for response
    const userRollno = req.User?.rollno || test_user_rollno || 'TEST_ADMIN';
    const userDepartment = req.User?.department || department || 'dept';    // Get the grievance
    const grievance = await grievanceService.getGrievanceByIssueId(grievanceId);
    if (!grievance) {
      res.status(404).json({
        message: 'Grievance not found',
        success: false,
      });
      return;
    }

    // Update status to REJECTED
    await grievanceService.updateGrievanceByIssueId(grievanceId, { status: 'REJECTED' });    // Create response for rejection
    const responseData = {
      issue_id: grievance.id, // Use database id for response table
      response_text: `REJECTED: ${rejection_reason}`,
      response_by: userRollno,
      status: 'REJECTED',
      stage: 'FINAL',
      attachment: null,
      redirect: null
    };

    const rejectionResponse = await responseService.createResponse(responseData);// Create history entry
    const historyData = {
      grievance_id: grievance.id, // Use database id for history table
      from_status: grievance.status,
      to_status: 'REJECTED',
      action_by: userRollno,
      action_type: 'REJECTED',
      note: note || `Rejected by ${userDepartment} admin: ${rejection_reason}`,
      date_time: Date.now()
    };

    await historyService.createHistory(historyData);

    res.status(200).json({
      message: 'Grievance rejected successfully',
      data: {
        response: rejectionResponse,
        status: 'REJECTED'
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
      priority, 
      note,
      test_user_rollno,
      department
    } = req.body;

    if (!grievanceId || !target_department || !redirect_reason) {
      res.status(400).json({
        message: 'Grievance ID, target department, and redirect reason are required',
        success: false,
      });
      return;
    }

    // Get user rollno for response
    const userRollno = req.User?.rollno || test_user_rollno || 'TEST_ADMIN';
    const userDepartment = req.User?.department || department || 'dept';

    // Validate target department
    if (!['exam', 'academic', 'campus'].includes(target_department)) {
      res.status(400).json({
        message: 'Invalid target department. Must be: exam, academic, or campus',
        success: false,
      });
      return;
    }

    // Validate priority if provided
    if (priority && !PRIORITY.includes(priority)) {
      res.status(400).json({
        message: 'Invalid priority. Must be one of: ' + PRIORITY.join(', '),
        success: false,
      });
      return;
    }    // Get the grievance
    const grievance = await grievanceService.getGrievanceByIssueId(grievanceId);
    if (!grievance) {
      res.status(404).json({
        message: 'Grievance not found',
        success: false,
      });
      return;
    }    // Update grievance status (remove priority update since column doesn't exist)
    const updateData: any = { status: 'IN_PROGRESS' };
    // Note: Priority will be mentioned in response text instead of database field

    await grievanceService.updateGrievanceByIssueId(grievanceId, updateData);// Create response for redirection
    const responseData = {
      issue_id: grievance.id, // Use database id for response table
      response_text: `REDIRECTED to ${target_department.toUpperCase()} department: ${redirect_reason}${priority ? ` [Priority: ${priority}]` : ''}`,
      response_by: userRollno,
      status: 'IN_PROGRESS',
      stage: 'FOLLOW_UP',
      attachment: null,
      redirect: target_department
    };

    const redirectResponse = await responseService.createResponse(responseData);// Create history entry
    const historyData = {
      grievance_id: grievance.id, // Use database id for history table
      from_status: grievance.status,
      to_status: 'IN_PROGRESS',
      action_by: userRollno,
      action_type: 'FORWARDED',
      note: note || `Redirected to ${target_department.toUpperCase()} by ${userDepartment} admin: ${redirect_reason}${priority ? ` [Priority: ${priority}]` : ''}`,
      date_time: Date.now()
    };

    await historyService.createHistory(historyData);

    res.status(200).json({
      message: 'Grievance redirected successfully',
      data: {
        response: redirectResponse,
        target_department: target_department,
        priority: priority || null,
        status: 'IN_PROGRESS'
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
    const { status, note, priority, test_user_rollno, department } = req.body;

    if (!grievanceId || !status) {
      res.status(400).json({
        message: 'Grievance ID and status are required',
        success: false,
      });
      return;
    }

    // Get user rollno for response
    const userRollno = req.User?.rollno || test_user_rollno || 'TEST_ADMIN';
    const userDepartment = req.User?.department || department || 'dept';

    // Validate status
    if (!STATUS.includes(status)) {
      res.status(400).json({
        message: 'Invalid status. Must be one of: ' + STATUS.join(', '),
        success: false,
      });
      return;
    }

    // Validate priority if provided
    if (priority && !PRIORITY.includes(priority)) {
      res.status(400).json({
        message: 'Invalid priority. Must be one of: ' + PRIORITY.join(', '),
        success: false,
      });
      return;
    }    // Get the grievance by issue_id
    const grievance = await grievanceService.getGrievanceByIssueId(grievanceId);
    if (!grievance) {
      res.status(404).json({
        message: 'Grievance not found',
        success: false,
      });
      return;
    }    // Update grievance using issue_id (remove priority update since column doesn't exist)
    const updateData: any = { status: status };
    // Note: Priority will be mentioned in response text and history instead of database field

    const updatedGrievance = await grievanceService.updateGrievanceByIssueId(grievanceId, updateData);

    // Create history entry if status changed
    if (status !== grievance.status) {
      const historyData = {
        grievance_id: grievance.id, // Use database id for history table
        from_status: grievance.status,
        to_status: status,
        action_by: userRollno,
        action_type: 'STATUS_UPDATED',
        note: note || `Status updated by ${userDepartment} admin${priority ? ` [Priority: ${priority}]` : ''}`,
        date_time: Date.now()
      };

      await historyService.createHistory(historyData);
    }

    res.status(200).json({
      message: 'Grievance status updated successfully',
      data: {
        grievance: updatedGrievance,
        status: status,
        priority: priority || null
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

// Get grievance statistics for department
export const getDepartmentStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const department = req.User?.department || req.query.department as Department;
    
    if (!department) {
      res.status(400).json({
        message: 'Department parameter is required. Use ?department=exam|academic|campus',
        success: false,
      });
      return;
    }
    
    if (!['exam', 'academic', 'campus'].includes(department)) {
      res.status(400).json({
        message: 'Invalid or missing department. Must be: exam, academic, or campus',
        success: false,
      });
      return;
    }

    // Get all grievances
    const allGrievances = await grievanceService.getAllGrievancesWithCompleteDetails();
    
    // Filter grievances by department
    const departmentGrievances = allGrievances.filter((grievance: any) => {
      const issueType = grievance.issuse_type?.toUpperCase();
      
      if (department === 'academic') {
        return issueType === 'ACADEMIC';
      } else if (department === 'exam') {
        return issueType === 'EXAM';
      } else if (department === 'campus') {
        return ['FACILITY', 'TECHNICAL', 'ADMINISTRATIVE', 'OTHER'].includes(issueType);
      }
      
      return false;
    });

    // Calculate statistics
    const stats = {
      total: departmentGrievances.length,
      pending: departmentGrievances.filter(g => g.status === 'PENDING').length,
      in_progress: departmentGrievances.filter(g => g.status === 'IN_PROGRESS').length,
      resolved: departmentGrievances.filter(g => g.status === 'RESOLVED').length,
      rejected: departmentGrievances.filter(g => g.status === 'REJECTED').length,
      returned: departmentGrievances.filter(g => g.status === 'RETURN').length,
      by_priority: {
        low: departmentGrievances.filter(g => g.priority === 'LOW').length,
        medium: departmentGrievances.filter(g => g.priority === 'MEDIUM').length,
        high: departmentGrievances.filter(g => g.priority === 'HIGH').length,
        critical: departmentGrievances.filter(g => g.priority === 'CRITICAL').length,
      },
      by_issue_type: {} as Record<string, number>
    };

    // Count by issue type
    departmentGrievances.forEach((grievance: any) => {
      const issueType = grievance.issuse_type;
      stats.by_issue_type[issueType] = (stats.by_issue_type[issueType] || 0) + 1;
    });

    res.status(200).json({
      message: `${department.toUpperCase()} department statistics retrieved successfully`,
      department: department,
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

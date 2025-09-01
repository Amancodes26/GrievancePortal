/// <reference path="../types/express/index.d.ts" />
import { Request, Response, NextFunction } from 'express';
import * as grievanceService from '../services/grievance.service';
import { ResponseService } from '../services/response.service';
import { HistoryService } from '../services/history.service';
import * as attachmentService from '../services/attachment.service';
import { errorHandler } from '../utils/errorHandler';

/**
 * Create a new grievance
 * POST /api/v1/grievances
 */
export const createGrievance = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(403).json({
        message: 'User not authenticated',
        success: false,
      });
      return;
    }

    const { Subject, Description, IssueCode, CampusId } = req.body;
    
    if (!Subject || !Description || !req.user.rollNumber || !IssueCode) {
      res.status(400).json({
        message: 'Subject, Description, Roll Number, and Issue Code are required',
        success: false,
      });
      return;
    }

    // Generate unique grievance ID
    const grievanceId = `GRV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    
    const serviceData = {
      grievanceId: grievanceId,
      rollNo: req.user.rollNumber,
      campusId: CampusId,
      issueCode: IssueCode,
      subject: Subject,
      description: Description,
      hasAttachments: false
    };

    const newGrievance = await grievanceService.createGrievance(serviceData);

    res.status(201).json({
      message: 'Grievance created successfully. You can now upload attachments using the grievance ID.',
      data: {
        grievance_id: newGrievance.GrievanceId,
        roll_number: newGrievance.RollNo,
        campus_id: newGrievance.CampusId,
        issue_code: newGrievance.IssueCode,
        subject: newGrievance.Subject,
        description: newGrievance.Description,
        admin_status: newGrievance.AdminStatus,
        student_status: newGrievance.StudentStatus,
        has_attachments: newGrievance.HasAttachments,
        created_at: newGrievance.CreatedAt,
        updated_at: newGrievance.UpdatedAt,
        attachment_upload_url: `/api/v1/attachments/grievance/${newGrievance.GrievanceId}`
      },
      success: true,
    });
  } catch (error) {
    console.error('Error creating grievance:', error);
    res.status(500).json({
      message: 'Error creating grievance',
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      success: false,
    });
  }
};

/**
 * Get grievance by ID with complete details
 * GET /api/v1/grievances/:id
 */
export const getGrievanceById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!id) {
      res.status(400).json({
        message: 'Grievance ID is required',
        success: false,
      });
      return;
    }

    const grievanceWithDetails = await grievanceService.getGrievanceWithDetails(id);
    
    if (!grievanceWithDetails) {
      res.status(404).json({
        message: 'Grievance not found',
        success: false,
      });
      return;
    }

    // Format response data
    const formattedGrievance = {
      grievance_details: {
        id: grievanceWithDetails.Id,
        grievance_id: grievanceWithDetails.GrievanceId,
        roll_number: grievanceWithDetails.RollNo,
        campus: grievanceWithDetails.CampusName,
        issue_type: grievanceWithDetails.IssueTitle,
        subject: grievanceWithDetails.Subject,
        description: grievanceWithDetails.Description,
        admin_status: grievanceWithDetails.AdminStatus,
        student_status: grievanceWithDetails.StudentStatus,
        has_attachments: grievanceWithDetails.HasAttachments,
        created_at: grievanceWithDetails.CreatedAt,
        updated_at: grievanceWithDetails.UpdatedAt
      },
      tracking_history: grievanceWithDetails.TrackingHistory || [],
      attachments: grievanceWithDetails.Attachments || []
    };

    res.status(200).json({
      message: 'Grievance retrieved successfully',
      data: formattedGrievance,
      success: true,
    });
  } catch (error) {
    console.error('Error retrieving grievance:', error);
    res.status(500).json({
      message: 'Error retrieving grievance',
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      success: false,
    });
  }
};

/**
 * Get all grievances with pagination and filters
 * GET /api/v1/grievances
 */
export const getAllGrievances = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    const campus = req.query.campus as string;
    const issueType = req.query.issue_type as string;

    const allGrievances = await grievanceService.getAllGrievancesWithDetails();
    
    // Apply filters if provided
    let filteredGrievances = allGrievances;
    if (status) {
      filteredGrievances = filteredGrievances.filter((g: any) => g.AdminStatus === status);
    }
    if (campus) {
      filteredGrievances = filteredGrievances.filter((g: any) => g.CampusId?.toString() === campus);
    }
    if (issueType) {
      filteredGrievances = filteredGrievances.filter((g: any) => g.IssueCode?.toString() === issueType);
    }

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedGrievances = filteredGrievances.slice(startIndex, endIndex);

    res.status(200).json({
      message: 'Grievances retrieved successfully',
      data: {
        grievances: paginatedGrievances,
        pagination: {
          current_page: page,
          per_page: limit,
          total_records: filteredGrievances.length,
          total_pages: Math.ceil(filteredGrievances.length / limit)
        }
      },
      success: true,
    });
  } catch (error) {
    console.error('Error retrieving grievances:', error);
    res.status(500).json({
      message: 'Error retrieving grievances',
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      success: false,
    });
  }
};

/**
 * Get grievances for the authenticated user
 * GET /api/v1/grievances/my
 */
export const getMyGrievances = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(403).json({
        message: 'User not authenticated',
        success: false,
      });
      return;
    }

    const rollNo = req.user.rollNumber;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const allUserGrievances = await grievanceService.getGrievancesByRollNoWithDetails(rollNo);

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedGrievances = allUserGrievances.slice(startIndex, endIndex);

    // Format grievances with complete details
    const formattedGrievances = paginatedGrievances.map((grievance: any) => ({
      grievance_details: {
        id: grievance.Id,
        grievance_id: grievance.GrievanceId,
        roll_number: grievance.RollNo,
        campus: grievance.CampusName,
        issue_type: grievance.IssueTitle,
        subject: grievance.Subject,
        description: grievance.Description,
        admin_status: grievance.AdminStatus,
        student_status: grievance.StudentStatus,
        has_attachments: grievance.HasAttachments,
        created_at: grievance.CreatedAt,
        updated_at: grievance.UpdatedAt
      },
      latest_response: grievance.LatestResponse || null,
      response_count: grievance.ResponseCount || 0
    }));

    res.status(200).json({
      message: 'My grievances retrieved successfully',
      data: {
        grievances: formattedGrievances,
        pagination: {
          current_page: page,
          per_page: limit,
          total_records: allUserGrievances.length,
          total_pages: Math.ceil(allUserGrievances.length / limit)
        }
      },
      success: true,
    });
  } catch (error) {
    console.error('Error retrieving user grievances:', error);
    res.status(500).json({
      message: 'Error retrieving grievances',
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      success: false,
    });
  }
};

/**
 * Add response to a grievance (Admin only)
 * POST /api/v1/grievances/:id/response
 */
export const addResponse = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.admin) {
      res.status(403).json({
        message: 'Admin access required',
        success: false,
      });
      return;
    }

    const { id } = req.params;
    const { ResponseText, NewAdminStatus, RedirectTo } = req.body;

    if (!id || !ResponseText) {
      res.status(400).json({
        message: 'Grievance ID and Response Text are required',
        success: false,
      });
      return;
    }

    const responseData = {
      grievanceId: id,
      responseText: ResponseText,
      adminStatus: NewAdminStatus || 'PENDING' as 'NEW' | 'PENDING' | 'REDIRECTED' | 'RESOLVED' | 'REJECTED',
      studentStatus: 'UNDER_REVIEW' as 'SUBMITTED' | 'UNDER_REVIEW' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED',
      responseBy: req.admin.AdminId
    };

    const newResponse = await ResponseService.addResponse(responseData);

    res.status(201).json({
      message: 'Response added successfully',
      data: {
        tracking_id: newResponse.TrackingId,
        grievance_id: newResponse.GrievanceId,
        response_text: newResponse.ResponseText,
        response_by: newResponse.ResponseBy,
        response_at: newResponse.ResponseAt,
        admin_status: newResponse.AdminStatus,
        redirect_to: newResponse.RedirectTo
      },
      success: true,
    });
  } catch (error) {
    console.error('Error adding response:', error);
    res.status(500).json({
      message: 'Error adding response',
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      success: false,
    });
  }
};

/**
 * Redirect grievance to another admin/department
 * POST /api/v1/grievances/:id/redirect
 */
export const redirectGrievance = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.admin) {
      res.status(403).json({
        message: 'Admin access required',
        success: false,
      });
      return;
    }

    const { id } = req.params;
    const { RedirectTo, RedirectReason } = req.body;

    if (!id || !RedirectTo) {
      res.status(400).json({
        message: 'Grievance ID and Redirect To are required',
        success: false,
      });
      return;
    }

    const redirectData = {
      grievanceId: id,
      responseText: RedirectReason || `Redirected to ${RedirectTo}`,
      redirectFrom: req.admin.AdminId,
      redirectTo: RedirectTo
    };

    const redirectResponse = await ResponseService.redirectGrievance(redirectData);

    res.status(200).json({
      message: 'Grievance redirected successfully',
      data: {
        tracking_id: redirectResponse.TrackingId,
        grievance_id: redirectResponse.GrievanceId,
        redirect_to: redirectResponse.RedirectTo,
        redirect_reason: redirectResponse.ResponseText,
        redirect_by: redirectResponse.ResponseBy,
        redirect_at: redirectResponse.ResponseAt
      },
      success: true,
    });
  } catch (error) {
    console.error('Error redirecting grievance:', error);
    res.status(500).json({
      message: 'Error redirecting grievance',
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      success: false,
    });
  }
};

/**
 * Get grievances by roll number (Admin only)
 * GET /api/v1/grievances/rollno/:rollno
 */
export const getGrievancesByRollNo = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.admin) {
      res.status(403).json({
        message: 'Admin access required',
        success: false,
      });
      return;
    }

    const { rollno } = req.params;
    
    if (!rollno) {
      res.status(400).json({
        message: 'Roll number is required',
        success: false,
      });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const allGrievances = await grievanceService.getGrievancesByRollNoWithDetails(rollno);
    
    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedGrievances = allGrievances.slice(startIndex, endIndex);

    res.status(200).json({
      message: 'Grievances retrieved successfully for roll number',
      data: {
        roll_number: rollno,
        grievances: paginatedGrievances,
        pagination: {
          current_page: page,
          per_page: limit,
          total_records: allGrievances.length,
          total_pages: Math.ceil(allGrievances.length / limit)
        }
      },
      success: true,
    });
  } catch (error) {
    console.error('Error retrieving grievances by roll number:', error);
    res.status(500).json({
      message: 'Error retrieving grievances',
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      success: false,
    });
  }
};

/**
 * Search grievance by grievance ID
 * GET /api/v1/grievances/search/:grievanceId
 */
export const getGrievanceByGrievanceId = async (req: Request, res: Response): Promise<void> => {
  try {
    const { grievanceId } = req.params;
    
    if (!grievanceId) {
      res.status(400).json({
        message: 'Grievance ID is required',
        success: false,
      });
      return;
    }

    const grievanceWithDetails = await grievanceService.getGrievanceWithDetails(grievanceId);
    
    if (!grievanceWithDetails) {
      res.status(404).json({
        message: 'Grievance not found with the provided ID',
        success: false,
      });
      return;
    }

    // Format response data
    const formattedGrievance = {
      grievance_details: {
        id: grievanceWithDetails.Id,
        grievance_id: grievanceWithDetails.GrievanceId,
        roll_number: grievanceWithDetails.RollNo,
        campus: grievanceWithDetails.CampusName,
        issue_type: grievanceWithDetails.IssueTitle,
        subject: grievanceWithDetails.Subject,
        description: grievanceWithDetails.Description,
        admin_status: grievanceWithDetails.AdminStatus,
        student_status: grievanceWithDetails.StudentStatus,
        has_attachments: grievanceWithDetails.HasAttachments,
        created_at: grievanceWithDetails.CreatedAt,
        updated_at: grievanceWithDetails.UpdatedAt
      },
      tracking_history: grievanceWithDetails.TrackingHistory || [],
      attachments: grievanceWithDetails.Attachments || []
    };

    res.status(200).json({
      message: 'Grievance found and retrieved successfully',
      data: formattedGrievance,
      success: true,
    });
  } catch (error) {
    console.error('Error searching for grievance:', error);
    res.status(500).json({
      message: 'Error searching for grievance',
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      success: false,
    });
  }
};

/**
 * Get grievance statistics (Admin only)
 * GET /api/v1/grievances/stats
 */
export const getGrievanceStats = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.admin) {
      res.status(403).json({
        message: 'Admin access required',
        success: false,
      });
      return;
    }

    // For now, return basic stats from available data
    const allGrievances = await grievanceService.getAllGrievancesWithDetails();
    
    const stats = {
      total_grievances: allGrievances.length,
      new_grievances: allGrievances.filter((g: any) => g.AdminStatus === 'NEW').length,
      pending_grievances: allGrievances.filter((g: any) => g.AdminStatus === 'PENDING').length,
      resolved_grievances: allGrievances.filter((g: any) => g.AdminStatus === 'RESOLVED').length,
      rejected_grievances: allGrievances.filter((g: any) => g.AdminStatus === 'REJECTED').length,
      redirected_grievances: allGrievances.filter((g: any) => g.AdminStatus === 'REDIRECTED').length
    };

    res.status(200).json({
      message: 'Grievance statistics retrieved successfully',
      data: stats,
      success: true,
    });
  } catch (error) {
    console.error('Error retrieving grievance statistics:', error);
    res.status(500).json({
      message: 'Error retrieving statistics',
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      success: false,
    });
  }
};

/**
 * Update student status (Student only - for feedback)
 * PATCH /api/v1/grievances/:id/student-status
 */
export const updateStudentStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(403).json({
        message: 'User authentication required',
        success: false,
      });
      return;
    }

    const { id } = req.params;
    const { StudentStatus } = req.body;

    if (!id || !StudentStatus) {
      res.status(400).json({
        message: 'Grievance ID and Student Status are required',
        success: false,
      });
      return;
    }

    // Use the existing updateGrievanceByGrievanceId method to update student status
    const updatedGrievance = await grievanceService.updateGrievanceByGrievanceId(id, {
      StudentStatus: StudentStatus
    });

    if (!updatedGrievance) {
      res.status(404).json({
        message: 'Grievance not found or you do not have permission to update it',
        success: false,
      });
      return;
    }

    res.status(200).json({
      message: 'Student status updated successfully',
      data: {
        grievance_id: updatedGrievance.GrievanceId,
        student_status: updatedGrievance.StudentStatus,
        updated_at: updatedGrievance.UpdatedAt
      },
      success: true,
    });
  } catch (error) {
    console.error('Error updating student status:', error);
    res.status(500).json({
      message: 'Error updating student status',
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      success: false,
    });
  }
};

// Legacy method for backwards compatibility
export const updateGrievanceStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id || !status) {
      res.status(400).json({
        message: 'Grievance ID and status are required',
        success: false,
      });
      return;
    }

    // This is a legacy method - redirect to appropriate new methods
    res.status(400).json({
      message: 'This method is deprecated. Please use /response for admin responses or /student-status for student feedback',
      success: false,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error updating grievance status',
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      success: false,
    });
  }
};

// Default export for module compatibility
export default {
  createGrievance,
  getGrievanceById,
  getAllGrievances,
  getMyGrievances,
  addResponse,
  redirectGrievance,
  getGrievancesByRollNo,
  getGrievanceByGrievanceId,
  getGrievanceStats,
  updateStudentStatus,
  updateGrievanceStatus
};



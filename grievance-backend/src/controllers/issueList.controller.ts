import { Request, Response } from 'express';
import { IssueListService } from '../services/issueList.service';
import { 
  CreateIssueListSchema, 
  UpdateIssueListSchema, 
  IssueCodeParamSchema, 
  ToggleIssueStatusSchema,
  IssueListQuerySchema 
} from '../validators/issueList.validator';
import { AppError } from '../utils/errorHandler';
import { ApiResponse } from '../utils/apiResponse';

/**
 * Controller class for IssueList API endpoints
 * Implements comprehensive issue management functionality
 * 
 * Principal Engineer Standards:
 * - Comprehensive input validation
 * - Consistent error handling
 * - Audit logging
 * - Performance monitoring
 * - Clean API contracts
 * - Role-based access control
 */
export class IssueListController {
  private issueListService: IssueListService;

  constructor() {
    this.issueListService = new IssueListService();
  }

  /**
   * GET /api/v1/issues
   * Lists all active issues (for students) or all issues (for admins)
   * 
   * @route GET /api/v1/issues
   * @access Public (students get only active), Admin (gets all based on filters)
   */
  getIssues = async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    
    try {
      console.info('[IssueListController.getIssues] Starting request processing', {
        path: req.path,
        method: req.method,
        query: req.query,
        userType: (req as any).admin ? 'admin' : 'student',
        adminId: (req as any).admin?.AdminId,
        timestamp: new Date().toISOString()
      });

      // Validate query parameters
      const queryValidation = IssueListQuerySchema.safeParse(req.query);
      if (!queryValidation.success) {
        const errorMessages = queryValidation.error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        ).join(', ');
        
        throw new AppError(
          `Invalid query parameters: ${errorMessages}`, 
          400, 
          'VALIDATION_ERROR',
          queryValidation.error.errors
        );
      }

      const filters = queryValidation.data;
      
      // Determine if this is an admin request
      const isAdminRequest = !!(req as any).admin?.AdminId;
      const adminId = (req as any).admin?.AdminId;

      let result;
      
      if (isAdminRequest) {
        // Admin gets all issues with full filtering capabilities
        result = await this.issueListService.getAllIssuesForAdmin(filters, adminId);
        
        console.info('[IssueListController.getIssues] Admin request completed', {
          adminId,
          totalIssues: result.total,
          returnedIssues: result.issues.length,
          filters
        });
      } else {
        // Students get only active issues
        const studentFilters = {
          ...filters,
          active: true // Force active filter for students
        };
        
        result = await this.issueListService.getActiveIssuesForStudents(studentFilters);
        
        console.info('[IssueListController.getIssues] Student request completed', {
          totalActiveIssues: result.total,
          returnedIssues: result.issues.length,
          filters: studentFilters
        });
      }

      const processingTime = Date.now() - startTime;

      // Return success response
      ApiResponse.success(res, {
        issues: result.issues,
        pagination: {
          total: result.total,
          limit: result.pagination.limit,
          offset: result.pagination.offset,
          hasMore: result.pagination.hasMore,
          currentPage: Math.floor(result.pagination.offset / result.pagination.limit) + 1,
          totalPages: Math.ceil(result.total / result.pagination.limit)
        },
        meta: {
          processingTime: `${processingTime}ms`,
          timestamp: new Date().toISOString(),
          userType: isAdminRequest ? 'admin' : 'student'
        }
      }, 'Issues retrieved successfully', 200);

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      console.error('[IssueListController.getIssues] Request failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query: req.query,
        processingTimeMs: processingTime,
        stack: error instanceof Error ? error.stack : undefined
      });

      if (error instanceof AppError) {
        ApiResponse.error(res, error.message, error.status, error.code, error.details);
      } else {
        ApiResponse.error(res, 'Internal server error occurred while retrieving issues', 500, 'INTERNAL_SERVER_ERROR');
      }
    }
  };

  /**
   * GET /api/v1/issues/:code
   * Retrieves a specific issue by IssueCode
   * 
   * @route GET /api/v1/issues/:code
   * @access Public (students get only active), Admin (gets any)
   */
  getIssueByCode = async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    
    try {
      console.info('[IssueListController.getIssueByCode] Starting request processing', {
        path: req.path,
        method: req.method,
        params: req.params,
        userType: (req as any).admin ? 'admin' : 'student',
        adminId: (req as any).admin?.AdminId,
        timestamp: new Date().toISOString()
      });

      // Validate route parameters
      const paramValidation = IssueCodeParamSchema.safeParse(req.params);
      if (!paramValidation.success) {
        const errorMessages = paramValidation.error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        ).join(', ');
        
        throw new AppError(
          `Invalid parameters: ${errorMessages}`, 
          400, 
          'PARAMETER_VALIDATION_ERROR',
          paramValidation.error.errors
        );
      }

      const { code: issueCode } = paramValidation.data;
      const isStudentRequest = !(req as any).admin?.AdminId;

      console.info('[IssueListController.getIssueByCode] Parameter validation successful', {
        issueCode,
        isStudentRequest
      });

      // Retrieve issue
      const issue = await this.issueListService.getIssueByCode(issueCode, isStudentRequest);

      if (!issue) {
        const processingTime = Date.now() - startTime;
        
        console.warn('[IssueListController.getIssueByCode] Issue not found', {
          issueCode,
          isStudentRequest,
          processingTimeMs: processingTime
        });

        ApiResponse.error(
          res, 
          `Issue with code ${issueCode} not found`, 
          404, 
          'ISSUE_NOT_FOUND'
        );
        return;
      }

      const processingTime = Date.now() - startTime;
      
      console.info('[IssueListController.getIssueByCode] Request completed successfully', {
        issueCode,
        issueTitle: issue.IssueTitle,
        isActive: issue.IsActive,
        processingTimeMs: processingTime
      });

      // Return success response
      ApiResponse.success(res, {
        issue,
        meta: {
          processingTime: `${processingTime}ms`,
          timestamp: new Date().toISOString(),
          userType: isStudentRequest ? 'student' : 'admin'
        }
      }, 'Issue retrieved successfully', 200);

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      console.error('[IssueListController.getIssueByCode] Request failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        params: req.params,
        processingTimeMs: processingTime,
        stack: error instanceof Error ? error.stack : undefined
      });

      if (error instanceof AppError) {
        ApiResponse.error(res, error.message, error.status, error.code, error.details);
      } else {
        ApiResponse.error(res, 'Internal server error occurred while retrieving issue', 500, 'INTERNAL_SERVER_ERROR');
      }
    }
  };

  /**
   * POST /api/v1/issues
   * Creates a new issue type (Admin only)
   * 
   * @route POST /api/v1/issues
   * @access Private (Admin only)
   */
  createIssue = async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    
    try {
      console.info('[IssueListController.createIssue] Starting request processing', {
        path: req.path,
        method: req.method,
        adminId: (req as any).admin?.AdminId,
        timestamp: new Date().toISOString()
      });

      // Extract admin ID from authenticated admin
      const adminId = (req as any).admin?.AdminId;
      if (!adminId) {
        throw new AppError('Admin authentication required', 401, 'AUTHENTICATION_REQUIRED');
      }

      // Validate request body
      const validationResult = CreateIssueListSchema.safeParse(req.body);
      if (!validationResult.success) {
        const errorMessages = validationResult.error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        ).join(', ');
        
        throw new AppError(
          `Validation failed: ${errorMessages}`, 
          400, 
          'VALIDATION_ERROR',
          validationResult.error.errors
        );
      }

      const issueData = validationResult.data;
      
      console.info('[IssueListController.createIssue] Input validation successful', {
        issueCode: issueData.IssueCode,
        issueTitle: issueData.IssueTitle,
        category: issueData.Category,
        issueLevel: issueData.IssueLevel,
        attachmentsCount: issueData.RequiredAttachments.length
      });

      // Create issue through service layer
      const createdIssue = await this.issueListService.createIssue(issueData, adminId);

      const processingTime = Date.now() - startTime;
      
      console.info('[IssueListController.createIssue] Request completed successfully', {
        issueId: createdIssue.Id,
        issueCode: createdIssue.IssueCode,
        processingTimeMs: processingTime,
        createdByAdmin: adminId
      });

      // Return success response
      ApiResponse.success(res, {
        issue: createdIssue,
        meta: {
          processingTime: `${processingTime}ms`,
          timestamp: new Date().toISOString(),
          createdBy: adminId
        }
      }, 'Issue created successfully', 201);

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      console.error('[IssueListController.createIssue] Request failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        body: req.body,
        processingTimeMs: processingTime,
        adminId: (req as any).admin?.AdminId,
        stack: error instanceof Error ? error.stack : undefined
      });

      if (error instanceof AppError) {
        ApiResponse.error(res, error.message, error.status, error.code, error.details);
      } else {
        ApiResponse.error(res, 'Internal server error occurred while creating issue', 500, 'INTERNAL_SERVER_ERROR');
      }
    }
  };

  /**
   * PUT /api/v1/issues/:code
   * Updates an existing issue type (Admin only)
   * 
   * @route PUT /api/v1/issues/:code
   * @access Private (Admin only)
   */
  updateIssue = async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    
    try {
      console.info('[IssueListController.updateIssue] Starting request processing', {
        path: req.path,
        method: req.method,
        params: req.params,
        adminId: (req as any).admin?.AdminId,
        timestamp: new Date().toISOString()
      });

      // Extract admin ID from authenticated admin
      const adminId = (req as any).admin?.AdminId;
      if (!adminId) {
        throw new AppError('Admin authentication required', 401, 'AUTHENTICATION_REQUIRED');
      }

      // Validate route parameters
      const paramValidation = IssueCodeParamSchema.safeParse(req.params);
      if (!paramValidation.success) {
        const errorMessages = paramValidation.error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        ).join(', ');
        
        throw new AppError(
          `Invalid parameters: ${errorMessages}`, 
          400, 
          'PARAMETER_VALIDATION_ERROR',
          paramValidation.error.errors
        );
      }

      // Validate request body
      const bodyValidation = UpdateIssueListSchema.safeParse(req.body);
      if (!bodyValidation.success) {
        const errorMessages = bodyValidation.error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        ).join(', ');
        
        throw new AppError(
          `Validation failed: ${errorMessages}`, 
          400, 
          'VALIDATION_ERROR',
          bodyValidation.error.errors
        );
      }

      const { code: issueCode } = paramValidation.data;
      const updateData = bodyValidation.data;

      // Check if there's actually data to update
      if (Object.keys(updateData).length === 0) {
        throw new AppError('No update data provided', 400, 'NO_UPDATE_DATA');
      }

      console.info('[IssueListController.updateIssue] Validation successful', {
        issueCode,
        updateFields: Object.keys(updateData)
      });

      // Update issue through service layer
      const updatedIssue = await this.issueListService.updateIssue(issueCode, updateData, adminId);

      const processingTime = Date.now() - startTime;
      
      console.info('[IssueListController.updateIssue] Request completed successfully', {
        issueCode,
        fieldsUpdated: Object.keys(updateData).length,
        processingTimeMs: processingTime,
        updatedByAdmin: adminId
      });

      // Return success response
      ApiResponse.success(res, {
        issue: updatedIssue,
        meta: {
          processingTime: `${processingTime}ms`,
          timestamp: new Date().toISOString(),
          updatedBy: adminId,
          fieldsUpdated: Object.keys(updateData)
        }
      }, 'Issue updated successfully', 200);

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      console.error('[IssueListController.updateIssue] Request failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        params: req.params,
        body: req.body,
        processingTimeMs: processingTime,
        adminId: (req as any).admin?.AdminId,
        stack: error instanceof Error ? error.stack : undefined
      });

      if (error instanceof AppError) {
        ApiResponse.error(res, error.message, error.status, error.code, error.details);
      } else {
        ApiResponse.error(res, 'Internal server error occurred while updating issue', 500, 'INTERNAL_SERVER_ERROR');
      }
    }
  };

  /**
   * PATCH /api/v1/issues/:code/toggle
   * Toggles the active status of an issue (Admin only)
   * 
   * @route PATCH /api/v1/issues/:code/toggle
   * @access Private (Admin only)
   */
  toggleIssueStatus = async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    
    try {
      console.info('[IssueListController.toggleIssueStatus] Starting request processing', {
        path: req.path,
        method: req.method,
        params: req.params,
        adminId: (req as any).admin?.AdminId,
        timestamp: new Date().toISOString()
      });

      // Extract admin ID from authenticated admin
      const adminId = (req as any).admin?.AdminId;
      if (!adminId) {
        throw new AppError('Admin authentication required', 401, 'AUTHENTICATION_REQUIRED');
      }

      // Validate route parameters
      const paramValidation = IssueCodeParamSchema.safeParse(req.params);
      if (!paramValidation.success) {
        const errorMessages = paramValidation.error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        ).join(', ');
        
        throw new AppError(
          `Invalid parameters: ${errorMessages}`, 
          400, 
          'PARAMETER_VALIDATION_ERROR',
          paramValidation.error.errors
        );
      }

      // Validate request body
      const bodyValidation = ToggleIssueStatusSchema.safeParse(req.body);
      if (!bodyValidation.success) {
        const errorMessages = bodyValidation.error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        ).join(', ');
        
        throw new AppError(
          `Validation failed: ${errorMessages}`, 
          400, 
          'VALIDATION_ERROR',
          bodyValidation.error.errors
        );
      }

      const { code: issueCode } = paramValidation.data;
      const { IsActive } = bodyValidation.data;

      console.info('[IssueListController.toggleIssueStatus] Validation successful', {
        issueCode,
        newActiveStatus: IsActive
      });

      // Toggle status through service layer
      const updatedIssue = await this.issueListService.toggleIssueStatus(issueCode, IsActive, adminId);

      const processingTime = Date.now() - startTime;
      
      console.info('[IssueListController.toggleIssueStatus] Request completed successfully', {
        issueCode,
        newStatus: IsActive,
        processingTimeMs: processingTime,
        toggledByAdmin: adminId
      });

      // Return success response
      ApiResponse.success(res, {
        issue: updatedIssue,
        meta: {
          processingTime: `${processingTime}ms`,
          timestamp: new Date().toISOString(),
          toggledBy: adminId,
          previousStatus: !IsActive,
          newStatus: IsActive
        }
      }, `Issue ${IsActive ? 'activated' : 'deactivated'} successfully`, 200);

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      console.error('[IssueListController.toggleIssueStatus] Request failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        params: req.params,
        body: req.body,
        processingTimeMs: processingTime,
        adminId: (req as any).admin?.AdminId,
        stack: error instanceof Error ? error.stack : undefined
      });

      if (error instanceof AppError) {
        ApiResponse.error(res, error.message, error.status, error.code, error.details);
      } else {
        ApiResponse.error(res, 'Internal server error occurred while toggling issue status', 500, 'INTERNAL_SERVER_ERROR');
      }
    }
  };
}

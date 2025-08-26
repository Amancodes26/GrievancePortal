import { Request, Response, NextFunction } from 'express';
import { GrievanceService } from '../services/grievance.service.new';
import { 
  CreateGrievanceSchema, 
  UpdateGrievanceSchema, 
  GetGrievancesQuerySchema, 
  GrievanceIdSchema,
  CreateGrievanceInput,
  UpdateGrievanceInput,
  GetGrievancesQuery
} from '../validators/grievance.validator';
import { AppError, asyncHandler } from '../utils/errorHandler';

// Create service instance
const grievanceService = new GrievanceService();

/**
 * POST /grievances
 * Creates a new grievance
 */
export const createGrievance = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  try {
    // Authentication check
    if (!req.user) {
      throw new AppError('Authentication required', 401, 'AUTHENTICATION_REQUIRED');
    }

    // Input validation using Zod schema
    const validationResult = CreateGrievanceSchema.safeParse({
      ...req.body,
      rollno: req.user.rollNumber // Auto-fill from authenticated user
    });

    if (!validationResult.success) {
      const validationErrors = validationResult.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      }));

      throw new AppError(
        'Validation failed', 
        400, 
        'VALIDATION_ERROR', 
        { errors: validationErrors }
      );
    }

    const validatedData: CreateGrievanceInput = validationResult.data;

    // Log request for audit trail
    console.info(`[createGrievance] Request from user: ${req.user.rollNumber}`, {
      issueCode: validatedData.issueCode,
      campusId: validatedData.campusId,
      timestamp: new Date().toISOString()
    });

    // Business logic execution
    const createdGrievance = await grievanceService.createGrievance(validatedData);

    // Success response
    const response = {
      success: true,
      message: 'Grievance created successfully',
      data: {
        id: createdGrievance.id,
        grievanceId: createdGrievance.grievanceId,
        rollno: createdGrievance.rollno,
        campusId: createdGrievance.campusId,
        issueCode: createdGrievance.issueCode,
        subject: createdGrievance.subject,
        description: createdGrievance.description,
        hasAttachments: createdGrievance.hasAttachments,
        createdAt: createdGrievance.createdAt,
        updatedAt: createdGrievance.updatedAt
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0'
      }
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('[createGrievance] Error:', error);
    throw error; // Will be handled by global error handler
  }
});

/**
 * GET /grievances/:id
 * Retrieves a specific grievance by ID
 */
export const getGrievanceById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  try {
    // Parameter validation
    const paramValidation = GrievanceIdSchema.safeParse(req.params);
    
    if (!paramValidation.success) {
      throw new AppError('Invalid grievance ID format', 400, 'INVALID_GRIEVANCE_ID');
    }

    const { id } = paramValidation.data;
    
    // Determine access level
    const isAdmin = !!(req.admin);
    const requestorRollNo = req.user?.rollNumber;

    if (!isAdmin && !requestorRollNo) {
      throw new AppError('Authentication required', 401, 'AUTHENTICATION_REQUIRED');
    }

    // Retrieve grievance with access control
    const grievance = await grievanceService.getGrievanceById(
      id, 
      requestorRollNo, 
      isAdmin
    );

    const response = {
      success: true,
      data: {
        id: grievance.id,
        grievanceId: grievance.grievanceId,
        rollno: grievance.rollno,
        campusId: grievance.campusId,
        issueCode: grievance.issueCode,
        subject: grievance.subject,
        description: grievance.description,
        hasAttachments: grievance.hasAttachments,
        createdAt: grievance.createdAt,
        updatedAt: grievance.updatedAt,
        // Additional metadata for admin users
        ...(isAdmin && {
          studentName: grievance.studentName,
          campusName: grievance.campusName,
          issueTitle: grievance.issueTitle
        })
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestorType: isAdmin ? 'admin' : 'student'
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('[getGrievanceById] Error:', error);
    throw error;
  }
});

/**
 * GET /grievances
 * Retrieves grievances with filtering and pagination
 */
export const getGrievances = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  try {
    // Query parameter validation
    const queryValidation = GetGrievancesQuerySchema.safeParse(req.query);
    
    if (!queryValidation.success) {
      const validationErrors = queryValidation.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));

      throw new AppError(
        'Invalid query parameters', 
        400, 
        'VALIDATION_ERROR', 
        { errors: validationErrors }
      );
    }

    const validatedQuery: GetGrievancesQuery = queryValidation.data;
    
    // Access control
    const isAdmin = !!(req.admin);
    const requestorRollNo = req.user?.rollNumber;

    if (!isAdmin && !requestorRollNo) {
      throw new AppError('Authentication required', 401, 'AUTHENTICATION_REQUIRED');
    }

    // Admin-only filters
    if (!isAdmin && validatedQuery.rollno) {
      throw new AppError('Access denied: Cannot filter by roll number', 403, 'ACCESS_DENIED');
    }

    // Retrieve grievances with business logic
    const result = await grievanceService.getGrievances(
      validatedQuery,
      requestorRollNo,
      isAdmin
    );

    const response = {
      success: true,
      data: {
        grievances: result.grievances.map(grievance => ({
          id: grievance.id,
          grievanceId: grievance.grievanceId,
          rollno: grievance.rollno,
          campusId: grievance.campusId,
          issueCode: grievance.issueCode,
          subject: grievance.subject,
          description: grievance.description,
          hasAttachments: grievance.hasAttachments,
          createdAt: grievance.createdAt,
          updatedAt: grievance.updatedAt,
          // Additional metadata for admin users
          ...(isAdmin && {
            studentName: grievance.studentName,
            campusName: grievance.campusName,
            issueTitle: grievance.issueTitle
          })
        })),
        pagination: result.pagination
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestorType: isAdmin ? 'admin' : 'student',
        filters: validatedQuery
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('[getGrievances] Error:', error);
    throw error;
  }
});

/**
 * PUT /grievances/:id
 * Updates a grievance (admin only)
 */
export const updateGrievance = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  try {
    // Admin authorization check
    if (!req.admin) {
      throw new AppError('Admin privileges required', 403, 'INSUFFICIENT_PRIVILEGES');
    }

    // Parameter validation
    const paramValidation = GrievanceIdSchema.safeParse(req.params);
    
    if (!paramValidation.success) {
      throw new AppError('Invalid grievance ID format', 400, 'INVALID_GRIEVANCE_ID');
    }

    // Body validation
    const bodyValidation = UpdateGrievanceSchema.safeParse(req.body);
    
    if (!bodyValidation.success) {
      const validationErrors = bodyValidation.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));

      throw new AppError(
        'Validation failed', 
        400, 
        'VALIDATION_ERROR', 
        { errors: validationErrors }
      );
    }

    const { id } = paramValidation.data;
    const validatedData: UpdateGrievanceInput = bodyValidation.data;

    // Log admin action for audit
    console.info(`[updateGrievance] Admin update by: ${req.admin.AdminId}`, {
      grievanceId: id,
      changes: validatedData,
      timestamp: new Date().toISOString()
    });

    // Execute update with business logic
    const updatedGrievance = await grievanceService.updateGrievance(
      id,
      validatedData,
      true
    );

    const response = {
      success: true,
      message: 'Grievance updated successfully',
      data: {
        id: updatedGrievance.id,
        grievanceId: updatedGrievance.grievanceId,
        rollno: updatedGrievance.rollno,
        campusId: updatedGrievance.campusId,
        issueCode: updatedGrievance.issueCode,
        subject: updatedGrievance.subject,
        description: updatedGrievance.description,
        hasAttachments: updatedGrievance.hasAttachments,
        createdAt: updatedGrievance.createdAt,
        updatedAt: updatedGrievance.updatedAt
      },
      meta: {
        timestamp: new Date().toISOString(),
        updatedBy: req.admin.AdminId
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('[updateGrievance] Error:', error);
    throw error;
  }
});

/**
 * DELETE /grievances/:id
 * Soft deletes a grievance (admin only)
 */
export const deleteGrievance = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  try {
    // Admin authorization check
    if (!req.admin) {
      throw new AppError('Admin privileges required', 403, 'INSUFFICIENT_PRIVILEGES');
    }

    // Parameter validation
    const paramValidation = GrievanceIdSchema.safeParse(req.params);
    
    if (!paramValidation.success) {
      throw new AppError('Invalid grievance ID format', 400, 'INVALID_GRIEVANCE_ID');
    }

    const { id } = paramValidation.data;

    // Log admin action for audit
    console.warn(`[deleteGrievance] Admin deletion by: ${req.admin.AdminId}`, {
      grievanceId: id,
      timestamp: new Date().toISOString()
    });

    // Execute soft deletion
    await grievanceService.deleteGrievance(id, true);

    const response = {
      success: true,
      message: 'Grievance has been marked as resolved/closed',
      data: {
        grievanceId: id,
        status: 'RESOLVED',
        closedAt: new Date().toISOString()
      },
      meta: {
        timestamp: new Date().toISOString(),
        closedBy: req.admin.AdminId,
        note: 'This is a soft delete - grievance data is preserved for audit purposes'
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('[deleteGrievance] Error:', error);
    throw error;
  }
});

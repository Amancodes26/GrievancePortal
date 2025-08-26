import { Request, Response } from 'express';
import { TrackingService } from '../services/tracking.service';
import { CreateTrackingSchema, GrievanceIdParamSchema, RedirectGrievanceSchema } from '../validators/tracking.validator';
import { AppError } from '../utils/errorHandler';
import { ApiResponse } from '../utils/apiResponse';

/**
 * Controller class for Tracking API endpoints
 * Implements comprehensive tracking functionality with enterprise-grade error handling
 * 
 * Principal Engineer Standards:
 * - Comprehensive input validation
 * - Consistent error handling
 * - Audit logging
 * - Performance monitoring
 * - Clean API contracts
 */
export class TrackingController {
  private trackingService: TrackingService;

  constructor() {
    this.trackingService = new TrackingService();
  }

  /**
   * POST /api/v1/tracking
   * Creates a new tracking entry for a grievance
   * 
   * @route POST /api/v1/tracking
   * @access Private (Admin only)
   */
  createTrackingEntry = async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    
    try {
      console.info('[TrackingController.createTrackingEntry] Starting request processing', {
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
      const validationResult = CreateTrackingSchema.safeParse(req.body);
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

      const trackingData = validationResult.data;
      
      console.info('[TrackingController.createTrackingEntry] Input validation successful', {
        grievanceId: trackingData.grievanceId,
        adminStatus: trackingData.adminStatus,
        studentStatus: trackingData.studentStatus,
        isRedirect: trackingData.isRedirect
      });

      // Create tracking entry through service layer
      const createdEntry = await this.trackingService.createTrackingEntry(trackingData, adminId);

      const processingTime = Date.now() - startTime;
      
      console.info('[TrackingController.createTrackingEntry] Request completed successfully', {
        trackingId: createdEntry.id,
        grievanceId: createdEntry.grievanceId,
        processingTimeMs: processingTime
      });

      // Return success response
      ApiResponse.success(res, {
        tracking: createdEntry,
        meta: {
          processingTime: `${processingTime}ms`,
          timestamp: new Date().toISOString()
        }
      }, 'Tracking entry created successfully', 201);

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      console.error('[TrackingController.createTrackingEntry] Request failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTimeMs: processingTime,
        stack: error instanceof Error ? error.stack : undefined
      });

      if (error instanceof AppError) {
        ApiResponse.error(res, error.message, error.status, error.code, error.details);
      } else {
        ApiResponse.error(res, 'Internal server error occurred while creating tracking entry', 500, 'INTERNAL_SERVER_ERROR');
      }
    }
  };

  /**
   * GET /api/v1/tracking/:grievanceId
   * Retrieves complete tracking history for a grievance
   * 
   * @route GET /api/v1/tracking/:grievanceId
   * @access Private (Admin only)
   */
  getTrackingHistory = async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    
    try {
      console.info('[TrackingController.getTrackingHistory] Starting request processing', {
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
      const paramValidationResult = GrievanceIdParamSchema.safeParse(req.params);
      if (!paramValidationResult.success) {
        const errorMessages = paramValidationResult.error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        ).join(', ');
        
        throw new AppError(
          `Invalid parameters: ${errorMessages}`, 
          400, 
          'PARAMETER_VALIDATION_ERROR',
          paramValidationResult.error.errors
        );
      }

      const { grievanceId } = paramValidationResult.data;
      
      console.info('[TrackingController.getTrackingHistory] Parameter validation successful', {
        grievanceId
      });

      // Retrieve tracking history through service layer
      const trackingHistory = await this.trackingService.getTrackingHistory(grievanceId, adminId);

      const processingTime = Date.now() - startTime;
      
      console.info('[TrackingController.getTrackingHistory] Request completed successfully', {
        grievanceId,
        entryCount: trackingHistory.entries.length,
        currentStatus: trackingHistory.summary.currentStatus,
        processingTimeMs: processingTime
      });

      // Return success response
      ApiResponse.success(res, {
        trackingHistory,
        meta: {
          processingTime: `${processingTime}ms`,
          timestamp: new Date().toISOString()
        }
      }, 'Tracking history retrieved successfully', 200);

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      console.error('[TrackingController.getTrackingHistory] Request failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        params: req.params,
        processingTimeMs: processingTime,
        stack: error instanceof Error ? error.stack : undefined
      });

      if (error instanceof AppError) {
        ApiResponse.error(res, error.message, error.status, error.code, error.details);
      } else {
        ApiResponse.error(res, 'Internal server error occurred while retrieving tracking history', 500, 'INTERNAL_SERVER_ERROR');
      }
    }
  };

  /**
   * GET /api/v1/tracking/:grievanceId/status  
   * Gets current tracking status for a grievance (lightweight endpoint)
   * 
   * @route GET /api/v1/tracking/:grievanceId/status
   * @access Private (Admin only)
   */
  getCurrentStatus = async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    
    try {
      console.info('[TrackingController.getCurrentStatus] Starting request processing', {
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
      const paramValidationResult = GrievanceIdParamSchema.safeParse(req.params);
      if (!paramValidationResult.success) {
        const errorMessages = paramValidationResult.error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        ).join(', ');
        
        throw new AppError(
          `Invalid parameters: ${errorMessages}`, 
          400, 
          'PARAMETER_VALIDATION_ERROR',
          paramValidationResult.error.errors
        );
      }

      const { grievanceId } = paramValidationResult.data;

      // Get current status through service layer
      const currentStatus = await this.trackingService.getCurrentTrackingStatus(grievanceId);

      const processingTime = Date.now() - startTime;
      
      console.info('[TrackingController.getCurrentStatus] Request completed successfully', {
        grievanceId,
        hasStatus: !!currentStatus,
        processingTimeMs: processingTime
      });

      // Return success response
      ApiResponse.success(res, {
        grievanceId,
        currentStatus: currentStatus || null,
        meta: {
          processingTime: `${processingTime}ms`,
          timestamp: new Date().toISOString()
        }
      }, currentStatus ? 'Current status retrieved successfully' : 'No tracking status found', 200);

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      console.error('[TrackingController.getCurrentStatus] Request failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        params: req.params,
        processingTimeMs: processingTime,
        stack: error instanceof Error ? error.stack : undefined
      });

      if (error instanceof AppError) {
        ApiResponse.error(res, error.message, error.status, error.code, error.details);
      } else {
        ApiResponse.error(res, 'Internal server error occurred while retrieving current status', 500, 'INTERNAL_SERVER_ERROR');
      }
    }
  };

  /**
   * POST /api/v1/tracking/redirect/:grievanceId
   * Redirects a grievance to another admin
   * 
   * @route POST /api/v1/tracking/redirect/:grievanceId
   * @access Private (Admin only)
   */
  redirectGrievance = async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    
    try {
      console.info('[TrackingController.redirectGrievance] Starting request processing', {
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

      // Validate grievanceId parameter
      const paramValidation = GrievanceIdParamSchema.safeParse(req.params);
      if (!paramValidation.success) {
        console.warn('[TrackingController.redirectGrievance] Parameter validation failed:', paramValidation.error.flatten());
        throw new AppError(
          `Invalid grievanceId parameter: ${paramValidation.error.issues.map((i: any) => i.message).join(', ')}`,
          400,
          'VALIDATION_ERROR'
        );
      }

      // Validate request body
      const bodyValidation = RedirectGrievanceSchema.safeParse(req.body);
      if (!bodyValidation.success) {
        console.warn('[TrackingController.redirectGrievance] Body validation failed:', bodyValidation.error.flatten());
        throw new AppError(
          `Validation failed: ${bodyValidation.error.issues.map((i: any) => i.message).join(', ')}`,
          400,
          'VALIDATION_ERROR'
        );
      }

      const { grievanceId } = paramValidation.data;
      const { redirectTo, comment } = bodyValidation.data;

      console.info('[TrackingController.redirectGrievance] Processing redirect request', {
        grievanceId,
        redirectFrom: adminId,
        redirectTo,
        commentLength: comment.length
      });

      // Process the redirect through service layer
      const redirectResult = await this.trackingService.redirectGrievance(
        grievanceId,
        adminId,
        redirectTo,
        comment
      );

      const processingTime = Date.now() - startTime;

      console.info('[TrackingController.redirectGrievance] Request completed successfully', {
        trackingId: redirectResult.id,
        grievanceId,
        processingTimeMs: processingTime
      });

      // Return success response
      res.status(200).json({
        success: true,
        message: 'Grievance redirected successfully',
        data: redirectResult
      });

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      console.error('[TrackingController.redirectGrievance] Request failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        params: req.params,
        body: req.body,
        processingTimeMs: processingTime,
        stack: error instanceof Error ? error.stack : undefined
      });

      if (error instanceof AppError) {
        res.status(error.status).json({
          success: false,
          message: error.message,
          error: {
            code: error.code,
            details: error.details
          }
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Internal server error occurred while redirecting grievance',
          error: {
            code: 'INTERNAL_SERVER_ERROR'
          }
        });
      }
    }
  };
}

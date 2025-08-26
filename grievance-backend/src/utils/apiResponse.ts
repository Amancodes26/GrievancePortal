import { Response } from 'express';

/**
 * Standardized API Response Utility
 * Provides consistent response format across all endpoints
 */
export class ApiResponse {

  /**
   * Send successful response
   * @param res - Express Response object
   * @param data - Response data
   * @param message - Success message
   * @param statusCode - HTTP status code (default: 200)
   */
  static success(
    res: Response, 
    data: any, 
    message: string = 'Request successful', 
    statusCode: number = 200
  ): void {
    res.status(statusCode).json({
      success: true,
      status: statusCode,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send error response  
   * @param res - Express Response object
   * @param message - Error message
   * @param statusCode - HTTP status code (default: 500)
   * @param errorCode - Application error code
   * @param details - Additional error details
   */
  static error(
    res: Response,
    message: string = 'An error occurred',
    statusCode: number = 500,
    errorCode?: string,
    details?: any
  ): void {
    const errorResponse: any = {
      success: false,
      status: statusCode,
      message,
      timestamp: new Date().toISOString()
    };

    if (errorCode) {
      errorResponse.errorCode = errorCode;
    }

    if (details) {
      errorResponse.details = details;
    }

    res.status(statusCode).json(errorResponse);
  }

  /**
   * Send validation error response
   * @param res - Express Response object  
   * @param errors - Validation error details
   * @param message - Error message
   */
  static validationError(
    res: Response,
    errors: any[],
    message: string = 'Validation failed'
  ): void {
    res.status(400).json({
      success: false,
      status: 400,
      message,
      errorCode: 'VALIDATION_ERROR',
      details: errors,
      timestamp: new Date().toISOString()
    });
  }
}

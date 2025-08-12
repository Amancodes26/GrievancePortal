import { Request, Response, NextFunction } from 'express';
import { ErrorResponse } from '../types/global';

// Standard error interface for the application
export interface AppError extends Error {
  status?: number;
  code?: string;
  details?: any;
}

// Enhanced error handler with proper typing and logging
export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log error details for debugging
  console.error('[ERROR]', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  const status = err.status || 500;
  const message = err.message || 'Internal server error';
  const code = err.code || 'INTERNAL_ERROR';

  const errorResponse: ErrorResponse = {
    success: false,
    error: message,
    code
  };

  // Include error details in development mode
  if (process.env.NODE_ENV === 'development') {
    errorResponse.details = {
      stack: err.stack,
      originalError: err
    };
  }

  res.status(status).json(errorResponse);
}

// Async error wrapper to catch errors in async route handlers
export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Custom error classes for different types of errors
export class ValidationError extends Error implements AppError {
  status = 400;
  code = 'VALIDATION_ERROR';
  
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error implements AppError {
  status = 401;
  code = 'AUTHENTICATION_ERROR';
  
  constructor(message: string = 'Authentication failed') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error implements AppError {
  status = 403;
  code = 'AUTHORIZATION_ERROR';
  
  constructor(message: string = 'Access denied') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends Error implements AppError {
  status = 404;
  code = 'NOT_FOUND';
  
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class DatabaseError extends Error implements AppError {
  status = 500;
  code = 'DATABASE_ERROR';
  
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'DatabaseError';
  }
}

// This error handler should be used after all routes and middlewares
// This file contains all project-wide custom type extensions aligned with current models

import { PersonalInfo } from '../models/PersonalInfo';
import { AdminInfo } from '../models/AdminInfo';
import { StudentUser, AdminUser } from './user';
import { DatabaseAdminRole, Department, AdminStatus, StudentStatus } from './common';

// Global type definitions for the grievance portal system
declare global {
  // Environment variables
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    PORT: string;
    DATABASE_URL: string;
    JWT_SECRET: string;
    ADMIN_JWT_SECRET: string;
    BCRYPT_SALT_ROUNDS: string;
    EMAIL_SERVICE?: string;
    EMAIL_USER?: string;
    EMAIL_PASS?: string;
  }

  // Express namespace augmentation (delegated to express/index.d.ts)
  namespace Express {
    interface Request {
      user?: {
        rollNumber: string;
        rollno: string;
        name: string;
        email: string;
        campusid: number;
        role: 'STUDENT';
      };
      
      admin?: {
        AdminId: string;
        AdminID: string;
        Name: string;
        Email: string;
        Role: DatabaseAdminRole;
        Department: Department;
        CampusId?: number;
        IsActive: boolean;
      };

      authenticatedUser?: PersonalInfo | AdminInfo;
      User?: PersonalInfo; // Legacy support
    }
  }
}

// API Response types
export interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  total?: number;
  page?: number;
  limit?: number;
}

export interface ErrorResponse {
  success: false;
  error: string;
  details?: any;
  code?: string;
}

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

// Database pagination types
export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Ensure this file is treated as a module
export {};

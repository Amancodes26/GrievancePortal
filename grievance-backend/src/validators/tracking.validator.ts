import { z } from 'zod';

/**
 * Zod validation schemas for Tracking API
 * Production-grade input validation with comprehensive error messages
 */

// Valid status enums matching database constraints
const AdminStatusEnum = z.enum(['NEW', 'PENDING', 'REDIRECTED', 'RESOLVED', 'REJECTED'], {
  errorMap: () => ({ message: 'AdminStatus must be one of: NEW, PENDING, REDIRECTED, RESOLVED, REJECTED' })
});

const StudentStatusEnum = z.enum(['SUBMITTED', 'UNDER_REVIEW', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'], {
  errorMap: () => ({ message: 'StudentStatus must be one of: SUBMITTED, UNDER_REVIEW, IN_PROGRESS, RESOLVED, REJECTED' })
});

/**
 * Schema for creating a new tracking entry
 */
export const CreateTrackingSchema = z.object({
  grievanceId: z.string()
    .min(1, 'GrievanceId is required')
    .regex(/^GRV-\d{4}-\d{6}$/, 'GrievanceId must match format: GRV-YYYY-NNNNNN'),
  
  responseText: z.string()
    .min(1, 'ResponseText is required')
    .max(2000, 'ResponseText cannot exceed 2000 characters')
    .trim(),
  
  adminStatus: AdminStatusEnum,
  
  studentStatus: StudentStatusEnum,
  
  responseBy: z.string()
    .min(1, 'ResponseBy (AdminId) is required')
    .max(50, 'ResponseBy cannot exceed 50 characters'),
  
  // Optional fields for redirection
  redirectTo: z.string()
    .max(50, 'RedirectTo cannot exceed 50 characters')
    .optional()
    .nullable(),
  
  redirectFrom: z.string()
    .max(50, 'RedirectFrom cannot exceed 50 characters')
    .optional()
    .nullable(),
  
  isRedirect: z.boolean()
    .default(false),
  
  hasAttachments: z.boolean()
    .default(false)
}).refine((data) => {
  // Business rule: If isRedirect is true, redirectTo must be provided
  if (data.isRedirect && !data.redirectTo) {
    return false;
  }
  // Business rule: If adminStatus is REDIRECTED, isRedirect should be true
  if (data.adminStatus === 'REDIRECTED' && !data.isRedirect) {
    return false;
  }
  return true;
}, {
  message: 'When isRedirect is true, redirectTo must be provided. When adminStatus is REDIRECTED, isRedirect must be true.',
  path: ['redirectTo']
});

/**
 * Schema for grievanceId path parameter
 */
export const GrievanceIdParamSchema = z.object({
  grievanceId: z.string()
    .min(1, 'GrievanceId is required')
    .regex(/^GRV-\d{4}-\d{6}$/, 'Invalid GrievanceId format')
});

/**
 * Schema for grievance redirect request
 */
export const RedirectGrievanceSchema = z.object({
  redirectTo: z.string()
    .min(1, 'RedirectTo AdminId is required')
    .max(50, 'RedirectTo cannot exceed 50 characters')
    .regex(/^ADMIN\d+$/, 'RedirectTo must be in format: ADMIN123'),
  
  comment: z.string()
    .min(1, 'Comment is required for redirect')
    .max(2000, 'Comment cannot exceed 2000 characters')
    .trim()
});

/**
 * Type definitions for use in controllers and services
 */
export type CreateTrackingInput = z.infer<typeof CreateTrackingSchema>;
export type GrievanceIdParam = z.infer<typeof GrievanceIdParamSchema>;
export type RedirectGrievanceInput = z.infer<typeof RedirectGrievanceSchema>;

/**
 * Export status enums for service layer usage
 */
export const AdminStatus = {
  NEW: 'NEW',
  PENDING: 'PENDING', 
  REDIRECTED: 'REDIRECTED',
  RESOLVED: 'RESOLVED',
  REJECTED: 'REJECTED'
} as const;

export const StudentStatus = {
  SUBMITTED: 'SUBMITTED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  IN_PROGRESS: 'IN_PROGRESS', 
  RESOLVED: 'RESOLVED',
  REJECTED: 'REJECTED'
} as const;

export type AdminStatus = typeof AdminStatus[keyof typeof AdminStatus];
export type StudentStatus = typeof StudentStatus[keyof typeof StudentStatus];

/**
 * Response type definitions for consistent API responses
 */
export interface TrackingEntry {
  id: number;
  grievanceId: string;
  responseText: string;
  adminStatus: 'NEW' | 'PENDING' | 'REDIRECTED' | 'RESOLVED' | 'REJECTED';
  studentStatus: 'SUBMITTED' | 'UNDER_REVIEW' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';
  responseBy: string;
  responseAt: string;
  redirectTo?: string | null;
  redirectFrom?: string | null;
  isRedirect: boolean;
  hasAttachments: boolean;
  // Additional fields for admin context
  adminName?: string;
  adminRole?: string;
}

export interface TrackingHistoryResponse {
  grievanceId: string;
  entries: TrackingEntry[];
  summary: {
    totalEntries: number;
    currentStatus: {
      admin: string;
      student: string;
    };
    lastUpdated: string;
    createdAt: string;
  };
}

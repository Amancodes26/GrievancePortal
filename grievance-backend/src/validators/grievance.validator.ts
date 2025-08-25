import { z } from 'zod';

/**
 * Validation schemas for Grievance operations using Zod
 * Provides compile-time type safety and runtime validation
 */

// Schema for creating a new grievance
export const CreateGrievanceSchema = z.object({
  rollno: z.string()
    .min(1, 'Roll number is required')
    .max(50, 'Roll number must be less than 50 characters')
    .regex(/^[A-Z0-9]+$/, 'Roll number must contain only alphanumeric characters'),
  
  issueCode: z.number()
    .int('Issue code must be an integer')
    .positive('Issue code must be a positive number'),
  
  campusId: z.number()
    .int('Campus ID must be an integer')
    .positive('Campus ID must be a positive number'),
  
  subject: z.string()
    .min(1, 'Subject is required')
    .max(200, 'Subject must be less than 200 characters')
    .trim(),
  
  description: z.string()
    .min(1, 'Description is required')
    .max(2000, 'Description must be less than 2000 characters')
    .trim(),
  
  hasAttachments: z.boolean()
    .optional()
    .default(false)
});

// Schema for updating a grievance (admin/system only)
export const UpdateGrievanceSchema = z.object({
  subject: z.string()
    .min(1, 'Subject is required')
    .max(200, 'Subject must be less than 200 characters')
    .trim()
    .optional(),
  
  description: z.string()
    .min(1, 'Description is required')
    .max(2000, 'Description must be less than 2000 characters')
    .trim()
    .optional(),
  
  hasAttachments: z.boolean().optional()
});

// Schema for query parameters when fetching grievances
export const GetGrievancesQuerySchema = z.object({
  rollno: z.string().optional(),
  issueCode: z.string().transform(val => val ? parseInt(val, 10) : undefined).optional(),
  campusId: z.string().transform(val => val ? parseInt(val, 10) : undefined).optional(),
  status: z.enum(['NEW', 'PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED', 'REDIRECTED']).optional(),
  page: z.string().transform(val => val ? Math.max(1, parseInt(val, 10)) : 1).optional(),
  limit: z.string().transform(val => val ? Math.min(100, Math.max(1, parseInt(val, 10))) : 10).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'subject']).optional().default('createdAt'),
  sortOrder: z.enum(['ASC', 'DESC']).optional().default('DESC')
});

// Schema for grievance ID parameter
export const GrievanceIdSchema = z.object({
  id: z.string()
    .regex(/^GRV-\d{4}-\d{6}$/, 'Invalid grievance ID format. Expected format: GRV-YYYY-NNNNNN')
});

// Type exports for TypeScript integration
export type CreateGrievanceInput = z.infer<typeof CreateGrievanceSchema>;
export type UpdateGrievanceInput = z.infer<typeof UpdateGrievanceSchema>;
export type GetGrievancesQuery = z.infer<typeof GetGrievancesQuerySchema>;
export type GrievanceIdParam = z.infer<typeof GrievanceIdSchema>;

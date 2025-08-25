import { z } from 'zod';

/**
 * IssueList Validation Schemas
 * Principal Engineer Standards:
 * - Comprehensive input validation
 * - Type safety with Zod
 * - Business rule enforcement
 * - Consistent error messages
 */

// Enum definitions for type safety
export const CategoryEnum = z.enum(['ACADEMIC', 'EXAM', 'OTHER'], {
  errorMap: () => ({ message: 'Category must be one of: ACADEMIC, EXAM, OTHER' })
});

export const IssueLevelEnum = z.enum(['CAMPUS_LEVEL', 'UNIVERSITY_LEVEL'], {
  errorMap: () => ({ message: 'Issue level must be one of: CAMPUS_LEVEL, UNIVERSITY_LEVEL' })
});

// Schema for creating new issue types
export const CreateIssueListSchema = z.object({
  IssueCode: z.number()
    .int('Issue code must be an integer')
    .positive('Issue code must be positive')
    .min(1, 'Issue code must be at least 1')
    .max(99999, 'Issue code must not exceed 99999'),
  
  IssueTitle: z.string()
    .min(3, 'Issue title must be at least 3 characters')
    .max(200, 'Issue title must not exceed 200 characters')
    .trim(),
  
  Category: CategoryEnum,
  
  RequiredAttachments: z.array(z.string().min(1, 'Attachment name cannot be empty'))
    .max(10, 'Cannot specify more than 10 required attachments')
    .default([]),
  
  IssueLevel: IssueLevelEnum
});

// Schema for updating issue types
export const UpdateIssueListSchema = z.object({
  IssueTitle: z.string()
    .min(3, 'Issue title must be at least 3 characters')
    .max(200, 'Issue title must not exceed 200 characters')
    .trim()
    .optional(),
  
  Category: CategoryEnum.optional(),
  
  RequiredAttachments: z.array(z.string().min(1, 'Attachment name cannot be empty'))
    .max(10, 'Cannot specify more than 10 required attachments')
    .optional(),
  
  IssueLevel: IssueLevelEnum.optional(),
  
  IsActive: z.boolean()
    .optional()
});

// Schema for issue code parameter validation
export const IssueCodeParamSchema = z.object({
  code: z.string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val > 0, {
      message: 'Issue code must be a positive integer'
    })
});

// Schema for toggle activation
export const ToggleIssueStatusSchema = z.object({
  IsActive: z.boolean({
    required_error: 'IsActive field is required',
    invalid_type_error: 'IsActive must be a boolean'
  })
});

// Schema for query parameters
export const IssueListQuerySchema = z.object({
  category: CategoryEnum.optional(),
  level: IssueLevelEnum.optional(),
  active: z.string()
    .transform((val) => val === 'true')
    .optional(),
  limit: z.string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val > 0 && val <= 100, {
      message: 'Limit must be between 1 and 100'
    })
    .default('50')
    .optional(),
  offset: z.string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val >= 0, {
      message: 'Offset must be non-negative'
    })
    .default('0')
    .optional()
});

// Type exports for TypeScript
export type CreateIssueListInput = z.infer<typeof CreateIssueListSchema>;
export type UpdateIssueListInput = z.infer<typeof UpdateIssueListSchema>;
export type IssueCodeParam = z.infer<typeof IssueCodeParamSchema>;
export type ToggleIssueStatusInput = z.infer<typeof ToggleIssueStatusSchema>;
export type IssueListQueryInput = z.infer<typeof IssueListQuerySchema>;

// Export category and level enums for reuse
export type CategoryType = z.infer<typeof CategoryEnum>;
export type IssueLevelType = z.infer<typeof IssueLevelEnum>;

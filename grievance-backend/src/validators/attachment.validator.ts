import { z } from 'zod';

/**
 * Zod validation schemas for Attachment API
 * Enterprise-grade file upload validation with security controls
 */

// Allowed MIME types for security
const ALLOWED_MIME_TYPES = [
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  // Images
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/bmp',
  'image/webp',
  // Archives (with caution)
  'application/zip',
  'application/x-zip-compressed',
  'application/x-rar-compressed'
] as const;

// File size limits
export const FILE_SIZE_LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_TOTAL_SIZE_PER_GRIEVANCE: 50 * 1024 * 1024, // 50MB total
  MAX_FILES_PER_GRIEVANCE: 10
} as const;

/**
 * Schema for file upload validation
 */
export const FileUploadSchema = z.object({
  grievanceId: z.string()
    .min(1, 'GrievanceId is required')
    .regex(/^GRV-\d{4}-\d{6}$/, 'GrievanceId must match format: GRV-YYYY-NNNNNN'),
  
  uploadedBy: z.string()
    .min(1, 'UploadedBy is required')
    .max(50, 'UploadedBy cannot exceed 50 characters'),
  
  // File metadata validation (populated from multer)
  originalname: z.string()
    .min(1, 'Original filename is required')
    .max(255, 'Filename cannot exceed 255 characters')
    .refine(
      (filename) => {
        // Check for dangerous file patterns
        const dangerousPatterns = [
          /\.(exe|bat|cmd|com|pif|scr|vbs|js|jar|app|deb|pkg|dmg)$/i,
          /\.\./,  // Directory traversal
          /[<>:"|?*]/,  // Invalid filename characters
          /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i  // Reserved Windows names
        ];
        return !dangerousPatterns.some(pattern => pattern.test(filename));
      },
      'Filename contains invalid or potentially dangerous characters'
    ),
  
  mimetype: z.string()
    .refine(
      (mimeType) => ALLOWED_MIME_TYPES.includes(mimeType as any),
      `File type not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`
    ),
  
  size: z.number()
    .min(1, 'File must not be empty')
    .max(FILE_SIZE_LIMITS.MAX_FILE_SIZE, `File size cannot exceed ${FILE_SIZE_LIMITS.MAX_FILE_SIZE / (1024 * 1024)}MB`),
  
  buffer: z.instanceof(Buffer, { message: 'File buffer is required' })
});

/**
 * Schema for grievance ID parameter validation
 */
export const GrievanceIdParamSchema = z.object({
  grievanceId: z.string()
    .regex(/^GRV-\d{4}-\d{6}$/, 'GrievanceId must match format: GRV-YYYY-NNNNNN')
});

/**
 * Schema for attachment ID parameter validation
 */
export const AttachmentIdParamSchema = z.object({
  id: z.string()
    .regex(/^\d+$/, 'Attachment ID must be a valid number')
    .transform((val) => parseInt(val, 10))
});

/**
 * Schema for attachment list query parameters
 */
export const AttachmentListQuerySchema = z.object({
  page: z.string()
    .regex(/^\d+$/, 'Page must be a valid number')
    .transform((val) => parseInt(val, 10))
    .refine((val) => val >= 1, 'Page must be at least 1')
    .default('1'),
  
  limit: z.string()
    .regex(/^\d+$/, 'Limit must be a valid number') 
    .transform((val) => parseInt(val, 10))
    .refine((val) => val >= 1 && val <= 100, 'Limit must be between 1 and 100')
    .default('20'),
  
  mimeType: z.string()
    .refine(
      (mimeType) => ALLOWED_MIME_TYPES.includes(mimeType as any),
      'Invalid MIME type filter'
    )
    .optional(),
  
  sortBy: z.enum(['uploadedAt', 'fileName', 'fileSize']).default('uploadedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

/**
 * Export types for service layer usage
 */
export type FileUploadInput = z.infer<typeof FileUploadSchema>;
export type GrievanceIdParam = z.infer<typeof GrievanceIdParamSchema>;
export type AttachmentIdParam = z.infer<typeof AttachmentIdParamSchema>;
export type AttachmentListQuery = z.infer<typeof AttachmentListQuerySchema>;

/**
 * Response type definitions for consistent API responses
 */
export interface AttachmentMetadata {
  id: number;
  attachmentId: string;
  grievanceId: string;
  fileName: string;
  originalFileName: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: string;
  uploadedBy: string;
  deletedAt?: string | null;
  // Additional fields for admin context
  uploaderName?: string;
  uploaderRole?: string;
}

export interface AttachmentListResponse {
  grievanceId: string;
  attachments: AttachmentMetadata[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    currentPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  summary: {
    totalFiles: number;
    totalSize: number;
    totalSizeMB: number;
    fileTypes: string[];
    uniqueFileTypes: number;
  };
}

export interface AttachmentUploadResponse {
  attachment: AttachmentMetadata;
  meta: {
    processingTime: string;
    savedToPath: string;
    fileHash?: string;
  };
}

/**
 * File security validation utilities
 */
export const FileSecurityUtils = {
  /**
   * Generate safe filename to prevent path traversal and naming conflicts
   */
  generateSafeFileName(originalName: string, grievanceId: string, uploadedBy: string): string {
    const timestamp = Date.now();
    const extension = originalName.split('.').pop()?.toLowerCase() || '';
    const baseName = originalName
      .replace(/\.[^/.]+$/, '') // Remove extension
      .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace invalid chars
      .substring(0, 100); // Limit length
    
    return `${grievanceId}_${uploadedBy}_${timestamp}_${baseName}.${extension}`;
  },

  /**
   * Validate file content matches declared MIME type (basic check)
   */
  validateFileSignature(buffer: Buffer, declaredMimeType: string): boolean {
    const fileSignatures: Record<string, number[][]> = {
      'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
      'image/jpeg': [[0xFF, 0xD8, 0xFF]], // JPEG
      'image/png': [[0x89, 0x50, 0x4E, 0x47]], // PNG
      'application/zip': [[0x50, 0x4B, 0x03, 0x04], [0x50, 0x4B, 0x05, 0x06]], // ZIP
      'image/gif': [[0x47, 0x49, 0x46, 0x38]], // GIF
    };

    const signatures = fileSignatures[declaredMimeType];
    if (!signatures) return true; // Skip validation for unknown types

    return signatures.some(signature => 
      signature.every((byte, index) => buffer[index] === byte)
    );
  },

  /**
   * Calculate file hash for deduplication and integrity
   */
  calculateFileHash(buffer: Buffer): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(buffer).digest('hex');
  },

  /**
   * Get human-readable file size
   */
  formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
};

/**
 * Export allowed MIME types for middleware configuration
 */
export { ALLOWED_MIME_TYPES };

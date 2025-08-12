// Grievance status constants aligned with Tracking model
export const ADMIN_STATUS = ['NEW', 'PENDING', 'REDIRECTED', 'RESOLVED', 'REJECTED'] as const;
export type AdminStatus = typeof ADMIN_STATUS[number];

export const STUDENT_STATUS = ['SUBMITTED', 'UNDER_REVIEW', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'] as const;
export type StudentStatus = typeof STUDENT_STATUS[number];

// Legacy status for backward compatibility
export const STATUS = ['PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED', 'RETURN'] as const;
export type Status = typeof STATUS[number];

// Admin roles aligned with AdminInfo model
export const ADMIN_ROLES = ['DEPT_ADMIN', 'CAMPUS_ADMIN', 'SUPER_ADMIN'] as const;
export type AdminRole = typeof ADMIN_ROLES[number];

// Department types aligned with AdminInfo model
export const DEPARTMENTS = ['ACADEMIC', 'EXAM', 'CAMPUS', 'SYSTEM'] as const;
export type Department = typeof DEPARTMENTS[number];

// Priority levels (if still needed)
export const PRIORITY = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type Priority = typeof PRIORITY[number];

// Grievance ID prefixes
export const GRIEVANCE_ID_PREFIX = 'ISSUE-';
export const CURRENT_YEAR = new Date().getFullYear();
export const CURRENT_MONTH = String(new Date().getMonth() + 1).padStart(2, '0');

// File upload constants
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_FILE_TYPES = [
  'image/jpeg', 'image/png', 'image/gif',
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
] as const;

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
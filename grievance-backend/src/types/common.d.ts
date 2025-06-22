// Standardized role definitions for the entire system
export type AdminRole = 'academic' | 'exam' | 'campus' | 'superadmin';
export type UserRole = 'STUDENT' | 'DEPT_ADMIN' | 'CAMPUS_ADMIN' | 'SUPER_ADMIN';

// Campus information
export interface CampusInfo {
  CampusId: number;
  CampusCode: string;
  CampusName: string;
  IsMainCampus?: boolean;
}

// Admin information with campus
export interface AdminInfo {
  AdminId: string;
  Name: string;
  Email: string;
  Role: AdminRole;
  CampusId?: number;
  IsActive: boolean;
  CreatedAt: Date;
  UpdatedAt: Date;
}

// Admin campus assignment
export interface AdminCampusAssignment {
  id: number;
  admin_id: string;
  campus_id: number;
  department: AdminRole;
  assigned_at: Date;
  is_primary: boolean;
}

// Audit log entry
export interface AdminAuditLog {
  id: number;
  admin_id: string;
  action_type: string;
  action_details: any;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
export interface ErrorResponse {
  success: false;
  error: string;
}
// Admin audit log interface for tracking admin actions
export interface AdminAuditLog {
  id?: number;
  AdminId: string; // Foreign key reference to Admin.AdminId
  Action_Type: string;
  Email: string;
  AccessedResource: string;
  IP_Address: string;
  IsActive: boolean;
  Timestamp?: Date;
  Query?: string;
  Role: 'DEPT_ADMIN' | 'CAMPUS_ADMIN' | 'SUPER_ADMIN';
}

// Interface for creating new audit log entries
export interface CreateAdminAuditLogData {
  AdminId: string;
  Action_Type: string;
  Email: string;
  AccessedResource: string;
  IP_Address: string;
  IsActive: boolean;
  Query?: string;
  Role: 'DEPT_ADMIN' | 'CAMPUS_ADMIN' | 'SUPER_ADMIN';
}

// Interface for updating audit log entries (typically read-only, but included for completeness)
export interface UpdateAdminAuditLogData {
  IsActive?: boolean;
}

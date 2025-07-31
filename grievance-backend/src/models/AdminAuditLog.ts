// Admin audit log interface for tracking admin actions
export interface AdminAuditLog {
  id?: number;
  adminid: string; // Foreign key reference to AdminInfo.AdminID
  action_type: string;
  email: string;
  accessedresource: string;
  ip_address: string;
  isactive: boolean;
  timestamp?: Date;
  query?: string;
  role: 'DEPT_ADMIN' | 'CAMPUS_ADMIN' | 'SUPER_ADMIN';
}

// Interface for creating new audit log entries
export interface CreateAdminAuditLogData {
  adminid: string;
  action_type: string;
  email: string;
  accessedresource: string;
  ip_address: string;
  isactive: boolean;
  query?: string;
  role: 'DEPT_ADMIN' | 'CAMPUS_ADMIN' | 'SUPER_ADMIN';
}

// Interface for updating audit log entries (typically read-only, but included for completeness)
export interface UpdateAdminAuditLogData {
  isactive?: boolean;
}

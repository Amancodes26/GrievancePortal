// Standardized role definitions aligned with current models
export type DatabaseAdminRole = 'DEPT_ADMIN' | 'CAMPUS_ADMIN' | 'SUPER_ADMIN'; // For database storage
export type UserRole = 'STUDENT' | 'DEPT_ADMIN' | 'CAMPUS_ADMIN' | 'SUPER_ADMIN';
export type Department = 'ACADEMIC' | 'EXAM' | 'CAMPUS' | 'SYSTEM'; // Standardized department names

// Grievance status types from Tracking model
export type AdminStatus = 'NEW' | 'PENDING' | 'REDIRECTED' | 'RESOLVED' | 'REJECTED';
export type StudentStatus = 'SUBMITTED' | 'UNDER_REVIEW' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';

// Campus information aligned with CampusInfo model
export interface CampusInfo {
  campusid: number;
  campuscode: string;
  campusname: string;
  createdat?: Date;
  updatedat?: Date;
}

// Admin information aligned with AdminInfo model
export interface AdminInfo {
  ID?: number;
  AdminID: string;
  Name: string;
  Email: string;
  Phone?: string;
  Role: DatabaseAdminRole;
  Department: Department;
  IsVerified?: boolean;
  IsActive: boolean;
  LastLogin?: Date;
  CreatedAt?: Date;
  UpdatedAt?: Date;
  CampusId?: number;
}

// Student information aligned with PersonalInfo model  
export interface PersonalInfo {
  rollno: string;
  name: string;
  email: string;
  phone?: string;
  campusid: number;
  programid: number;
  academicinfoid: number;
  isactive: boolean;
  createdat?: Date;
  updatedat?: Date;
}

// Grievance information aligned with Grievance model
export interface GrievanceInfo {
  id?: number;
  grievanceId: string;
  rollno: string;
  campusId: number;
  issueCode: number;
  subject: string;
  description: string;
  hasAttachments: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Tracking information aligned with Tracking model
export interface TrackingInfo {
  id?: number;
  grievanceId: string;
  responseText: string;
  adminStatus: AdminStatus;
  studentStatus: StudentStatus;
  responseBy: string;
  responseAt: Date;
  redirectTo?: string;
  redirectFrom?: string;
  isRedirect: boolean;
  hasAttachments: boolean;
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
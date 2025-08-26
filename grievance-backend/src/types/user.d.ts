import { DatabaseAdminRole, Department } from './common';

// Student user interface aligned with PersonalInfo model
export interface StudentUser {
  rollno: string;
  name: string;
  email: string;
  phone?: string;
  campusid: number;
  programid: number;
  academicinfoid: number;
  role: 'STUDENT';
  isactive: boolean;
}

// Admin user interface aligned with AdminInfo model
export interface AdminUser {
  adminId: string;
  name: string;
  email: string;
  phone?: string;
  role: DatabaseAdminRole;
  department: Department;
  campusId?: number;
  isVerified?: boolean;
  isActive: boolean;
  lastLogin?: Date;
}

// Generic user interface for authentication
export interface User {
  id: string;
  rollNumber?: string; // For students
  adminId?: string;    // For admins
  name: string;
  email: string;
  role: 'STUDENT' | 'DEPT_ADMIN' | 'CAMPUS_ADMIN' | 'SUPER_ADMIN';
  campus?: string;
  department?: Department;
  campusId?: number;
}

// User with authentication token
export interface UserWithToken extends User {
  token: string;
}

// JWT payload for students
export interface StudentJWTPayload {
  rollno: string;
  name: string;
  email: string;
  campusid: number;
  role: 'STUDENT';
  iat?: number;
  exp?: number;
}

// JWT payload for admins
export interface AdminJWTPayload {
  adminId: string;
  name: string;
  email: string;
  role: DatabaseAdminRole;
  department: Department;
  campusId?: number;
  iat?: number;
  exp?: number;
}
import { StudentUser, AdminUser } from '../user';
import { PersonalInfo } from '../../models/PersonalInfo';
import { AdminInfo } from '../../models/AdminInfo';
import { DatabaseAdminRole, Department } from '../common';

// Unified Express Request augmentation aligned with current models
declare global {
  namespace Express {
    interface Request {
      // Student authentication
      user?: {
        rollNumber: string;
        rollno: string;  // Alternative field name for backward compatibility
        name: string;
        email: string;
        campusid: number;
        role: 'STUDENT';
      };
      
      // Admin authentication
      admin?: {
        AdminId: string;
        AdminID: string;  // Alternative field name for database compatibility
        Name: string;
        Email: string;
        Role: DatabaseAdminRole;
        Department: Department;
        CampusId?: number;
        IsActive: boolean;
      };

      // Full user object after authentication
      authenticatedUser?: PersonalInfo | AdminInfo;
      
      // Legacy support
      User?: PersonalInfo;
    }
  }
}

// AuthenticatedRequest type for controllers
export interface AuthenticatedRequest extends Request {
  user?: {
    rollNumber: string;
    rollno: string;
    name: string;
    email: string;
    campusid: number;
    role: 'STUDENT';
  };
  admin?: {
    AdminId: string;
    AdminID: string;
    Name: string;
    Email: string;
    Role: DatabaseAdminRole;
    Department: Department;
    CampusId?: number;
    IsActive: boolean;
  };
}

// This file extends the Express Request interface to include user and admin properties
// that contain authentication information aligned with our current models.
// This allows us to access the user/admin information in our route handlers and middleware after JWT verification.
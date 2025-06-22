import { User } from '../user';
import { PersonalInfo } from '../../models/PersonalInfo';

// Unified Express Request augmentation
declare global {
  namespace Express {
    interface Request {
      user?: {
        rollNumber: string;
        name: string;
        email: string;
        role?: string;
      };
      admin?: {
        AdminId: string;
        Name: string;
        Email: string;
        Role: string;
        CampusId?: number;
        Department?: string;
        IsActive?: boolean;
      };
      User?: PersonalInfo; // Use correct type for User
    }
  }
}
// This file extends the Express Request interface to include user and admin properties
// that contain authentication information. This allows us to access the user/admin
// information in our route handlers and middleware after JWT verification.
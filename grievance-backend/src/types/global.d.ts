// This file contains all project-wide custom type extensions

import { PersonalInfo } from '../models/PersonalInfo';
import { User as UserType } from './user';

// Express namespace augmentation
declare global {
  namespace Express {
    // Extend the Express Request interface
    interface Request {
      // User information set by authentication middleware
      user?: {
        rollNumber: string;
        name: string;
        email: string;
        role?: string;
      };
      
      // Full user object set by authentication middleware
      User?: PersonalInfo;
    }
  }
}

// Ensure this file is treated as a module
export {};

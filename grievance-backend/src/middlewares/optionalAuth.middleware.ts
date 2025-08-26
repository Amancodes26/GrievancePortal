import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

/**
 * Optional authentication middleware
 * Attempts to authenticate user or admin if token is provided,
 * but allows request to proceed even if no token or invalid token
 * 
 * Sets req.user or req.admin if authentication succeeds
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "") || req.cookies?.jwtToken;
    
    if (!token) {
      // No token provided, allow request to proceed without authentication
      console.log('[optionalAuth] No token provided, proceeding without authentication');
      return next();
    }

    // Try to verify the token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      
      // Check if it's a user token (has studentId)
      if (decoded.studentId) {
        console.log('[optionalAuth] Valid user token detected');
        (req as any).user = {
          studentId: decoded.studentId,
          email: decoded.email
        };
        return next();
      }
      
      // Check if it's an admin token (has adminId)
      if (decoded.adminId) {
        console.log('[optionalAuth] Valid admin token detected');
        
        // For now, trust the token without database verification
        (req as any).admin = {
          AdminId: decoded.adminId,
          email: decoded.email,
          role: decoded.role
        };
        console.log('[optionalAuth] Admin authentication successful');
        return next();
      }
      
      // Token doesn't match expected format, proceed without auth
      console.log('[optionalAuth] Token format not recognized, proceeding without auth');
      return next();
      
    } catch (jwtError) {
      // Invalid token, but we allow the request to proceed
      console.log('[optionalAuth] Invalid token provided, proceeding without authentication');
      return next();
    }
    
  } catch (error) {
    console.error('[optionalAuth] Unexpected error in optional auth:', error);
    // Even on error, allow request to proceed
    return next();
  }
};

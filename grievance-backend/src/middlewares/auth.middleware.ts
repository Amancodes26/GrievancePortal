import { Request, Response, NextFunction } from 'express';
import { verifyJWT } from './userAuth.middleware';
import { verifyAdminJWT } from './adminAuth.middleware';

/**
 * Middleware that allows either user or admin authentication
 * This is useful for routes that should be accessible by both users and admins
 */
export const verifyUserOrAdminJWT = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // First try to verify as user
  let userAuthSuccess = false;
  let adminAuthSuccess = false;

  // Create a mock response object to capture the auth result
  const mockRes = {
    status: () => mockRes,
    json: () => mockRes,
  } as any;

  try {
    await verifyJWT(req, mockRes, () => {
      userAuthSuccess = true;
    });
  } catch (error) {
    // User auth failed, ignore and try admin auth
  }

  if (userAuthSuccess) {
    return next();
  }

  // If user auth failed, try admin auth
  try {
    await verifyAdminJWT(req, mockRes, () => {
      adminAuthSuccess = true;
    });
  } catch (error) {
    // Admin auth also failed
  }

  if (adminAuthSuccess) {
    return next();
  }

  // Both auth methods failed
  res.status(403).json({
    message: "Authentication required - please provide valid user or admin JWT token",
    status: 403,
    success: false,
  });
};

/**
 * Middleware that requires admin authentication specifically
 * This is an alias to verifyAdminJWT for clarity in routes
 */
export const requireAdminAuth = verifyAdminJWT;

/**
 * Middleware that requires user authentication specifically  
 * This is an alias to verifyJWT for clarity in routes
 */
export const requireUserAuth = verifyJWT;

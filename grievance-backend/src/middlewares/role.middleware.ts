import { Request, Response, NextFunction } from 'express';

export const permit = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Check both req.user (for students) and req.admin (for admins)
    const userRole = req.user?.role;
    const adminRole = req.admin?.role;
    const currentRole = userRole || adminRole;
    
    if (!currentRole || !allowedRoles.includes(currentRole)) {
      res.status(403).json({ 
        message: 'Access denied', 
        requiredRoles: allowedRoles,
        currentRole: currentRole || 'none'
      });
      return;
    }
    next();
  };
};

export const isAdmin = (req: Request, res: Response, next: NextFunction): void => {
  const adminRole = req.admin?.role;
  
  if (!adminRole || adminRole !== 'superadmin') {
    res.status(403).json({ 
      message: 'Access denied - Super Admin role required',
      currentRole: adminRole || 'none'
    });
    return;
  }
  next();
};

export const isDeptAdmin = (req: Request, res: Response, next: NextFunction): void => {
  const adminRole = req.admin?.role;
  
  if (!adminRole || !['deptadmin', 'superadmin'].includes(adminRole)) {
    res.status(403).json({ 
      message: 'Access denied - Department Admin or Super Admin role required',
      currentRole: adminRole || 'none'
    });
    return;
  }
  next();
};
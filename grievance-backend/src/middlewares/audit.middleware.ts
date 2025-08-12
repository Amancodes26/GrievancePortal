import { Request, Response, NextFunction } from 'express';
import { SuperAdminService } from '../services/superAdmin.service';
import { DatabaseAdminRole } from '../types/common';

interface AuditConfig {
  actionType: string;
  includeBody?: boolean;
  includeParams?: boolean;
  includeQuery?: boolean;
  customDetails?: (req: Request, res: Response) => any;
}

export const createAuditLogger = (config: AuditConfig) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const originalSend = res.send;
    
    // Override res.send to capture response
    res.send = function(data: any) {
      // Restore original send
      res.send = originalSend;
      
      // Log the action asynchronously (don't block response)
      logActionAsync(req, res, config, data);
      
      // Send the response
      return originalSend.call(this, data);
    };
    
    next();
  };
};

async function logActionAsync(req: Request, res: Response, config: AuditConfig, responseData: any) {
  try {
    const adminId = req.admin?.AdminId || req.user?.rollNumber || 'unknown';
    
    let actionDetails: any = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      timestamp: new Date().toISOString()
    };
    
    // Include request body if configured
    if (config.includeBody && req.body) {
      actionDetails.body = sanitizeBody(req.body);
    }
    
    // Include URL parameters if configured
    if (config.includeParams && req.params) {
      actionDetails.params = req.params;
    }
    
    // Include query parameters if configured
    if (config.includeQuery && req.query) {
      actionDetails.query = req.query;
    }
    
    // Include custom details if provided
    if (config.customDetails) {
      const customDetails = config.customDetails(req, res);
      if (customDetails) {
        actionDetails.custom = customDetails;
      }
    }
    
    // Include response data for successful operations
    if (res.statusCode >= 200 && res.statusCode < 300) {
      try {
        const response = typeof responseData === 'string' ? JSON.parse(responseData) : responseData;
        if (response && response.success) {
          actionDetails.response = {
            success: response.success,
            message: response.message
          };
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }
    
    // Include IP address
    actionDetails.ipAddress = req.ip || req.connection.remoteAddress;
    actionDetails.userAgent = req.get('User-Agent');
    
    await SuperAdminService.logAdminAction({
      adminId,
      actionType: config.actionType,
      actionDetails,
      ipAddress: actionDetails.ipAddress,
      email: req.admin?.Email || 'unknown',
      accessedResource: req.originalUrl,
      role: req.admin?.Role || 'DEPT_ADMIN'
    });
    
  } catch (error) {
    // Don't let audit logging errors affect the main application
    console.error('Audit logging error:', error);
  }
}

// Sanitize sensitive data from request body
function sanitizeBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }
  
  const sanitized = { ...body };
  
  // Remove sensitive fields
  const sensitiveFields = ['password', 'token', 'jwtToken', 'otp'];
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  return sanitized;
}

// Predefined audit loggers
export const auditGrievanceCreation = createAuditLogger({
  actionType: 'GRIEVANCE_CREATED',
  includeBody: true,
  customDetails: (req) => ({
    studentRollNo: req.user?.rollNumber,
    campus: req.body?.campus
  })
});

export const auditGrievanceResponse = createAuditLogger({
  actionType: 'GRIEVANCE_RESPONSE_ADDED',
  includeBody: true,
  includeParams: true,
  customDetails: (req) => ({
    adminId: req.admin?.AdminId,
    grievanceId: req.params?.grievanceId
  })
});

export const auditGrievanceRedirect = createAuditLogger({
  actionType: 'GRIEVANCE_REDIRECTED',
  includeBody: true,
  includeParams: true,
  customDetails: (req) => ({
    adminId: req.admin?.AdminId,
    grievanceId: req.params?.grievanceId,
    targetDepartment: req.body?.target_department,
    targetCampus: req.body?.target_campus_id
  })
});

export const auditAdminCreation = createAuditLogger({
  actionType: 'ADMIN_CREATED',
  includeBody: true,
  customDetails: (req) => ({
    createdBy: req.admin?.AdminId || req.user?.rollNumber,
    newAdminRole: req.body?.role,
    newAdminCampus: req.body?.campusId
  })
});

export const auditAdminLogin = createAuditLogger({
  actionType: 'ADMIN_LOGIN',
  includeBody: false, // Don't log credentials
  customDetails: (req) => ({
    email: req.body?.email,
    success: true
  })
});

export const auditSystemAccess = createAuditLogger({
  actionType: 'SYSTEM_ACCESS',
  includeQuery: true,
  customDetails: (req) => ({
    adminId: req.admin?.AdminId,
    accessedResource: req.path
  })
}); 
import { getPool } from "../db";
import ConnectionManager from '../db/connectionManager';
import * as grievanceService from './grievance.service';
import { SuperAdminService } from './superAdmin.service';
import { Department, DatabaseAdminRole } from '../types/common';
import { TrackingQueries } from '../db/queries';

export class DeptAdminService {
    // Get department grievances with campus filtering
  static async getDepartmentGrievances(department: Department, campusId?: number): Promise<any[]> {
    let query = `
      SELECT 
        g.*, 
        si.fullname as student_name,
        ci.campuscode, ci.campusname,
        COUNT(DISTINCT t.trackingid) as tracking_count,
        COUNT(DISTINCT a.id) as attachment_count
      FROM grievance g
      LEFT JOIN studentinfo si ON g.rollno = si.rollno
      LEFT JOIN campusinfo ci ON g.campusid = ci.campusid
      LEFT JOIN tracking t ON g.grievanceid = t.grievanceid
      LEFT JOIN attachment a ON g.grievanceid = a.grievanceid
      WHERE g.issuecode LIKE $1
    `;
    
    const params: any[] = [`${department.toUpperCase()}%`];
    
    if (campusId) {
      query += ' AND g.campusid = $2';
      params.push(campusId);
    }
    
    query += `
      GROUP BY g.id, g.grievanceid, g.rollno, g.campusid, g.issuecode, g.subject, g.description, g.hasattachments, g.createdat, g.updatedat, si.fullname, ci.campuscode, ci.campusname
      ORDER BY g.createdat DESC
    `;
    
    const result = await ConnectionManager.query(query, params);
    return result.rows;
  }
  // Enhanced redirection with campus support
  static async redirectGrievance(
    grievanceId: string, 
    targetDepartment: Department, 
    options: {
      redirectReason: string;
      note?: string;
      adminId: string;
      adminCampusId?: number;
    },
    targetCampusId?: number
  ): Promise<any> {
    
    return await ConnectionManager.transaction(async (client) => {
      // Get the grievance
      const grievance = await grievanceService.getGrievanceByGrievanceId(grievanceId);
      if (!grievance) {
        throw new Error('Grievance not found');
      }
      
      // Determine target campus
      let finalTargetCampusId = targetCampusId;
      let isMainCampusRedirect = false;
      
      if (!targetCampusId) {
        // If no specific campus, redirect to main campus (DSEU Dwarka)
        finalTargetCampusId = SuperAdminService.getMainCampusId();
        isMainCampusRedirect = true;
      }
      
      // Update grievance issue code to reflect new department
      const newIssueCode = `${targetDepartment.toUpperCase()}_${Date.now()}`;
      await grievanceService.updateGrievanceByGrievanceId(grievanceId, { 
        issuecode: newIssueCode
      });
      
      // Create tracking entry for redirection
      const trackingText = isMainCampusRedirect 
        ? `REDIRECTED to ${targetDepartment.toUpperCase()} department at MAIN CAMPUS (DSEU Dwarka): ${options.redirectReason}`
        : `REDIRECTED to ${targetDepartment.toUpperCase()} department: ${options.redirectReason}`;
      
      await ConnectionManager.query(TrackingQueries.CREATE, [
        grievanceId,
        'redirected', // AdminStatus
        'in_progress', // StudentStatus
        'redirection', // Stage
        options.adminId, // AdminId
        null, // AssignedTo (will be assigned later)
        trackingText + (options.note ? ` Note: ${options.note}` : '')
      ]);
      
      // Log the action
      await SuperAdminService.logAdminAction({
        adminId: options.adminId,
        actionType: 'GRIEVANCE_REDIRECT',
        email: 'admin@grievance.system', // TODO: Get actual admin email
        accessedResource: `grievance/${grievanceId}`,
        role: 'DEPT_ADMIN' as DatabaseAdminRole,
        actionDetails: {
          grievanceId,
          targetDepartment,
          targetCampusId: finalTargetCampusId,
          isMainCampusRedirect,
          redirectReason: options.redirectReason
        }
      });
      
      return {
        target_department: targetDepartment,
        target_campus_id: finalTargetCampusId,
        is_main_campus_redirect: isMainCampusRedirect,
        status: 'redirected'
      };
    });
  }

  // Get department statistics with campus filtering
  static async getDepartmentStats(department: Department, campusId?: number): Promise<any> {
    let query = `
      SELECT 
        COUNT(*) as total_grievances,
        COUNT(CASE WHEN t.adminstatus = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN t.adminstatus = 'in_progress' THEN 1 END) as in_progress,
        COUNT(CASE WHEN t.adminstatus = 'resolved' THEN 1 END) as resolved,
        COUNT(CASE WHEN t.adminstatus = 'rejected' THEN 1 END) as rejected,
        AVG(EXTRACT(EPOCH FROM (NOW() - g.createdat))/86400) as avg_resolution_days
      FROM grievance g
      LEFT JOIN campusinfo c ON g.campusid = c.campusid
      LEFT JOIN tracking t ON g.grievanceid = t.grievanceid
      WHERE g.issuecode LIKE $1
    `;
    
    const params: any[] = [`${department.toUpperCase()}%`];
    
    if (campusId) {
      query += ' AND g.campusid = $2';
      params.push(campusId.toString());
    }
    
    const result = await ConnectionManager.query(query, params);
    const stats = result.rows[0];
    
    // Get monthly stats for recent 6 months
    let monthlyQuery = `
      SELECT 
        TO_CHAR(g.createdat, 'YYYY-MM') as month,
        COUNT(*) as submitted,
        COUNT(CASE WHEN t.adminstatus = 'resolved' THEN 1 END) as resolved
      FROM grievance g
      LEFT JOIN campusinfo c ON g.campusid = c.campusid
      LEFT JOIN tracking t ON g.grievanceid = t.grievanceid
      WHERE g.issuecode LIKE $1
        AND g.createdat >= NOW() - INTERVAL '6 months'
    `;
    
    const monthlyParams = [`${department.toUpperCase()}%`];
    if (campusId) {
      monthlyQuery += ' AND g.campusid = $2';
      monthlyParams.push(campusId.toString());
    }
    
    const monthlyResult = await ConnectionManager.query(monthlyQuery + ' GROUP BY month ORDER BY month DESC', monthlyParams);
    
    return {
      total_grievances: parseInt(stats.total_grievances),
      pending: parseInt(stats.pending),
      in_progress: parseInt(stats.in_progress),
      resolved: parseInt(stats.resolved),
      rejected: parseInt(stats.rejected),
      average_resolution_days: parseFloat(stats.avg_resolution_days || '0'),
      monthly_trends: monthlyResult.rows
    };
  }

  // Get campus-specific department admins
  static async getCampusDepartmentAdmins(campusId: number, department: Department): Promise<any[]> {
    return SuperAdminService.getDepartmentAdminsByCampus(campusId, department);
  }

  // Get main campus department admins
  static async getMainCampusDepartmentAdmins(department: Department): Promise<any[]> {
    return SuperAdminService.getMainCampusDepartmentAdmins(department);
  }

  // Validate admin access to grievance
  static async validateAdminAccess(
    adminId: string, 
    grievanceId: string, 
    department: Department
  ): Promise<boolean> {
    // Get admin info
    const adminResult = await getPool().query(
      'SELECT Role, CampusId FROM Admin WHERE AdminId = $1 AND IsActive = true',
      [adminId]
    );
    
    if (adminResult.rows.length === 0) {
      return false;
    }
    
    const admin = adminResult.rows[0];
    
    // Super admin has access to everything
    if (admin.Role === 'superadmin') {
      return true;
    }
    
    // Department admin can only access their department
    if (admin.Role !== department) {
      return false;
    }
    
    // Get grievance info
    const grievance = await grievanceService.getGrievanceByGrievanceId(grievanceId);
    if (!grievance) {
      return false;
    }
    
    // If admin has campus assignment, check campus match
    if (admin.CampusId) {
      return admin.CampusId === grievance.campusid;
    }
    
    // If no campus assignment, allow access (system-wide admin)
    return true;
  }

  // Get admin's assigned campuses
  static async getAdminCampuses(adminId: string): Promise<any[]> {
    const result = await ConnectionManager.query(`
      SELECT 
        aca.campusid,
        c.campuscode,
        c.campusname,
        aca.department,
        aca.isprimary
      FROM adminauditlog aca
      JOIN campusinfo c ON aca.campusid = c.campusid
      WHERE aca.adminid = $1
      ORDER BY aca.isprimary DESC, c.campusname
    `, [adminId]);
    
    return result.rows;
  }
} 
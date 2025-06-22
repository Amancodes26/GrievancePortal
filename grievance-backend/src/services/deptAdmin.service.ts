import { getPool } from "../db";
import ConnectionManager from '../db/connectionManager';
import * as grievanceService from './grievance.service';
import * as responseService from './response.service';
import * as historyService from './history.service';
import { SuperAdminService } from './superAdmin.service';
import { AdminRole } from '../types/common';
import { STATUS, PRIORITY, Priority, Status } from '../constants/grievanceConstants';

export class DeptAdminService {
    // Get department grievances with campus filtering
  static async getDepartmentGrievances(department: AdminRole, campusId?: number): Promise<any[]> {
    let query = `
      SELECT 
        g.*, 
        p.Name as student_name,
        c.CampusCode, c.CampusName,
        array_agg(DISTINCT r.id) as response_ids,
        array_agg(DISTINCT gh.Id) as history_ids
      FROM Grievance g
      LEFT JOIN PersonalInfo p ON g.RollNo = p.RollNo
      LEFT JOIN CampusInfo c ON g.Campus = c.CampusCode
      LEFT JOIN Response r ON g.id = r.Issuse_Id
      LEFT JOIN GrievanceHistory gh ON g.id = gh.Issuse_Id
      WHERE g.Issuse_type = $1
    `;
    
    const params: any[] = [department.toUpperCase()];
    
    if (campusId) {
      query += ' AND c.CampusId = $2';
      params.push(campusId);
    }
    
    query += `
      GROUP BY g.id, p.Name, c.CampusCode, c.CampusName
      ORDER BY g.Date DESC
    `;
    
    const result = await ConnectionManager.query(query, params);
    return result.rows;
  }
  // Enhanced redirection with campus support
  static async redirectGrievance(
    grievanceId: string, 
    targetDepartment: AdminRole, 
    options: {
      redirectReason: string;
      priority?: Priority;
      note?: string;
      adminId: string;
      adminCampusId?: number;
    },
    targetCampusId?: number
  ): Promise<any> {
    
    return await ConnectionManager.transaction(async (client) => {
      // Get the grievance
      const grievance = await grievanceService.getGrievanceByIssueId(grievanceId);
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
      
      // Update grievance status
      await grievanceService.updateGrievanceByIssueId(grievanceId, { 
        status: 'IN_PROGRESS' 
      });
      
      // Create response for redirection
      const responseText = isMainCampusRedirect 
        ? `REDIRECTED to ${targetDepartment.toUpperCase()} department at MAIN CAMPUS (DSEU Dwarka): ${options.redirectReason}${options.priority ? ` [Priority: ${options.priority}]` : ''}`
        : `REDIRECTED to ${targetDepartment.toUpperCase()} department: ${options.redirectReason}${options.priority ? ` [Priority: ${options.priority}]` : ''}`;
      
      const responseData = {
        issue_id: grievance.id,
        response_text: responseText,
        response_by: options.adminId,
        status: 'IN_PROGRESS',
        stage: 'FOLLOW_UP',
        attachment: null,
        redirect: targetDepartment
      };
      
      const redirectResponse = await responseService.createResponse(responseData);
      
      // Create history entry
      const historyData = {
        grievance_id: grievance.id,
        from_status: grievance.status,
        to_status: 'IN_PROGRESS',
        action_by: options.adminId,
        action_type: isMainCampusRedirect ? 'FORWARDED_TO_MAIN_CAMPUS' : 'FORWARDED',
        note: options.note || `Redirected to ${targetDepartment.toUpperCase()}${isMainCampusRedirect ? ' at MAIN CAMPUS' : ''} by admin: ${options.redirectReason}${options.priority ? ` [Priority: ${options.priority}]` : ''}`,
        date_time: Date.now()
      };
      
      await historyService.createHistory(historyData);
      
      // Log the action
      await SuperAdminService.logAdminAction({
        adminId: options.adminId,
        actionType: 'GRIEVANCE_REDIRECT',
        actionDetails: {
          grievanceId,
          targetDepartment,
          targetCampusId: finalTargetCampusId,
          isMainCampusRedirect,
          redirectReason: options.redirectReason,
          priority: options.priority
        }
      });
      
      return {
        response: redirectResponse,
        target_department: targetDepartment,
        target_campus_id: finalTargetCampusId,
        is_main_campus_redirect: isMainCampusRedirect,
        priority: options.priority || null,
        status: 'IN_PROGRESS'
      };
    });
  }

  // Get department statistics with campus filtering
  static async getDepartmentStats(department: AdminRole, campusId?: number): Promise<any> {
    let query = `
      SELECT 
        COUNT(*) as total_grievances,
        COUNT(CASE WHEN g.Status = 'PENDING' THEN 1 END) as pending,
        COUNT(CASE WHEN g.Status = 'IN_PROGRESS' THEN 1 END) as in_progress,
        COUNT(CASE WHEN g.Status = 'RESOLVED' THEN 1 END) as resolved,
        COUNT(CASE WHEN g.Status = 'REJECTED' THEN 1 END) as rejected,
        AVG(EXTRACT(EPOCH FROM (NOW() - g.Date))/86400) as avg_resolution_days
      FROM Grievance g
      LEFT JOIN CampusInfo c ON g.Campus = c.CampusCode
      WHERE g.Issuse_type = $1
    `;
    
    const params: any[] = [department.toUpperCase()];
    
    if (campusId) {
      query += ' AND c.CampusId = $2';
      params.push(campusId);
    }
    
    const result = await getPool().query(query, params);
    const stats = result.rows[0];
    
    // Get monthly stats
    const monthlyQuery = `
      SELECT 
        TO_CHAR(g.Date, 'YYYY-MM') as month,
        COUNT(*) as submitted,
        COUNT(CASE WHEN g.Status = 'RESOLVED' THEN 1 END) as resolved
      FROM Grievance g
      LEFT JOIN CampusInfo c ON g.Campus = c.CampusCode
      WHERE g.Issuse_type = $1
      ${campusId ? 'AND c.CampusId = $2' : ''}
      AND g.Date >= NOW() - INTERVAL '6 months'
      GROUP BY TO_CHAR(g.Date, 'YYYY-MM')
      ORDER BY month DESC
    `;
    
    const monthlyParams = campusId ? [department.toUpperCase(), campusId] : [department.toUpperCase()];
    const monthlyResult = await getPool().query(monthlyQuery, monthlyParams);
    
    return {
      department,
      campus_id: campusId,
      total_grievances: parseInt(stats.total_grievances),
      pending: parseInt(stats.pending),
      in_progress: parseInt(stats.in_progress),
      resolved: parseInt(stats.resolved),
      rejected: parseInt(stats.rejected),
      average_resolution_days: parseFloat(stats.avg_resolution_days || '0'),
      monthly_stats: monthlyResult.rows
    };
  }

  // Get campus-specific department admins
  static async getCampusDepartmentAdmins(campusId: number, department: AdminRole): Promise<any[]> {
    return SuperAdminService.getDepartmentAdminsByCampus(campusId, department);
  }

  // Get main campus department admins
  static async getMainCampusDepartmentAdmins(department: AdminRole): Promise<any[]> {
    return SuperAdminService.getMainCampusDepartmentAdmins(department);
  }

  // Validate admin access to grievance
  static async validateAdminAccess(
    adminId: string, 
    grievanceId: string, 
    department: AdminRole
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
    const grievance = await grievanceService.getGrievanceByIssueId(grievanceId);
    if (!grievance) {
      return false;
    }
    
    // If admin has campus assignment, check campus match
    if (admin.CampusId) {
      const campusResult = await getPool().query(
        'SELECT CampusId FROM CampusInfo WHERE CampusCode = $1',
        [grievance.campus]
      );
      
      if (campusResult.rows.length > 0) {
        const grievanceCampusId = campusResult.rows[0].CampusId;
        return admin.CampusId === grievanceCampusId;
      }
    }
    
    // If no campus assignment, allow access (system-wide admin)
    return true;
  }

  // Get admin's assigned campuses
  static async getAdminCampuses(adminId: string): Promise<any[]> {
    const result = await getPool().query(`
      SELECT 
        aca.campus_id,
        c.CampusCode,
        c.CampusName,
        aca.department,
        aca.is_primary
      FROM Admin_Campus_Assignment aca
      JOIN CampusInfo c ON aca.campus_id = c.CampusId
      WHERE aca.admin_id = $1
      ORDER BY aca.is_primary DESC, c.CampusName
    `, [adminId]);
    
    return result.rows;
  }
} 
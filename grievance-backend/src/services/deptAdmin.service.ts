import ConnectionManager from '../db/connectionManager';
import { 
  GrievanceQueries, 
  TrackingQueries, 
  AdminQueries, 
  AdminAuditLogQueries,
  StatsQueries 
} from '../db/queries';
import { SuperAdminService } from './superAdmin.service';
import { ResponseService } from './response.service';

/**
 * DSEU Department Admin Service
 * Updated for init.sql schema with proper department management
 */

type Department = 'ACADEMIC' | 'EXAM' | 'CAMPUS' | 'SYSTEM';
type AdminRole = 'DEPT_ADMIN' | 'CAMPUS_ADMIN' | 'SUPER_ADMIN';

export class DeptAdminService {
  // Get department grievances based on admin's department and campus
  static async getDepartmentGrievances(adminId: string): Promise<any[]> {
    try {
      // Get admin details first
      const admin = await ConnectionManager.query(AdminQueries.GET_BY_ID, [adminId]);
      if (!admin.rows[0]) {
        throw new Error('Admin not found');
      }

      const adminInfo = admin.rows[0];
      let query = '';
      const params: any[] = [];

      if (adminInfo.role === 'SUPER_ADMIN') {
        // Super admin can see all grievances
        query = GrievanceQueries.GET_ALL;
      } else if (adminInfo.role === 'CAMPUS_ADMIN') {
        // Campus admin can see all grievances from their campus
        query = GrievanceQueries.GET_BY_CAMPUS;
        params.push(adminInfo.campusid);
      } else if (adminInfo.role === 'DEPT_ADMIN') {
        // Department admin sees grievances based on issue level and department
        if (adminInfo.department === 'ACADEMIC' || adminInfo.department === 'EXAM') {
          // Get grievances from their campus with matching category
          query = `
            SELECT g.*, s.Name as StudentName, c.CampusName, i.IssueTitle 
            FROM Grievance g
            LEFT JOIN PersonalInfo s ON g.RollNo = s.RollNo
            LEFT JOIN CampusInfo c ON g.CampusId = c.CampusId
            LEFT JOIN IssueList i ON g.IssueCode = i.IssueCode
            WHERE g.CampusId = $1 AND i.Category = $2 AND i.IssueLevel = 'CAMPUS_LEVEL'
            ORDER BY g.CreatedAt DESC
          `;
          params.push(adminInfo.campusid, adminInfo.department);
        }
      }

      if (!query) {
        return [];
      }

      const result = await ConnectionManager.query(query, params);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Get grievances assigned/redirected to admin
  static async getAssignedGrievances(adminId: string): Promise<any[]> {
    try {
      const result = await ConnectionManager.query(TrackingQueries.GET_REDIRECTED_TO_ADMIN, [adminId]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Redirect grievance to another admin/department
  static async redirectGrievance(data: {
    grievanceId: string;
    redirectFrom: string;
    redirectTo: string;
    responseText: string;
    adminEmail: string;
    ipAddress?: string;
  }): Promise<any> {
    try {
      // Validate that target admin exists and is active
      const targetAdmin = await ConnectionManager.query(AdminQueries.GET_BY_ID, [data.redirectTo]);
      if (!targetAdmin.rows[0] || !targetAdmin.rows[0].isactive) {
        throw new Error('Target admin not found or inactive');
      }

      // Use ResponseService to handle the redirect
      const result = await ResponseService.redirectGrievance({
        grievanceId: data.grievanceId,
        responseText: data.responseText,
        redirectFrom: data.redirectFrom,
        redirectTo: data.redirectTo,
        adminEmail: data.adminEmail,
        ipAddress: data.ipAddress
      });

      return result;
    } catch (error) {
      throw error;
    }
  }

  // Add response to grievance
  static async addGrievanceResponse(data: {
    grievanceId: string;
    responseText: string;
    adminStatus: 'NEW' | 'PENDING' | 'REDIRECTED' | 'RESOLVED' | 'REJECTED';
    studentStatus: 'SUBMITTED' | 'UNDER_REVIEW' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';
    adminId: string;
    hasAttachments?: boolean;
    adminEmail: string;
    ipAddress?: string;
  }): Promise<any> {
    try {
      const result = await ResponseService.addResponse({
        grievanceId: data.grievanceId,
        responseText: data.responseText,
        adminStatus: data.adminStatus,
        studentStatus: data.studentStatus,
        responseBy: data.adminId,
        hasAttachments: data.hasAttachments,
        adminEmail: data.adminEmail,
        ipAddress: data.ipAddress
      });

      return result;
    } catch (error) {
      throw error;
    }
  }

  // Get department statistics
  static async getDepartmentStats(adminId: string): Promise<any> {
    try {
      // Get admin details
      const admin = await ConnectionManager.query(AdminQueries.GET_BY_ID, [adminId]);
      if (!admin.rows[0]) {
        throw new Error('Admin not found');
      }

      const adminInfo = admin.rows[0];
      let query = '';
      const params: any[] = [];

      if (adminInfo.role === 'SUPER_ADMIN') {
        // System-wide stats
        const result = await ConnectionManager.query(StatsQueries.GET_SYSTEM_STATS);
        return result.rows[0];
      } else if (adminInfo.role === 'CAMPUS_ADMIN') {
        // Campus-specific stats
        query = `
          SELECT 
            COUNT(g.Id) as total_grievances,
            COUNT(CASE WHEN latest.AdminStatus = 'PENDING' THEN 1 END) as pending,
            COUNT(CASE WHEN latest.AdminStatus = 'RESOLVED' THEN 1 END) as resolved,
            COUNT(CASE WHEN latest.AdminStatus = 'REJECTED' THEN 1 END) as rejected,
            COUNT(CASE WHEN latest.AdminStatus = 'REDIRECTED' THEN 1 END) as redirected,
            ROUND(AVG(
              CASE WHEN latest.AdminStatus IN ('RESOLVED', 'REJECTED') THEN 
                EXTRACT(EPOCH FROM (latest.ResponseAt - g.CreatedAt)) / 3600 
              END
            ), 2) as avg_resolution_hours
          FROM Grievance g
          LEFT JOIN LATERAL (
            SELECT AdminStatus, ResponseAt FROM Tracking t 
            WHERE t.GrievanceId = g.GrievanceId 
            ORDER BY t.ResponseAt DESC LIMIT 1
          ) latest ON true
          WHERE g.CampusId = $1
        `;
        params.push(adminInfo.campusid);
      } else if (adminInfo.role === 'DEPT_ADMIN') {
        // Department-specific stats
        query = `
          SELECT 
            COUNT(g.Id) as total_grievances,
            COUNT(CASE WHEN latest.AdminStatus = 'PENDING' THEN 1 END) as pending,
            COUNT(CASE WHEN latest.AdminStatus = 'RESOLVED' THEN 1 END) as resolved,
            COUNT(CASE WHEN latest.AdminStatus = 'REJECTED' THEN 1 END) as rejected,
            COUNT(CASE WHEN latest.AdminStatus = 'REDIRECTED' THEN 1 END) as redirected,
            ROUND(AVG(
              CASE WHEN latest.AdminStatus IN ('RESOLVED', 'REJECTED') THEN 
                EXTRACT(EPOCH FROM (latest.ResponseAt - g.CreatedAt)) / 3600 
              END
            ), 2) as avg_resolution_hours
          FROM Grievance g
          LEFT JOIN IssueList i ON g.IssueCode = i.IssueCode
          LEFT JOIN LATERAL (
            SELECT AdminStatus, ResponseAt FROM Tracking t 
            WHERE t.GrievanceId = g.GrievanceId 
            ORDER BY t.ResponseAt DESC LIMIT 1
          ) latest ON true
          WHERE g.CampusId = $1 AND i.Category = $2
        `;
        params.push(adminInfo.campusid, adminInfo.department);
      }

      const result = await ConnectionManager.query(query, params);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Get available admins for redirection based on department and campus
  static async getAvailableAdmins(issueCategory: 'ACADEMIC' | 'EXAM' | 'OTHER', campusId: number): Promise<any[]> {
    try {
      let query = '';
      let params: any[] = [];

      if (issueCategory === 'ACADEMIC' || issueCategory === 'EXAM') {
        // Get department admins of the specific type from the campus
        query = AdminQueries.GET_BY_CAMPUS_AND_DEPARTMENT;
        params = [campusId, issueCategory];
      } else {
        // For other issues, get campus admin
        query = AdminQueries.GET_BY_CAMPUS_AND_DEPARTMENT;
        params = [campusId, 'CAMPUS'];
      }

      const result = await ConnectionManager.query(query, params);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Validate admin access to grievance
  static async validateAdminAccess(adminId: string, grievanceId: string): Promise<boolean> {
    try {
      const [admin, grievance] = await Promise.all([
        ConnectionManager.query(AdminQueries.GET_BY_ID, [adminId]),
        ConnectionManager.query(GrievanceQueries.GET_BY_GRIEVANCE_ID, [grievanceId])
      ]);

      if (!admin.rows[0] || !grievance.rows[0]) {
        return false;
      }

      const adminInfo = admin.rows[0];
      const grievanceInfo = grievance.rows[0];

      // Super admin has access to everything
      if (adminInfo.role === 'SUPER_ADMIN') {
        return true;
      }

      // Campus admin has access to grievances from their campus
      if (adminInfo.role === 'CAMPUS_ADMIN') {
        return adminInfo.campusid === grievanceInfo.campusid;
      }

      // Department admin has access based on issue category and campus
      if (adminInfo.role === 'DEPT_ADMIN') {
        const issueResult = await ConnectionManager.query(
          'SELECT Category FROM IssueList WHERE IssueCode = $1', 
          [grievanceInfo.issuecode]
        );
        
        if (!issueResult.rows[0]) return false;
        
        return adminInfo.campusid === grievanceInfo.campusid && 
               adminInfo.department === issueResult.rows[0].category;
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  // Get admin workload (number of pending grievances)
  static async getAdminWorkload(adminId: string): Promise<number> {
    try {
      const result = await ConnectionManager.query(`
        SELECT COUNT(*) as workload
        FROM Tracking t
        WHERE t.ResponseBy = $1 
        AND t.AdminStatus = 'PENDING'
        AND t.ResponseAt = (
          SELECT MAX(t2.ResponseAt) 
          FROM Tracking t2 
          WHERE t2.GrievanceId = t.GrievanceId
        )
      `, [adminId]);

      return parseInt(result.rows[0]?.workload || '0');
    } catch (error) {
      return 0;
    }
  }

  // Get admin performance metrics
  static async getAdminPerformance(adminId: string, days: number = 30): Promise<any> {
    try {
      const result = await ConnectionManager.query(`
        SELECT 
          COUNT(*) as total_responses,
          COUNT(CASE WHEN AdminStatus = 'RESOLVED' THEN 1 END) as resolved_count,
          COUNT(CASE WHEN AdminStatus = 'REJECTED' THEN 1 END) as rejected_count,
          COUNT(CASE WHEN IsRedirect = true THEN 1 END) as redirects_made,
          ROUND(AVG(
            CASE WHEN AdminStatus IN ('RESOLVED', 'REJECTED') THEN 
              EXTRACT(EPOCH FROM (ResponseAt - (
                SELECT MIN(t2.ResponseAt) 
                FROM Tracking t2 
                WHERE t2.GrievanceId = Tracking.GrievanceId
              ))) / 3600 
            END
          ), 2) as avg_resolution_hours
        FROM Tracking 
        WHERE ResponseBy = $1 
        AND ResponseAt > NOW() - INTERVAL '$2 days'
      `, [adminId, days]);

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
} 
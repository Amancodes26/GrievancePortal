import ConnectionManager from '../db/connectionManager';
import { TrackingQueries, AdminAuditLogQueries } from '../db/queries';
import { SuperAdminService } from './superAdmin.service';

/**
 * DSEU Grievance Response Service
 * Handles admin responses, status updates, and grievance redirects
 * Updated for init.sql schema with history-based tracking
 */

interface AddResponseInput {
  grievanceId: string;
  responseText: string;
  adminStatus: 'NEW' | 'PENDING' | 'REDIRECTED' | 'RESOLVED' | 'REJECTED';
  studentStatus: 'SUBMITTED' | 'UNDER_REVIEW' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';
  responseBy: string;
  hasAttachments?: boolean;
  adminEmail?: string;
  ipAddress?: string;
}

interface RedirectGrievanceInput {
  grievanceId: string;
  responseText: string;
  redirectFrom: string;
  redirectTo: string;
  adminEmail?: string;
  ipAddress?: string;
}

export class ResponseService {
  // Add a response to a grievance
  static async addResponse(input: AddResponseInput): Promise<any> {
    try {
      // Validate status transition
      const isValidTransition = await this.validateStatusTransition(input.grievanceId, input.adminStatus);
      if (!isValidTransition) {
        throw new Error('Invalid status transition');
      }

      // Add the response
      const result = await ConnectionManager.query(TrackingQueries.ADD_RESPONSE, [
        input.grievanceId,
        input.responseText,
        input.adminStatus,
        input.studentStatus,
        input.responseBy,
        input.hasAttachments || false
      ]);

      // Log admin action
      if (input.adminEmail) {
        await SuperAdminService.logAdminAction({
          adminId: input.responseBy,
          actionType: 'GRIEVANCE_RESPONSE',
          actionDetails: {
            grievanceId: input.grievanceId,
            adminStatus: input.adminStatus,
            studentStatus: input.studentStatus,
            responseLength: input.responseText.length
          },
          ipAddress: input.ipAddress,
          email: input.adminEmail,
          accessedResource: `grievance/${input.grievanceId}`,
          role: 'DEPT_ADMIN' // This should be retrieved from the admin record
        });
      }

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Redirect a grievance to another admin
  static async redirectGrievance(input: RedirectGrievanceInput): Promise<any> {
    try {
      // Validate that both admins exist and are active
      const [fromAdmin, toAdmin] = await Promise.all([
        ConnectionManager.query('SELECT * FROM Admin WHERE AdminId = $1 AND IsActive = true', [input.redirectFrom]),
        ConnectionManager.query('SELECT * FROM Admin WHERE AdminId = $1 AND IsActive = true', [input.redirectTo])
      ]);

      if (!fromAdmin.rows[0] || !toAdmin.rows[0]) {
        throw new Error('Invalid admin IDs for redirect');
      }

      // Create redirect entry
      const result = await ConnectionManager.query(TrackingQueries.REDIRECT_GRIEVANCE, [
        input.grievanceId,
        input.responseText,
        input.redirectFrom,
        input.redirectTo,
        input.redirectFrom
      ]);

      // Log admin action
      if (input.adminEmail) {
        await SuperAdminService.logAdminAction({
          adminId: input.redirectFrom,
          actionType: 'GRIEVANCE_REDIRECT',
          actionDetails: {
            grievanceId: input.grievanceId,
            redirectTo: input.redirectTo,
            toAdminName: toAdmin.rows[0].name
          },
          ipAddress: input.ipAddress,
          email: input.adminEmail,
          accessedResource: `grievance/${input.grievanceId}`,
          role: fromAdmin.rows[0].role
        });
      }

      return {
        ...result.rows[0],
        redirectedToAdmin: toAdmin.rows[0]
      };
    } catch (error) {
      throw error;
    }
  }

  // Get all responses for a grievance (history)
  static async getGrievanceResponses(grievanceId: string): Promise<any[]> {
    const result = await ConnectionManager.query(TrackingQueries.GET_GRIEVANCE_HISTORY, [grievanceId]);
    return result.rows;
  }

  // Get latest status of a grievance
  static async getLatestResponse(grievanceId: string): Promise<any> {
    const result = await ConnectionManager.query(TrackingQueries.GET_LATEST_BY_GRIEVANCE_ID, [grievanceId]);
    return result.rows[0] || null;
  }

  // Get grievances by admin status
  static async getGrievancesByStatus(adminStatus: string): Promise<any[]> {
    const result = await ConnectionManager.query(TrackingQueries.GET_BY_ADMIN_STATUS, [adminStatus]);
    return result.rows;
  }

  // Get grievances redirected to an admin
  static async getRedirectedGrievances(adminId: string): Promise<any[]> {
    const result = await ConnectionManager.query(TrackingQueries.GET_REDIRECTED_TO_ADMIN, [adminId]);
    return result.rows;
  }

  // Resolve a grievance
  static async resolveGrievance(
    grievanceId: string,
    responseText: string,
    adminId: string,
    adminEmail?: string,
    ipAddress?: string
  ): Promise<any> {
    return this.addResponse({
      grievanceId,
      responseText,
      adminStatus: 'RESOLVED',
      studentStatus: 'RESOLVED',
      responseBy: adminId,
      adminEmail,
      ipAddress
    });
  }

  // Reject a grievance
  static async rejectGrievance(
    grievanceId: string,
    responseText: string,
    adminId: string,
    adminEmail?: string,
    ipAddress?: string
  ): Promise<any> {
    return this.addResponse({
      grievanceId,
      responseText,
      adminStatus: 'REJECTED',
      studentStatus: 'REJECTED',
      responseBy: adminId,
      adminEmail,
      ipAddress
    });
  }

  // Mark grievance as pending (under review)
  static async markAsPending(
    grievanceId: string,
    responseText: string,
    adminId: string,
    adminEmail?: string,
    ipAddress?: string
  ): Promise<any> {
    return this.addResponse({
      grievanceId,
      responseText,
      adminStatus: 'PENDING',
      studentStatus: 'UNDER_REVIEW',
      responseBy: adminId,
      adminEmail,
      ipAddress
    });
  }

  // Get response statistics for an admin
  static async getAdminResponseStats(adminId: string): Promise<any> {
    try {
      const result = await ConnectionManager.query(`
        SELECT 
          COUNT(*) as total_responses,
          COUNT(CASE WHEN AdminStatus = 'RESOLVED' THEN 1 END) as resolved_count,
          COUNT(CASE WHEN AdminStatus = 'REJECTED' THEN 1 END) as rejected_count,
          COUNT(CASE WHEN AdminStatus = 'PENDING' THEN 1 END) as pending_count,
          COUNT(CASE WHEN IsRedirect = true THEN 1 END) as redirects_made,
          AVG(CASE WHEN AdminStatus = 'RESOLVED' THEN 
            EXTRACT(EPOCH FROM (ResponseAt - (
              SELECT MIN(t2.ResponseAt) 
              FROM Tracking t2 
              WHERE t2.GrievanceId = Tracking.GrievanceId
            ))) / 3600 
          END) as avg_resolution_hours
        FROM Tracking 
        WHERE ResponseBy = $1
      `, [adminId]);

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Validate status transition
  private static async validateStatusTransition(grievanceId: string, newStatus: string): Promise<boolean> {
    try {
      const currentStatus = await this.getLatestResponse(grievanceId);
      if (!currentStatus) return true; // First response

      const result = await ConnectionManager.query(`
        SELECT CASE 
          WHEN $1 = 'NEW' AND $2 IN ('PENDING', 'REDIRECTED') THEN true
          WHEN $1 = 'PENDING' AND $2 IN ('RESOLVED', 'REJECTED', 'REDIRECTED') THEN true
          WHEN $1 = 'REDIRECTED' AND $2 IN ('PENDING', 'RESOLVED', 'REJECTED') THEN true
          WHEN $1 = 'RESOLVED' THEN false
          WHEN $1 = 'REJECTED' THEN false
          ELSE false
        END as is_valid
      `, [currentStatus.adminstatus, newStatus]);

      return result.rows[0]?.is_valid || false;
    } catch (error) {
      return false;
    }
  }

  // Get grievances requiring attention (NEW or REDIRECTED to admin)
  static async getGrievancesRequiringAttention(adminId: string): Promise<any[]> {
    try {
      const [newGrievances, redirectedGrievances] = await Promise.all([
        this.getGrievancesByStatus('NEW'),
        this.getRedirectedGrievances(adminId)
      ]);

      return [...newGrievances, ...redirectedGrievances];
    } catch (error) {
      throw error;
    }
  }
}

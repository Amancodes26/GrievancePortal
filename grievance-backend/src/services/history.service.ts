import ConnectionManager from '../db/connectionManager';
import { TrackingQueries, UtilityQueries, StatsQueries } from '../db/queries';

/**
 * DSEU Grievance History Service
 * Handles historical data, trends, and analytics
 * Updated for init.sql schema with history-based tracking
 */

interface HistoryFilter {
  startDate?: Date;
  endDate?: Date;
  campusId?: number;
  adminId?: string;
  studentRollNo?: string;
  adminStatus?: string;
  studentStatus?: string;
}

export class HistoryService {
  // Get complete history of a grievance with all responses
  static async getGrievanceFullHistory(grievanceId: string): Promise<any> {
    try {
      const [grievance, history] = await Promise.all([
        ConnectionManager.query(`
          SELECT g.*, s.Name as StudentName, c.CampusName, i.IssueTitle 
          FROM Grievance g
          LEFT JOIN PersonalInfo s ON g.RollNo = s.RollNo
          LEFT JOIN CampusInfo c ON g.CampusId = c.CampusId
          LEFT JOIN IssueList i ON g.IssueCode = i.IssueCode
          WHERE g.GrievanceId = $1
        `, [grievanceId]),
        ConnectionManager.query(TrackingQueries.GET_GRIEVANCE_HISTORY, [grievanceId])
      ]);

      if (!grievance.rows[0]) return null;

      return {
        grievance: grievance.rows[0],
        history: history.rows,
        timeline: this.buildTimeline(history.rows),
        totalResponses: history.rows.length,
        averageResponseTime: this.calculateAverageResponseTime(history.rows)
      };
    } catch (error) {
      throw error;
    }
  }

  // Get recent activity across the system
  static async getRecentActivity(limit: number = 50): Promise<any[]> {
    try {
      const result = await ConnectionManager.query(UtilityQueries.GET_RECENT_ACTIVITY);
      return result.rows.slice(0, limit);
    } catch (error) {
      throw error;
    }
  }

  // Get grievance statistics with historical trends
  static async getGrievanceStats(filter?: HistoryFilter): Promise<any> {
    try {
      const [systemStats, statusStats, monthlyTrends, campusStats, issueStats] = await Promise.all([
        ConnectionManager.query(StatsQueries.GET_SYSTEM_STATS),
        ConnectionManager.query(StatsQueries.GET_GRIEVANCE_STATUS_STATS),
        ConnectionManager.query(StatsQueries.GET_MONTHLY_GRIEVANCE_TRENDS),
        ConnectionManager.query(StatsQueries.GET_CAMPUS_GRIEVANCE_STATS),
        ConnectionManager.query(StatsQueries.GET_ISSUE_TYPE_STATS)
      ]);

      return {
        overview: systemStats.rows[0],
        statusDistribution: statusStats.rows,
        monthlyTrends: monthlyTrends.rows,
        campusDistribution: campusStats.rows,
        issueTypeDistribution: issueStats.rows
      };
    } catch (error) {
      throw error;
    }
  }

  // Get admin performance history
  static async getAdminPerformanceHistory(adminId?: string, startDate?: Date, endDate?: Date): Promise<any[]> {
    try {
      let query = StatsQueries.GET_ADMIN_ACTIVITY_STATS;
      const params: any[] = [];

      if (adminId) {
        query = `
          SELECT 
            a.AdminId,
            a.Name,
            a.Role,
            a.Department,
            COUNT(t.Id) as responses_count,
            COUNT(CASE WHEN t.IsRedirect = true THEN 1 END) as redirects_made,
            COUNT(CASE WHEN t.AdminStatus = 'RESOLVED' THEN 1 END) as resolved_count,
            COUNT(CASE WHEN t.AdminStatus = 'REJECTED' THEN 1 END) as rejected_count,
            AVG(CASE WHEN t.AdminStatus IN ('RESOLVED', 'REJECTED') THEN 
              EXTRACT(EPOCH FROM (t.ResponseAt - (
                SELECT MIN(t2.ResponseAt) 
                FROM Tracking t2 
                WHERE t2.GrievanceId = t.GrievanceId
              ))) / 3600 
            END) as avg_resolution_hours,
            MAX(t.ResponseAt) as last_activity
          FROM Admin a
          LEFT JOIN Tracking t ON a.AdminId = t.ResponseBy
          WHERE a.AdminId = $1 AND a.IsActive = true
        `;
        params.push(adminId);

        if (startDate && endDate) {
          query += ' AND t.ResponseAt BETWEEN $2 AND $3';
          params.push(startDate, endDate);
        }

        query += ' GROUP BY a.AdminId, a.Name, a.Role, a.Department';
      }

      const result = await ConnectionManager.query(query, params);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Get campus performance comparison
  static async getCampusPerformanceComparison(startDate?: Date, endDate?: Date): Promise<any[]> {
    try {
      let query = `
        SELECT 
          c.CampusId,
          c.CampusCode,
          c.CampusName,
          COUNT(g.Id) as total_grievances,
          COUNT(CASE WHEN latest.AdminStatus = 'RESOLVED' THEN 1 END) as resolved_count,
          COUNT(CASE WHEN latest.AdminStatus = 'REJECTED' THEN 1 END) as rejected_count,
          COUNT(CASE WHEN latest.AdminStatus = 'PENDING' THEN 1 END) as pending_count,
          ROUND(
            COUNT(CASE WHEN latest.AdminStatus = 'RESOLVED' THEN 1 END)::DECIMAL / 
            NULLIF(COUNT(g.Id), 0) * 100, 2
          ) as resolution_rate
        FROM CampusInfo c
        LEFT JOIN Grievance g ON c.CampusId = g.CampusId
        LEFT JOIN LATERAL (
          SELECT AdminStatus FROM Tracking t 
          WHERE t.GrievanceId = g.GrievanceId 
          ORDER BY t.ResponseAt DESC LIMIT 1
        ) latest ON true
      `;

      const params: any[] = [];
      if (startDate && endDate) {
        query += ' WHERE g.CreatedAt BETWEEN $1 AND $2';
        params.push(startDate, endDate);
      }

      query += ' GROUP BY c.CampusId, c.CampusCode, c.CampusName ORDER BY total_grievances DESC';

      const result = await ConnectionManager.query(query, params);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Get issue type resolution trends
  static async getIssueTypeResolutionTrends(days: number = 30): Promise<any[]> {
    try {
      const result = await ConnectionManager.query(`
        SELECT 
          i.IssueTitle,
          i.IssueCode,
          i.Category,
          i.IssueLevel,
          COUNT(g.Id) as total_grievances,
          COUNT(CASE WHEN latest.AdminStatus = 'RESOLVED' THEN 1 END) as resolved_count,
          ROUND(AVG(
            CASE WHEN latest.AdminStatus = 'RESOLVED' THEN 
              EXTRACT(EPOCH FROM (latest.ResponseAt - g.CreatedAt)) / 3600 
            END
          ), 2) as avg_resolution_hours
        FROM IssueList i
        LEFT JOIN Grievance g ON i.IssueCode = g.IssueCode
        LEFT JOIN LATERAL (
          SELECT AdminStatus, ResponseAt FROM Tracking t 
          WHERE t.GrievanceId = g.GrievanceId 
          ORDER BY t.ResponseAt DESC LIMIT 1
        ) latest ON true
        WHERE g.CreatedAt > NOW() - INTERVAL '$1 days' OR g.CreatedAt IS NULL
        GROUP BY i.IssueCode, i.IssueTitle, i.Category, i.IssueLevel
        ORDER BY total_grievances DESC
      `, [days]);

      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Get student satisfaction trends (based on response patterns)
  static async getStudentSatisfactionIndicators(): Promise<any> {
    try {
      const result = await ConnectionManager.query(`
        SELECT 
          COUNT(CASE WHEN latest.AdminStatus = 'RESOLVED' THEN 1 END) as satisfied_cases,
          COUNT(CASE WHEN latest.AdminStatus = 'REJECTED' THEN 1 END) as unsatisfied_cases,
          COUNT(CASE WHEN latest.AdminStatus = 'PENDING' AND 
            g.CreatedAt < NOW() - INTERVAL '7 days' THEN 1 END) as delayed_cases,
          ROUND(AVG(
            CASE WHEN latest.AdminStatus IN ('RESOLVED', 'REJECTED') THEN 
              EXTRACT(EPOCH FROM (latest.ResponseAt - g.CreatedAt)) / 3600 
            END
          ), 2) as avg_response_time_hours,
          COUNT(DISTINCT g.GrievanceId) as total_cases
        FROM Grievance g
        LEFT JOIN LATERAL (
          SELECT AdminStatus, ResponseAt FROM Tracking t 
          WHERE t.GrievanceId = g.GrievanceId 
          ORDER BY t.ResponseAt DESC LIMIT 1
        ) latest ON true
        WHERE g.CreatedAt > NOW() - INTERVAL '30 days'
      `);

      const data = result.rows[0];
      const totalCases = parseInt(data.total_cases);
      
      return {
        ...data,
        satisfaction_rate: totalCases > 0 ? 
          Math.round((data.satisfied_cases / totalCases) * 100) : 0,
        response_efficiency: data.avg_response_time_hours < 24 ? 'Excellent' : 
                           data.avg_response_time_hours < 72 ? 'Good' : 'Needs Improvement'
      };
    } catch (error) {
      throw error;
    }
  }

  // Export history data for reporting
  static async exportHistoryData(filter: HistoryFilter): Promise<any[]> {
    try {
      let query = `
        SELECT 
          g.GrievanceId,
          g.Subject,
          g.Description,
          g.CreatedAt as GrievanceCreatedAt,
          s.RollNo,
          s.Name as StudentName,
          s.Email as StudentEmail,
          c.CampusName,
          i.IssueTitle,
          i.Category as IssueCategory,
          latest.AdminStatus,
          latest.StudentStatus,
          latest.ResponseText as LatestResponse,
          latest.ResponseAt as LatestResponseAt,
          admin.Name as LastRespondedBy,
          admin.Role as AdminRole
        FROM Grievance g
        LEFT JOIN PersonalInfo s ON g.RollNo = s.RollNo
        LEFT JOIN CampusInfo c ON g.CampusId = c.CampusId
        LEFT JOIN IssueList i ON g.IssueCode = i.IssueCode
        LEFT JOIN LATERAL (
          SELECT AdminStatus, StudentStatus, ResponseText, ResponseAt, ResponseBy
          FROM Tracking t 
          WHERE t.GrievanceId = g.GrievanceId 
          ORDER BY t.ResponseAt DESC LIMIT 1
        ) latest ON true
        LEFT JOIN Admin admin ON latest.ResponseBy = admin.AdminId
        WHERE 1=1
      `;

      const params: any[] = [];
      let paramIndex = 1;

      if (filter.startDate) {
        query += ` AND g.CreatedAt >= $${paramIndex}`;
        params.push(filter.startDate);
        paramIndex++;
      }

      if (filter.endDate) {
        query += ` AND g.CreatedAt <= $${paramIndex}`;
        params.push(filter.endDate);
        paramIndex++;
      }

      if (filter.campusId) {
        query += ` AND g.CampusId = $${paramIndex}`;
        params.push(filter.campusId);
        paramIndex++;
      }

      if (filter.studentRollNo) {
        query += ` AND g.RollNo = $${paramIndex}`;
        params.push(filter.studentRollNo);
        paramIndex++;
      }

      if (filter.adminStatus) {
        query += ` AND latest.AdminStatus = $${paramIndex}`;
        params.push(filter.adminStatus);
        paramIndex++;
      }

      query += ' ORDER BY g.CreatedAt DESC';

      const result = await ConnectionManager.query(query, params);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Helper method to build timeline from tracking history
  private static buildTimeline(history: any[]): any[] {
    return history.map((entry, index) => ({
      step: index + 1,
      date: entry.responseat,
      action: this.getActionDescription(entry.adminstatus, entry.isredirect),
      adminName: entry.adminname || 'System',
      response: entry.responsetext,
      isRedirect: entry.isredirect,
      redirectTo: entry.redirectto
    }));
  }

  // Helper method to calculate average response time
  private static calculateAverageResponseTime(history: any[]): number | null {
    if (history.length < 2) return null;

    const intervals = [];
    for (let i = 1; i < history.length; i++) {
      const prev = new Date(history[i].responseat);
      const curr = new Date(history[i - 1].responseat);
      intervals.push((curr.getTime() - prev.getTime()) / (1000 * 60 * 60)); // hours
    }

    return intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
  }

  // Helper method to get action description
  private static getActionDescription(adminStatus: string, isRedirect: boolean): string {
    if (isRedirect) return 'Redirected to another admin';
    
    switch (adminStatus) {
      case 'NEW': return 'Grievance submitted';
      case 'PENDING': return 'Under review';
      case 'RESOLVED': return 'Resolved';
      case 'REJECTED': return 'Rejected';
      default: return 'Status updated';
    }
  }
}

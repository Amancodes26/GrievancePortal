import ConnectionManager from '../db/connectionManager';
import { 
  UtilityQueries, 
  StatsQueries, 
  ValidationQueries,
  TemporaryDataQueries 
} from '../db/queries';

/**
 * DSEU Database Service
 * Handles database health, maintenance, and system utilities
 * Based on init.sql utility functions
 */

export class DatabaseService {
  // Check database health and table status
  static async checkDatabaseHealth(): Promise<any> {
    try {
      const [healthCheck, tablesExist, tableStatus] = await Promise.all([
        ConnectionManager.query(UtilityQueries.GET_DB_HEALTH),
        ConnectionManager.query(UtilityQueries.CHECK_ALL_TABLES_EXIST),
        ConnectionManager.query(UtilityQueries.GET_TABLE_STATUS)
      ]);

      return {
        health: healthCheck.rows[0],
        allTablesExist: tablesExist.rows[0].all_tables_exist,
        tableStatus: tableStatus.rows
      };
    } catch (error) {
      return {
        health: { status: 'Error', error: (error as Error).message },
        allTablesExist: false,
        tableStatus: []
      };
    }
  }

  // Get comprehensive system statistics
  static async getSystemStatistics(): Promise<any> {
    try {
      const [systemStats, statusStats, campusStats, issueStats] = await Promise.all([
        ConnectionManager.query(StatsQueries.GET_SYSTEM_STATS),
        ConnectionManager.query(StatsQueries.GET_GRIEVANCE_STATUS_STATS),
        ConnectionManager.query(StatsQueries.GET_CAMPUS_GRIEVANCE_STATS),
        ConnectionManager.query(StatsQueries.GET_ISSUE_TYPE_STATS)
      ]);

      return {
        system: systemStats.rows[0],
        statusDistribution: statusStats.rows,
        campusDistribution: campusStats.rows,
        issueDistribution: issueStats.rows
      };
    } catch (error) {
      throw error;
    }
  }

  // Validate system data integrity
  static async validateDataIntegrity(): Promise<any> {
    try {
      const [duplicateStudentEmails, incompleteProfiles, orphanedGrievances] = await Promise.all([
        ConnectionManager.query(ValidationQueries.GET_DUPLICATE_STUDENT_EMAILS),
        ConnectionManager.query(ValidationQueries.GET_INCOMPLETE_STUDENT_PROFILES),
        ConnectionManager.query(ValidationQueries.GET_ORPHANED_GRIEVANCES)
      ]);

      return {
        duplicateEmails: duplicateStudentEmails.rows,
        incompleteProfiles: incompleteProfiles.rows,
        orphanedGrievances: orphanedGrievances.rows,
        issues: duplicateStudentEmails.rows.length + incompleteProfiles.rows.length + orphanedGrievances.rows.length
      };
    } catch (error) {
      throw error;
    }
  }

  // Initialize sample data for testing
  static async initializeSampleData(): Promise<any> {
    try {
      return await ConnectionManager.transaction(async (client) => {
        // Initialize DSEU campuses
        await client.query(TemporaryDataQueries.INITIALIZE_DSEU_CAMPUSES);
        
        // Add sample programs
        await client.query(TemporaryDataQueries.SAMPLE_PROGRAM_DATA);
        
        // Add sample issues
        await client.query(TemporaryDataQueries.SAMPLE_ISSUE_DATA);
        
        // Add sample students
        await client.query(TemporaryDataQueries.SAMPLE_STUDENT_DATA);
        
        // Add sample admins
        await client.query(TemporaryDataQueries.SAMPLE_ADMIN_DATA);
        
        // Create sample grievance with tracking
        await client.query(TemporaryDataQueries.SAMPLE_GRIEVANCE_WITH_TRACKING);

        return { status: 'Sample data initialized successfully' };
      });
    } catch (error) {
      throw error;
    }
  }

  // Clean up sample data
  static async cleanupSampleData(): Promise<any> {
    try {
      await ConnectionManager.query(TemporaryDataQueries.DELETE_SAMPLE_DATA_ONLY);
      return { status: 'Sample data cleaned up successfully' };
    } catch (error) {
      throw error;
    }
  }

  // Reset all data (dangerous operation)
  static async resetAllData(): Promise<any> {
    try {
      await ConnectionManager.query(TemporaryDataQueries.DELETE_ALL_DATA);
      return { status: 'All data has been reset' };
    } catch (error) {
      throw error;
    }
  }

  // Validate specific data formats
  static async validateDataFormats(data: {
    rollNo?: string;
    grievanceId?: string;
    email?: string;
    issueCode?: number;
    campusId?: number;
  }): Promise<any> {
    try {
      const validations = [];

      if (data.rollNo) {
        const result = await ConnectionManager.query(ValidationQueries.VALIDATE_ROLLNO_FORMAT, [data.rollNo]);
        validations.push({
          field: 'rollNo',
          value: data.rollNo,
          isValid: result.rows[0].is_valid
        });
      }

      if (data.grievanceId) {
        const result = await ConnectionManager.query(ValidationQueries.VALIDATE_GRIEVANCE_ID_FORMAT, [data.grievanceId]);
        validations.push({
          field: 'grievanceId',
          value: data.grievanceId,
          isValid: result.rows[0].is_valid
        });
      }

      if (data.email) {
        const [studentExists, adminExists] = await Promise.all([
          ConnectionManager.query(ValidationQueries.STUDENT_EMAIL_EXISTS, [data.email]),
          ConnectionManager.query(ValidationQueries.ADMIN_EMAIL_EXISTS, [data.email])
        ]);
        
        validations.push({
          field: 'email',
          value: data.email,
          studentExists: studentExists.rows[0].exists,
          adminExists: adminExists.rows[0].exists,
          isAvailable: !studentExists.rows[0].exists && !adminExists.rows[0].exists
        });
      }

      if (data.issueCode) {
        const result = await ConnectionManager.query(ValidationQueries.ISSUE_CODE_EXISTS, [data.issueCode]);
        validations.push({
          field: 'issueCode',
          value: data.issueCode,
          exists: result.rows[0].exists
        });
      }

      if (data.campusId) {
        const result = await ConnectionManager.query(ValidationQueries.CAMPUS_EXISTS, [data.campusId]);
        validations.push({
          field: 'campusId',
          value: data.campusId,
          exists: result.rows[0].exists
        });
      }

      return { validations };
    } catch (error) {
      throw error;
    }
  }

  // Get recent system activity
  static async getRecentActivity(limit: number = 20): Promise<any[]> {
    try {
      const result = await ConnectionManager.query(UtilityQueries.GET_RECENT_ACTIVITY);
      return result.rows.slice(0, limit);
    } catch (error) {
      throw error;
    }
  }

  // Get grievances with their latest status efficiently
  static async getGrievancesWithLatestStatus(limit?: number): Promise<any[]> {
    try {
      let query = UtilityQueries.GET_GRIEVANCES_WITH_LATEST_STATUS;
      if (limit) {
        query += ` LIMIT ${limit}`;
      }
      
      const result = await ConnectionManager.query(query);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Backup essential system data
  static async backupSystemData(): Promise<any> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      const [campuses, programs, issues, admins, grievances] = await Promise.all([
        ConnectionManager.query('SELECT * FROM CampusInfo'),
        ConnectionManager.query('SELECT * FROM ProgramInfo'),  
        ConnectionManager.query('SELECT * FROM IssueList WHERE IsActive = true'),
        ConnectionManager.query('SELECT AdminId, Name, Email, Role, Department, CampusId FROM Admin WHERE IsActive = true'),
        ConnectionManager.query('SELECT COUNT(*) as count FROM Grievance')
      ]);

      return {
        timestamp,
        backup: {
          campuses: campuses.rows,
          programs: programs.rows,
          issues: issues.rows,
          admins: admins.rows,
          grievanceCount: grievances.rows[0].count
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Monitor system performance
  static async getPerformanceMetrics(): Promise<any> {
    try {
      const [connectionInfo, queryStats, tableStats] = await Promise.all([
        ConnectionManager.query(`
          SELECT 
            count(*) as total_connections,
            count(CASE WHEN state = 'active' THEN 1 END) as active_connections,
            count(CASE WHEN state = 'idle' THEN 1 END) as idle_connections
          FROM pg_stat_activity
        `),
        ConnectionManager.query(`
          SELECT 
            schemaname,
            relname,
            seq_scan,
            seq_tup_read,
            idx_scan,
            idx_tup_fetch,
            n_tup_ins,
            n_tup_upd,
            n_tup_del
          FROM pg_stat_user_tables
          WHERE schemaname = 'public'
          ORDER BY seq_scan + idx_scan DESC
          LIMIT 10
        `),
        ConnectionManager.query(UtilityQueries.GET_TABLE_STATUS)
      ]);

      return {
        connections: connectionInfo.rows[0],
        queryStats: queryStats.rows,
        tableStats: tableStats.rows
      };
    } catch (error) {
      throw error;
    }
  }

  // Generate system health report
  static async generateHealthReport(): Promise<any> {
    try {
      const [health, integrity, performance, statistics] = await Promise.all([
        this.checkDatabaseHealth(),
        this.validateDataIntegrity(),
        this.getPerformanceMetrics(),
        this.getSystemStatistics()
      ]);

      return {
        timestamp: new Date().toISOString(),
        health,
        integrity,
        performance,
        statistics,
        recommendations: this.generateRecommendations(integrity, performance)
      };
    } catch (error) {
      throw error;
    }
  }

  // Generate system recommendations
  private static generateRecommendations(integrity: any, performance: any): string[] {
    const recommendations = [];

    if (integrity.issues > 0) {
      recommendations.push(`Found ${integrity.issues} data integrity issues that should be resolved`);
    }

    if (integrity.duplicateEmails.length > 0) {
      recommendations.push('Remove duplicate email addresses from student records');
    }

    if (integrity.orphanedGrievances.length > 0) {
      recommendations.push('Create initial tracking entries for orphaned grievances');
    }

    if (performance.connections.active_connections > 50) {
      recommendations.push('Consider increasing database connection pool size');
    }

    const totalQueries = performance.queryStats.reduce((sum: number, stat: any) => 
      sum + (stat.seq_scan || 0) + (stat.idx_scan || 0), 0);
    
    if (totalQueries > 10000) {
      recommendations.push('Database is experiencing high query load - consider optimization');
    }

    if (recommendations.length === 0) {
      recommendations.push('System is running optimally with no issues detected');
    }

    return recommendations;
  }
}

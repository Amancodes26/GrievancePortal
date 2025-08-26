import ConnectionManager from '../db/connectionManager';

/**
 * Database Health Check Utility
 */
export class DatabaseHealthCheck {
  
  /**
   * Perform comprehensive database health check
   */
  static async performHealthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: any;
  }> {
    const results = {
      connection: false,
      poolStatus: null as any,
      queryResponse: null as any,
      timestamp: new Date().toISOString()
    };

    try {
      // Check basic connection
      results.connection = await ConnectionManager.healthCheck();
      
      // Get pool status
      results.poolStatus = ConnectionManager.getPoolStatus();
      
      // Test query performance
      const start = Date.now();
      await ConnectionManager.query('SELECT 1 as test');
      const queryTime = Date.now() - start;
      
      results.queryResponse = {
        success: true,
        responseTime: queryTime
      };

      // Determine overall health
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      
      if (!results.connection) {
        status = 'unhealthy';
      } else if (
        results.poolStatus.waitingCount > 5 ||
        results.poolStatus.totalCount - results.poolStatus.idleCount > 18 ||
        queryTime > 5000
      ) {
        status = 'degraded';
      }

      return {
        status,
        details: results
      };

    } catch (error) {
      results.queryResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      return {
        status: 'unhealthy',
        details: results
      };
    }
  }

  /**
   * Monitor pool and log warnings
   */
  static monitorPool() {
    const status = ConnectionManager.getPoolStatus();
    
    if (status.waitingCount > 0) {
      console.warn(`⚠️  Pool Warning: ${status.waitingCount} connections waiting`);
    }
    
    if (status.totalCount - status.idleCount > 15) {
      console.warn(`⚠️  Pool Warning: ${status.totalCount - status.idleCount}/20 connections in use`);
    }

    return status;
  }

  /**
   * Force cleanup of idle connections
   */
  static async cleanupIdleConnections(): Promise<void> {
    try {
      // This would typically be handled by the pool automatically
      // but we can log the current state
      const status = ConnectionManager.getPoolStatus();
      console.log('🧹 Pool cleanup check:', {
        total: status.totalCount,
        idle: status.idleCount,
        inUse: status.totalCount - status.idleCount
      });
    } catch (error) {
      console.error('Error during pool cleanup check:', error);
    }
  }

  /**
   * Test database table accessibility for current models
   */
  static async testTableAccess(): Promise<{
    accessible: string[];
    errors: string[];
  }> {
    const tables = [
      'grievances',
      'tracking', 
      'admininfo',
      'PersonalInfo',
      'campusinfo',
      'issuelist',
      'programinfo',
      'academicinfo',
      'attachments',
      'adminauditlog'
    ];

    const accessible: string[] = [];
    const errors: string[] = [];

    for (const table of tables) {
      try {
        await ConnectionManager.query(`SELECT 1 FROM ${table} LIMIT 1`);
        accessible.push(table);
      } catch (error) {
        errors.push(`${table}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { accessible, errors };
  }

  /**
   * Get database statistics for monitoring
   */
  static async getDatabaseStats(): Promise<any> {
    try {
      const stats = await ConnectionManager.query(`
        SELECT 
          schemaname,
          tablename,
          n_tup_ins as inserts,
          n_tup_upd as updates,
          n_tup_del as deletes,
          n_live_tup as live_tuples,
          n_dead_tup as dead_tuples
        FROM pg_stat_user_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename
      `);

      return stats.rows;
    } catch (error) {
      console.error('Error getting database stats:', error);
      return [];
    }
  }

  /**
   * Check for database locks
   */
  static async checkForLocks(): Promise<any[]> {
    try {
      const locks = await ConnectionManager.query(`
        SELECT 
          l.locktype,
          l.mode,
          l.granted,
          l.pid,
          l.relation::regclass as table_name,
          a.query,
          a.query_start,
          now() - a.query_start as duration
        FROM pg_locks l
        JOIN pg_stat_activity a ON l.pid = a.pid
        WHERE NOT l.granted
        ORDER BY l.pid
      `);

      return locks.rows;
    } catch (error) {
      console.error('Error checking database locks:', error);
      return [];
    }
  }

  /**
   * Start periodic health monitoring
   */
  static startMonitoring(intervalMs: number = 30000): NodeJS.Timeout {
    console.log('🏥 Starting database health monitoring...');
    
    return setInterval(async () => {
      try {
        const health = await this.performHealthCheck();
        
        if (health.status === 'unhealthy') {
          console.error('🚨 Database is unhealthy:', health.details);
        } else if (health.status === 'degraded') {
          console.warn('⚠️  Database performance degraded:', health.details);
        }

        // Monitor pool
        this.monitorPool();

        // Check for locks if unhealthy
        if (health.status !== 'healthy') {
          const locks = await this.checkForLocks();
          if (locks.length > 0) {
            console.warn('🔒 Active database locks detected:', locks);
          }
        }

      } catch (error) {
        console.error('Error during health monitoring:', error);
      }
    }, intervalMs);
  }
}

export default DatabaseHealthCheck;

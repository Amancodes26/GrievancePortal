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
}

export default DatabaseHealthCheck;

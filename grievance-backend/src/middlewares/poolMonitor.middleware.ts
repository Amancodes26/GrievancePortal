import { Request, Response, NextFunction } from 'express';
import ConnectionManager, { logPoolStatus } from '../db/connectionManager';

/**
 * Middleware to monitor database connection pool
 */
export function poolMonitorMiddleware(req: Request, res: Response, next: NextFunction): void {
  const status = ConnectionManager.getPoolStatus();
  
  // Log warning if pool is getting full (reduced threshold)
  if (status.totalCount - status.idleCount > 10) {
    console.warn(`⚠️  High database connection usage: ${status.totalCount - status.idleCount}/15 in use`);
  }
  
  // Reject requests if pool is nearly exhausted
  if (status.totalCount - status.idleCount > 12) {
    console.error(`🚨 Database connection pool nearly exhausted: ${status.totalCount - status.idleCount}/15 in use`);
    res.status(503).json({
      success: false,
      message: 'Service temporarily unavailable - database connection pool exhausted',
      error: 'Please try again in a few seconds'
    });
    return;
  }
  
  // Add pool status to response headers for debugging
  if (process.env.NODE_ENV !== 'production') {
    res.setHeader('X-DB-Pool-Total', status.totalCount.toString());
    res.setHeader('X-DB-Pool-Idle', status.idleCount.toString());
    res.setHeader('X-DB-Pool-InUse', (status.totalCount - status.idleCount).toString());
    res.setHeader('X-DB-Pool-Waiting', status.waitingCount.toString());
  }
  
  next();
}

/**
 * Route handler for pool status endpoint
 */
export async function getPoolStatus(req: Request, res: Response) {
  try {
    const status = ConnectionManager.getPoolStatus();
    const isHealthy = await ConnectionManager.healthCheck();
    
    res.json({
      success: true,
      data: {
        pool: {
          total: status.totalCount,
          idle: status.idleCount,
          inUse: status.totalCount - status.idleCount,
          waiting: status.waitingCount
        },
        healthy: isHealthy,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting pool status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get pool status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Express error handler for database connection errors
 */
export function databaseErrorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    res.status(503).json({
      success: false,
      message: 'Database connection failed',
      error: 'Service temporarily unavailable'
    });
    return;
  }
  
  if (err.message && err.message.includes('too many clients already')) {
    logPoolStatus(); // Log current pool status
    res.status(503).json({
      success: false,
      message: 'Database connection pool exhausted',
      error: 'Service temporarily unavailable - please try again shortly'
    });
    return;
  }
  
  if (err.code === '08006' || err.code === '08001') { // PostgreSQL connection errors
    res.status(503).json({
      success: false,
      message: 'Database connection error',
      error: 'Service temporarily unavailable'
    });
    return;
  }
  
  next(err);
}

export default {
  poolMonitorMiddleware,
  getPoolStatus,
  databaseErrorHandler
};

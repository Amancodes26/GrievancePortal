import { getPool } from './index';
import { PoolClient } from 'pg';

/**
 * Database Connection Manager
 * Provides utilities for better connection management and preventing connection leaks
 */
export class ConnectionManager {
  
  /**
   * Execute a query with automatic connection management
   * @param query SQL query string
   * @param params Query parameters
   * @returns Query result
   */
  static async query(query: string, params?: any[]) {
    if (!getPool) {
      throw new Error('Database not available. Check environment variables.');
    }
    
    const start = Date.now();
    try {
      const result = await getPool().query(query, params);
      const duration = Date.now() - start;
      
      if (process.env.LOG_QUERIES === 'true') {
        console.log('✅ Query executed in', duration, 'ms');
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      console.error('❌ Query failed after', duration, 'ms:', error);
      throw error;
    }
  }

  /**
   * Execute multiple queries in a transaction
   * @param queryFn Function that receives a client and executes queries
   * @returns Result of the transaction function
   */
  static async transaction<T>(
    queryFn: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    if (!getPool) {
      throw new Error('Database not available. Check environment variables.');
    }
    
    const client = await getPool().connect();
    const start = Date.now();
    
    try {
      await client.query('BEGIN');
      const result = await queryFn(client);
      await client.query('COMMIT');
      
      const duration = Date.now() - start;
      if (process.env.LOG_QUERIES === 'true') {
        console.log('✅ Transaction completed in', duration, 'ms');
      }
      
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      const duration = Date.now() - start;
      console.error('❌ Transaction failed after', duration, 'ms:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get pool status for monitoring
   */
  static getPoolStatus() {
    if (!getPool) {
      return {
        totalCount: 0,
        idleCount: 0,
        waitingCount: 0,
        available: false,
        error: 'Database not available. Check environment variables.'
      };
    }
    
    const pool = getPool();
    return {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount,
      available: true
    };
  }

  /**
   * Check if pool is healthy
   */
  static async healthCheck(): Promise<boolean> {
    if (!getPool) {
      return false;
    }
    
    try {
      const client = await getPool().connect();
      await client.query('SELECT 1');
      client.release();
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  /**
   * Get a client from pool with timeout protection
   * Use this when you need manual client management
   */
  static async getClient(timeoutMs: number = 30000): Promise<PoolClient> {
    if (!getPool) {
      throw new Error('Database not available. Check environment variables.');
    }
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Connection timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      getPool().connect()
        .then(client => {
          clearTimeout(timeout);
          resolve(client);
        })
        .catch(error => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }
}

/**
 * Middleware for monitoring connection pool
 */
export function logPoolStatus() {
  const status = ConnectionManager.getPoolStatus();
  if (status.available) {
    console.log('🔌 Pool Status:', {
      total: status.totalCount,
      idle: status.idleCount,
      waiting: status.waitingCount,
      inUse: status.totalCount - status.idleCount
    });
  } else {
    console.log('🔌 Pool Status:', status.error);
  }
}

// Log pool status every 30 seconds in development
if (process.env.NODE_ENV !== 'production') {
  setInterval(() => {
    const status = ConnectionManager.getPoolStatus();
    if (status.available && (status.waitingCount > 0 || status.totalCount - status.idleCount > 10)) {
      console.warn('⚠️  Pool Status Warning:', {
        total: status.totalCount,
        idle: status.idleCount,
        waiting: status.waitingCount,
        inUse: status.totalCount - status.idleCount
      });
    }
  }, 30000);
}

export default ConnectionManager;

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import apiRoutes from './routes/index';
import { errorHandler } from './utils/errorHandler';
import { poolMonitorMiddleware, databaseErrorHandler, getPoolStatus } from './middlewares/poolMonitor.middleware';
import ConnectionManager from './db/connectionManager';


export const app = express();
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add pool monitoring middleware
app.use(poolMonitorMiddleware as express.RequestHandler);

app.use('/api', apiRoutes);

// Pool status endpoint for monitoring
app.get('/api/pool-status', getPoolStatus);

// Database health check endpoint
app.get('/api/health', (req, res) => {
  ConnectionManager.healthCheck()
    .then(isHealthy => {
      const status = ConnectionManager.getPoolStatus();
      
      if (!status.available) {
        return res.status(503).json({
          status: 'unhealthy',
          database: false,
          error: status.error || 'Database not available',
          pool: {
            available: false,
            error: status.error
          },
          timestamp: new Date().toISOString()
        });
      }
      
      return res.status(isHealthy ? 200 : 503).json({
        status: isHealthy ? 'healthy' : 'unhealthy',
        database: isHealthy,
        pool: {
          total: status.totalCount,
          idle: status.idleCount,
          inUse: status.totalCount - status.idleCount,
          waiting: status.waitingCount,
          available: true
        },
        timestamp: new Date().toISOString()
      });
    })
    .catch(error => {
      return res.status(503).json({
        status: 'unhealthy',
        database: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    });
});

// Database error handling middleware (should come before general error handler)
app.use(databaseErrorHandler as express.ErrorRequestHandler);
app.use(errorHandler);

// Test endpoint
app.get('/api/test', (req, res) => {
  res.status(200).json({ message: 'Test endpoint is working!' });
});

// Environment variables checker endpoint (for debugging)
app.get('/api/env-check', (req, res) => {
  const requiredVars = ['PGHOST', 'PGUSER', 'PGPASSWORD', 'PGDATABASE', 'PGPORT', 'JWT_SECRET'];
  const optionalVars = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN', 'EMAIL'];
  
  const missingRequired = requiredVars.filter(varName => !process.env[varName]);
  const missingOptional = optionalVars.filter(varName => !process.env[varName]);
  const presentVars = [...requiredVars, ...optionalVars].filter(varName => process.env[varName]);
  
  res.status(200).json({
    status: missingRequired.length === 0 ? 'ready' : 'missing_vars',
    missing_required: missingRequired,
    missing_optional: missingOptional,
    present_vars: presentVars.map(varName => ({
      name: varName,
      value: varName.includes('SECRET') || varName.includes('PASSWORD') || varName.includes('TOKEN') 
        ? '***hidden***' 
        : process.env[varName]?.substring(0, 10) + (process.env[varName] && process.env[varName]!.length > 10 ? '...' : '')
    })),
    node_env: process.env.NODE_ENV || 'not_set',
    timestamp: new Date().toISOString()
  });
});

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({ message: 'Not Found' });
});

export default app;

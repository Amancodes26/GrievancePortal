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
app.get('/api/health', async (req, res) => {
  try {
    const isHealthy = await ConnectionManager.healthCheck();
    const status = ConnectionManager.getPoolStatus();
    
    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      database: isHealthy,
      pool: {
        total: status.totalCount,
        idle: status.idleCount,
        inUse: status.totalCount - status.idleCount,
        waiting: status.waitingCount
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      database: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Database error handling middleware (should come before general error handler)
app.use(databaseErrorHandler as express.ErrorRequestHandler);
app.use(errorHandler);

// Test endpoint
app.get('/api/test', (req, res) => {
  res.status(200).json({ message: 'Test endpoint is working!' });
});

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({ message: 'Not Found' });
});

export default app;

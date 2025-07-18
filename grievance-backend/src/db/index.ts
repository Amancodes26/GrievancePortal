// src/utils/db.ts
import { Pool } from "pg";
import { setupDatabase, checkAllTablesExistSimple, getTableStatusSimple, resetDatabase } from "./setupDatabase";
import { config } from "dotenv";
config();

// Check for required environment variables
const requiredEnvVars = ['PGHOST', 'PGPASSWORD'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars);
  console.error('Please set the following environment variables in your Vercel deployment:');
  missingEnvVars.forEach(varName => {
    console.error(`  - ${varName}`);
  });
  
  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️  Running in development mode with mock database connection');
  } else {
    console.error('❌ Cannot proceed without required environment variables');
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  }
}

// Create pool only if we have the required environment variables
let pool: Pool | null = null;
let isInitializing = false;
let initializationPromise: Promise<Pool> | null = null;

// Fixed: Single function to create pool configuration
const createPoolConfig = () => ({
  user: process.env.PGUSER || 'avnadmin',
  host: process.env.PGHOST,
  database: process.env.PGDATABASE || 'grievance',
  password: process.env.PGPASSWORD,
  port: Number(process.env.PGPORT) || 26066,
  ssl: {
    rejectUnauthorized: false,
  },
  // Optimized for Vercel serverless functions
  max: process.env.NODE_ENV === 'production' ? 5 : 15,
  min: 0,
  idleTimeoutMillis: process.env.NODE_ENV === 'production' ? 10000 : 30000,
  connectionTimeoutMillis: process.env.NODE_ENV === 'production' ? 5000 : 30000,
  allowExitOnIdle: true,
  statement_timeout: 30000,
  query_timeout: 30000,
});

// Fixed: Proper async initialization
const initialize = async (): Promise<Pool> => {
  if (pool) return pool;

  if (isInitializing && initializationPromise) {
    return initializationPromise;
  }

  isInitializing = true;
  
  initializationPromise = (async () => {
    try {
      console.log('🚀 Initializing database connection pool...');
      
      // Create pool with proper configuration
      pool = new Pool(createPoolConfig());
      
      // Set up pool event handlers
      pool.on('error', (err) => {
        console.error('Unexpected error on idle client', err);
        if (process.env.NODE_ENV !== 'production') {
          process.exit(-1);
        }
      });

      pool.on('connect', (client) => {
        console.log('🔗 New database connection established');
      });

      pool.on('remove', (client) => {
        console.log('🔌 Database connection removed from pool');
      });

      // Add query logging if enabled
      if (process.env.LOG_QUERIES === 'true') {
        const originalQuery = pool.query.bind(pool);
        pool.query = (text: any, params?: any) => {
          const query = typeof text === 'string' ? text : text.text;
          console.log('🔍 SQL:', query);
          if (params && params.length > 0) {
            console.log('📝 Params:', params);
          }
          return originalQuery(text, params);
        };
      }
      
      // Warm up the pool with a test connection
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      
      console.log('✅ Database pool initialized successfully');
      return pool;
    } catch (error) {
      console.error('❌ Failed to initialize database pool:', error);
      pool = null;
      throw error;
    } finally {
      isInitializing = false;
    }
  })();

  return initializationPromise;
};

// Fixed: Only initialize if env vars are present
if (missingEnvVars.length === 0) {
  // Initialize pool on module load
  initialize().catch((error) => {
    console.error('❌ Pool initialization failed:', error);
  });
}

// Export a function to get the pool safely
export function getPool(): Pool {
  if (!pool) {
    throw new Error('Database pool not initialized. Check environment variables or wait for initialization.');
  }
  return pool;
}

// Fixed: Safe pool getter that waits for initialization
export async function getPoolSafe(): Promise<Pool> {
  if (!pool && missingEnvVars.length === 0) {
    return await initialize();
  }
  return getPool();
}

// Export pool as default for backward compatibility
export default pool;

// Fixed: Proper connection test with initialization
if (missingEnvVars.length === 0) {
  initialize()
    .then(async (initializedPool) => {
      console.log("✅ Connected to PostgreSQL database successfully.");
      
      // Check if all required tables exist
      const allTablesExist = await checkAllTablesExistSimple();
      if (!allTablesExist) {
        console.log("⚠️  Some tables are missing. Setting up database...");
        await setupDatabase();
      } else {
        console.log("✅ All required tables exist.");
        
        // Display current table status
        const tableStatus = await getTableStatusSimple();
        console.log('📊 Current Database Status:');
        tableStatus.forEach(row => {
          console.log(`   ${row.table_name}: ${row.record_count} records`);
        });
      }
    })
    .catch((err) => {
      console.error("❌ Failed to connect to PostgreSQL database:", err.message);
      console.error("❌ Error code:", err.code);
      
      if (err.code === 'ENOTFOUND') {
        console.error("💡 Check your internet connection and database hostname");
      } else if (err.code === 'ECONNREFUSED') {
        console.error("💡 Database server might be down or port blocked");
      } else if (err.code === 'ETIMEDOUT') {
        console.error("💡 Connection timeout - check network or firewall settings");
      } else if (err.message.includes('password')) {
        console.error("💡 Check your database credentials");
      }
      
      console.warn("⚠️  Server will start without database connection.");
      console.warn("⚠️  Database-dependent features will not work until connection is restored.");
      
      if (process.env.NODE_ENV === 'production') {
        console.error("🛑 Exiting due to database connection failure in production");
        process.exit(1);
      }
    });
} else {
  console.warn("⚠️  Database pool not initialized - skipping connection test");
}

// Graceful shutdown function
export async function closePool() {
  if (pool) {
    console.log('🔄 Closing database pool...');
    await pool.end();
    pool = null;
    console.log('✅ Database pool closed successfully');
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  await closePool();
  process.exit(0);
});

// Export utility functions for database operations
export { setupDatabase, checkAllTablesExistSimple, getTableStatusSimple, resetDatabase } from "./setupDatabase";
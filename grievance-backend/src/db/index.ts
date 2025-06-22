// src/utils/db.ts
import { Pool } from "pg";
import { setupDatabase, checkAllTablesExistSimple, getTableStatusSimple, resetDatabase } from "./setupDatabase";
// Load environment variables from .env file
import { config } from "dotenv";
config();

const pool = new Pool({
    user: process.env.PGUSER || 'avnadmin',
    host: process.env.PGHOST,
    database: process.env.PGDATABASE || 'grievance',
    password: process.env.PGPASSWORD,
    port: Number(process.env.PGPORT) || 26066,
    ssl: {
        rejectUnauthorized: false,
    },
    // Optimized for Vercel serverless functions
    max: process.env.NODE_ENV === 'production' ? 5 : 15, // Smaller pool for production
    min: 0,  // No minimum connections for serverless
    idleTimeoutMillis: 10000, // Release idle connections quickly
    connectionTimeoutMillis: 5000, // Faster timeout for serverless
    allowExitOnIdle: true, // Allow connections to be released when idle
    // Additional serverless optimizations
    statement_timeout: 30000, // 30 second query timeout
    query_timeout: 30000, // 30 second query timeout
});

// Handle pool errors
pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

// Handle pool connect events
pool.on('connect', (client) => {
    console.log('🔗 New database connection established');
});

pool.on('remove', (client) => {
    console.log('🔌 Database connection removed from pool');
});

// Simple query logging with one environment variable
if (process.env.LOG_QUERIES === 'true') {
    const originalQuery = pool.query.bind(pool);
    pool.query = (text: any, params?: any) => {
        const query = typeof text === 'string' ? text : text.text;
        console.log('🔍 SQL:', query);
        if (params && params.length > 0) {
            console.log('📝 Params:', params);
            // Show actual query with parameters substituted
            let actualQuery = query;
            interface QueryParam {
                value: string | number | boolean | Date | null | undefined;
            }

            interface FormattedParam {
                placeholder: string;
                value: string;
            }

            params.forEach((param: QueryParam['value'], index: number) => {
                const placeholder: string = `$${index + 1}`;
                let value: string = param as string;
                
                // Format different data types for display
                if (typeof param === 'string') {
                    value = `'${param.replace(/'/g, "''")}'`;
                } else if (param === null || param === undefined) {
                    value = 'NULL';
                } else if (param instanceof Date) {
                    value = `'${param.toISOString()}'`;
                } else if (typeof param === 'boolean') {
                    value = param ? 'TRUE' : 'FALSE';
                }
                
                actualQuery = actualQuery.replace(new RegExp(`\\${placeholder}\\b`, 'g'), String(value));
            });
            console.log('🔗 Actual Query:', actualQuery);
        }
        return originalQuery(text, params);
    };
}

export default pool;

// Test the database connection when the app starts
pool.connect()
    .then(async (client) => {
        console.log("✅ Connected to PostgreSQL database successfully.");
        client.release();
        // Check if all required tables exist using simple approach
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
        console.error("❌ Failed to connect to PostgreSQL database:", err);
    });

// Graceful shutdown function
export async function closePool() {
    console.log('🔄 Closing database pool...');
    await pool.end();
    console.log('✅ Database pool closed successfully');
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
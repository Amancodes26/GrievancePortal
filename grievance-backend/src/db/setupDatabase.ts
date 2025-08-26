import { readFileSync } from 'fs';
import { join } from 'path';

import { getPool } from "./index";

export async function setupDatabase(): Promise<void> {
  try {
    console.log('Setting up database...');
    const initSqlPath = join(__dirname, '../../Database/init.sql');
    const initSql = readFileSync(initSqlPath, 'utf8');
    
    await getPool().query(initSql);
    
    console.log('Database setup completed successfully!');
    
    const tablesExist = await checkAllTablesExistSimple();
    if (tablesExist) {
      console.log('✅ All required tables exist');
      
      const tableStatus = await getTableStatusSimple();
      console.log('📊 Table Status:');
      tableStatus.forEach(row => {
        console.log(`   ${row.table_name}: ${row.record_count} records`);
      });
    } else {
      throw new Error('Some tables are missing after setup');
    }
    
  } catch (error) {
    console.error('Error setting up database:', error);
    throw error;
  }
}

export async function checkAllTablesExistSimple(): Promise<boolean> {
  try {
    const requiredTables = [
      'campusinfo',
      'programinfo', 
      'PersonalInfo',
      'admin',
      'academicinfo',
      'issuelist',
      'grievance',
      'tracking',
      'attachment'
    ];
    const missingTables: string[] = [];
    
    for (const tableName of requiredTables) {
      const exists = await checkTableExists(tableName);
      if (!exists) {
        missingTables.push(tableName);
      }
    }
    
    if (missingTables.length > 0) {
      console.log(`Missing tables: ${missingTables.join(', ')}`);
      return false;
    }
    
    console.log(`All required tables exist: ${requiredTables.join(', ')}`);
    return true;
  } catch (error) {
    console.error('Error in simple table check:', error);
    return false;
  }
}

export async function getTableStatusSimple(): Promise<Array<{table_name: string, record_count: string}>> {
  try {
    const tables = [
      { name: 'CampusInfo', table: 'campusinfo' },
      { name: 'ProgramInfo', table: 'programinfo' },
      { name: 'PersonalInfo', table: 'PersonalInfo' },
      { name: 'Admin', table: 'admin' },
      { name: 'AcademicInfo', table: 'academicinfo' },
      { name: 'IssueList', table: 'issuelist' },
      { name: 'Grievance', table: 'grievance' },
      { name: 'Tracking', table: 'tracking' },
      { name: 'Attachment', table: 'attachment' }
    ];

    const results = [];

    for (const table of tables) {
      try {
        const result = await getPool().query(`SELECT COUNT(*) FROM ${table.table}`);
        results.push({
          table_name: table.name,
          record_count: result.rows[0].count
        });
      } catch (error) {
        results.push({
          table_name: table.name,
          record_count: 'Error'
        });
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error getting simple table status:', error);
    return [];
  }
}

export async function resetDatabase(): Promise<void> {
  try {
    console.log('Resetting database...');
    
    // Drop all tables in correct order (dependencies first)
    const dropOrder = [
      'attachment',
      'tracking',
      'grievance',
      'academicinfo',
      'PersonalInfo',
      'admin',
      'issuelist',
      'programinfo',
      'campusinfo'
    ];

    for (const table of dropOrder) {
      await getPool().query(`DROP TABLE IF EXISTS ${table} CASCADE`);
      console.log(`Dropped table: ${table}`);
    }

    console.log('All tables dropped. Recreating...');
    await setupDatabase();
    
  } catch (error) {
    console.error('Error resetting database:', error);
    throw error;
  }
}

export async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    const result = await getPool().query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      )
    `, [tableName.toLowerCase()]);
    
    return result.rows[0].exists;
  } catch (error) {
    console.error(`Error checking table ${tableName}:`, error);
    return false;
  }
}

/**
 * Validate database schema integrity
 */
export async function validateSchema(): Promise<{valid: boolean, issues: string[]}> {
  const issues: string[] = [];
  
  try {
    // Check for proper foreign key relationships
    const foreignKeyChecks = [
      {
        table: 'PersonalInfo',
        column: 'campusid',
        references: 'campusinfo(campusid)',
        query: `
          SELECT COUNT(*) as invalid_count 
          FROM PersonalInfo s 
          LEFT JOIN campusinfo c ON s.campusid = c.campusid 
          WHERE s.campusid IS NOT NULL AND c.campusid IS NULL
        `
      },
      {
        table: 'grievance', 
        column: 'rollno',
        references: 'PersonalInfo(rollno)',
        query: `
          SELECT COUNT(*) as invalid_count 
          FROM grievance g 
          LEFT JOIN PersonalInfo s ON g.rollno = s.rollno 
          WHERE s.rollno IS NULL
        `
      },
      {
        table: 'grievance',
        column: 'campusid', 
        references: 'campusinfo(campusid)',
        query: `
          SELECT COUNT(*) as invalid_count 
          FROM grievance g 
          LEFT JOIN campusinfo c ON g.campusid = c.campusid 
          WHERE c.campusid IS NULL
        `
      },
      {
        table: 'grievance',
        column: 'issuecode',
        references: 'issuelist(issuecode)',
        query: `
          SELECT COUNT(*) as invalid_count 
          FROM grievance g 
          LEFT JOIN issuelist i ON g.issuecode = i.issuecode 
          WHERE i.issuecode IS NULL
        `
      }
    ];

    for (const check of foreignKeyChecks) {
      try {
        const result = await getPool().query(check.query);
        const invalidCount = parseInt(result.rows[0].invalid_count);
        if (invalidCount > 0) {
          issues.push(`${invalidCount} invalid foreign key references in ${check.table}.${check.column} -> ${check.references}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        issues.push(`Failed to check foreign key ${check.table}.${check.column}: ${errorMessage}`);
      }
    }

    // Check for duplicate primary keys
    const duplicateChecks = [
      { table: 'campusinfo', key: 'campusid' },
      { table: 'PersonalInfo', key: 'rollno' },
      { table: 'admin', key: 'adminid' },
      { table: 'grievance', key: 'grievanceid' }
    ];

    for (const check of duplicateChecks) {
      try {
        const result = await getPool().query(`
          SELECT ${check.key}, COUNT(*) as count 
          FROM ${check.table} 
          GROUP BY ${check.key} 
          HAVING COUNT(*) > 1
        `);
        if (result.rows.length > 0) {
          issues.push(`Duplicate ${check.key} values found in ${check.table}: ${result.rows.length} duplicates`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        issues.push(`Failed to check duplicates in ${check.table}: ${errorMessage}`);
      }
    }

    return {
      valid: issues.length === 0,
      issues
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    issues.push(`Schema validation failed: ${errorMessage}`);
    return {
      valid: false,
      issues
    };
  }
}

/**
 * Get comprehensive database health report
 */
export async function getDatabaseHealthReport(): Promise<any> {
  try {
    const tablesExist = await checkAllTablesExistSimple();
    const tableStatus = await getTableStatusSimple();
    const schemaValidation = await validateSchema();
    
    // Check for recent activity
    const recentActivity = await getPool().query(`
      SELECT 
        (SELECT COUNT(*) FROM grievance WHERE createdat > NOW() - INTERVAL '7 days') as recent_grievances,
        (SELECT COUNT(*) FROM PersonalInfo WHERE createdat > NOW() - INTERVAL '30 days') as recent_students,
        (SELECT COUNT(*) FROM tracking WHERE updatedat > NOW() - INTERVAL '7 days') as recent_updates
    `);

    return {
      timestamp: new Date().toISOString(),
      overall_status: tablesExist && schemaValidation.valid ? 'healthy' : 'issues_detected',
      tables: {
        all_exist: tablesExist,
        status: tableStatus
      },
      schema: schemaValidation,
      recent_activity: recentActivity.rows[0],
      recommendations: generateRecommendations(tableStatus, schemaValidation)
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      timestamp: new Date().toISOString(),
      overall_status: 'error',
      error: errorMessage
    };
  }
}

function generateRecommendations(tableStatus: any[], schemaValidation: any): string[] {
  const recommendations: string[] = [];
  
  // Check for empty critical tables
  const criticalTables = ['campusinfo', 'issuelist'];
  for (const critical of criticalTables) {
    const table = tableStatus.find(t => t.table_name.toLowerCase().includes(critical.toLowerCase()));
    if (table && (table.record_count === '0' || table.record_count === 'Error')) {
      recommendations.push(`Initialize ${table.table_name} with sample data for proper system operation`);
    }
  }

  // Schema issues
  if (!schemaValidation.valid) {
    recommendations.push('Fix foreign key constraint violations before production use');
  }

  // Performance recommendations
  const largeDataTables = tableStatus.filter(t => parseInt(t.record_count) > 10000);
  if (largeDataTables.length > 0) {
    recommendations.push('Consider implementing data archiving for large tables: ' + 
      largeDataTables.map(t => t.table_name).join(', '));
  }

  return recommendations;
}
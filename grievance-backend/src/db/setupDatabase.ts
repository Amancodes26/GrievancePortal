import { readFileSync } from 'fs';
import { join } from 'path';

import { getPool } from "./index";

export async function setupDatabase(): Promise<void> {
  try {
    console.log('Setting up database...');
    const initSqlPath = join(__dirname, '../../database/init.sql');
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
      'programoptions',
      'campusprogram',
      'course',
      'courseeval',
      'courseprogram',
      'personalinfo',
      'admin',
      'otp',
      'adminotp',
      'academicinfo',
      'grievance',
      'response',
      'grievancehistory',
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
      { name: 'ProgramOptions', table: 'programoptions' },
      { name: 'CampusProgram', table: 'campusprogram' },
      { name: 'Course', table: 'course' },
      { name: 'CourseEval', table: 'courseeval' },
      { name: 'CourseProgram', table: 'courseprogram' },
      { name: 'PersonalInfo', table: 'personalinfo' },
      { name: 'Admin', table: 'admin' },
      { name: 'OTP', table: 'otp' },
      { name: 'AdminOTP', table: 'adminotp' },
      { name: 'AcademicInfo', table: 'academicinfo' },
      { name: 'Grievance', table: 'grievance' },
      { name: 'Response', table: 'response' },
      { name: 'GrievanceHistory', table: 'grievancehistory' },
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
      'grievancehistory',
      'response',
      'grievance',
      'adminotp',
      'otp',
      'academicinfo',
      'courseeval',
      'courseprogram',
      'course',
      'campusprogram',
      'programoptions',
      'programinfo',
      'admin',
      'personalinfo',
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
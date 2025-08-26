import { getPool } from './src/db';

async function checkIssueListSchema() {
  try {
    const pool = getPool();
    
    // Check the actual table structure
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'issuelist'
      ORDER BY ordinal_position;
    `);
    
    console.log('IssueList table columns:');
    result.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type}`);
    });
    
    // Also check a sample row
    const sampleResult = await pool.query('SELECT * FROM issuelist LIMIT 1');
    
    if (sampleResult.rows.length > 0) {
      console.log('\nSample row structure:');
      console.log(Object.keys(sampleResult.rows[0]));
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking schema:', error);
    process.exit(1);
  }
}

checkIssueListSchema();

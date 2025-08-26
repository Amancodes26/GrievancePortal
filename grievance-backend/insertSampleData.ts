import pkg from 'pg';
const { Pool } = pkg;
import bcrypt from 'bcryptjs';

const pool = new Pool({
  host: '10.22.12.115',
  user: 'jaspreet',
  password: 'dseu123#',
  database: 'grievanceportal',
  port: 5432,
  ssl: false
});

async function insertSampleData() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting sample data insertion...');
    
    // Hash password for "qwertyuiop"
    const hashedPassword = await bcrypt.hash('qwertyuiop', 10);
    console.log('🔐 Password hashed successfully');
    
    // Insert Issue List data
    console.log('📝 Inserting Issue List data...');
    await client.query(`
      INSERT INTO IssueList (IssueCode, IssueTitle, Category, IssueLevel, IsActive) VALUES
      (1001, 'Academic Query - Course Related', 'ACADEMIC', 'CAMPUS_LEVEL', true),
      (1002, 'Exam Schedule Conflict', 'EXAM', 'CAMPUS_LEVEL', true),
      (1003, 'Library Book Unavailable', 'OTHER', 'CAMPUS_LEVEL', true),
      (1004, 'Hostel Accommodation Issue', 'OTHER', 'CAMPUS_LEVEL', true),
      (1005, 'Fee Payment Problem', 'OTHER', 'CAMPUS_LEVEL', true)
      ON CONFLICT (IssueCode) DO NOTHING
    `);
    
    // Insert Students with hashed passwords
    console.log('👥 Inserting Student data...');
    await client.query(`
      INSERT INTO StudentInfo (RollNo, Name, Email, Phone, Password, IsVerified, AdmissionYear, Gender, CampusId) VALUES
      ($1, 'Test Student', 'test.student@dseu.ac.in', '9876543210', $2, true, 2024, 'Male', 1),
      ('2024CS001', 'Rahul Sharma', 'rahul.sharma@dseu.ac.in', '9876543211', $2, true, 2024, 'Male', 1),
      ('2024CS002', 'Priya Singh', 'priya.singh@dseu.ac.in', '9876543212', $2, true, 2024, 'Female', 1),
      ('2024EC001', 'Amit Kumar', 'amit.kumar@dseu.ac.in', '9876543213', $2, true, 2024, 'Male', 2),
      ('2024BBA001', 'Sneha Gupta', 'sneha.gupta@dseu.ac.in', '9876543214', $2, true, 2024, 'Female', 2)
      ON CONFLICT (RollNo) DO NOTHING
    `, ['41522063', hashedPassword]);
    
    // Insert Admin users
    console.log('👨‍💼 Inserting Admin data...');
    await client.query(`
      INSERT INTO Admin (AdminId, Name, Email, Phone, Password, Role, Department, IsVerified, IsActive) VALUES
      ('ADMIN001', 'Dr. Rajesh Verma', 'admin@dseu.ac.in', '9876543220', $1, 'SUPER_ADMIN', 'SYSTEM', true, true),
      ('ADMIN002', 'Prof. Sunita Mishra', 'campus.admin@dseu.ac.in', '9876543221', $1, 'CAMPUS_ADMIN', 'CAMPUS', true, true),
      ('ADMIN003', 'Dr. Arun Joshi', 'dept.admin@dseu.ac.in', '9876543222', $1, 'DEPT_ADMIN', 'ACADEMIC', true, true)
      ON CONFLICT (AdminId) DO NOTHING
    `, [hashedPassword]);
    
    // Insert sample grievances
    console.log('📋 Inserting Grievance data...');
    await client.query(`
      INSERT INTO Grievance (GrievanceId, RollNo, IssueCode, Subject, Description, Status, HasAttachments) VALUES
      ('GRV-2024-001001', '41522063', 1003, 'Library Book Not Available', 'Required textbook for Computer Science is not available in library', 'PENDING', false),
      ('GRV-2024-001002', '2024CS001', 1002, 'Exam Schedule Conflict', 'Two exams scheduled at same time', 'PENDING', false),
      ('GRV-2024-001003', '2024CS002', 1001, 'Course Material Missing', 'Course material not uploaded on portal', 'IN_PROGRESS', false)
      ON CONFLICT (GrievanceId) DO NOTHING
    `);
    
    // Verify insertion
    console.log('🔍 Verifying data insertion...');
    const studentCount = await client.query('SELECT COUNT(*) FROM StudentInfo');
    const adminCount = await client.query('SELECT COUNT(*) FROM Admin');
    const issueCount = await client.query('SELECT COUNT(*) FROM IssueList');
    const grievanceCount = await client.query('SELECT COUNT(*) FROM Grievance');
    
    console.log('✅ Sample data inserted successfully!');
    console.log(`📊 Database Status:
       Students: ${studentCount.rows[0].count}
       Admins: ${adminCount.rows[0].count}
       Issues: ${issueCount.rows[0].count}
       Grievances: ${grievanceCount.rows[0].count}`);
    
    // Test the specific user
    const testUser = await client.query('SELECT RollNo, Name, Email FROM StudentInfo WHERE RollNo = $1', ['41522063']);
    if (testUser.rows.length > 0) {
      console.log('🎯 Test user found:', testUser.rows[0]);
    }
    
  } catch (error) {
    console.error('❌ Error inserting sample data:', (error as Error).message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

insertSampleData()
  .then(() => {
    console.log('🏁 Sample data insertion completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Failed to insert sample data:', (error as Error).message);
    process.exit(1);
  });

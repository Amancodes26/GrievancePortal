import pool from './index';
import { OTP_EXPIRY_MINUTES, OTP_FREEZE_DURATION_HOURS } from '../constants/otpConstants';

// Use the pool from index.ts instead of creating a new one
export const db = pool;

// CampusInfo CRUD queries
export const CampusInfoQueries = {
  GET_ALL: `SELECT * FROM CampusInfo ORDER BY CampusId`,
  GET_BY_ID: `SELECT * FROM CampusInfo WHERE CampusId = $1`,
  GET_BY_CODE: `SELECT * FROM CampusInfo WHERE CampusCode = $1`,
  CREATE: `
    INSERT INTO CampusInfo (CampusCode, CampusName) 
    VALUES ($1, $2) 
    RETURNING *
  `,
  UPDATE: (fields: string[]) => `
    UPDATE CampusInfo SET
      ${fields.map((f, i) => `${f} = $${i + 2}`).join(",\n      ")},
      UpdatedAt = (NOW() AT TIME ZONE 'Asia/Kolkata')
    WHERE CampusId = $1 RETURNING *
  `,
  DELETE: `DELETE FROM CampusInfo WHERE CampusId = $1 RETURNING *`
};

// IssueList CRUD queries
export const IssueListQueries = {
  GET_ALL: `SELECT * FROM IssueList ORDER BY IssueCode`,
  GET_BY_CODE: `SELECT * FROM IssueList WHERE IssueCode = $1`,
  GET_ACTIVE: `SELECT * FROM IssueList WHERE IsActive = true ORDER BY IssueCode`,
  GET_BY_LEVEL: `SELECT * FROM IssueList WHERE IssueLevel = $1 AND IsActive = true ORDER BY IssueCode`,
  GET_BY_CATEGORY: `SELECT * FROM IssueList WHERE Category = $1 AND IsActive = true ORDER BY IssueCode`,
  CREATE: `
    INSERT INTO IssueList (IssueCode, IssueTitle, RequiredAttachments, IssueLevel, Category, IsActive) 
    VALUES ($1, $2, $3, $4, $5, COALESCE($6, true)) 
    RETURNING *
  `,
  UPDATE: (fields: string[]) => `
    UPDATE IssueList SET
      ${fields.map((f, i) => `${f} = $${i + 2}`).join(",\n      ")},
      UpdatedAt = (NOW() AT TIME ZONE 'Asia/Kolkata')
    WHERE IssueCode = $1 RETURNING *
  `,
  DELETE: `DELETE FROM IssueList WHERE IssueCode = $1 RETURNING *`
};

// ProgramInfo CRUD queries
export const ProgramInfoQueries = {
  GET_ALL: `SELECT * FROM ProgramInfo ORDER BY ProgramId`,
  GET_BY_ID: `SELECT * FROM ProgramInfo WHERE ProgramId = $1`,
  GET_BY_CODE: `SELECT * FROM ProgramInfo WHERE ProgramCode = $1`,
  CREATE: `
    INSERT INTO ProgramInfo (ProgramCode, ProgramName, ProgramType, TermType, Specialisation, SpecialCode, SpecialName) 
    VALUES ($1, $2, $3, $4, COALESCE($5, false), $6, $7) 
    RETURNING *
  `,
  UPDATE: (fields: string[]) => `
    UPDATE ProgramInfo SET
      ${fields.map((f, i) => `${f} = $${i + 2}`).join(",\n      ")},
      UpdatedAt = (NOW() AT TIME ZONE 'Asia/Kolkata')
    WHERE ProgramId = $1 RETURNING *
  `,
  DELETE: `DELETE FROM ProgramInfo WHERE ProgramId = $1 RETURNING *`
};

// StudentInfo CRUD queries
export const StudentInfoQueries = {
  GET_ALL: `SELECT * FROM StudentInfo ORDER BY RollNo`,
  GET_BY_ROLLNO: `SELECT * FROM StudentInfo WHERE RollNo = $1`,
  GET_BY_EMAIL: `SELECT * FROM StudentInfo WHERE Email = $1`,
  GET_BY_CAMPUS: `SELECT * FROM StudentInfo WHERE CampusId = $1 ORDER BY RollNo`,
  GET_VERIFIED: `SELECT * FROM StudentInfo WHERE IsVerified = true ORDER BY RollNo`,
  CREATE: `
    INSERT INTO StudentInfo (RollNo, Name, Email, Phone, Password, IsVerified, AdmissionYear, Gender, CampusId) 
    VALUES ($1, $2, $3, $4, $5, COALESCE($6, false), $7, $8, $9) 
    RETURNING *
  `,
  UPDATE: (fields: string[]) => `
    UPDATE StudentInfo SET
      ${fields.map((f, i) => `${f} = $${i + 2}`).join(",\n      ")},
      UpdatedAt = (NOW() AT TIME ZONE 'Asia/Kolkata')
    WHERE RollNo = $1 RETURNING *
  `,
  UPDATE_PASSWORD: `
    UPDATE StudentInfo SET 
      Password = $2, 
      UpdatedAt = (NOW() AT TIME ZONE 'Asia/Kolkata')
    WHERE RollNo = $1 RETURNING *
  `,
  UPDATE_VERIFICATION: `
    UPDATE StudentInfo SET 
      IsVerified = $2, 
      UpdatedAt = (NOW() AT TIME ZONE 'Asia/Kolkata')
    WHERE RollNo = $1 RETURNING *
  `,
  DELETE: `DELETE FROM StudentInfo WHERE RollNo = $1 RETURNING *`,
  // Check if student exists
  EXISTS: `SELECT EXISTS(SELECT 1 FROM StudentInfo WHERE RollNo = $1) as exists`,
  EMAIL_EXISTS: `SELECT EXISTS(SELECT 1 FROM StudentInfo WHERE Email = $1) as exists`
};

// Admin CRUD queries  
export const AdminQueries = {
  GET_ALL: `SELECT * FROM Admin ORDER BY AdminId`,
  GET_BY_ID: `SELECT * FROM Admin WHERE AdminId = $1`,
  GET_BY_EMAIL: `SELECT * FROM Admin WHERE Email = $1`,
  GET_BY_CAMPUS: `SELECT * FROM Admin WHERE CampusId = $1 ORDER BY AdminId`,
  GET_BY_ROLE: `SELECT * FROM Admin WHERE Role = $1 ORDER BY AdminId`,
  GET_BY_ROLE_AND_DEPARTMENT: `SELECT * FROM Admin WHERE Role = $1 AND Department = $2 ORDER BY AdminId`,
  GET_BY_CAMPUS_AND_DEPARTMENT: `SELECT * FROM Admin WHERE CampusId = $1 AND Department = $2 AND IsActive = true ORDER BY AdminId`,
  GET_ACTIVE: `SELECT * FROM Admin WHERE IsActive = true ORDER BY AdminId`,
  CREATE: `
    INSERT INTO Admin (AdminId, Name, Email, Phone, Password, Role, Department, IsVerified, IsActive, CampusId) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, false), COALESCE($9, true), $10) 
    RETURNING *
  `,
  UPDATE: (fields: string[]) => `
    UPDATE Admin SET
      ${fields.map((f, i) => `${f} = $${i + 2}`).join(",\n      ")},
      UpdatedAt = (NOW() AT TIME ZONE 'Asia/Kolkata')
    WHERE AdminId = $1 RETURNING *
  `,
  UPDATE_PASSWORD: `
    UPDATE Admin SET 
      Password = $2, 
      UpdatedAt = (NOW() AT TIME ZONE 'Asia/Kolkata')
    WHERE AdminId = $1 RETURNING *
  `,
  UPDATE_LAST_LOGIN: `
    UPDATE Admin SET 
      LastLogin = (NOW() AT TIME ZONE 'Asia/Kolkata'),
      UpdatedAt = (NOW() AT TIME ZONE 'Asia/Kolkata')
    WHERE AdminId = $1 RETURNING *
  `,
  DELETE: `DELETE FROM Admin WHERE AdminId = $1 RETURNING *`,
  // Check if admin exists
  EXISTS: `SELECT EXISTS(SELECT 1 FROM Admin WHERE AdminId = $1) as exists`,
  EMAIL_EXISTS: `SELECT EXISTS(SELECT 1 FROM Admin WHERE Email = $1) as exists`
};
// AcademicInfo CRUD queries
export const AcademicInfoQueries = {
  GET_ALL: `SELECT * FROM AcademicInfo ORDER BY Id`,
  GET_BY_ID: `SELECT * FROM AcademicInfo WHERE Id = $1`,
  GET_BY_ROLLNO: `SELECT * FROM AcademicInfo WHERE RollNo = $1`,
  GET_BY_ROLLNO_AND_TERM: `SELECT * FROM AcademicInfo WHERE RollNo = $1 AND Term = $2`,
  GET_BY_PROGRAM: `SELECT * FROM AcademicInfo WHERE ProgramId = $1 ORDER BY RollNo`,
  CREATE: `
    INSERT INTO AcademicInfo (RollNo, ProgramId, AcademicYear, Term, CampusId, Batch) 
    VALUES ($1, $2, $3, $4, $5, $6) 
    RETURNING *
  `,
  UPDATE: (fields: string[]) => `
    UPDATE AcademicInfo SET
      ${fields.map((f, i) => `${f} = $${i + 2}`).join(",\n      ")},
      UpdatedAt = (NOW() AT TIME ZONE 'Asia/Kolkata')
    WHERE Id = $1 RETURNING *
  `,
  UPDATE_BY_ROLLNO_AND_TERM: (fields: string[]) => `
    UPDATE AcademicInfo SET
      ${fields.map((f, i) => `${f} = $${i + 3}`).join(",\n      ")},
      UpdatedAt = (NOW() AT TIME ZONE 'Asia/Kolkata')
    WHERE RollNo = $1 AND Term = $2 RETURNING *
  `,
  DELETE: `DELETE FROM AcademicInfo WHERE Id = $1 RETURNING *`
};

// Grievance CRUD queries (without status field - using Tracking table instead)
export const GrievanceQueries = {
  CREATE: `
    INSERT INTO Grievance (
      GrievanceId, RollNo, CampusId, IssueCode, Subject, Description, HasAttachments
    ) VALUES (
      $1, $2, $3, $4, $5, $6, COALESCE($7, false)
    ) RETURNING *
  `,
  GET_BY_ID: `
    SELECT g.*, s.Name as StudentName, c.CampusName, i.IssueTitle 
    FROM Grievance g
    LEFT JOIN StudentInfo s ON g.RollNo = s.RollNo
    LEFT JOIN CampusInfo c ON g.CampusId = c.CampusId  
    LEFT JOIN IssueList i ON g.IssueCode = i.IssueCode
    WHERE g.Id = $1
  `,
  GET_BY_GRIEVANCE_ID: `
    SELECT g.*, s.Name as StudentName, c.CampusName, i.IssueTitle 
    FROM Grievance g
    LEFT JOIN StudentInfo s ON g.RollNo = s.RollNo
    LEFT JOIN CampusInfo c ON g.CampusId = c.CampusId
    LEFT JOIN IssueList i ON g.IssueCode = i.IssueCode
    WHERE g.GrievanceId = $1
  `,
  GET_BY_ROLLNO: `
    SELECT g.*, c.CampusName, i.IssueTitle 
    FROM Grievance g
    LEFT JOIN CampusInfo c ON g.CampusId = c.CampusId
    LEFT JOIN IssueList i ON g.IssueCode = i.IssueCode
    WHERE g.RollNo = $1 
    ORDER BY g.CreatedAt DESC
  `,
  GET_BY_CAMPUS: `
    SELECT g.*, s.Name as StudentName, i.IssueTitle 
    FROM Grievance g
    LEFT JOIN StudentInfo s ON g.RollNo = s.RollNo
    LEFT JOIN IssueList i ON g.IssueCode = i.IssueCode
    WHERE g.CampusId = $1 
    ORDER BY g.CreatedAt DESC
  `,
  GET_ALL: `
    SELECT g.*, s.Name as StudentName, c.CampusName, i.IssueTitle 
    FROM Grievance g
    LEFT JOIN StudentInfo s ON g.RollNo = s.RollNo
    LEFT JOIN CampusInfo c ON g.CampusId = c.CampusId
    LEFT JOIN IssueList i ON g.IssueCode = i.IssueCode
    ORDER BY g.CreatedAt DESC
  `,
  UPDATE: (fields: string[]) => `
    UPDATE Grievance SET
      ${fields.map((f, i) => `${f} = $${i + 2}`).join(",\n      ")},
      UpdatedAt = (NOW() AT TIME ZONE 'Asia/Kolkata')
    WHERE Id = $1 RETURNING *
  `,
  UPDATE_BY_GRIEVANCE_ID: (fields: string[]) => `
    UPDATE Grievance SET
      ${fields.map((f, i) => `${f} = $${i + 2}`).join(",\n      ")},
      UpdatedAt = (NOW() AT TIME ZONE 'Asia/Kolkata')
    WHERE GrievanceId = $1 RETURNING *
  `,
  DELETE: `DELETE FROM Grievance WHERE Id = $1 RETURNING *`,
  DELETE_BY_GRIEVANCE_ID: `DELETE FROM Grievance WHERE GrievanceId = $1 RETURNING *`,
  // Statistics queries
  COUNT_BY_CAMPUS: `SELECT CampusId, COUNT(*) as count FROM Grievance GROUP BY CampusId`,
  COUNT_BY_ISSUE: `SELECT IssueCode, COUNT(*) as count FROM Grievance GROUP BY IssueCode`,
  COUNT_RECENT: `
    SELECT COUNT(*) as count 
    FROM Grievance 
    WHERE CreatedAt > NOW() - INTERVAL '30 days'
  `
};

// Tracking CRUD queries (for grievance status management)
export const TrackingQueries = {
  CREATE: `
    INSERT INTO Tracking (
      GrievanceId, AdminStatus, StudentStatus, Stage, AdminId, AssignedTo, Comments
    ) VALUES (
      $1, COALESCE($2, 'pending'), COALESCE($3, 'submitted'), $4, $5, $6, $7
    ) RETURNING *
  `,
  GET_BY_GRIEVANCE_ID: `
    SELECT t.*, a1.Name as AdminName, a2.Name as AssignedToName
    FROM Tracking t
    LEFT JOIN Admin a1 ON t.AdminId = a1.AdminId
    LEFT JOIN Admin a2 ON t.AssignedTo = a2.AdminId
    WHERE t.GrievanceId = $1 
    ORDER BY t.UpdatedAt DESC
  `,
  GET_LATEST_BY_GRIEVANCE_ID: `
    SELECT t.*, a1.Name as AdminName, a2.Name as AssignedToName
    FROM Tracking t
    LEFT JOIN Admin a1 ON t.AdminId = a1.AdminId
    LEFT JOIN Admin a2 ON t.AssignedTo = a2.AdminId
    WHERE t.GrievanceId = $1 
    ORDER BY t.UpdatedAt DESC
    LIMIT 1
  `,
  UPDATE_STATUS: `
    INSERT INTO Tracking (GrievanceId, AdminStatus, StudentStatus, Stage, AdminId, Comments)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `,
  GET_BY_ADMIN_STATUS: `
    SELECT DISTINCT ON (t.GrievanceId) t.*, g.Subject, s.Name as StudentName
    FROM Tracking t
    JOIN Grievance g ON t.GrievanceId = g.GrievanceId
    LEFT JOIN StudentInfo s ON g.RollNo = s.RollNo
    WHERE t.AdminStatus = $1
    ORDER BY t.GrievanceId, t.UpdatedAt DESC
  `,
  GET_ASSIGNED_TO_ADMIN: `
    SELECT DISTINCT ON (t.GrievanceId) t.*, g.Subject, s.Name as StudentName
    FROM Tracking t
    JOIN Grievance g ON t.GrievanceId = g.GrievanceId
    LEFT JOIN StudentInfo s ON g.RollNo = s.RollNo
    WHERE t.AssignedTo = $1
    ORDER BY t.GrievanceId, t.UpdatedAt DESC
  `
};

// Attachment CRUD queries (updated with proper field names)
export const AttachmentQueries = {
  CREATE: `
    INSERT INTO Attachment (
      GrievanceId, FileName, FilePath, MimeType, FileSize, UploadedBy
    ) VALUES (
      $1, $2, $3, $4, $5, $6
    ) RETURNING *
  `,
  GET_BY_GRIEVANCE_ID: `
    SELECT * FROM Attachment 
    WHERE GrievanceId = $1 
    ORDER BY UploadedAt DESC
  `,
  GET_BY_ID: `
    SELECT * FROM Attachment WHERE Id = $1
  `,
  GET_ALL: `
    SELECT a.*, g.Subject, s.Name as StudentName
    FROM Attachment a
    JOIN Grievance g ON a.GrievanceId = g.GrievanceId
    LEFT JOIN StudentInfo s ON g.RollNo = s.RollNo
    ORDER BY a.UploadedAt DESC
  `,
  DELETE: `DELETE FROM Attachment WHERE Id = $1 RETURNING *`,
  DELETE_BY_GRIEVANCE_ID: `DELETE FROM Attachment WHERE GrievanceId = $1 RETURNING *`,
  // Update attachment metadata
  UPDATE_METADATA: (fields: string[]) => `
    UPDATE Attachment SET
      ${fields.map((f, i) => `${f} = $${i + 2}`).join(",\n      ")},
      UpdatedAt = (NOW() AT TIME ZONE 'Asia/Kolkata')
    WHERE Id = $1 RETURNING *
  `
};

// Utility and Validation Queries
export const ValidationQueries = {
  // Check if email is already taken in StudentInfo
  STUDENT_EMAIL_EXISTS: `
    SELECT EXISTS(SELECT 1 FROM StudentInfo WHERE Email = $1) as exists
  `,
  // Check if email is already taken in Admin
  ADMIN_EMAIL_EXISTS: `
    SELECT EXISTS(SELECT 1 FROM Admin WHERE Email = $1) as exists
  `,
  // Check if roll number format is valid (DSEU format)
  VALIDATE_ROLLNO_FORMAT: `
    SELECT $1 ~ '^[0-9]{8,12}$' as is_valid
  `,
  // Check if grievance ID format is valid
  VALIDATE_GRIEVANCE_ID_FORMAT: `
    SELECT $1 ~ '^GRV[0-9]{10}$' as is_valid
  `,
  // Get duplicate emails in StudentInfo
  GET_DUPLICATE_STUDENT_EMAILS: `
    SELECT Email, COUNT(*) as count 
    FROM StudentInfo 
    GROUP BY Email 
    HAVING COUNT(*) > 1
  `,
  // Get students with incomplete profiles
  GET_INCOMPLETE_STUDENT_PROFILES: `
    SELECT RollNo, Name, Email 
    FROM StudentInfo 
    WHERE Phone IS NULL 
    OR Gender IS NULL 
    OR CampusId IS NULL
  `,
  // Check if issue code exists and is active
  ISSUE_CODE_EXISTS: `
    SELECT EXISTS(
      SELECT 1 FROM IssueList 
      WHERE IssueCode = $1 AND IsActive = true
    ) as exists
  `,
  // Check if campus ID exists
  CAMPUS_EXISTS: `
    SELECT EXISTS(SELECT 1 FROM CampusInfo WHERE CampusId = $1) as exists
  `
};

// Statistics and Analytics Queries
export const StatsQueries = {
  // Get overall system statistics
  GET_SYSTEM_STATS: `
    SELECT 
      (SELECT COUNT(*) FROM StudentInfo) as total_students,
      (SELECT COUNT(*) FROM StudentInfo WHERE IsVerified = true) as verified_students,
      (SELECT COUNT(*) FROM Admin WHERE IsActive = true) as active_admins,
      (SELECT COUNT(*) FROM Grievance) as total_grievances,
      (SELECT COUNT(*) FROM CampusInfo) as total_campuses,
      (SELECT COUNT(*) FROM IssueList WHERE IsActive = true) as active_issue_types
  `,
  // Get grievance statistics by status
  GET_GRIEVANCE_STATUS_STATS: `
    SELECT 
      t.AdminStatus,
      COUNT(*) as count
    FROM (
      SELECT DISTINCT ON (GrievanceId) GrievanceId, AdminStatus
      FROM Tracking
      ORDER BY GrievanceId, UpdatedAt DESC
    ) t
    GROUP BY t.AdminStatus
    ORDER BY count DESC
  `,
  // Get monthly grievance trends
  GET_MONTHLY_GRIEVANCE_TRENDS: `
    SELECT 
      DATE_TRUNC('month', CreatedAt) as month,
      COUNT(*) as grievance_count
    FROM Grievance
    WHERE CreatedAt >= NOW() - INTERVAL '12 months'
    GROUP BY DATE_TRUNC('month', CreatedAt)
    ORDER BY month DESC
  `,
  // Get campus-wise grievance distribution
  GET_CAMPUS_GRIEVANCE_STATS: `
    SELECT 
      c.CampusName,
      c.CampusCode,
      COUNT(g.Id) as grievance_count
    FROM CampusInfo c
    LEFT JOIN Grievance g ON c.CampusId = g.CampusId
    GROUP BY c.CampusId, c.CampusName, c.CampusCode
    ORDER BY grievance_count DESC
  `,
  // Get issue type distribution
  GET_ISSUE_TYPE_STATS: `
    SELECT 
      i.IssueTitle,
      i.IssueCode,
      COUNT(g.Id) as grievance_count
    FROM IssueList i
    LEFT JOIN Grievance g ON i.IssueCode = g.IssueCode
    WHERE i.IsActive = true
    GROUP BY i.IssueCode, i.IssueTitle
    ORDER BY grievance_count DESC
  `
};

// Sample Data for Testing (Updated to match current schema)
export const TemporaryDataQueries = {
  SAMPLE_CAMPUS_DATA: `
    INSERT INTO CampusInfo (CampusCode, CampusName) VALUES 
    ('ABIT', 'ARYABHATT DSEU ASHOK VIHAR CAMPUS'),
    ('AIT', 'AMBEDKAR DSEU CAMPUS-I'),
    ('BPIBS', 'BHAI PARMANAND DSEU SHAKARPUR CAMPUS-II'),
    ('CDO', 'CHAMPS DSEU OKHLA CAMPUS'),
    ('CVR', 'SIR C.V. RAMAN DSEU DHEERPUR CAMPUS'),
    ('DDC', 'DSEU DWARKA CAMPUS'),
    ('DJC', 'DSEU JAFFARPUR CAMPUS'),
    ('DRC', 'DSEU RAJOKRI CAMPUS'),
    ('DWC', 'DSEU WAZIRPUR-I CAMPUS'),
    ('GBP', 'G.B. PANT DSEU OKHLA-I CAMPUS');
  `,
  SAMPLE_PROGRAM_DATA: `
    INSERT INTO ProgramInfo (ProgramCode, ProgramName, ProgramType, TermType, Specialisation, SpecialCode, SpecialName) VALUES 
    ('BTECH-CSE', 'Bachelor of Technology in Computer Science', 'BTech', 'semester', true, 'AI-ML', 'Artificial Intelligence and Machine Learning'),
    ('BTECH-ECE', 'Bachelor of Technology in Electronics', 'BTech', 'semester', true, 'VLSI', 'VLSI Design'),
    ('BTECH-ME', 'Bachelor of Technology in Mechanical Engineering', 'BTech', 'semester', false, NULL, NULL),
    ('BBA', 'Bachelor of Business Administration', 'BBA', 'semester', true, 'FM', 'Financial Management'),
    ('BCA', 'Bachelor of Computer Applications', 'BCA', 'semester', false, NULL, NULL);
  `,
  SAMPLE_ISSUE_DATA: `
    INSERT INTO IssueList (IssueCode, IssueTitle, RequiredAttachments, IssueLevel, IsActive) VALUES 
    ('EXAM001', 'Examination Related Issues', false, 'academic', true),
    ('FEES001', 'Fee Payment Issues', true, 'financial', true),
    ('INFRA001', 'Infrastructure Problems', true, 'facility', true),
    ('CERT001', 'Certificate Issues', true, 'academic', true),
    ('TECH001', 'Technical Support', false, 'technical', true);
  `,
  SAMPLE_STUDENT_DATA: `
    INSERT INTO StudentInfo (RollNo, Name, Email, Phone, IsVerified, AdmissionYear, Gender, CampusId) VALUES 
    ('41522014', 'Anupam Kumar', '9582anupamk@gmail.com', '9876543210', false, 2022, 'Male', 1),
    ('41522026', 'Harshit Tiwari', 'tharshit0812@gmail.com', '9876543211', false, 2022, 'Male', 1),
    ('41522068', 'Manis Sharma', 'btech41522068@dseu.ac.in', '9876543212', false, 2022, 'Male', 2),
    ('41522047', 'Pankaj Kumar', 'pankajkumar086420@gmail.com', '9876543213', false, 2022, 'Male', 1),
    ('41522054', 'Samagra Singh', 'dinomafia16@gmail.com', '9876543214', false, 2022, 'Male', 2);
  `,
  SAMPLE_ADMIN_DATA: `
    INSERT INTO Admin (AdminId, Name, Email, Phone, Role, IsVerified, IsActive, CampusId) VALUES 
    ('admin001', 'System Administrator', 'btech41522047@dseu.ac.in', '9876543215', 'super_admin', true, true, NULL),
    ('admin002', 'Campus Admin ABIT', 'btech41522068@dseu.ac.in', '9876543216', 'campus_admin', true, true, 1),
    ('admin003', 'Campus Admin AIT', 'sagar200422@gmail.com', '9876543217', 'campus_admin', true, true, 2);
  `,
  DELETE_ALL_DATA: `
    TRUNCATE TABLE Attachment, Tracking, Grievance, AcademicInfo, StudentInfo, Admin, IssueList, ProgramInfo, CampusInfo RESTART IDENTITY CASCADE;
  `,
  DELETE_SAMPLE_DATA_ONLY: `
    DELETE FROM StudentInfo WHERE RollNo IN ('41522014', '41522026', '41522068', '41522047', '41522054');
    DELETE FROM Admin WHERE AdminId IN ('admin001', 'admin002', 'admin003');
    DELETE FROM IssueList WHERE IssueCode IN ('EXAM001', 'FEES001', 'INFRA001', 'CERT001', 'TECH001');
    DELETE FROM ProgramInfo WHERE ProgramCode IN ('BTECH-CSE', 'BTECH-ECE', 'BTECH-ME', 'BBA', 'BCA');
    DELETE FROM CampusInfo WHERE CampusCode IN ('ABIT', 'AIT', 'BPIBS', 'CDO', 'CVR', 'DDC', 'DJC', 'DRC', 'DWC', 'GBP');
  `
};
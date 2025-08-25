import pool from './index';
import { OTP_EXPIRY_MINUTES, OTP_FREEZE_DURATION_HOURS } from '../constants/otpConstants';

// Use the pool from index.ts instead of creating a new one
export const db = pool;

/**
 * DSEU Grievance Portal Database Queries
 * Updated to match init.sql schema (2025)
 * 
 * Key Updates:
 * - Tracking table now uses history-based approach with ResponseText, ResponseAt
 * - IssueList supports RequiredAttachments array and proper Category/Level enums
 * - Added Admin_Audit_Log table support 
 * - Updated field names to match exact database schema (PascalCase)
 * - Added comprehensive utility and validation queries
 * - Enhanced statistics and analytics queries
 * - Updated sample data to match DSEU campus structure
 */

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
    VALUES ($1, $2, $3, $4, COALESCE($5, 'OTHER'), COALESCE($6, true)) 
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

// PersonalInfo CRUD queries
export const PersonalInfoQueries = {
  GET_ALL: `SELECT * FROM PersonalInfo ORDER BY RollNo`,
  GET_BY_ROLLNO: `SELECT * FROM PersonalInfo WHERE RollNo = $1`,
  GET_BY_EMAIL: `SELECT * FROM PersonalInfo WHERE Email = $1`,
  GET_BY_CAMPUS: `SELECT * FROM PersonalInfo WHERE CampusId = $1 ORDER BY RollNo`,
  GET_VERIFIED: `SELECT * FROM PersonalInfo WHERE IsVerified = true ORDER BY RollNo`,
  CREATE: `
    INSERT INTO PersonalInfo (RollNo, Name, Email, Phone, Password, IsVerified, AdmissionYear, Gender, CampusId) 
    VALUES ($1, $2, $3, $4, $5, COALESCE($6, false), $7, $8, $9) 
    RETURNING *
  `,
  UPDATE: (fields: string[]) => `
    UPDATE PersonalInfo SET
      ${fields.map((f, i) => `${f} = $${i + 2}`).join(",\n      ")},
      UpdatedAt = (NOW() AT TIME ZONE 'Asia/Kolkata')
    WHERE RollNo = $1 RETURNING *
  `,
  UPDATE_PASSWORD: `
    UPDATE PersonalInfo SET 
      Password = $2, 
      UpdatedAt = (NOW() AT TIME ZONE 'Asia/Kolkata')
    WHERE RollNo = $1 RETURNING *
  `,
  UPDATE_VERIFICATION: `
    UPDATE PersonalInfo SET 
      IsVerified = $2, 
      UpdatedAt = (NOW() AT TIME ZONE 'Asia/Kolkata')
    WHERE RollNo = $1 RETURNING *
  `,
  DELETE: `DELETE FROM PersonalInfo WHERE RollNo = $1 RETURNING *`,
  // Check if student exists
  EXISTS: `SELECT EXISTS(SELECT 1 FROM PersonalInfo WHERE RollNo = $1) as exists`,
  EMAIL_EXISTS: `SELECT EXISTS(SELECT 1 FROM PersonalInfo WHERE Email = $1) as exists`
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
    LEFT JOIN PersonalInfo s ON g.RollNo = s.RollNo
    LEFT JOIN CampusInfo c ON g.CampusId = c.CampusId  
    LEFT JOIN IssueList i ON g.IssueCode = i.IssueCode
    WHERE g.Id = $1
  `,
  GET_BY_GRIEVANCE_ID: `
    SELECT g.*, s.Name as StudentName, c.CampusName, i.IssueTitle 
    FROM Grievance g
    LEFT JOIN PersonalInfo s ON g.RollNo = s.RollNo
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
    LEFT JOIN PersonalInfo s ON g.RollNo = s.RollNo
    LEFT JOIN IssueList i ON g.IssueCode = i.IssueCode
    WHERE g.CampusId = $1 
    ORDER BY g.CreatedAt DESC
  `,
  GET_ALL: `
    SELECT g.*, s.Name as StudentName, c.CampusName, i.IssueTitle 
    FROM Grievance g
    LEFT JOIN PersonalInfo s ON g.RollNo = s.RollNo
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

// Tracking CRUD queries (for grievance status management with history-based approach)
export const TrackingQueries = {
  CREATE: `
    INSERT INTO Tracking (
      GrievanceId, ResponseText, AdminStatus, StudentStatus, ResponseBy, RedirectTo, RedirectFrom, IsRedirect, HasAttachments
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, COALESCE($8, false), COALESCE($9, false)
    ) RETURNING *
  `,
  GET_BY_GRIEVANCE_ID: `
    SELECT t.*, a1.Name as AdminName, a2.Name as RedirectToName
    FROM Tracking t
    LEFT JOIN Admin a1 ON t.ResponseBy = a1.AdminId
    LEFT JOIN Admin a2 ON t.RedirectTo = a2.AdminId
    WHERE t.GrievanceId = $1 
    ORDER BY t.ResponseAt DESC
  `,
  GET_LATEST_BY_GRIEVANCE_ID: `
    SELECT t.*, a1.Name as AdminName, a2.Name as RedirectToName
    FROM Tracking t
    LEFT JOIN Admin a1 ON t.ResponseBy = a1.AdminId
    LEFT JOIN Admin a2 ON t.RedirectTo = a2.AdminId
    WHERE t.GrievanceId = $1 
    ORDER BY t.ResponseAt DESC
    LIMIT 1
  `,
  ADD_RESPONSE: `
    INSERT INTO Tracking (GrievanceId, ResponseText, AdminStatus, StudentStatus, ResponseBy, HasAttachments)
    VALUES ($1, $2, $3, $4, $5, COALESCE($6, false))
    RETURNING *
  `,
  REDIRECT_GRIEVANCE: `
    INSERT INTO Tracking (GrievanceId, ResponseText, AdminStatus, StudentStatus, ResponseBy, RedirectTo, RedirectFrom, IsRedirect)
    VALUES ($1, $2, 'REDIRECTED', 'UNDER_REVIEW', $3, $4, $5, true)
    RETURNING *
  `,
  GET_BY_ADMIN_STATUS: `
    SELECT DISTINCT ON (t.GrievanceId) t.*, g.Subject, s.Name as StudentName
    FROM Tracking t
    JOIN Grievance g ON t.GrievanceId = g.GrievanceId
    LEFT JOIN PersonalInfo s ON g.RollNo = s.RollNo
    WHERE t.AdminStatus = $1
    ORDER BY t.GrievanceId, t.ResponseAt DESC
  `,
  GET_REDIRECTED_TO_ADMIN: `
    SELECT DISTINCT ON (t.GrievanceId) t.*, g.Subject, s.Name as StudentName
    FROM Tracking t
    JOIN Grievance g ON t.GrievanceId = g.GrievanceId
    LEFT JOIN PersonalInfo s ON g.RollNo = s.RollNo
    WHERE t.RedirectTo = $1 AND t.IsRedirect = true
    ORDER BY t.GrievanceId, t.ResponseAt DESC
  `,
  GET_GRIEVANCE_HISTORY: `
    SELECT t.*, a1.Name as AdminName
    FROM Tracking t
    LEFT JOIN Admin a1 ON t.ResponseBy = a1.AdminId
    WHERE t.GrievanceId = $1
    ORDER BY t.ResponseAt ASC
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
    LEFT JOIN PersonalInfo s ON g.RollNo = s.RollNo
    ORDER BY a.UploadedAt DESC
  `,
  DELETE: `DELETE FROM Attachment WHERE Id = $1 RETURNING *`,
  DELETE_BY_GRIEVANCE_ID: `DELETE FROM Attachment WHERE GrievanceId = $1 RETURNING *`,
  // Update attachment metadata - removed as per new schema (no UpdatedAt field in Attachment)
};

// Admin Audit Log CRUD queries
export const AdminAuditLogQueries = {
  CREATE: `
    INSERT INTO Admin_Audit_Log (
      AdminId, Action_Type, Email, AccessedResource, IP_Address, IsActive, Query, Role
    ) VALUES (
      $1, $2, $3, $4, $5, COALESCE($6, true), $7, $8
    ) RETURNING *
  `,
  GET_BY_ADMIN: `
    SELECT * FROM Admin_Audit_Log 
    WHERE AdminId = $1 
    ORDER BY Timestamp DESC
  `,
  GET_BY_ACTION_TYPE: `
    SELECT * FROM Admin_Audit_Log 
    WHERE Action_Type = $1 
    ORDER BY Timestamp DESC
  `,
  GET_BY_DATE_RANGE: `
    SELECT * FROM Admin_Audit_Log 
    WHERE Timestamp BETWEEN $1 AND $2 
    ORDER BY Timestamp DESC
  `,
  GET_RECENT: `
    SELECT aal.*, a.Name as AdminName 
    FROM Admin_Audit_Log aal
    LEFT JOIN Admin a ON aal.AdminId = a.AdminId
    WHERE aal.IsActive = true
    ORDER BY aal.Timestamp DESC 
    LIMIT $1
  `,
  GET_BY_IP: `
    SELECT * FROM Admin_Audit_Log 
    WHERE IP_Address = $1 
    ORDER BY Timestamp DESC
  `,
  GET_ALL: `
    SELECT aal.*, a.Name as AdminName 
    FROM Admin_Audit_Log aal
    LEFT JOIN Admin a ON aal.AdminId = a.AdminId
    WHERE aal.IsActive = true
    ORDER BY aal.Timestamp DESC
  `,
  DEACTIVATE: `
    UPDATE Admin_Audit_Log SET 
      IsActive = false 
    WHERE id = $1 RETURNING *
  `,
  DELETE_OLD_LOGS: `
    DELETE FROM Admin_Audit_Log 
    WHERE Timestamp < NOW() - INTERVAL '$1 days'
    RETURNING count(*) as deleted_count
  `
};

// Utility and Validation Queries
export const ValidationQueries = {
  // Check if email is already taken in PersonalInfo
  STUDENT_EMAIL_EXISTS: `
    SELECT EXISTS(SELECT 1 FROM PersonalInfo WHERE Email = $1) as exists
  `,
  // Check if email is already taken in Admin
  ADMIN_EMAIL_EXISTS: `
    SELECT EXISTS(SELECT 1 FROM Admin WHERE Email = $1) as exists
  `,
  // Check if roll number format is valid (DSEU format)
  VALIDATE_ROLLNO_FORMAT: `
    SELECT $1 ~ '^[0-9]{8,12}$' as is_valid
  `,
  // Check if grievance ID format is valid (updated format from init.sql)
  VALIDATE_GRIEVANCE_ID_FORMAT: `
    SELECT $1 ~ '^GRV-[0-9]{4}-[0-9]{3}$' as is_valid
  `,
  // Get duplicate emails in PersonalInfo
  GET_DUPLICATE_STUDENT_EMAILS: `
    SELECT Email, COUNT(*) as count 
    FROM PersonalInfo 
    GROUP BY Email 
    HAVING COUNT(*) > 1
  `,
  // Get students with incomplete profiles
  GET_INCOMPLETE_STUDENT_PROFILES: `
    SELECT RollNo, Name, Email 
    FROM PersonalInfo 
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
  `,
  // Check if admin has proper role-department combination
  VALIDATE_ADMIN_ROLE_DEPARTMENT: `
    SELECT CASE 
      WHEN $1 = 'SUPER_ADMIN' AND $2 = 'SYSTEM' THEN true
      WHEN $1 = 'CAMPUS_ADMIN' AND $2 = 'CAMPUS' THEN true
      WHEN $1 = 'DEPT_ADMIN' AND $2 IN ('ACADEMIC', 'EXAM') THEN true
      ELSE false
    END as is_valid
  `,
  // Check if tracking status transition is valid
  VALIDATE_STATUS_TRANSITION: `
    SELECT CASE 
      WHEN $1 = 'NEW' AND $2 IN ('PENDING', 'REDIRECTED') THEN true
      WHEN $1 = 'PENDING' AND $2 IN ('RESOLVED', 'REJECTED', 'REDIRECTED') THEN true
      WHEN $1 = 'REDIRECTED' AND $2 IN ('PENDING', 'RESOLVED', 'REJECTED') THEN true
      WHEN $1 = 'RESOLVED' THEN false  -- Cannot change from resolved
      WHEN $1 = 'REJECTED' THEN false  -- Cannot change from rejected
      ELSE false
    END as is_valid
  `,
  // Get grievances without any tracking entries (orphaned)
  GET_ORPHANED_GRIEVANCES: `
    SELECT g.GrievanceId, g.Subject, g.CreatedAt
    FROM Grievance g
    LEFT JOIN Tracking t ON g.GrievanceId = t.GrievanceId
    WHERE t.GrievanceId IS NULL
  `,
  // Check attachment requirements for issue type
  GET_REQUIRED_ATTACHMENTS: `
    SELECT RequiredAttachments
    FROM IssueList
    WHERE IssueCode = $1 AND IsActive = true
  `
};

// Statistics and Analytics Queries
export const StatsQueries = {
  // Get overall system statistics
  GET_SYSTEM_STATS: `
    SELECT 
      (SELECT COUNT(*) FROM PersonalInfo) as total_students,
      (SELECT COUNT(*) FROM PersonalInfo WHERE IsVerified = true) as verified_students,
      (SELECT COUNT(*) FROM Admin WHERE IsActive = true) as active_admins,
      (SELECT COUNT(*) FROM Grievance) as total_grievances,
      (SELECT COUNT(*) FROM CampusInfo) as total_campuses,
      (SELECT COUNT(*) FROM IssueList WHERE IsActive = true) as active_issue_types,
      (SELECT COUNT(*) FROM Attachment) as total_attachments,
      (SELECT COUNT(*) FROM Admin_Audit_Log WHERE IsActive = true) as audit_log_entries
  `,
  // Get grievance statistics by status (using latest status from Tracking)
  GET_GRIEVANCE_STATUS_STATS: `
    SELECT 
      t.AdminStatus,
      t.StudentStatus,
      COUNT(*) as count
    FROM (
      SELECT DISTINCT ON (GrievanceId) GrievanceId, AdminStatus, StudentStatus
      FROM Tracking
      ORDER BY GrievanceId, ResponseAt DESC
    ) t
    GROUP BY t.AdminStatus, t.StudentStatus
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
      COUNT(g.Id) as grievance_count,
      COUNT(CASE WHEN a.AdminStatus = 'RESOLVED' THEN 1 END) as resolved_count
    FROM CampusInfo c
    LEFT JOIN Grievance g ON c.CampusId = g.CampusId
    LEFT JOIN (
      SELECT DISTINCT ON (GrievanceId) GrievanceId, AdminStatus
      FROM Tracking
      ORDER BY GrievanceId, ResponseAt DESC
    ) a ON g.GrievanceId = a.GrievanceId
    GROUP BY c.CampusId, c.CampusName, c.CampusCode
    ORDER BY grievance_count DESC
  `,
  // Get issue type distribution
  GET_ISSUE_TYPE_STATS: `
    SELECT 
      i.IssueTitle,
      i.IssueCode,
      i.IssueLevel,
      i.Category,
      COUNT(g.Id) as grievance_count
    FROM IssueList i
    LEFT JOIN Grievance g ON i.IssueCode = g.IssueCode
    WHERE i.IsActive = true
    GROUP BY i.IssueCode, i.IssueTitle, i.IssueLevel, i.Category
    ORDER BY grievance_count DESC
  `,
  // Get admin activity statistics
  GET_ADMIN_ACTIVITY_STATS: `
    SELECT 
      a.AdminId,
      a.Name,
      a.Role,
      COUNT(t.Id) as responses_count,
      COUNT(CASE WHEN t.IsRedirect = true THEN 1 END) as redirects_made,
      MAX(t.ResponseAt) as last_activity
    FROM Admin a
    LEFT JOIN Tracking t ON a.AdminId = t.ResponseBy
    WHERE a.IsActive = true
    GROUP BY a.AdminId, a.Name, a.Role
    ORDER BY responses_count DESC
  `
};

// Database Health and Utility Queries
export const UtilityQueries = {
  // Check if all required tables exist (from init.sql function)
  CHECK_ALL_TABLES_EXIST: `SELECT check_all_tables_exist() as all_tables_exist`,
  
  // Get table status with record counts (from init.sql function)
  GET_TABLE_STATUS: `SELECT * FROM get_table_status() ORDER BY tbl_name`,
  
  // Database connection health check
  GET_DB_HEALTH: `
    SELECT 
      'Database Connected' as status,
      NOW() AT TIME ZONE 'Asia/Kolkata' as server_time,
      version() as postgres_version
  `,
  
  // Get recent grievance activity
  GET_RECENT_ACTIVITY: `
    SELECT 
      'grievance' as activity_type,
      g.GrievanceId as reference_id,
      g.Subject as description,
      g.CreatedAt as activity_time,
      s.Name as user_name
    FROM Grievance g
    LEFT JOIN PersonalInfo s ON g.RollNo = s.RollNo
    WHERE g.CreatedAt > NOW() - INTERVAL '24 hours'
    
    UNION ALL
    
    SELECT 
      'response' as activity_type,
      t.GrievanceId as reference_id,
      LEFT(t.ResponseText, 50) || '...' as description,
      t.ResponseAt as activity_time,
      a.Name as user_name
    FROM Tracking t
    LEFT JOIN Admin a ON t.ResponseBy = a.AdminId
    WHERE t.ResponseAt > NOW() - INTERVAL '24 hours'
    
    ORDER BY activity_time DESC
    LIMIT 20
  `,
  
  // Get grievances with latest status
  GET_GRIEVANCES_WITH_LATEST_STATUS: `
    SELECT 
      g.*,
      s.Name as StudentName,
      c.CampusName,
      i.IssueTitle,
      lt.AdminStatus,
      lt.StudentStatus,
      lt.ResponseAt as LastUpdate,
      a.Name as LastRespondedBy
    FROM Grievance g
    LEFT JOIN PersonalInfo s ON g.RollNo = s.RollNo
    LEFT JOIN CampusInfo c ON g.CampusId = c.CampusId
    LEFT JOIN IssueList i ON g.IssueCode = i.IssueCode
    LEFT JOIN LATERAL (
      SELECT * FROM Tracking t 
      WHERE t.GrievanceId = g.GrievanceId 
      ORDER BY t.ResponseAt DESC 
      LIMIT 1
    ) lt ON true
    LEFT JOIN Admin a ON lt.ResponseBy = a.AdminId
    ORDER BY g.CreatedAt DESC
  `
};

// Sample Data for Testing (Updated to match current schema)
export const TemporaryDataQueries = {
  SAMPLE_CAMPUS_DATA: `
    INSERT INTO CampusInfo (CampusCode, CampusName) VALUES 
    ('DDC', 'DSEU Dwarka Campus'),
    ('DSC', 'DSEU Shakarpur Campus'),
    ('DKC', 'DSEU Kashmere Gate Campus'),  
    ('DPC', 'DSEU Pusa Campus'),
    ('DVC', 'DSEU Vivek Vihar Campus'),
    ('DRC', 'DSEU Rohini Campus'),
    ('DNC', 'DSEU Narela Campus'),
    ('DDC2', 'DSEU Dwarka Sector-9 Campus'),
    ('DBC', 'DSEU Bawana Campus'),
    ('DFC', 'DSEU Faridabad Campus'),
    ('DGC', 'DSEU Gurgaon Campus')
    ON CONFLICT (CampusCode) DO NOTHING;
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
    INSERT INTO IssueList (IssueCode, IssueTitle, RequiredAttachments, IssueLevel, Category, IsActive) VALUES 
    (1001, 'Examination Related Issues', ARRAY['marksheet', 'admit_card'], 'CAMPUS_LEVEL', 'EXAM', true),
    (1002, 'Fee Payment Issues', ARRAY['receipt', 'bank_statement'], 'CAMPUS_LEVEL', 'OTHER', true),
    (1003, 'Infrastructure Problems', ARRAY['photo'], 'CAMPUS_LEVEL', 'OTHER', true),
    (1004, 'Certificate Issues', ARRAY['application', 'id_proof'], 'UNIVERSITY_LEVEL', 'ACADEMIC', true),
    (1005, 'Technical Support', ARRAY[], 'CAMPUS_LEVEL', 'OTHER', true);
  `,
  SAMPLE_STUDENT_DATA: `
    INSERT INTO PersonalInfo (RollNo, Name, Email, Phone, IsVerified, AdmissionYear, Gender, CampusId) VALUES 
    ('41522014', 'Anupam Kumar', '9582anupamk@gmail.com', '9876543210', false, 2022, 'Male', 1),
    ('41522026', 'Harshit Tiwari', 'tharshit0812@gmail.com', '9876543211', false, 2022, 'Male', 1),
    ('41522068', 'Manis Sharma', 'btech41522068@dseu.ac.in', '9876543212', false, 2022, 'Male', 2),
    ('41522047', 'Pankaj Kumar', 'pankajkumar086420@gmail.com', '9876543213', false, 2022, 'Male', 1),
    ('41522054', 'Samagra Singh', 'dinomafia16@gmail.com', '9876543214', false, 2022, 'Male', 2);
  `,
  SAMPLE_ADMIN_DATA: `
    INSERT INTO Admin (AdminId, Name, Email, Phone, Role, Department, IsVerified, IsActive, CampusId) VALUES 
    ('admin001', 'System Administrator', 'admin@dseu.ac.in', '9876543215', 'SUPER_ADMIN', 'SYSTEM', true, true, NULL),
    ('admin002', 'Campus Admin DDC', 'ddcadmin@dseu.ac.in', '9876543216', 'CAMPUS_ADMIN', 'CAMPUS', true, true, 1),
    ('admin003', 'Dept Admin Academic', 'academicdept@dseu.ac.in', '9876543217', 'DEPT_ADMIN', 'ACADEMIC', true, true, 2),
    ('admin004', 'Dept Admin Exam', 'examdept@dseu.ac.in', '9876543218', 'DEPT_ADMIN', 'EXAM', true, true, 1);
  `,
  DELETE_ALL_DATA: `
    TRUNCATE TABLE Admin_Audit_Log, Attachment, Tracking, Grievance, AcademicInfo, PersonalInfo, Admin, IssueList, ProgramInfo, CampusInfo RESTART IDENTITY CASCADE;
  `,
  DELETE_SAMPLE_DATA_ONLY: `
    DELETE FROM PersonalInfo WHERE RollNo IN ('41522014', '41522026', '41522068', '41522047', '41522054');
    DELETE FROM Admin WHERE AdminId IN ('admin001', 'admin002', 'admin003', 'admin004');
    DELETE FROM IssueList WHERE IssueCode IN (1001, 1002, 1003, 1004, 1005);
    DELETE FROM ProgramInfo WHERE ProgramCode IN ('BTECH-CSE', 'BTECH-ECE', 'BTECH-ME', 'BBA', 'BCA');
    DELETE FROM CampusInfo WHERE CampusCode IN ('DDC', 'DSC', 'DKC', 'DPC', 'DVC', 'DRC', 'DNC', 'DDC2', 'DBC', 'DFC', 'DGC');
  `,
  // Sample grievance with tracking
  SAMPLE_GRIEVANCE_WITH_TRACKING: `
    WITH new_grievance AS (
      INSERT INTO Grievance (GrievanceId, RollNo, CampusId, IssueCode, Subject, Description, HasAttachments) 
      VALUES ('GRV-2025-001', '41522014', 1, 1001, 'Sample Exam Issue', 'This is a sample grievance for testing purposes', false)
      RETURNING *
    )
    INSERT INTO Tracking (GrievanceId, ResponseText, AdminStatus, StudentStatus, ResponseBy)
    SELECT 'GRV-2025-001', 'Grievance received and under review', 'PENDING', 'UNDER_REVIEW', 'admin002'
    FROM new_grievance;
  `,
  // Initialize with actual DSEU campus data (from init.sql)
  INITIALIZE_DSEU_CAMPUSES: `
    INSERT INTO CampusInfo (CampusId, CampusCode, CampusName) VALUES 
    (1016, 'DDC', 'DSEU Dwarka Campus'),
    (1001, 'DSC', 'DSEU Shakarpur Campus'),
    (1002, 'DKC', 'DSEU Kashmere Gate Campus'),  
    (1003, 'DPC', 'DSEU Pusa Campus'),
    (1004, 'DVC', 'DSEU Vivek Vihar Campus'),
    (1005, 'DRC', 'DSEU Rohini Campus'),
    (1006, 'DNC', 'DSEU Narela Campus'),
    (1007, 'DDC2', 'DSEU Dwarka Sector-9 Campus'),
    (1008, 'DBC', 'DSEU Bawana Campus'),
    (1009, 'DFC', 'DSEU Faridabad Campus'),
    (1010, 'DGC', 'DSEU Gurgaon Campus')
    ON CONFLICT (CampusId) DO UPDATE SET
        CampusCode = EXCLUDED.CampusCode,
        CampusName = EXCLUDED.CampusName,
        UpdatedAt = (NOW() AT TIME ZONE 'Asia/Kolkata');
  `
};
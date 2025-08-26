-- Database initialization script for DSEU Grievance Portal 2025
-- This comprehensive script creates all necessary tables, indexes, functions, and initial data
-- Consolidates functionality from multiple migration files into a single initialization script
-- 
-- Features included:
-- - Core academic system (Campus, Program, Course, Student data)
-- - Admin system with campus-based role management
-- - Modern grievance management system with dual-status tracking
-- - Enhanced attachment system for grievance files
-- - Audit logging and system health monitoring
-- - Pre-populated campus data for DSEU
-- 
-- Models supported:
-- - PersonalInfo
-- - AdminInfo with role-based permissions
-- - AdminAuditLog for security tracking
-- - IssueList for predefined grievance categories
-- - Grievance with dual ID system (id + grievanceId)
-- - Tracking with history-based admin responses and dual status system
-- - Attachment for file management
-- 
-- Run this script on a fresh database to set up the complete system

-- Drop tables if they exist (for fresh setup)
DROP TABLE IF EXISTS Tracking CASCADE;
DROP TABLE IF EXISTS Attachment CASCADE;
DROP TABLE IF EXISTS Grievance CASCADE;
DROP TABLE IF EXISTS IssueList CASCADE;
DROP TABLE IF EXISTS Admin_Audit_Log CASCADE;
DROP TABLE IF EXISTS Admin CASCADE;
DROP TABLE IF EXISTS PersonalInfo CASCADE;
DROP TABLE IF EXISTS ProgramInfo CASCADE;
DROP TABLE IF EXISTS CampusInfo CASCADE;
DROP TABLE IF EXISTS AcademicInfo CASCADE;

-- Create CampusInfo table
CREATE TABLE CampusInfo (
    CampusId SERIAL PRIMARY KEY,
    CampusCode VARCHAR(50) UNIQUE NOT NULL,
    CampusName VARCHAR(255) NOT NULL,
    CreatedAt TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata'),
    UpdatedAt TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata')
);

-- Create IssueList table for grievance types
CREATE TABLE IssueList (
    Id SERIAL PRIMARY KEY,
    IssueCode INTEGER UNIQUE NOT NULL,
    IssueTitle TEXT NOT NULL,
    RequiredAttachments TEXT[], -- Array of required attachment types
    IssueLevel VARCHAR(20) CHECK (IssueLevel IN ('CAMPUS_LEVEL', 'UNIVERSITY_LEVEL')) NOT NULL,
    Category VARCHAR(20) CHECK (Category IN ('ACADEMIC', 'EXAM', 'OTHER')) DEFAULT 'OTHER',
    IsActive BOOLEAN DEFAULT TRUE,
    CreatedAt TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata'),
    UpdatedAt TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata')
);
-- Create ProgramInfo table
CREATE TABLE ProgramInfo (
    ProgramId SERIAL PRIMARY KEY,
    ProgramCode VARCHAR(50) UNIQUE NOT NULL,
    ProgramName VARCHAR(255) NOT NULL,
    ProgramType VARCHAR(100) NOT NULL,
    TermType VARCHAR(50) NOT NULL, -- enum: semester, annual
    Specialisation BOOLEAN DEFAULT FALSE,
    SpecialCode VARCHAR(50),
    SpecialName VARCHAR(255),
    CreatedAt TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata'),
    UpdatedAt TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata')
);



-- Create PersonalInfo table
CREATE TABLE PersonalInfo (
    Id SERIAL,
    RollNo VARCHAR(50) PRIMARY KEY,
    Name VARCHAR(255) NOT NULL,
    Email VARCHAR(255) NOT NULL,
    Phone VARCHAR(20),
    Password VARCHAR(255),
    IsVerified BOOLEAN DEFAULT FALSE,
    AdmissionYear INTEGER,
    Gender VARCHAR(10),
    CampusId INTEGER NOT NULL,
    CreatedAt TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata'),
    UpdatedAt TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata'),
    CONSTRAINT fk_student_campus FOREIGN KEY (CampusId) REFERENCES CampusInfo(CampusId)
);

-- Create Admin table with proper role constraints
CREATE TABLE Admin (
    ID SERIAL,
    AdminId VARCHAR(50) PRIMARY KEY,
    Name VARCHAR(255) NOT NULL,
    Email VARCHAR(255) NOT NULL,
    Phone VARCHAR(20),
    Password VARCHAR(255),
    Role VARCHAR(50) CHECK (Role IN ('DEPT_ADMIN', 'CAMPUS_ADMIN', 'SUPER_ADMIN')),
    Department VARCHAR(20) CHECK (Department IN ('ACADEMIC', 'EXAM', 'CAMPUS', 'SYSTEM')),
    IsVerified BOOLEAN DEFAULT FALSE,
    IsActive BOOLEAN DEFAULT TRUE,
    LastLogin TIMESTAMP,
    CreatedAt TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata'),
    UpdatedAt TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata'),
    CampusId INTEGER,
    CONSTRAINT fk_admin_campus FOREIGN KEY (CampusId) REFERENCES CampusInfo(CampusId)
);



-- Create AcademicInfo table
CREATE TABLE AcademicInfo (
    Id SERIAL PRIMARY KEY,
    RollNo VARCHAR(50) NOT NULL,
    ProgramId INTEGER NOT NULL,
    AcademicYear VARCHAR(20) NOT NULL,
    Term INTEGER NOT NULL,
    CampusId INTEGER NOT NULL,
    Batch INTEGER NOT NULL,
    Status VARCHAR(50) DEFAULT 'active',
    CreatedAt TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata'),
    UpdatedAt TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata'),
    CONSTRAINT fk_academicinfo_rollno FOREIGN KEY (RollNo) REFERENCES PersonalInfo(RollNo) ON DELETE CASCADE,
    CONSTRAINT fk_academicinfo_program FOREIGN KEY (ProgramId) REFERENCES ProgramInfo(ProgramId) ON DELETE CASCADE,
    CONSTRAINT fk_academicinfo_campus FOREIGN KEY (CampusId) REFERENCES CampusInfo(CampusId) ON DELETE CASCADE,
    CONSTRAINT unique_rollno_academicyear_term UNIQUE (RollNo, AcademicYear, Term)
);

-- Create Grievance table
CREATE TABLE Grievance (
   Id SERIAL PRIMARY KEY,
   GrievanceId VARCHAR(50) UNIQUE NOT NULL,
   RollNo VARCHAR(50) NOT NULL,
   CampusId INTEGER NOT NULL,
   IssueCode INTEGER NOT NULL,
   Subject VARCHAR(255) NOT NULL,
   Description TEXT NOT NULL,
   HasAttachments BOOLEAN DEFAULT FALSE,
   CreatedAt TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata'),
   UpdatedAt TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata'),
   CONSTRAINT fk_grievance_student FOREIGN KEY (RollNo) REFERENCES PersonalInfo(RollNo) ON DELETE CASCADE,
   CONSTRAINT fk_grievance_campus FOREIGN KEY (CampusId) REFERENCES CampusInfo(CampusId),
   CONSTRAINT fk_grievance_issue FOREIGN KEY (IssueCode) REFERENCES IssueList(IssueCode)
);

-- Create Tracking table for grievance status updates and admin responses
-- Each admin action creates a new tracking entry (history-based approach)
CREATE TABLE Tracking (
    Id SERIAL PRIMARY KEY,
    GrievanceId VARCHAR(50) NOT NULL,
    ResponseText TEXT NOT NULL,
    AdminStatus VARCHAR(20) CHECK (AdminStatus IN ('NEW', 'PENDING', 'REDIRECTED', 'RESOLVED', 'REJECTED')) NOT NULL,
    StudentStatus VARCHAR(20) CHECK (StudentStatus IN ('SUBMITTED', 'UNDER_REVIEW', 'IN_PROGRESS', 'RESOLVED', 'REJECTED')) NOT NULL,
    ResponseBy VARCHAR(50) NOT NULL,
    ResponseAt TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata'),
    RedirectTo VARCHAR(50),
    RedirectFrom VARCHAR(50),
    IsRedirect BOOLEAN DEFAULT FALSE,
    HasAttachments BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_tracking_grievance FOREIGN KEY (GrievanceId) REFERENCES Grievance(GrievanceId) ON DELETE CASCADE,
    CONSTRAINT fk_tracking_admin FOREIGN KEY (ResponseBy) REFERENCES Admin(AdminId)
);

-- Create Attachment table for grievance file uploads
CREATE TABLE Attachment (
    Id SERIAL PRIMARY KEY,
    GrievanceId VARCHAR(50) NOT NULL,
    FileName VARCHAR(255) NOT NULL,
    FilePath TEXT NOT NULL,
    MimeType VARCHAR(100) NOT NULL,
    FileSize INTEGER NOT NULL,
    UploadedAt TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata'),
    UploadedBy VARCHAR(50) NOT NULL,
    CONSTRAINT fk_attachment_grievance FOREIGN KEY (GrievanceId) REFERENCES Grievance(GrievanceId) ON DELETE CASCADE
);

-- Create Admin_Audit_Log table for tracking admin actions
CREATE TABLE Admin_Audit_Log (
    id SERIAL PRIMARY KEY,
    AdminId VARCHAR(50) NOT NULL,
    Action_Type VARCHAR(100) NOT NULL,
    Email VARCHAR(255) NOT NULL,
    AccessedResource VARCHAR(255) NOT NULL,
    IP_Address VARCHAR(45) NOT NULL,
    IsActive BOOLEAN DEFAULT TRUE,
    Timestamp TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata'),
    Query TEXT,
    Role VARCHAR(50) CHECK (Role IN ('DEPT_ADMIN', 'CAMPUS_ADMIN', 'SUPER_ADMIN')) NOT NULL,
    CONSTRAINT fk_admin_audit_admin FOREIGN KEY (AdminId) REFERENCES Admin(AdminId) ON DELETE CASCADE
);
-- Create indexes for better performance
CREATE INDEX idx_campusinfo_code ON CampusInfo(CampusCode);
CREATE INDEX idx_campusinfo_name ON CampusInfo(CampusName);
CREATE INDEX idx_issuelist_code ON IssueList(IssueCode);
CREATE INDEX idx_issuelist_level ON IssueList(IssueLevel);
CREATE INDEX idx_issuelist_active ON IssueList(IsActive);
CREATE INDEX idx_programinfo_code ON ProgramInfo(ProgramCode);
CREATE INDEX idx_programinfo_name ON ProgramInfo(ProgramName);
CREATE INDEX idx_programinfo_type ON ProgramInfo(ProgramType);
CREATE INDEX idx_personalinfo_rollno ON PersonalInfo(RollNo);
CREATE INDEX idx_personalinfo_email ON PersonalInfo(Email);
CREATE INDEX idx_personalinfo_isverified ON PersonalInfo(IsVerified);
CREATE INDEX idx_personalinfo_campus ON PersonalInfo(CampusId);
CREATE INDEX idx_admin_adminid ON Admin(AdminId);
CREATE INDEX idx_admin_email ON Admin(Email);
CREATE INDEX idx_admin_campus ON Admin(CampusId);
CREATE INDEX idx_admin_role ON Admin(Role);
CREATE INDEX idx_admin_active ON Admin(IsActive);
CREATE INDEX idx_academicinfo_rollno ON AcademicInfo(RollNo);
CREATE INDEX idx_academicinfo_programid ON AcademicInfo(ProgramId);
CREATE INDEX idx_academicinfo_campusid ON AcademicInfo(CampusId);
CREATE INDEX idx_academicinfo_batch ON AcademicInfo(Batch);
CREATE INDEX idx_academicinfo_year_term ON AcademicInfo(AcademicYear, Term);
CREATE INDEX idx_academicinfo_status ON AcademicInfo(Status);
CREATE INDEX idx_grievance_rollno ON Grievance(RollNo);
CREATE INDEX idx_grievance_campus ON Grievance(CampusId);
CREATE INDEX idx_grievance_issue ON Grievance(IssueCode);
CREATE INDEX idx_grievance_created ON Grievance(CreatedAt);
CREATE INDEX idx_tracking_grievanceid ON Tracking(GrievanceId);
CREATE INDEX idx_tracking_responseby ON Tracking(ResponseBy);
CREATE INDEX idx_tracking_adminstatus ON Tracking(AdminStatus);
CREATE INDEX idx_tracking_studentstatus ON Tracking(StudentStatus);
CREATE INDEX idx_tracking_responseat ON Tracking(ResponseAt);
CREATE INDEX idx_attachment_grievanceid ON Attachment(GrievanceId);
CREATE INDEX idx_admin_audit_admin ON Admin_Audit_Log(AdminId);
CREATE INDEX idx_admin_audit_action ON Admin_Audit_Log(Action_Type);
CREATE INDEX idx_admin_audit_timestamp ON Admin_Audit_Log(Timestamp);

-- Create trigger function to update UpdatedAt timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.UpdatedAt = (NOW() AT TIME ZONE 'Asia/Kolkata');
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for all tables with UpdatedAt column
CREATE TRIGGER update_campusinfo_updated_at 
    BEFORE UPDATE ON CampusInfo 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_programinfo_updated_at 
    BEFORE UPDATE ON ProgramInfo 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_personalinfo_updated_at 
    BEFORE UPDATE ON PersonalInfo 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_updated_at 
    BEFORE UPDATE ON Admin 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_academicinfo_updated_at 
    BEFORE UPDATE ON AcademicInfo 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_issuelist_updated_at 
    BEFORE UPDATE ON IssueList 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_grievance_updated_at 
    BEFORE UPDATE ON Grievance 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to check if all required tables exist
CREATE OR REPLACE FUNCTION check_all_tables_exist()
RETURNS BOOLEAN AS $$
DECLARE
    required_tables TEXT[] := ARRAY['campusinfo', 'issuelist', 'programinfo', 'personalinfo', 'admin', 'academicinfo', 'grievance', 'tracking', 'attachment', 'admin_audit_log'];
    tbl_name TEXT;
    table_exists BOOLEAN;
    missing_tables TEXT[] := ARRAY[]::TEXT[];
BEGIN
    FOREACH tbl_name IN ARRAY required_tables
    LOOP
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = tbl_name
        ) INTO table_exists;
        
        IF NOT table_exists THEN
            missing_tables := array_append(missing_tables, tbl_name);
        END IF;
    END LOOP;
    
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE NOTICE 'Missing tables: %', array_to_string(missing_tables, ', ');
        RETURN FALSE;
    ELSE
        RAISE NOTICE 'All required tables exist: %', array_to_string(required_tables, ', ');
        RETURN TRUE;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get table status
CREATE OR REPLACE FUNCTION get_table_status()
RETURNS TABLE(tbl_name TEXT, record_count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT 'CampusInfo'::TEXT, COUNT(*) FROM CampusInfo
    UNION ALL
    SELECT 'IssueList'::TEXT, COUNT(*) FROM IssueList
    UNION ALL
    SELECT 'ProgramInfo'::TEXT, COUNT(*) FROM ProgramInfo
    UNION ALL
    SELECT 'PersonalInfo'::TEXT, COUNT(*) FROM PersonalInfo
    UNION ALL
    SELECT 'Admin'::TEXT, COUNT(*) FROM Admin
    UNION ALL
    SELECT 'AcademicInfo'::TEXT, COUNT(*) FROM AcademicInfo
    UNION ALL
    SELECT 'Grievance'::TEXT, COUNT(*) FROM Grievance
    UNION ALL
    SELECT 'Tracking'::TEXT, COUNT(*) FROM Tracking
    UNION ALL
    SELECT 'Attachment'::TEXT, COUNT(*) FROM Attachment
    UNION ALL
    SELECT 'Admin_Audit_Log'::TEXT, COUNT(*) FROM Admin_Audit_Log;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE CampusInfo IS 'Stores campus information for DSEU';
COMMENT ON TABLE IssueList IS 'Stores predefined grievance categories with attachment requirements';
COMMENT ON TABLE ProgramInfo IS 'Stores academic program information';
COMMENT ON TABLE PersonalInfo IS 'Stores personal information and authentication data';
COMMENT ON TABLE Admin IS 'Stores administrator accounts with role-based permissions';
COMMENT ON TABLE AcademicInfo IS 'Stores student academic enrollment information connecting students to programs, campuses, and academic terms';
COMMENT ON TABLE Grievance IS 'Stores student grievance submissions with dual ID system';
COMMENT ON TABLE Tracking IS 'Stores grievance status updates and admin responses with history-based tracking';
COMMENT ON TABLE Attachment IS 'Stores file attachments for grievances';
COMMENT ON TABLE Admin_Audit_Log IS 'Tracks all administrative actions for security and compliance';
COMMENT ON COLUMN IssueList.IssueLevel IS 'Issue scope: CAMPUS_LEVEL or UNIVERSITY_LEVEL';
COMMENT ON COLUMN IssueList.RequiredAttachments IS 'Array of required attachment types for this issue';
COMMENT ON COLUMN Grievance.GrievanceId IS 'Unique tracking ID (e.g., GRV-2025-001)';
COMMENT ON COLUMN Grievance.HasAttachments IS 'Whether the original grievance submission has attachments';
COMMENT ON COLUMN Tracking.AdminStatus IS 'Admin workflow status for internal tracking';
COMMENT ON COLUMN Tracking.StudentStatus IS 'Student-visible status for progress updates';
COMMENT ON COLUMN Tracking.RedirectTo IS 'AdminId if redirected to another admin';
COMMENT ON COLUMN Tracking.RedirectFrom IS 'AdminId who redirected this grievance';
COMMENT ON COLUMN Tracking.HasAttachments IS 'Whether this specific admin response has attachments';

-- ===================================================================
-- CAMPUS DATA INITIALIZATION
-- ===================================================================

-- Insert default campus information for DSEU
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

-- Insert a fallback default campus
INSERT INTO CampusInfo (CampusId, CampusCode, CampusName) VALUES 
(1, 'MAIN', 'Main Campus')
ON CONFLICT (CampusId) DO NOTHING;

-- Update the sequence to avoid conflicts
SELECT setval('campusinfo_campusid_seq', (SELECT COALESCE(MAX(CampusId), 2000) + 1 FROM CampusInfo), false);

-- Execute table check
SELECT check_all_tables_exist();

-- Display table status
SELECT * FROM get_table_status();

-- Display final summary
SELECT 
    'Database Initialization Complete' as status,
    (SELECT COUNT(*) FROM CampusInfo) as campus_count,
    (SELECT COUNT(*) FROM Admin WHERE IsActive = true) as active_admins,
    (SELECT COUNT(*) FROM Grievance) as grievance_count,
    (SELECT COUNT(*) FROM Tracking) as tracking_entries,
    (SELECT COUNT(*) FROM Attachment) as attachment_count,
    NOW() AT TIME ZONE 'Asia/Kolkata' as completed_at;
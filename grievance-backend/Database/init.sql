-- Database initialization script for DSEU Project 2025

-- Drop tables if they exist (for fresh setup)
DROP TABLE IF EXISTS attachment CASCADE;
DROP TABLE IF EXISTS grievancehistory CASCADE;
DROP TABLE IF EXISTS response CASCADE;
DROP TABLE IF EXISTS grievance CASCADE;
DROP TABLE IF EXISTS CourseEval CASCADE;
DROP TABLE IF EXISTS ProgramOptions CASCADE;
DROP TABLE IF EXISTS CourseProgram CASCADE;
DROP TABLE IF EXISTS Course CASCADE;
DROP TABLE IF EXISTS CampusProgram CASCADE;
DROP TABLE IF EXISTS AdminOTP CASCADE;
DROP TABLE IF EXISTS Admin CASCADE;
DROP TABLE IF EXISTS OTP CASCADE;
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

-- Create ProgramOptions table
CREATE TABLE ProgramOptions (
    Id SERIAL PRIMARY KEY,
    ProgramId INTEGER NOT NULL,
    Term INTEGER NOT NULL,
    Batch INTEGER NOT NULL,
    GradingType VARCHAR(50) NOT NULL, -- enum: absolute, relative
    CreatedAt TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata'),
    UpdatedAt TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata'),
    CONSTRAINT fk_program_options_program FOREIGN KEY (ProgramId) REFERENCES ProgramInfo(ProgramId) ON DELETE CASCADE,
    CONSTRAINT unique_program_term_batch UNIQUE (ProgramId, Term, Batch)
);

-- Create CampusProgram table (Many-to-Many relationship)
CREATE TABLE CampusProgram (
    Id SERIAL PRIMARY KEY,
    CampusId INTEGER NOT NULL,
    ProgramId INTEGER NOT NULL,
    Batch INTEGER NOT NULL,
    IsActive BOOLEAN DEFAULT TRUE,
    CreatedAt TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata'),
    UpdatedAt TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata'),
    CONSTRAINT fk_campus_program_campus FOREIGN KEY (CampusId) REFERENCES CampusInfo(CampusId) ON DELETE CASCADE,
    CONSTRAINT fk_campus_program_program FOREIGN KEY (ProgramId) REFERENCES ProgramInfo(ProgramId) ON DELETE CASCADE,
    CONSTRAINT unique_campus_program_batch UNIQUE (CampusId, ProgramId, Batch)
);

-- Create Course table
CREATE TABLE Course (
    CourseId SERIAL UNIQUE PRIMARY KEY,
    CourseCode VARCHAR(50) NOT NULL,
    CourseName VARCHAR(255) NOT NULL,
    Term INTEGER NOT NULL,
    CourseType VARCHAR(50) NOT NULL,
    Credit INTEGER NOT NULL,
    CreatedAt TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata'),
    UpdatedAt TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata')
);

-- Create CourseEval table
CREATE TABLE CourseEval (
    Id SERIAL PRIMARY KEY,
    CourseId INTEGER NOT NULL,
    Lect INTEGER DEFAULT 0,
    Pract INTEGER DEFAULT 0,
    CompTypes VARCHAR(255) DEFAULT 'default',
    CreatedAt TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata'),
    UpdatedAt TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata'),
    CONSTRAINT fk_course_eval_course FOREIGN KEY (CourseId) REFERENCES Course(CourseId) ON DELETE CASCADE
);

-- Create CourseProgram table (Many-to-Many relationship)
CREATE TABLE CourseProgram (
    Id SERIAL PRIMARY KEY,
    ProgramId INTEGER NOT NULL,
    CourseId INTEGER NOT NULL,
    Batch INTEGER NOT NULL,
    IsActive BOOLEAN DEFAULT TRUE,
    CreatedAt TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata'),
    UpdatedAt TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata'),
    CONSTRAINT fk_course_program_program FOREIGN KEY (ProgramId) REFERENCES ProgramInfo(ProgramId) ON DELETE CASCADE,
    CONSTRAINT fk_course_program_course FOREIGN KEY (CourseId) REFERENCES Course(CourseId) ON DELETE CASCADE,
    CONSTRAINT unique_program_course_batch UNIQUE (ProgramId, CourseId, Batch)
);

-- Create PersonalInfo table
CREATE TABLE PersonalInfo (
    id SERIAL PRIMARY KEY,
    RollNo VARCHAR(50) UNIQUE NOT NULL,
    Name VARCHAR(255) NOT NULL,
    Father VARCHAR(255),
    Mother VARCHAR(255),
    Abc VARCHAR(100),
    DOB DATE,
    Category VARCHAR(50),
    Gender VARCHAR(10),
    Pwd BOOLEAN DEFAULT FALSE,
    Phone VARCHAR(15),
    Email VARCHAR(255),
    Password VARCHAR(255),
    IsVerified BOOLEAN DEFAULT FALSE,
    AdmissionYear INTEGER,
    LE BOOLEAN DEFAULT FALSE,
    CreatedAt TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata'),
    UpdatedAt TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata')
);

-- Create Admin table
CREATE TABLE Admin (
    id SERIAL PRIMARY KEY,
    AdminId VARCHAR(50) UNIQUE NOT NULL,
    Name VARCHAR(255) NOT NULL,
    Email VARCHAR(255) UNIQUE NOT NULL,
    Password VARCHAR(255),
    Role VARCHAR(50) DEFAULT 'admin',
    IsActive BOOLEAN DEFAULT TRUE,
    LastLogin TIMESTAMP,
    CreatedAt TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata'),
    UpdatedAt TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata')
);

-- Create OTP table
CREATE TABLE OTP (
    id SERIAL PRIMARY KEY,
    RollNo VARCHAR(50) NOT NULL,
    OTP INTEGER,
    Email VARCHAR(255) NOT NULL,
    CreatedAt TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata'),
    Attempt INTEGER DEFAULT 3,
    CONSTRAINT fk_otp_rollno FOREIGN KEY (RollNo) REFERENCES PersonalInfo(RollNo) ON DELETE CASCADE
);

-- Create AdminOTP table
CREATE TABLE AdminOTP (
    id SERIAL PRIMARY KEY,
    AdminId VARCHAR(50) NOT NULL,
    OTP INTEGER,
    Email VARCHAR(255) NOT NULL,
    CreatedAt TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata'),
    Attempt INTEGER DEFAULT 3,
    CONSTRAINT fk_admin_otp_adminid FOREIGN KEY (AdminId) REFERENCES Admin(AdminId) ON DELETE CASCADE
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

-- Create indexes for better performance
CREATE INDEX idx_campusinfo_code ON CampusInfo(CampusCode);
CREATE INDEX idx_campusinfo_name ON CampusInfo(CampusName);
CREATE INDEX idx_programinfo_code ON ProgramInfo(ProgramCode);
CREATE INDEX idx_programinfo_name ON ProgramInfo(ProgramName);
CREATE INDEX idx_programinfo_type ON ProgramInfo(ProgramType);
CREATE INDEX idx_programoptions_program ON ProgramOptions(ProgramId);
CREATE INDEX idx_programoptions_term ON ProgramOptions(Term);
CREATE INDEX idx_programoptions_batch ON ProgramOptions(Batch);
CREATE INDEX idx_campusprogram_campus ON CampusProgram(CampusId);
CREATE INDEX idx_campusprogram_program ON CampusProgram(ProgramId);
CREATE INDEX idx_campusprogram_batch ON CampusProgram(Batch);
CREATE INDEX idx_course_code ON Course(CourseCode);
CREATE INDEX idx_course_name ON Course(CourseName);
CREATE INDEX idx_course_type ON Course(CourseType);
CREATE INDEX idx_courseeval_courseid ON CourseEval(CourseId);
CREATE INDEX idx_courseprogram_program ON CourseProgram(ProgramId);
CREATE INDEX idx_courseprogram_course ON CourseProgram(CourseId);
CREATE INDEX idx_courseprogram_batch ON CourseProgram(Batch);
CREATE INDEX idx_personalinfo_rollno ON PersonalInfo(RollNo);
CREATE INDEX idx_personalinfo_email ON PersonalInfo(Email);
CREATE INDEX idx_personalinfo_isverified ON PersonalInfo(IsVerified);
CREATE INDEX idx_otp_rollno_email ON OTP(RollNo, Email);
CREATE INDEX idx_otp_createdat ON OTP(CreatedAt);
CREATE INDEX idx_admin_adminid ON Admin(AdminId);
CREATE INDEX idx_admin_email ON Admin(Email);
CREATE INDEX idx_admin_otp_adminid_email ON AdminOTP(AdminId, Email);
CREATE INDEX idx_admin_otp_createdat ON AdminOTP(CreatedAt);
CREATE INDEX idx_academicinfo_rollno ON AcademicInfo(RollNo);
CREATE INDEX idx_academicinfo_programid ON AcademicInfo(ProgramId);
CREATE INDEX idx_academicinfo_campusid ON AcademicInfo(CampusId);
CREATE INDEX idx_academicinfo_batch ON AcademicInfo(Batch);
CREATE INDEX idx_academicinfo_year_term ON AcademicInfo(AcademicYear, Term);
CREATE INDEX idx_academicinfo_status ON AcademicInfo(Status);

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

CREATE TRIGGER update_programoptions_updated_at 
    BEFORE UPDATE ON ProgramOptions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campusprogram_updated_at 
    BEFORE UPDATE ON CampusProgram 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_course_updated_at 
    BEFORE UPDATE ON Course 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courseeval_updated_at 
    BEFORE UPDATE ON CourseEval 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courseprogram_updated_at 
    BEFORE UPDATE ON CourseProgram 
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

-- Function to check if all required tables exist
CREATE OR REPLACE FUNCTION check_all_tables_exist()
RETURNS BOOLEAN AS $$
DECLARE
    required_tables TEXT[] := ARRAY['campusinfo', 'programinfo', 'programoptions', 'campusprogram', 'course', 'courseeval', 'courseprogram', 'personalinfo', 'admin', 'otp', 'adminotp', 'academicinfo'];
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
    SELECT 'ProgramInfo'::TEXT, COUNT(*) FROM ProgramInfo
    UNION ALL
    SELECT 'ProgramOptions'::TEXT, COUNT(*) FROM ProgramOptions
    UNION ALL
    SELECT 'CampusProgram'::TEXT, COUNT(*) FROM CampusProgram
    UNION ALL
    SELECT 'Course'::TEXT, COUNT(*) FROM Course
    UNION ALL
    SELECT 'CourseEval'::TEXT, COUNT(*) FROM CourseEval
    UNION ALL
    SELECT 'CourseProgram'::TEXT, COUNT(*) FROM CourseProgram
    UNION ALL
    SELECT 'PersonalInfo'::TEXT, COUNT(*) FROM PersonalInfo
    UNION ALL
    SELECT 'Admin'::TEXT, COUNT(*) FROM Admin
    UNION ALL
    SELECT 'OTP'::TEXT, COUNT(*) FROM OTP
    UNION ALL    SELECT 'AdminOTP'::TEXT, COUNT(*) FROM AdminOTP
    UNION ALL
    SELECT 'AcademicInfo'::TEXT, COUNT(*) FROM AcademicInfo
    UNION ALL
    SELECT 'grievance'::TEXT, COUNT(*) FROM grievance
    UNION ALL
    SELECT 'response'::TEXT, COUNT(*) FROM response
    UNION ALL
    SELECT 'grievancehistory'::TEXT, COUNT(*) FROM grievancehistory
    UNION ALL
    SELECT 'attachment'::TEXT, COUNT(*) FROM attachment;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE CampusInfo IS 'Stores campus information for DSEU';
COMMENT ON TABLE ProgramInfo IS 'Stores academic program information';
COMMENT ON TABLE ProgramOptions IS 'Stores program-specific options like grading type for each term and batch';
COMMENT ON TABLE CampusProgram IS 'Many-to-many relationship between campus and programs';
COMMENT ON TABLE Course IS 'Stores course information';
COMMENT ON TABLE CourseEval IS 'Stores course evaluation structure with lecture, practical components';
COMMENT ON TABLE CourseProgram IS 'Many-to-many relationship between courses and programs';
COMMENT ON TABLE OTP IS 'Stores OTP verification data for user authentication';
COMMENT ON TABLE PersonalInfo IS 'Stores personal information and authentication data for users';
COMMENT ON TABLE Admin IS 'Stores administrator accounts and their details';
COMMENT ON TABLE AdminOTP IS 'Stores OTP verification data for admin authentication';
COMMENT ON TABLE AcademicInfo IS 'Stores student academic enrollment information connecting students to programs, campuses, and academic terms';
COMMENT ON COLUMN PersonalInfo.Pwd IS 'Person with Disability status';
COMMENT ON COLUMN PersonalInfo.LE IS 'Lateral Entry status';
COMMENT ON COLUMN PersonalInfo.Abc IS 'Academic Bank of Credits ID';
COMMENT ON COLUMN ProgramOptions.GradingType IS 'Grading system: absolute, relative, pass_fail';
COMMENT ON COLUMN CourseEval.Lect IS 'Number of lecture hours per week';
COMMENT ON COLUMN CourseEval.Pract IS 'Type of practical component: LAB, PROJECT, CASE_STUDY, NONE';
COMMENT ON COLUMN CourseEval.CompTypes IS 'Comma-separated list of assessment components';
COMMENT ON COLUMN AcademicInfo.Status IS 'Academic enrollment status: active, completed, withdrawn, etc.';

-- Execute table check
SELECT check_all_tables_exist();

-- Display table status
SELECT * FROM get_table_status();

-- ...existing code...

-- Create grievance table
CREATE TABLE grievance (
   id SERIAL PRIMARY KEY,
   Issuse_Id VARCHAR(50) NOT NULL,
   RollNo VARCHAR(50) NOT NULL,
   Campus VARCHAR(50) NOT NULL,
   Subject VARCHAR(255) NOT NULL,
   Description TEXT NOT NULL,
   Issuse_type VARCHAR(50) NOT NULL,
   Status VARCHAR(50) DEFAULT 'pending',
   Attachment TEXT,
   Date TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata'),   
   CONSTRAINT fk_grievance_rollno FOREIGN KEY (RollNo) REFERENCES PersonalInfo(RollNo) ON DELETE CASCADE 
);

-- Create response table
CREATE TABLE response (
    id SERIAL PRIMARY KEY,
    Issuse_Id INTEGER NOT NULL,
    ResponseText TEXT NOT NULL,
    ResponseBy VARCHAR(50) NOT NULL,
    ResponseAt TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata'),
    Status VARCHAR(50) DEFAULT 'pending',
    Stage VARCHAR(50) NOT NULL,
    attachment TEXT,
    redirect VARCHAR(50),
    Date TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata'),
    CONSTRAINT fk_response_grievance FOREIGN KEY (Issuse_Id) REFERENCES grievance(id) ON DELETE CASCADE
);

-- Create grievancehistory table
CREATE TABLE grievancehistory (
    Id SERIAL PRIMARY KEY,
    Issuse_Id INTEGER NOT NULL,
    from_status VARCHAR(50) NOT NULL,
    to_status VARCHAR(50) NOT NULL,
    action_by VARCHAR(50) NOT NULL,
    stage_type VARCHAR(50) NOT NULL,
    Note TEXT,
    DATE TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata'),
    CONSTRAINT fk_history_grievance FOREIGN KEY (Issuse_Id) REFERENCES grievance(id) ON DELETE CASCADE
);

-- Create attachment table
CREATE TABLE attachment (
    id SERIAL PRIMARY KEY,
    Issuse_Id INTEGER NOT NULL,
    FileName VARCHAR(255) NOT NULL,
    FilePath VARCHAR(255) NOT NULL,
    UploadedBy VARCHAR(50) NOT NULL,
    UploadedAt TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata'),
    CreatedAt TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata'),
    UpdatedAt TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata'),
    CONSTRAINT fk_attachment_grievance FOREIGN KEY (Issuse_Id) REFERENCES grievance(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_grievance_rollno ON grievance(RollNo);
CREATE INDEX idx_grievance_status ON grievance(Status);
CREATE INDEX idx_grievance_date ON grievance(Date);
CREATE INDEX idx_response_issueid ON response(Issuse_Id);
CREATE INDEX idx_history_issueid ON grievancehistory(Issuse_Id);
CREATE INDEX idx_attachment_issueid ON attachment(Issuse_Id);
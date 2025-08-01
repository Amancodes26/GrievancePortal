-- CampusInfo table
CREATE TABLE IF NOT EXISTS CampusInfo (
    CampusId SERIAL PRIMARY KEY,
    CampusCode VARCHAR(50) UNIQUE NOT NULL,
    CampusName VARCHAR(255) NOT NULL,
    CreatedAt TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata'),
    UpdatedAt TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata')
);

-- IssueList table for grievance types
CREATE TABLE IF NOT EXISTS IssueList (
    Id SERIAL PRIMARY KEY,
    IssueCode INTEGER UNIQUE NOT NULL,
    IssueTitle TEXT NOT NULL,
    RequiredAttachments TEXT[], -- Array of required attachment types
    IssueLevel VARCHAR(20) CHECK (IssueLevel IN ('CAMPUS_LEVEL', 'UNIVERSITY_LEVEL')) NOT NULL,
    IsActive BOOLEAN DEFAULT TRUE,
    CreatedAt TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata'),
    UpdatedAt TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata')
);

-- ProgramInfo table
CREATE TABLE IF NOT EXISTS ProgramInfo (
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



-- StudentInfo table (renamed from PersonalInfo)
CREATE TABLE IF NOT EXISTS StudentInfo (
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

-- Admin table
CREATE TABLE IF NOT EXISTS Admin (
    ID SERIAL,
    AdminId VARCHAR(50) PRIMARY KEY,
    Name VARCHAR(255) NOT NULL,
    Email VARCHAR(255) NOT NULL,
    Phone VARCHAR(20),
    Password VARCHAR(255),
    Role VARCHAR(50) CHECK (Role IN ('DEPT_ADMIN', 'CAMPUS_ADMIN', 'SUPER_ADMIN')),
    IsVerified BOOLEAN DEFAULT FALSE,
    IsActive BOOLEAN DEFAULT TRUE,
    LastLogin TIMESTAMP,
    CreatedAt TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata'),
    UpdatedAt TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata'),
    CampusId INTEGER,
    CONSTRAINT fk_admin_campus FOREIGN KEY (CampusId) REFERENCES CampusInfo(CampusId)
);



-- AcademicInfo table
CREATE TABLE IF NOT EXISTS AcademicInfo (
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
    CONSTRAINT fk_academicinfo_rollno FOREIGN KEY (RollNo) REFERENCES StudentInfo(RollNo) ON DELETE CASCADE,
    CONSTRAINT fk_academicinfo_program FOREIGN KEY (ProgramId) REFERENCES ProgramInfo(ProgramId) ON DELETE CASCADE,
    CONSTRAINT fk_academicinfo_campus FOREIGN KEY (CampusId) REFERENCES CampusInfo(CampusId) ON DELETE CASCADE,
    CONSTRAINT unique_rollno_academicyear_term UNIQUE (RollNo, AcademicYear, Term)
);

-- Grievance table
CREATE TABLE IF NOT EXISTS Grievance (
   Id SERIAL PRIMARY KEY,
   GrievanceId VARCHAR(50) UNIQUE NOT NULL,
   RollNo VARCHAR(50) NOT NULL,
   CampusId INTEGER NOT NULL,
   IssueCode INTEGER NOT NULL,
   Subject VARCHAR(255) NOT NULL,
   Description TEXT NOT NULL,
   Status VARCHAR(20) CHECK (Status IN ('PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED')) DEFAULT 'PENDING',
   HasAttachments BOOLEAN DEFAULT FALSE,
   CreatedAt TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata'),
   UpdatedAt TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata'),
   CONSTRAINT fk_grievance_student FOREIGN KEY (RollNo) REFERENCES StudentInfo(RollNo) ON DELETE CASCADE,
   CONSTRAINT fk_grievance_campus FOREIGN KEY (CampusId) REFERENCES CampusInfo(CampusId),
   CONSTRAINT fk_grievance_issue FOREIGN KEY (IssueCode) REFERENCES IssueList(IssueCode)
);

-- Tracking table for grievance status updates and admin responses
-- Each admin action creates a new tracking entry (history-based approach)
CREATE TABLE IF NOT EXISTS Tracking (
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

-- Attachment table for grievance file uploads
CREATE TABLE IF NOT EXISTS Attachment (
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_campusinfo_code ON CampusInfo(CampusCode);
CREATE INDEX IF NOT EXISTS idx_campusinfo_name ON CampusInfo(CampusName);
CREATE INDEX IF NOT EXISTS idx_issuelist_code ON IssueList(IssueCode);
CREATE INDEX IF NOT EXISTS idx_issuelist_level ON IssueList(IssueLevel);
CREATE INDEX IF NOT EXISTS idx_issuelist_active ON IssueList(IsActive);
CREATE INDEX IF NOT EXISTS idx_programinfo_code ON ProgramInfo(ProgramCode);
CREATE INDEX IF NOT EXISTS idx_programinfo_name ON ProgramInfo(ProgramName);
CREATE INDEX IF NOT EXISTS idx_programinfo_type ON ProgramInfo(ProgramType);
CREATE INDEX IF NOT EXISTS idx_studentinfo_rollno ON StudentInfo(RollNo);
CREATE INDEX IF NOT EXISTS idx_studentinfo_email ON StudentInfo(Email);
CREATE INDEX IF NOT EXISTS idx_studentinfo_isverified ON StudentInfo(IsVerified);
CREATE INDEX IF NOT EXISTS idx_studentinfo_campus ON StudentInfo(CampusId);
CREATE INDEX IF NOT EXISTS idx_admin_adminid ON Admin(AdminId);
CREATE INDEX IF NOT EXISTS idx_admin_email ON Admin(Email);
CREATE INDEX IF NOT EXISTS idx_admin_campus ON Admin(CampusId);
CREATE INDEX IF NOT EXISTS idx_admin_role ON Admin(Role);
CREATE INDEX IF NOT EXISTS idx_admin_active ON Admin(IsActive);
CREATE INDEX IF NOT EXISTS idx_academicinfo_rollno ON AcademicInfo(RollNo);
CREATE INDEX IF NOT EXISTS idx_academicinfo_programid ON AcademicInfo(ProgramId);
CREATE INDEX IF NOT EXISTS idx_academicinfo_campusid ON AcademicInfo(CampusId);
CREATE INDEX IF NOT EXISTS idx_academicinfo_batch ON AcademicInfo(Batch);
CREATE INDEX IF NOT EXISTS idx_academicinfo_year_term ON AcademicInfo(AcademicYear, Term);
CREATE INDEX IF NOT EXISTS idx_academicinfo_status ON AcademicInfo(Status);
CREATE INDEX IF NOT EXISTS idx_grievance_rollno ON Grievance(RollNo);
CREATE INDEX IF NOT EXISTS idx_grievance_status ON Grievance(Status);
CREATE INDEX IF NOT EXISTS idx_grievance_campus ON Grievance(CampusId);
CREATE INDEX IF NOT EXISTS idx_grievance_issue ON Grievance(IssueCode);
CREATE INDEX IF NOT EXISTS idx_grievance_created ON Grievance(CreatedAt);
CREATE INDEX IF NOT EXISTS idx_tracking_grievanceid ON Tracking(GrievanceId);
CREATE INDEX IF NOT EXISTS idx_tracking_responseby ON Tracking(ResponseBy);
CREATE INDEX IF NOT EXISTS idx_tracking_adminstatus ON Tracking(AdminStatus);
CREATE INDEX IF NOT EXISTS idx_tracking_studentstatus ON Tracking(StudentStatus);
CREATE INDEX IF NOT EXISTS idx_tracking_responseat ON Tracking(ResponseAt);
CREATE INDEX IF NOT EXISTS idx_attachment_grievanceid ON Attachment(GrievanceId);

-- Admin_Audit_Log table for tracking admin actions
CREATE TABLE IF NOT EXISTS Admin_Audit_Log (
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

-- Add indexes for admin audit log
CREATE INDEX IF NOT EXISTS idx_admin_audit_admin ON Admin_Audit_Log(AdminId);
CREATE INDEX IF NOT EXISTS idx_admin_audit_action ON Admin_Audit_Log(Action_Type);
CREATE INDEX IF NOT EXISTS idx_admin_audit_timestamp ON Admin_Audit_Log(Timestamp);
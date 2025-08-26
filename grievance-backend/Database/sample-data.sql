-- Sample Data for DSEU Grievance Portal Testing
-- Run this after your main init.sql setup

-- Insert Sample Campus Data
INSERT INTO CampusInfo (CampusName, CampusLocation, IsActive) VALUES 
('DSEU Okhla - I Campus', 'Okhla Industrial Area, Phase I, New Delhi', 1),
('DSEU Shakarpur Campus', 'Shakarpur, New Delhi', 1),
('DSEU Pusa Campus', 'Pusa, New Delhi', 1);

-- Insert Sample Program Data
INSERT INTO ProgramInfo (ProgramName, ProgramCode, CampusId, IsActive) VALUES 
('Bachelor of Technology - Computer Science', 'BTECH_CS', 1, 1),
('Bachelor of Technology - Electronics', 'BTECH_EC', 1, 1),
('Bachelor of Business Administration', 'BBA', 2, 1),
('Bachelor of Computer Applications', 'BCA', 2, 1),
('Diploma in Engineering - Mechanical', 'DIPLOMA_ME', 3, 1);

-- Insert Sample Academic Years
INSERT INTO AcademicInfo (AcademicYear, Semester, IsActive) VALUES 
('2024-25', 'I', 1),
('2024-25', 'II', 1),
('2024-25', 'III', 1),
('2024-25', 'IV', 1),
('2024-25', 'V', 1),
('2024-25', 'VI', 1),
('2024-25', 'VII', 1),
('2024-25', 'VIII', 1);

-- Insert Sample Students
INSERT INTO PersonalInfo (RollNo, FirstName, LastName, Email, PhoneNumber, ProgramId, AcademicId, IsActive, PasswordHash) VALUES 
('2024CS001', 'Rahul', 'Sharma', 'rahul.sharma@student.dseu.ac.in', '9876543210', 1, 3, 1, '$2b$10$sample.hash.for.password123'),
('2024CS002', 'Priya', 'Singh', 'priya.singh@student.dseu.ac.in', '9876543211', 1, 3, 1, '$2b$10$sample.hash.for.password123'),
('2024EC001', 'Amit', 'Kumar', 'amit.kumar@student.dseu.ac.in', '9876543212', 2, 3, 1, '$2b$10$sample.hash.for.password123'),
('2024BBA001', 'Sneha', 'Gupta', 'sneha.gupta@student.dseu.ac.in', '9876543213', 3, 2, 1, '$2b$10$sample.hash.for.password123'),
('2024BCA001', 'Vikash', 'Yadav', 'vikash.yadav@student.dseu.ac.in', '9876543214', 4, 2, 1, '$2b$10$sample.hash.for.password123');

-- Insert Sample Issue Categories
INSERT INTO IssueList (IssueCategory, IssueDescription, IsActive, ResponsibleAdminRole) VALUES 
('Academic', 'Issues related to academic matters, courses, exams', 1, 'DEPT_ADMIN'),
('Infrastructure', 'Issues related to campus facilities, equipment', 1, 'CAMPUS_ADMIN'),
('Fee Related', 'Issues related to fee payment, scholarships', 1, 'CAMPUS_ADMIN'),
('Disciplinary', 'Issues related to student conduct and discipline', 1, 'CAMPUS_ADMIN'),
('Technical', 'Issues related to IT services, systems', 1, 'DEPT_ADMIN'),
('Hostel', 'Issues related to hostel accommodation', 1, 'CAMPUS_ADMIN'),
('Library', 'Issues related to library services and resources', 1, 'DEPT_ADMIN'),
('Transport', 'Issues related to campus transportation', 1, 'CAMPUS_ADMIN');

-- Insert Sample Admin Users
INSERT INTO AdminInfo (AdminId, FirstName, LastName, Email, PhoneNumber, Role, CampusId, IsActive, PasswordHash) VALUES 
('ADMIN001', 'Dr. Rajesh', 'Verma', 'rajesh.verma@dseu.ac.in', '9876543220', 'SUPER_ADMIN', 1, 1, '$2b$10$sample.hash.for.admin123'),
('ADMIN002', 'Prof. Sunita', 'Mishra', 'sunita.mishra@dseu.ac.in', '9876543221', 'CAMPUS_ADMIN', 1, 1, '$2b$10$sample.hash.for.admin123'),
('ADMIN003', 'Dr. Arun', 'Joshi', 'arun.joshi@dseu.ac.in', '9876543222', 'DEPT_ADMIN', 1, 1, '$2b$10$sample.hash.for.admin123'),
('ADMIN004', 'Ms. Kavita', 'Sharma', 'kavita.sharma@dseu.ac.in', '9876543223', 'CAMPUS_ADMIN', 2, 1, '$2b$10$sample.hash.for.admin123'),
('ADMIN005', 'Dr. Manoj', 'Singh', 'manoj.singh@dseu.ac.in', '9876543224', 'DEPT_ADMIN', 2, 1, '$2b$10$sample.hash.for.admin123');

-- Insert Sample Grievances
INSERT INTO Grievance (GrievanceId, RollNo, IssueId, Subject, Description, Priority, Status, HasAttachments, SubmissionDate, LastUpdated, ResponsibleAdminId, StudentStatus) VALUES 
('GRV2024001', '2024CS001', 1, 'Exam Schedule Conflict', 'There is a conflict between two exam schedules for the same time slot', 'HIGH', 'PENDING', 0, NOW(), NOW(), 'ADMIN003', 'ACTIVE'),
('GRV2024002', '2024CS002', 2, 'Laboratory Equipment Issue', 'Computer systems in lab are not working properly', 'MEDIUM', 'IN_PROGRESS', 0, NOW(), NOW(), 'ADMIN002', 'ACTIVE'),
('GRV2024003', '2024EC001', 3, 'Fee Payment Problem', 'Online fee payment portal is showing error', 'HIGH', 'PENDING', 0, NOW(), NOW(), 'ADMIN002', 'ACTIVE'),
('GRV2024004', '2024BBA001', 4, 'Classroom Discipline Issue', 'Disruptive behavior in classroom affecting studies', 'MEDIUM', 'RESOLVED', 0, NOW(), NOW(), 'ADMIN004', 'ACTIVE'),
('GRV2024005', '2024BCA001', 5, 'WiFi Connectivity Problem', 'Campus WiFi is very slow and frequently disconnecting', 'LOW', 'IN_PROGRESS', 0, NOW(), NOW(), 'ADMIN005', 'ACTIVE');

-- Insert Sample Tracking Records
INSERT INTO Tracking (GrievanceId, Status, ActionBy, ActionByRole, Remarks, Timestamp) VALUES 
('GRV2024001', 'PENDING', 'SYSTEM', 'SYSTEM', 'Grievance submitted by student', NOW()),
('GRV2024002', 'PENDING', 'SYSTEM', 'SYSTEM', 'Grievance submitted by student', NOW()),
('GRV2024002', 'IN_PROGRESS', 'ADMIN002', 'CAMPUS_ADMIN', 'Assigned to maintenance team for resolution', NOW()),
('GRV2024003', 'PENDING', 'SYSTEM', 'SYSTEM', 'Grievance submitted by student', NOW()),
('GRV2024004', 'PENDING', 'SYSTEM', 'SYSTEM', 'Grievance submitted by student', NOW()),
('GRV2024004', 'IN_PROGRESS', 'ADMIN004', 'CAMPUS_ADMIN', 'Meeting scheduled with concerned parties', NOW()),
('GRV2024004', 'RESOLVED', 'ADMIN004', 'CAMPUS_ADMIN', 'Issue resolved after discussion. Warning issued to disruptive students.', NOW()),
('GRV2024005', 'PENDING', 'SYSTEM', 'SYSTEM', 'Grievance submitted by student', NOW()),
('GRV2024005', 'IN_PROGRESS', 'ADMIN005', 'DEPT_ADMIN', 'IT team working on network optimization', NOW());

-- Insert Sample Admin Audit Logs
INSERT INTO AdminAuditLog (AdminId, Action, TargetType, TargetId, Details, Timestamp) VALUES 
('ADMIN002', 'STATUS_UPDATE', 'GRIEVANCE', 'GRV2024002', 'Changed status from PENDING to IN_PROGRESS', NOW()),
('ADMIN004', 'STATUS_UPDATE', 'GRIEVANCE', 'GRV2024004', 'Changed status from PENDING to IN_PROGRESS', NOW()),
('ADMIN004', 'STATUS_UPDATE', 'GRIEVANCE', 'GRV2024004', 'Changed status from IN_PROGRESS to RESOLVED', NOW()),
('ADMIN005', 'STATUS_UPDATE', 'GRIEVANCE', 'GRV2024005', 'Changed status from PENDING to IN_PROGRESS', NOW());

-- Display confirmation message
SELECT 'Sample data inserted successfully!' AS Message, 
       (SELECT COUNT(*) FROM PersonalInfo) AS Students_Count,
       (SELECT COUNT(*) FROM AdminInfo) AS Admins_Count,
       (SELECT COUNT(*) FROM Grievance) AS Grievances_Count,
       (SELECT COUNT(*) FROM IssueList) AS Issues_Count;

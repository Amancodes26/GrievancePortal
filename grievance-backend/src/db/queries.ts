import pool from './index';

// Use the pool from index.ts instead of creating a new one
export const db = pool;

// CourseEval CRUD queries
export const CourseEvalCrudQueries = {
  GET_ALL: `SELECT * FROM courseeval ORDER BY Id`,
  GET_BY_ID: `SELECT * FROM courseeval WHERE Id = $1`,
  CREATE: `
    INSERT INTO courseeval (
      CourseId, Lect, Pract, CompTypes
    ) VALUES (
      $1, $2, $3, $4
    ) RETURNING *
  `,
  UPDATE: (fields: string[]) => `
    UPDATE courseeval SET
      ${fields.map((f, i) => `${f} = $${i + 2}`).join(",\n      ")},
      UpdatedAt = (NOW() AT TIME ZONE 'Asia/Kolkata')
    WHERE Id = $1 RETURNING *
  `,
  DELETE: `DELETE FROM courseeval WHERE Id = $1 RETURNING *`,
};
// ProgramOptions CRUD queries
export const ProgramOptionsCrudQueries = {
  GET_ALL: `SELECT * FROM programoptions ORDER BY Id`,
  GET_BY_PROGRAMID_TERM_BATCH: `SELECT * FROM programoptions WHERE ProgramId = $1 AND Term = $2 AND Batch = $3`,
  CREATE: `
    INSERT INTO programoptions (
      ProgramId, Term, Batch, GradingType
    ) VALUES (
      $1, $2, $3, $4
    ) RETURNING *
  `,
  UPDATE_BY_PROGRAMID_TERM_BATCH: (fields: string[]) => `
    UPDATE programoptions SET
      ${fields.map((f, i) => `${f} = $${i + 4}`).join(",\n      ")},
      UpdatedAt = (NOW() AT TIME ZONE 'Asia/Kolkata')
    WHERE ProgramId = $1 AND Term = $2 AND Batch = $3 RETURNING *
  `,
  DELETE_BY_PROGRAMID_TERM_BATCH: `DELETE FROM programoptions WHERE ProgramId = $1 AND Term = $2 AND Batch = $3 RETURNING *`,
};

// CourseProgram CRUD queries
export const CourseProgramCrudQueries = {
  GET_ALL: `SELECT * FROM courseprogram ORDER BY Id`,
  GET_BY_COMPOSITE_KEY: `SELECT * FROM courseprogram WHERE ProgramId = $1 AND CourseId = $2 AND Batch = $3`,
  CREATE: `
    INSERT INTO courseprogram (
      ProgramId, CourseId, Batch, IsActive
    ) VALUES (
      $1, $2, $3, COALESCE($4, TRUE)
    ) RETURNING *
  `,
  UPDATE_BY_COMPOSITE_KEY: (fields: string[]) => `
    UPDATE courseprogram SET
      ${fields.map((f, i) => `${f} = $${i + 4}`).join(",\n      ")},
      UpdatedAt = (NOW() AT TIME ZONE 'Asia/Kolkata')
    WHERE ProgramId = $1 AND CourseId = $2 AND Batch = $3 RETURNING *
  `,
  DELETE_BY_COMPOSITE_KEY: `DELETE FROM courseprogram WHERE ProgramId = $1 AND CourseId = $2 AND Batch = $3 RETURNING *`,
};

// Course CRUD queries
export const CourseCrudQueries = {
  GET_ALL: `SELECT * FROM course ORDER BY CourseId`,
  GET_BY_ID: `SELECT * FROM course WHERE CourseId = $1`,
  GET_BY_CODE: `SELECT * FROM course WHERE CourseCode = $1`,
  CREATE: `
    INSERT INTO course (
      CourseCode, CourseName, Term, CourseType, Credit
    ) VALUES (
      $1, $2, $3, $4, $5
    ) RETURNING *
  `,
  UPDATE: (fields: string[]) => `
    UPDATE course SET
      ${fields.map((f, i) => `${f} = $${i + 2}`).join(",\n      ")},
      UpdatedAt = (NOW() AT TIME ZONE 'Asia/Kolkata')
    WHERE CourseId = $1 RETURNING *
  `,
  DELETE: `DELETE FROM course WHERE CourseId = $1 RETURNING *`,
};

// AcademicInfo CRUD queries
export const AcademicInfoCrudQueries = {
  GET_ALL: `SELECT * FROM academicinfo ORDER BY Id`,
  GET_BY_ROLLNO_AND_TERM: `SELECT * FROM academicinfo WHERE RollNo = $1 AND Term = $2`,
  CREATE: `
    INSERT INTO academicinfo (
      RollNo, ProgramId, AcademicYear, Term, CampusId, Batch
    ) VALUES (
      $1, $2, $3, $4, $5, $6
    ) RETURNING *
  `,  // Dynamic update: only update provided fields, never update Id
  UPDATE_BY_ROLLNO_AND_TERM: (fields: string[]) => `
    UPDATE academicinfo SET
      ${fields.map((f, i) => `${f} = $${i + 3}`).join(",\n      ")},
      UpdatedAt = (NOW() AT TIME ZONE 'Asia/Kolkata')
    WHERE RollNo = $1 AND Term = $2 RETURNING *
  `,
  DELETE: `DELETE FROM academicinfo WHERE Id = $1 RETURNING *`,
};
// ProgramInfo CRUD queries
export const ProgramInfoCrudQueries = {
  GET_ALL: `SELECT * FROM ProgramInfo ORDER BY ProgramId`,
  GET_BY_ID: `SELECT * FROM ProgramInfo WHERE ProgramId = $1`,
  CREATE: `
    INSERT INTO ProgramInfo (
      ProgramId,
      ProgramCode, ProgramName, ProgramType, TermType, Specialisation, SpecialCode, SpecialName
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8
    ) RETURNING *
  `,
  // Dynamic update: only update provided fields, never update ProgramId
  UPDATE: (fields: string[]) => `
    UPDATE ProgramInfo SET
      ${fields.map((f, i) => `${f} = $${i + 2}`).join(",\n      ")},
      UpdatedAt = (NOW() AT TIME ZONE 'Asia/Kolkata')
    WHERE ProgramId = $1 RETURNING *
  `,
  DELETE: `DELETE FROM ProgramInfo WHERE ProgramId = $1 RETURNING *`,
};
// PersonalInfo CRUD queries
export const PersonalInfoCrudQueries = {
  GET_ALL: `SELECT * FROM PersonalInfo ORDER BY id`,
  GET_BY_ROLL_NO: `SELECT * FROM PersonalInfo WHERE rollno = $1`,
  CREATE: `
    INSERT INTO PersonalInfo (
      RollNo, Name, Father, Mother, Abc, DOB, Category, Gender, Pwd, Phone, Email, Password, IsVerified, AdmissionYear, LE
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
    ) RETURNING *
  `,
  // Dynamic update: only update provided fields, never update RollNo
  UPDATE: (fields: string[]) => `
    UPDATE PersonalInfo SET
      ${fields.map((f, i) => `${f} = $${i + 2}`).join(",\n      ")},
      UpdatedAt = (NOW() AT TIME ZONE 'Asia/Kolkata')
    WHERE RollNo = $1 RETURNING *
  `,
  DELETE: `DELETE FROM PersonalInfo WHERE RollNo = $1 RETURNING *`,
};
// Campuses queries
export const CampusQueries = {
  GET_ALL: `SELECT * FROM CampusInfo ORDER BY CampusId`,
  GET_BY_ID: `SELECT * FROM CampusInfo WHERE CampusId = $1`,
  CREATE: `INSERT INTO CampusInfo (CampusId, CampusCode, CampusName) VALUES ($1, $2, $3) RETURNING *`,
  UPDATE: `UPDATE CampusInfo SET CampusCode = $1, CampusName = $2, UpdatedAt = (NOW() AT TIME ZONE 'Asia/Kolkata') WHERE CampusId = $3 RETURNING *`,
  DELETE: `DELETE FROM CampusInfo WHERE CampusId = $1 RETURNING *`,
};
// AdminOTP queries
export const AdminOTPQueries = {
  CREATE_ADMIN_OTP: `
    INSERT INTO AdminOTP (adminid, otp, email, attempt, createdat)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `,
  FIND_LATEST_ADMIN_OTP: `
    SELECT * FROM AdminOTP
    WHERE adminid = $1 AND email = $2
    ORDER BY createdat DESC
    LIMIT 1
  `,  UPDATE_ADMIN_OTP_ATTEMPT: `
    UPDATE AdminOTP
    SET attempt = $3, createdat = $4, otp = $5
    WHERE adminid = $1 AND email = $2
    AND id = (
      SELECT id FROM AdminOTP
      WHERE adminid = $1 AND email = $2
      ORDER BY createdat DESC
      LIMIT 1
    )
    RETURNING *
  `,  EXPIRE_ADMIN_OTP: `
    UPDATE AdminOTP 
    SET otp = NULL 
    WHERE adminid = $1 AND email = $2
    AND id = (
      SELECT id FROM AdminOTP
      WHERE adminid = $1 AND email = $2
      ORDER BY createdat DESC
      LIMIT 1
    )
  `,
  FIND_BY_ADMIN_EMAIL: `SELECT * FROM Admin WHERE Email = $1`,
  UPDATE_ADMIN_PASSWORD: `UPDATE Admin SET Password = $1 WHERE Email = $2`,
};
// Database queries for DSEU Project
import { OTP_EXPIRY_MINUTES, OTP_FREEZE_DURATION_HOURS } from '../constants/otpConstants';

export const PersonalInfoQueries = {
  // Find user by roll number
  FIND_BY_ROLLNO: `
    SELECT * FROM PersonalInfo 
    WHERE rollno = $1
  `,

  // Find user by email
  FIND_BY_EMAIL: `
    SELECT * FROM PersonalInfo 
    WHERE email = $1
  `,

  // Create new user
  CREATE_USER: `
    INSERT INTO PersonalInfo 
    (rollno, name, email, father, mother, abc, dob, category, gender, pwd, phone, admissionyear, le)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *
  `,

  // Update user password
  UPDATE_PASSWORD: `
    UPDATE PersonalInfo 
    SET password = $1, isverified = $2, updatedat = CURRENT_TIMESTAMP
    WHERE rollno = $3
    RETURNING *
  `,

  // Update user phone
  UPDATE_PHONE: `
    UPDATE PersonalInfo 
    SET phone = $1, updatedat = CURRENT_TIMESTAMP
    WHERE rollno = $2
    RETURNING *
  `,

  // Update user verification status
  UPDATE_VERIFICATION: `
    UPDATE PersonalInfo 
    SET isverified = $1, updatedat = CURRENT_TIMESTAMP
    WHERE rollno = $2
    RETURNING *
  `,

  // Get all users (for admin purposes)
  GET_ALL_USERS: `
    SELECT rollno, name, email, isverified, admissionyear, createdat 
    FROM PersonalInfo 
    ORDER BY createdat DESC
  `,

  // Get users by admission year
  GET_USERS_BY_YEAR: `
    SELECT rollno, name, email, isverified, createdat 
    FROM PersonalInfo 
    WHERE admissionyear = $1
    ORDER BY rollno
  `,

  // Check if user exists by rollno
  USER_EXISTS: `
    SELECT EXISTS(SELECT 1 FROM PersonalInfo WHERE rollno = $1) as exists
  `,

  // Get user stats
  GET_USER_STATS: `
    SELECT 
      COUNT(*) as total_users,
      COUNT(CASE WHEN isverified = true THEN 1 END) as verified_users,
      COUNT(CASE WHEN isverified = false THEN 1 END) as unverified_users
    FROM PersonalInfo
  `
};

export const OTPQueries = {
  // Create new OTP
  CREATE_OTP: `
    INSERT INTO OTP (rollno, otp, email, attempt, createdat)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `,

  // Upsert OTP (insert if not exists, update if exists)
  UPSERT_OTP: `
    INSERT INTO OTP (rollno, otp, email, attempt, createdat)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (rollno, email) 
    DO UPDATE SET 
      otp = EXCLUDED.otp,
      attempt = EXCLUDED.attempt,
      createdat = EXCLUDED.createdat
    RETURNING *
  `,

  // Find latest OTP for user
  FIND_LATEST_OTP: `
    SELECT * FROM OTP 
    WHERE rollno = $1 AND email = $2 
    ORDER BY createdat DESC 
    LIMIT 1
  `,

  // Find OTP by roll number only
  FIND_OTP_BY_ROLLNO: `
    SELECT * FROM OTP 
    WHERE rollno = $1 
    ORDER BY createdat DESC 
    LIMIT 1
  `,

  // Delete OTP for specific user
  DELETE_OTP: `
    DELETE FROM OTP 
    WHERE rollno = $1 AND email = $2
  `,
  // Delete all OTPs for a user
  DELETE_USER_OTPS: `
    DELETE FROM OTP 
    WHERE rollno = $1
  `,

  // Ensure only latest OTP exists for a user (cleanup duplicates)
  CLEANUP_DUPLICATE_OTPS: `
    DELETE FROM OTP 
    WHERE rollno = $1 AND email = $2 
    AND id NOT IN (
      SELECT id FROM OTP 
      WHERE rollno = $1 AND email = $2 
      ORDER BY createdat DESC 
      LIMIT 1
    )
  `,

  // Count OTPs for a specific user
  COUNT_USER_OTPS: `
    SELECT COUNT(*) as count 
    FROM OTP 
    WHERE rollno = $1 AND email = $2
  `,  // Delete expired OTPs (older than OTP_EXPIRY_MINUTES) - IST aware
  DELETE_EXPIRED_OTPS: `
    DELETE FROM OTP 
    WHERE createdat < (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') - INTERVAL '${OTP_EXPIRY_MINUTES} minutes'
  `,
  // Get OTP attempt count
  GET_ATTEMPT_COUNT: `
    SELECT COUNT(*) as attempt_count 
    FROM OTP 
    WHERE rollno = $1 AND email = $2 
    AND createdat > NOW() - INTERVAL '${OTP_FREEZE_DURATION_HOURS} hour'
  `,
  // Update OTP attempt and created date
  UPDATE_OTP_ATTEMPT: `
    UPDATE OTP 
    SET attempt = $3, createdat = $4, otp = $5
    WHERE rollno = $1 AND email = $2 
    AND createdat = (
      SELECT MAX(createdat) 
      FROM OTP 
      WHERE rollno = $1 AND email = $2
    )
    RETURNING *
  `,

  // Update only attempt count
  UPDATE_ATTEMPT_COUNT: `
    UPDATE OTP 
    SET attempt = $3
    WHERE rollno = $1 AND email = $2 
    AND createdat = (
      SELECT MAX(createdat) 
      FROM OTP 
      WHERE rollno = $1 AND email = $2
    )
    RETURNING *
  `,
  // Clean up old OTPs (older than 1 day) - IST aware
  CLEANUP_OLD_OTPS: `
    DELETE FROM OTP 
    WHERE createdat < (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') - INTERVAL '1 day'
  `,

  // Get OTP statistics
  GET_OTP_STATS: `
    SELECT 
      COUNT(*) as total_otps,
      COUNT(DISTINCT rollno) as unique_users,
      AVG(attempt) as avg_attempts
    FROM OTP 
    WHERE createdat > NOW() - INTERVAL '24 hours'
  `
};

export const AdminQueries = {
  // Get database health stats
  GET_DB_HEALTH: `    SELECT 
      (SELECT COUNT(*) FROM PersonalInfo) as total_users,
      (SELECT COUNT(*) FROM OTP) as active_otps,
      (SELECT COUNT(*) FROM PersonalInfo WHERE isverified = true) as verified_users,
      (SELECT COUNT(*) FROM OTP WHERE createdat > NOW() - INTERVAL '${OTP_FREEZE_DURATION_HOURS} hour') as recent_otps
  `,

  // Get user activity logs
  GET_USER_ACTIVITY: `
    SELECT 
      p.rollno,
      p.name,
      p.email,
      p.isverified,
      p.createdat as registration_date,
      o.createdat as last_otp_request
    FROM PersonalInfo p
    LEFT JOIN (
      SELECT rollno, MAX(createdat) as createdat
      FROM OTP
      GROUP BY rollno
    ) o ON p.rollno = o.rollno
    ORDER BY p.createdat DESC
    LIMIT $1 OFFSET $2
  `,

  // Get failed login attempts
  GET_FAILED_ATTEMPTS: `
    SELECT 
      rollno,
      email,
      COUNT(*) as failed_attempts,
      MAX(createdat) as last_attempt
    FROM OTP 
    WHERE attempt > 3 
    AND createdat > NOW() - INTERVAL '24 hours'
    GROUP BY rollno, email
    ORDER BY failed_attempts DESC
  `
};

export const ValidationQueries = {
  // Check if email is already taken
  EMAIL_EXISTS: `
    SELECT EXISTS(SELECT 1 FROM PersonalInfo WHERE email = $1) as exists
  `,

  // Check if roll number format is valid (assuming DSEU format)
  VALIDATE_ROLLNO_FORMAT: `
    SELECT $1 ~ '^[0-9]{8}$' as is_valid
  `,

  // Get duplicate emails
  GET_DUPLICATE_EMAILS: `
    SELECT email, COUNT(*) as count 
    FROM PersonalInfo 
    GROUP BY email 
    HAVING COUNT(*) > 1
  `,

  // Get users with missing data
  GET_INCOMPLETE_PROFILES: `
    SELECT rollno, name, email 
    FROM PersonalInfo 
    WHERE phone IS NULL 
    OR dob IS NULL 
    OR category IS NULL 
    OR gender IS NULL
  `
};
export const TemporaryDataQueries = {
  SAMPLE_DATA: `-- Insert sample CampusInfo data
      INSERT INTO CampusInfo (CampusId, CampusCode, CampusName) VALUES 
      (1011, 'ABIT', 'ARYABHATT DSEU ASHOK VIHAR CAMPUS'),
      (1012, 'AIT', 'AMBEDKAR DSEU CAMPUS-I'),
      (1013, 'BPIBS', 'BHAI PARMANAND DSEU SHAKARPUR CAMPUS-II'),
      (1014, 'CDO', 'CHAMPS DSEU OKHLA CAMPUS'),
      (1015, 'CVR', 'SIR C.V. RAMAN DSEU DHEERPUR CAMPUS'),
      (1016, 'DDC', 'DSEU DWARKA CAMPUS'),
      (1017, 'DJC', 'DSEU JAFFARPUR CAMPUS'),
      (1018, 'DRC', 'DSEU RAJOKRI CAMPUS'),
      (1019, 'DWC', 'DSEU WAZIRPUR-I CAMPUS'),
      (1020, 'GBP', 'G.B. PANT DSEU OKHLA-I CAMPUS'),
      (1021, 'GND', 'GURU NANAK DEV DSEU ROHINI CAMPUS'),
      (1022, 'KDP', 'KASTURBA DSEU PITAMPURA CAMPUS (FOR GIRLS ONLY)'),
      (1023, 'MBC', 'MEERABAI DSEU MAHARANI BAGH CAMPUS (FOR GIRLS ONLY)');

-- Insert sample ProgramInfo data
INSERT INTO ProgramInfo (ProgramCode, ProgramName, ProgramType, TermType, Specialisation, SpecialCode, SpecialName) VALUES 
('BTECH-CSE', 'Bachelor of Technology in Computer Science', 'BTech', 'semester', TRUE, 'AI-ML', 'Artificial Intelligence and Machine Learning'),
('BTECH-ECE', 'Bachelor of Technology in Electronics', 'BTech', 'semester', TRUE, 'VLSI', 'VLSI Design'),
('BTECH-ME', 'Bachelor of Technology in Mechanical Engineering', 'BTech', 'semester', FALSE, NULL, NULL),
('BBA', 'Bachelor of Business Administration', 'BBA', 'semester', TRUE, 'FM', 'Financial Management'),
('BCA', 'Bachelor of Computer Applications', 'BCA', 'semester', FALSE, NULL, NULL);

-- Insert sample ProgramOptions data
INSERT INTO ProgramOptions (ProgramId, Term, Batch, GradingType) VALUES 
-- BTech CSE Options
(1, 1, 2022, 'absolute'), (1, 2, 2022, 'absolute'), (1, 3, 2022, 'relative'),
(1, 1, 2023, 'absolute'), (1, 2, 2023, 'absolute'), (1, 3, 2023, 'relative'),
(1, 1, 2024, 'absolute'), (1, 2, 2024, 'absolute'),
-- BTech ECE Options
(2, 1, 2022, 'absolute'), (2, 2, 2022, 'absolute'), (2, 3, 2022, 'relative'),
(2, 1, 2023, 'absolute'), (2, 2, 2023, 'absolute'),
-- BBA Options
(4, 1, 2022, 'absolute'), (4, 2, 2022, 'absolute'),
(4, 1, 2023, 'absolute'), (4, 2, 2023, 'absolute'),
-- BCA Options
(5, 1, 2022, 'absolute'), (5, 2, 2022, 'absolute'),
(5, 1, 2023, 'relative'), (5, 2, 2023, 'absolute'); 

-- Insert sample CampusProgram data
INSERT INTO CampusProgram (CampusId, ProgramId, Batch) VALUES 
(1011, 1, 2022), (1011, 1, 2023), (1011, 1, 2024),
(1011, 2, 2022), (1011, 2, 2023),
(1012, 1, 2022), (1012, 1, 2023),
(1012, 3, 2022), (1012, 3, 2023),
(1013, 4, 2022), (1013, 4, 2023),
(1014, 5, 2022), (1014, 5, 2023);

-- Insert sample Course data
INSERT INTO Course (CourseCode, CourseName, Term, CourseType, Credit) VALUES 
-- BTech CSE Courses
('CSE101', 'Programming Fundamentals', 1, 'core', 4),
('CSE102', 'Data Structures', 2, 'core', 4),
('CSE201', 'Database Management Systems', 3, 'core', 4),
('CSE202', 'Operating Systems', 4, 'core', 4),
('CSE301', 'Machine Learning', 5, 'elective', 3),
('CSE302', 'Artificial Intelligence', 6, 'elective', 3),
-- BTech ECE Courses
('ECE101', 'Electronic Devices', 1, 'core', 4),
('ECE102', 'Digital Electronics', 2, 'core', 4),
('ECE201', 'VLSI Design', 3, 'core', 4),
-- BBA Courses
('BBA101', 'Principles of Management', 1, 'core', 3),
('BBA102', 'Financial Accounting', 2, 'core', 3),
('BBA201', 'Financial Management', 3, 'elective', 3),
-- BCA Courses
('BCA101', 'Computer Fundamentals', 1, 'core', 3),
('BCA102', 'Programming in C', 2, 'core', 4);

-- Insert sample CourseEval data
INSERT INTO CourseEval (CourseId, Lect, Tut, Pract, CompTypes) VALUES 
-- CSE Course Evaluations
('CSE101', 3, 1, 0, 'default'),
('CSE102', 3, 1, 0, 'default'),
('CSE201', 3, 0, 0, 'default'),
('CSE202', 3, 1, 0, 'default'),
('CSE301', 3, 0, 0, 'default'),
('CSE302', 3, 0, 0, 'default'),
-- ECE Course Evaluations
('ECE101', 3, 1, 1, 'default'),
('ECE102', 3, 1, 1, 'default'),
('ECE201', 3, 0, 1, 'default'),
-- BBA Course Evaluations
('BBA101', 3, 0, 0, 'default'),
('BBA102', 3, 1, 0, 'default'),
('BBA201', 3, 0, 1, 'default'),
-- BCA Course Evaluations
('BCA101', 3, 0, 0, 'default'),
('BCA102', 3, 1, 0, 'default');

-- Insert sample CourseProgram data
INSERT INTO CourseProgram (ProgramId, CourseId, Batch) VALUES 
-- BTech CSE Program Courses
(1, 1, 2022), (1, 1, 2023), (1, 1, 2024),
(1, 2, 2022), (1, 2, 2023), (1, 2, 2024),
(1, 3, 2022), (1, 3, 2023),
(1, 4, 2022), (1, 4, 2023),
(1, 5, 2022), (1, 6, 2022),
-- BTech ECE Program Courses
(2, 7, 2022), (2, 7, 2023),
(2, 8, 2022), (2, 8, 2023),
(2, 9, 2022), (2, 9, 2023),
-- BBA Program Courses
(4, 10, 2022), (4, 10, 2023),
(4, 11, 2022), (4, 11, 2023),
(4, 12, 2022), (4, 12, 2023),
-- BCA Program Courses
(5, 13, 2022), (5, 13, 2023),
(5, 14, 2022), (5, 14, 2023);

-- Insert sample PersonalInfo data
INSERT INTO PersonalInfo (
    RollNo, Name, Email, IsVerified, AdmissionYear, LE
) VALUES 
(
    '41522014', 
    'Anupam', 
    '9582anupamk@gmail.com', 
    FALSE, 
    2022, 
    FALSE
),
(
    '41522026', 
    'Harshit Tiwari', 
    'tharshit0812@gmail.com', 
    FALSE, 
    2022, 
    FALSE
),
(
    '41522068',
    'MANIS 2', 
    'btech41522068@dseu.ac.in', 
    FALSE, 
    2022, 
    FALSE
),
(
    '41522047', 
    'Pankaj', 
    'pankajkumar086420@gmail.com',
    FALSE,
    2022,
    FALSE
),
(
    '41522054', 
    'Samagra', 
    'dinomafia16@gmail.com',
    FALSE,
    2022,
    FALSE
);

-- Insert sample Admin data
INSERT INTO Admin (
    AdminId, Name, Email, Role
) VALUES 
(
    'admin001', 
    'System Administrator', 
    'btech41522047@dseu.ac.in', 
    'super_admin'
),
(
    'admin002', 
    'Exam Controller', 
    'btech41522068@dseu.ac.in', 
    'super_admin'
),
(
    'admin003', 
    'IT Support', 
    'btech41522054@dseu.ac.in', 
    'super_admin'
);
`,
DELETE_DATA: `-- Truncate all tables to remove temporary data
TRUNCATE TABLE CampusInfo, ProgramInfo, ProgramOptions, CampusProgram, Course, CourseEval, CourseProgram, PersonalInfo, Admin, OTP, AdminOTP RESTART IDENTITY CASCADE;`,
  SAMPLE_PERSONAL_DATA: `-- Insert sample PersonalInfo data
INSERT INTO PersonalInfo (
    RollNo, Name, Email, IsVerified, AdmissionYear, LE
) VALUES 
(
    '231632043002', 
    'Aman', 
    'Amansngh8586@gmail.com', 
    FALSE, 
    2023, 
    TRUE
),
(
    '41522026', 
    'Harshit Tiwari', 
    'tharshit0812@gmail.com', 
    FALSE, 
    2022, 
    FALSE
),
(
    '41522068',
    'MANIS 2', 
    'btech41522068@dseu.ac.in', 
    FALSE, 
    2022, 
    FALSE
),
(
    '41522047', 
    'Pankaj', 
    'pankajkumar086420@gmail.com',
    FALSE,
    2022,
    FALSE
),
(
    '41522054', 
    'Samagra', 
    'dinomafia16@gmail.com',
    FALSE,
    2022,
    FALSE
);


-- Insert sample Admin data
INSERT INTO Admin (
    AdminId, Name, Email,Password, Role
) VALUES 
(
    'admin001', 
    'System Administrator', 
    'btech41522047@dseu.ac.in',
    '$2b$10$NlPRJZdOhxhIpWLkzXPMr.7lufHx/8074gvv1vUFidPteZzhG.qZK', 
    'super_admin'
),
(
    'admin002', 
    'Exam Controller', 
    'btech41522068@dseu.ac.in',
    '$2b$10$hjMSbP9m/qamDSmC58sTtOlV8KvC8L3NuwpTMrzsSoXvrZb07k7Om', 
    'super_admin'
),
(
    'admin003', 
    'IT Support', 
    'sagar200422@gmail.com',
    '$2b$10$aQGXX3chDfP61lZetKE.h.zi3TWtmYnLAOxa.1OqEAHm8U9.NFLjS',
    'super_admin'
);
`,
}


// Marks Entry Validation Queries
export const MarksValidationQueries = {
  // Check if course code exists
  COURSE_CODE_EXISTS: `
    SELECT EXISTS(SELECT 1 FROM Course WHERE CourseCode = $1) as exists
  `,
  
  // Get course by code to validate course name
  GET_COURSE_BY_CODE: `
    SELECT CourseCode, CourseName 
    FROM Course 
    WHERE CourseCode = $1
  `,
  
  // Check if roll number exists in PersonalInfo
  ROLLNO_EXISTS: `
    SELECT EXISTS(SELECT 1 FROM PersonalInfo WHERE RollNo = $1) as exists
  `,
  
  // Get student info by roll number to validate name
  GET_STUDENT_BY_ROLLNO: `
    SELECT RollNo, Name 
    FROM PersonalInfo 
    WHERE RollNo = $1
  `,
  
  // Check if student is enrolled in the academic system (has AcademicInfo record)
  STUDENT_ENROLLED: `
    SELECT EXISTS(
      SELECT 1 
      FROM AcademicInfo 
      WHERE RollNo = $1
    ) as enrolled
  `,
  
  // Get student academic info with program details
  GET_STUDENT_ACADEMIC_INFO: `
    SELECT 
      ai.RollNo,
      ai.ProgramId,
      ai.Term,
      ai.Batch,
      ai.AcademicYear,
      pi.ProgramCode,
      pi.ProgramName
    FROM AcademicInfo ai
    JOIN ProgramInfo pi ON ai.ProgramId = pi.ProgramId
    WHERE ai.RollNo = $1
  `,
  
  // Validate if course is offered for a specific program and batch
  COURSE_PROGRAM_MATCH: `
    SELECT EXISTS(
      SELECT 1 
      FROM CourseProgram cp
      JOIN Course c ON cp.CourseId = c.CourseId
      WHERE c.CourseCode = $1 
      AND cp.ProgramId = $2 
      AND cp.Batch = $3
      AND cp.IsActive = true
    ) as course_offered
  `
};

// ...existing code...


// Grievance CRUD queries
export const GrievanceQueries = {
  CREATE: `
    INSERT INTO grievance (
      Issuse_Id, RollNo, Campus, Subject, Description, Issuse_type, Status, Attachment
    ) VALUES (
      $1, $2, $3, $4, $5, $6, COALESCE($7, 'pending'), $8
    ) RETURNING *
  `,
  GET_BY_ID: `
    SELECT * FROM grievance WHERE id = $1
  `,
  GET_BY_ROLLNO: `
    SELECT * FROM grievance WHERE RollNo = $1 ORDER BY Date DESC
  `,
  GET_ALL: `
    SELECT * FROM grievance ORDER BY Date DESC
  `,
  UPDATE_STATUS: `
    UPDATE grievance SET Status = $2 WHERE id = $1 RETURNING *
  `,
  UPDATE: (fields: string[]) => `
    UPDATE grievance SET
      ${fields.map((f, i) => `${f} = $${i + 2}`).join(",\n      ")}
    WHERE id = $1 RETURNING *
  `,
  DELETE: `
    DELETE FROM grievance WHERE id = $1 RETURNING *
  `
};

// Response CRUD queries
export const ResponseQueries = {
  CREATE: `
    INSERT INTO response (
      Issuse_Id, ResponseText, ResponseBy, Status, Stage, attachment, redirect
    ) VALUES (
      $1, $2, $3, COALESCE($4, 'pending'), $5, $6, $7
    ) RETURNING *
  `,
  GET_BY_ISSUE_ID: `
    SELECT * FROM response WHERE Issuse_Id = $1 ORDER BY Date ASC
  `,
  GET_ALL: `
    SELECT * FROM response ORDER BY Date DESC
  `,
  DELETE: `
    DELETE FROM response WHERE id = $1 RETURNING *
  `
};

// GrievanceHistory CRUD queries
export const GrievanceHistoryQueries = {
  CREATE: `
    INSERT INTO grievancehistory (
      Issuse_Id, from_status, to_status, action_by, stage_type, Note
    ) VALUES (
      $1, $2, $3, $4, $5, $6
    ) RETURNING *
  `,
  GET_BY_ISSUE_ID: `
    SELECT * FROM grievancehistory WHERE Issuse_Id = $1 ORDER BY Date ASC
  `,
  GET_ALL: `
    SELECT * FROM grievancehistory ORDER BY Date DESC
  `,
  DELETE: `
    DELETE FROM grievancehistory WHERE Id = $1 RETURNING *
  `
};

// Attachment CRUD queries
export const AttachmentQueries = {
  CREATE: `
    INSERT INTO attachment (
      Issuse_Id, FileName, FilePath, UploadedBy
    ) VALUES (
      $1, $2, $3, $4
    ) RETURNING *
  `,
  GET_BY_ISSUE_ID: `
    SELECT * FROM attachment WHERE Issuse_Id = $1 ORDER BY UploadedAt DESC
  `,
  GET_ALL: `
    SELECT * FROM attachment ORDER BY UploadedAt DESC
  `,
  DELETE: `
    DELETE FROM attachment WHERE id = $1 RETURNING *
  `
};

// ...existing code...
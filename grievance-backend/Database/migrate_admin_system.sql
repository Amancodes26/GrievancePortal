-- Migration script for Enhanced Admin System
-- This script adds campus-based admin functionality to existing database

-- Step 1: Add new columns to Admin table
ALTER TABLE Admin 
ADD COLUMN IF NOT EXISTS CampusId INTEGER,
ADD COLUMN IF NOT EXISTS IsActive BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS CreatedAt TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata'),
ADD COLUMN IF NOT EXISTS UpdatedAt TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata');

-- Step 2: Add foreign key constraint for campus (PostgreSQL compatible)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_admin_campus' 
        AND table_name = 'admin'
    ) THEN
        ALTER TABLE Admin ADD CONSTRAINT fk_admin_campus 
        FOREIGN KEY (CampusId) REFERENCES CampusInfo(CampusId);
    END IF;
END $$;

-- Step 3: Create Admin_Campus_Assignment table
CREATE TABLE IF NOT EXISTS Admin_Campus_Assignment (
    id SERIAL PRIMARY KEY,
    admin_id VARCHAR(50) NOT NULL,
    campus_id INTEGER NOT NULL,
    department VARCHAR(50) NOT NULL,
    assigned_at TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata'),
    is_primary BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_admin_campus_assignment_admin FOREIGN KEY (admin_id) REFERENCES Admin(AdminId) ON DELETE CASCADE,
    CONSTRAINT fk_admin_campus_assignment_campus FOREIGN KEY (campus_id) REFERENCES CampusInfo(CampusId) ON DELETE CASCADE,
    CONSTRAINT unique_admin_campus_dept UNIQUE (admin_id, campus_id, department)
);

-- Step 4: Create Admin_Audit_Log table
CREATE TABLE IF NOT EXISTS Admin_Audit_Log (
    id SERIAL PRIMARY KEY,
    admin_id VARCHAR(50) NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    action_details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata'),
    CONSTRAINT fk_admin_audit_admin FOREIGN KEY (admin_id) REFERENCES Admin(AdminId) ON DELETE CASCADE
);

-- Step 5: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_campus ON Admin(CampusId);
CREATE INDEX IF NOT EXISTS idx_admin_role ON Admin(Role);
CREATE INDEX IF NOT EXISTS idx_admin_active ON Admin(IsActive);
CREATE INDEX IF NOT EXISTS idx_admin_campus_assignment_admin ON Admin_Campus_Assignment(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_campus_assignment_campus ON Admin_Campus_Assignment(campus_id);
CREATE INDEX IF NOT EXISTS idx_admin_campus_assignment_dept ON Admin_Campus_Assignment(department);
CREATE INDEX IF NOT EXISTS idx_admin_audit_admin ON Admin_Audit_Log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_action ON Admin_Audit_Log(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON Admin_Audit_Log(created_at);

-- Step 6: Create trigger for updating UpdatedAt timestamp
CREATE OR REPLACE FUNCTION update_admin_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.UpdatedAt = (NOW() AT TIME ZONE 'Asia/Kolkata');
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_admin_updated_at ON Admin;
CREATE TRIGGER update_admin_updated_at 
    BEFORE UPDATE ON Admin 
    FOR EACH ROW EXECUTE FUNCTION update_admin_updated_at();

-- Step 7: Insert default super admin if not exists
INSERT INTO Admin (AdminId, Name, Email, Password, Role, CampusId, IsActive)
SELECT 
    'SUPERADMIN_001',
    'System Super Admin',
    'superadmin@dseu.ac.in',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: password
    'superadmin',
    1016, -- DSEU Dwarka Campus (Main Campus)
    true
WHERE NOT EXISTS (
    SELECT 1 FROM Admin WHERE Role = 'superadmin'
);

-- Step 8: Create sample department admins for main campus (DSEU Dwarka)
-- Academic Admin
INSERT INTO Admin (AdminId, Name, Email, Password, Role, CampusId, IsActive)
SELECT 
    'ACADEMIC_001',
    'Academic Department Admin',
    'academic.admin@dseu.ac.in',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: password
    'academic',
    1016, -- DSEU Dwarka Campus
    true
WHERE NOT EXISTS (
    SELECT 1 FROM Admin WHERE AdminId = 'ACADEMIC_001'
);

-- Exam Admin
INSERT INTO Admin (AdminId, Name, Email, Password, Role, CampusId, IsActive)
SELECT 
    'EXAM_001',
    'Exam Department Admin',
    'exam.admin@dseu.ac.in',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: password
    'exam',
    1016, -- DSEU Dwarka Campus
    true
WHERE NOT EXISTS (
    SELECT 1 FROM Admin WHERE AdminId = 'EXAM_001'
);

-- Campus Admin
INSERT INTO Admin (AdminId, Name, Email, Password, Role, CampusId, IsActive)
SELECT 
    'CAMPUS_001',
    'Campus Department Admin',
    'campus.admin@dseu.ac.in',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: password
    'campus',
    1016, -- DSEU Dwarka Campus
    true
WHERE NOT EXISTS (
    SELECT 1 FROM Admin WHERE AdminId = 'CAMPUS_001'
);

-- Step 9: Create campus assignments for main campus admins
INSERT INTO Admin_Campus_Assignment (admin_id, campus_id, department, is_primary)
SELECT 'ACADEMIC_001', 1016, 'academic', true
WHERE NOT EXISTS (
    SELECT 1 FROM Admin_Campus_Assignment WHERE admin_id = 'ACADEMIC_001' AND campus_id = 1016
);

INSERT INTO Admin_Campus_Assignment (admin_id, campus_id, department, is_primary)
SELECT 'EXAM_001', 1016, 'exam', true
WHERE NOT EXISTS (
    SELECT 1 FROM Admin_Campus_Assignment WHERE admin_id = 'EXAM_001' AND campus_id = 1016
);

INSERT INTO Admin_Campus_Assignment (admin_id, campus_id, department, is_primary)
SELECT 'CAMPUS_001', 1016, 'campus', true
WHERE NOT EXISTS (
    SELECT 1 FROM Admin_Campus_Assignment WHERE admin_id = 'CAMPUS_001' AND campus_id = 1016
);

-- Step 10: Update existing admins to have default campus if not set
UPDATE Admin 
SET CampusId = 1016 
WHERE CampusId IS NULL AND Role != 'superadmin';

-- Step 11: Create campus assignments for existing admins
INSERT INTO Admin_Campus_Assignment (admin_id, campus_id, department, is_primary)
SELECT 
    a.AdminId, 
    a.CampusId, 
    a.Role, 
    true
FROM Admin a
WHERE a.CampusId IS NOT NULL 
AND a.Role IN ('academic', 'exam', 'campus')
AND NOT EXISTS (
    SELECT 1 FROM Admin_Campus_Assignment aca 
    WHERE aca.admin_id = a.AdminId 
    AND aca.campus_id = a.CampusId
);

-- Step 12: Verify migration
SELECT 
    'Migration completed successfully' as status,
    COUNT(*) as total_admins,
    COUNT(CASE WHEN CampusId IS NOT NULL THEN 1 END) as admins_with_campus,
    COUNT(CASE WHEN IsActive = true THEN 1 END) as active_admins
FROM Admin;

-- Step 13: Show admin assignments
SELECT 
    a.AdminId,
    a.Name,
    a.Role,
    c.CampusName,
    aca.is_primary
FROM Admin a
LEFT JOIN CampusInfo c ON a.CampusId = c.CampusId
LEFT JOIN Admin_Campus_Assignment aca ON a.AdminId = aca.admin_id
ORDER BY a.Role, a.Name; 
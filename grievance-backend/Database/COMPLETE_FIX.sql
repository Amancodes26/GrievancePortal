-- Complete Fix for Campus and Admin Foreign Key Issues
-- Run this script to resolve all campus and admin creation problems

-- ===================================================================
-- STEP 1: Fix CampusInfo Table and Data
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

-- ===================================================================
-- STEP 2: Fix Admin Table Foreign Key Constraint
-- ===================================================================

-- Drop and recreate the foreign key constraint to make it more flexible
ALTER TABLE Admin DROP CONSTRAINT IF EXISTS fk_admin_campus;
ALTER TABLE Admin ADD CONSTRAINT fk_admin_campus 
    FOREIGN KEY (CampusId) REFERENCES CampusInfo(CampusId) 
    ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ===================================================================
-- STEP 3: Fix Existing Admin Data
-- ===================================================================

-- Update any existing admins with invalid campus IDs to use main campus
UPDATE Admin 
SET CampusId = 1016, UpdatedAt = (NOW() AT TIME ZONE 'Asia/Kolkata')
WHERE CampusId IS NOT NULL 
AND CampusId NOT IN (SELECT CampusId FROM CampusInfo);

-- For admins with NULL campus, set to main campus
UPDATE Admin 
SET CampusId = 1016, UpdatedAt = (NOW() AT TIME ZONE 'Asia/Kolkata')
WHERE CampusId IS NULL;

-- ===================================================================
-- STEP 4: Fix Attachment Table Foreign Key (from previous issue)
-- ===================================================================

-- Drop the existing foreign key constraint for attachments
ALTER TABLE attachment DROP CONSTRAINT IF EXISTS fk_attachment_grievance;

-- Allow NULL values in Issuse_Id column for temporary attachments
ALTER TABLE attachment ALTER COLUMN Issuse_Id DROP NOT NULL;

-- Add new foreign key constraint that allows NULL values
ALTER TABLE attachment ADD CONSTRAINT fk_attachment_grievance 
    FOREIGN KEY (Issuse_Id) REFERENCES grievance(id) ON DELETE CASCADE;

-- Add check constraint to ensure Issuse_Id is either NULL or positive
ALTER TABLE attachment ADD CONSTRAINT chk_attachment_issue_id 
    CHECK (Issuse_Id IS NULL OR Issuse_Id > 0);

-- Add index for better performance on temporary attachments
CREATE INDEX IF NOT EXISTS idx_attachment_temporary ON attachment(UploadedBy) 
    WHERE Issuse_Id IS NULL;

-- ===================================================================
-- STEP 5: Create Required Support Tables (if not exist)
-- ===================================================================

-- Create Admin_Campus_Assignment table if it doesn't exist
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

-- Create Admin_Audit_Log table if it doesn't exist
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

-- ===================================================================
-- STEP 6: Create Indexes for Performance
-- ===================================================================

CREATE INDEX IF NOT EXISTS idx_admin_campus ON Admin(CampusId);
CREATE INDEX IF NOT EXISTS idx_admin_role ON Admin(Role);
CREATE INDEX IF NOT EXISTS idx_admin_active ON Admin(IsActive);
CREATE INDEX IF NOT EXISTS idx_admin_campus_assignment_admin ON Admin_Campus_Assignment(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_campus_assignment_campus ON Admin_Campus_Assignment(campus_id);
CREATE INDEX IF NOT EXISTS idx_admin_campus_assignment_dept ON Admin_Campus_Assignment(department);
CREATE INDEX IF NOT EXISTS idx_admin_audit_admin ON Admin_Audit_Log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_action ON Admin_Audit_Log(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON Admin_Audit_Log(created_at);

-- ===================================================================
-- STEP 7: Verification Queries
-- ===================================================================

-- Show campus data
SELECT 'Campus Data:' as info;
SELECT CampusId, CampusCode, CampusName FROM CampusInfo ORDER BY CampusId;

-- Show admin data with campus info
SELECT 'Admin Data:' as info;
SELECT 
    a.AdminId, a.Name, a.Email, a.Role, a.CampusId, a.IsActive,
    c.CampusCode, c.CampusName
FROM Admin a
LEFT JOIN CampusInfo c ON a.CampusId = c.CampusId
ORDER BY a.CreatedAt DESC
LIMIT 10;

-- Show attachment constraints
SELECT 'Attachment Constraints:' as info;
SELECT 
    constraint_name, 
    constraint_type,
    table_name
FROM information_schema.table_constraints 
WHERE table_name = 'attachment' AND constraint_type = 'FOREIGN KEY';

-- Show counts
SELECT 'System Counts:' as info;
SELECT 'Campuses' as type, COUNT(*) as count FROM CampusInfo
UNION ALL
SELECT 'Admins' as type, COUNT(*) as count FROM Admin
UNION ALL
SELECT 'Active Admins' as type, COUNT(*) as count FROM Admin WHERE IsActive = true
UNION ALL
SELECT 'Attachments' as type, COUNT(*) as count FROM attachment
UNION ALL
SELECT 'Temporary Attachments' as type, COUNT(*) as count FROM attachment WHERE Issuse_Id IS NULL;

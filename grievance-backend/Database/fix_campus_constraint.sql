-- Migration script to fix Campus and Admin foreign key issues
-- This script will populate the CampusInfo table and fix admin creation issues

-- Step 1: Insert default campus information for DSEU campuses
INSERT INTO CampusInfo (CampusId, CampusCode, CampusName) VALUES 
(1016, 'DDC', 'DSEU Dwarka Campus')
ON CONFLICT (CampusId) DO NOTHING;

INSERT INTO CampusInfo (CampusId, CampusCode, CampusName) VALUES 
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
ON CONFLICT (CampusId) DO NOTHING;

-- Step 2: Insert a default campus if none of the above work
INSERT INTO CampusInfo (CampusId, CampusCode, CampusName) VALUES 
(1, 'MAIN', 'Main Campus')
ON CONFLICT (CampusId) DO NOTHING;

-- Step 3: Update the sequence to start from a higher number to avoid conflicts
SELECT setval('campusinfo_campusid_seq', 2000, false);

-- Step 4: Verify campus data
SELECT CampusId, CampusCode, CampusName FROM CampusInfo ORDER BY CampusId;

-- Step 5: Drop and recreate the foreign key constraint to make it deferrable (optional)
ALTER TABLE Admin DROP CONSTRAINT IF EXISTS fk_admin_campus;
ALTER TABLE Admin ADD CONSTRAINT fk_admin_campus 
    FOREIGN KEY (CampusId) REFERENCES CampusInfo(CampusId) DEFERRABLE INITIALLY DEFERRED;

-- Step 6: Update any existing admins with invalid campus IDs to use main campus
UPDATE Admin 
SET CampusId = 1016 
WHERE CampusId IS NOT NULL 
AND CampusId NOT IN (SELECT CampusId FROM CampusInfo);

-- Step 7: For admins with NULL campus, set to main campus
UPDATE Admin 
SET CampusId = 1016 
WHERE CampusId IS NULL;

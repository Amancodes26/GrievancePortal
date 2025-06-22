-- Migration: Update attachment table for file-based storage only

ALTER TABLE attachment
  ADD COLUMN IF NOT EXISTS OriginalFileName VARCHAR(255) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS MimeType VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
  ADD COLUMN IF NOT EXISTS FileSize INTEGER NOT NULL DEFAULT 0;

-- Ensure FilePath is NOT NULL for file-based storage
ALTER TABLE attachment
  ALTER COLUMN FilePath SET NOT NULL;

-- Remove FileData column if it exists (memory storage no longer used)
ALTER TABLE attachment
  DROP COLUMN IF EXISTS FileData;

-- Update any existing records to ensure proper defaults
UPDATE attachment 
SET 
  OriginalFileName = COALESCE(OriginalFileName, FileName),
  MimeType = COALESCE(MimeType, 'application/pdf'),
  FileSize = COALESCE(FileSize, 0)
WHERE OriginalFileName = '' OR MimeType = '' OR FileSize = 0;

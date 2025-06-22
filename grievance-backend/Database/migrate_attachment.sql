-- Migration: Update attachment table to match code expectations

ALTER TABLE attachment
  ADD COLUMN IF NOT EXISTS OriginalFileName VARCHAR(255) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS FileData TEXT,
  ADD COLUMN IF NOT EXISTS MimeType VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
  ADD COLUMN IF NOT EXISTS FileSize INTEGER NOT NULL DEFAULT 0;

-- Ensure FilePath is NOT NULL (should already be, but for safety)
ALTER TABLE attachment
  ALTER COLUMN FilePath SET NOT NULL; 
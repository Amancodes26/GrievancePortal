import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE } from '../constants/grievanceConstants';

// File validation interface
export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  details?: any;
}

// File metadata interface aligned with Attachment model
export interface FileMetadata {
  originalName: string;
  sanitizedName: string;
  fileSize: number;
  mimeType: string;
  extension: string;
  filePath: string;
  hash: string;
  uploadedAt: Date;
}

/**
 * Sanitize filename to prevent security issues
 */
export function sanitizeFilename(originalName: string): string {
  // Remove dangerous characters and normalize
  const sanitized = originalName
    .replace(/[^a-z0-9.\-_\s]/gi, '_')  // Replace invalid chars
    .replace(/\s+/g, '_')               // Replace spaces with underscores
    .replace(/_{2,}/g, '_')             // Replace multiple underscores with single
    .replace(/^_+|_+$/g, '')           // Remove leading/trailing underscores
    .toLowerCase();

  // Ensure filename isn't empty and has reasonable length
  if (sanitized.length === 0) {
    return 'file';
  }
  
  if (sanitized.length > 100) {
    const ext = path.extname(sanitized);
    const name = path.basename(sanitized, ext).substring(0, 90);
    return name + ext;
  }

  return sanitized;
}

/**
 * Generate unique file path with organized directory structure
 */
export function generateFilePath(originalName: string, grievanceId?: string): string {
  const safeName = sanitizeFilename(originalName);
  const dateFolder = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const timestamp = Date.now();
  const randomId = crypto.randomBytes(4).toString('hex');
  
  // Create unique filename with timestamp and random component
  const uniqueName = `${timestamp}-${randomId}-${safeName}`;
  
  // Use /tmp directory for Vercel serverless environment
  const baseDir = process.env.VERCEL ? '/tmp' : 'uploads';
  
  // Organize by date and optionally by grievance ID
  let dir: string;
  if (grievanceId) {
    dir = path.join(baseDir, 'grievances', dateFolder, grievanceId);
  } else {
    dir = path.join(baseDir, 'attachments', dateFolder);
  }
  
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (error) {
    console.warn('Could not create directory:', error);
    
    // Fallback to /tmp if available
    if (process.env.VERCEL && fs.existsSync('/tmp')) {
      const fallbackDir = path.join('/tmp', 'uploads', dateFolder);
      try {
        if (!fs.existsSync(fallbackDir)) {
          fs.mkdirSync(fallbackDir, { recursive: true });
        }
        return path.join(fallbackDir, uniqueName);
      } catch (fallbackError) {
        console.error('Failed to create fallback directory:', fallbackError);
        throw new Error('File system not available');
      }
    }
    
    throw error;
  }
  
  return path.join(dir, uniqueName);
}

/**
 * Validate uploaded file according to our security policies
 */
export function validateFile(file: any): FileValidationResult {
  // Check if file exists
  if (!file) {
    return {
      isValid: false,
      error: 'No file provided'
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
      details: { fileSize: file.size, maxSize: MAX_FILE_SIZE }
    };
  }

  // Check file type
  if (!ALLOWED_FILE_TYPES.includes(file.mimetype)) {
    return {
      isValid: false,
      error: 'File type not allowed',
      details: { 
        providedType: file.mimetype, 
        allowedTypes: ALLOWED_FILE_TYPES 
      }
    };
  }

  // Check filename
  if (!file.originalname || file.originalname.trim().length === 0) {
    return {
      isValid: false,
      error: 'Invalid filename'
    };
  }

  // Additional security checks
  const extension = path.extname(file.originalname).toLowerCase();
  const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.js', '.vbs', '.jar'];
  
  if (dangerousExtensions.includes(extension)) {
    return {
      isValid: false,
      error: 'File extension not allowed for security reasons',
      details: { extension }
    };
  }

  return { isValid: true };
}

/**
 * Generate file hash for integrity checking
 */
export function generateFileHash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Extract file metadata for database storage
 */
export function extractFileMetadata(file: any, filePath: string): FileMetadata {
  const hash = file.buffer ? generateFileHash(file.buffer) : '';
  
  return {
    originalName: file.originalname,
    sanitizedName: sanitizeFilename(file.originalname),
    fileSize: file.size,
    mimeType: file.mimetype,
    extension: path.extname(file.originalname),
    filePath,
    hash,
    uploadedAt: new Date()
  };
}

/**
 * Clean up old files (for maintenance)
 */
export async function cleanupOldFiles(daysOld: number = 30): Promise<number> {
  const baseDir = process.env.VERCEL ? '/tmp' : 'uploads';
  let deletedCount = 0;
  
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const traverseDirectory = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const itemPath = path.join(dir, item);
        const stats = fs.statSync(itemPath);
        
        if (stats.isDirectory()) {
          traverseDirectory(itemPath);
          
          // Remove empty directories
          try {
            if (fs.readdirSync(itemPath).length === 0) {
              fs.rmdirSync(itemPath);
            }
          } catch (e) {
            // Directory not empty or other error, ignore
          }
        } else {
          // Delete old files
          if (stats.mtime < cutoffDate) {
            try {
              fs.unlinkSync(itemPath);
              deletedCount++;
            } catch (e) {
              console.warn(`Failed to delete old file: ${itemPath}`, e);
            }
          }
        }
      }
    };
    
    traverseDirectory(baseDir);
    
  } catch (error) {
    console.error('Error during file cleanup:', error);
  }
  
  return deletedCount;
}

/**
 * Check if file exists
 */
export function fileExists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

/**
 * Get file stats safely
 */
export function getFileStats(filePath: string): fs.Stats | null {
  try {
    return fs.statSync(filePath);
  } catch {
    return null;
  }
}

/**
 * Delete file safely
 */
export function deleteFile(filePath: string): boolean {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error deleting file ${filePath}:`, error);
    return false;
  }
}

/**
 * Create directory if it doesn't exist
 */
export function ensureDirectoryExists(dirPath: string): boolean {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    return true;
  } catch (error) {
    console.error(`Error creating directory ${dirPath}:`, error);
    return false;
  }
}

// Export file size formatter utility
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

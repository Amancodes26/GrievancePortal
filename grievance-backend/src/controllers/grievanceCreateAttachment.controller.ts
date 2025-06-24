import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { getPool } from '../db/index';
import { AttachmentQueries } from '../db/queries';

// Security configuration for grievance creation attachments
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const ALLOWED_EXTENSIONS = ['.pdf', '.jpeg', '.jpg', '.png'];
const MAX_FILENAME_LENGTH = 100;

// For Vercel compatibility - use temp directory for file uploads
const getUploadDir = () => {
  const tempDir = process.env.VERCEL ? '/tmp/uploads' : path.join(process.cwd(), 'uploads', 'grievances');
  
  // Ensure upload directory exists with proper permissions
  if (!fs.existsSync(tempDir)) {
    try {
      fs.mkdirSync(tempDir, { recursive: true, mode: 0o755 });
      console.log(`[UPLOAD] Created upload directory: ${tempDir}`);
    } catch (error) {
      console.error(`[UPLOAD] Failed to create upload directory: ${tempDir}`, error);
      throw new Error('Failed to create upload directory');
    }
  }
  return tempDir;
};

// Enhanced filename sanitization
const sanitizeFilename = (filename: string): string => {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Remove special characters
    .replace(/\.{2,}/g, '_') // Replace multiple dots
    .replace(/^\.+|\.+$/g, '') // Remove leading/trailing dots
    .substring(0, MAX_FILENAME_LENGTH); // Limit length
};

// Generate secure filename for grievance creation
const generateSecureFilename = (originalName: string): string => {
  const timestamp = Date.now();
  const randomBytes = crypto.randomBytes(16).toString('hex');
  const sanitizedName = sanitizeFilename(originalName);
  const extension = path.extname(sanitizedName).toLowerCase();
  const nameWithoutExt = path.basename(sanitizedName, extension);
  
  return `grievance_${timestamp}_${randomBytes}_${nameWithoutExt}${extension}`;
};

// Advanced file validation
const validateFile = async (filePath: string, mimetype: string): Promise<{ isValid: boolean; error?: string }> => {
  try {
    const buffer = fs.readFileSync(filePath);
    
    // Check minimum file size
    if (buffer.length < 10) {
      return { isValid: false, error: 'File is too small or corrupted' };
    }
    
    // PDF validation
    if (mimetype === 'application/pdf') {
      const pdfHeader = buffer.slice(0, 4).toString();
      if (pdfHeader !== '%PDF') {
        return { isValid: false, error: 'Invalid PDF file format' };
      }
    }
    
    // Image validation
    if (mimetype.startsWith('image/')) {
      // Check for common image headers
      const header = buffer.slice(0, 8);
      const isJPEG = header[0] === 0xFF && header[1] === 0xD8;
      const isPNG = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47;
      
      if (mimetype === 'image/jpeg' || mimetype === 'image/jpg') {
        if (!isJPEG) {
          return { isValid: false, error: 'Invalid JPEG file format' };
        }
      } else if (mimetype === 'image/png') {
        if (!isPNG) {
          return { isValid: false, error: 'Invalid PNG file format' };
        }
      }
    }
    
    // Check for suspicious content
    const bufferString = buffer.toString('binary', 0, Math.min(buffer.length, 10000));
    const suspiciousPatterns = [
      /<script/i,
      /eval\s*\(/i,
      /unescape\s*\(/i,
      /javascript:/i
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(bufferString)) {
        return { isValid: false, error: 'File contains potentially malicious content' };
      }
    }
    
    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: 'Failed to validate file' };
  }
};

// Enhanced file filter for grievance creation
const grievanceFileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  try {
    // Check file extension
    const fileExtension = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
      return cb(new Error(`File extension not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`) as any);
    }
    
    // Check MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new Error(`File type not allowed. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`) as any);
    }
    
    // Check filename length
    if (file.originalname.length > MAX_FILENAME_LENGTH) {
      return cb(new Error(`Filename too long. Maximum ${MAX_FILENAME_LENGTH} characters allowed`) as any);
    }
    
    // Check for suspicious filename patterns
    const suspiciousPatterns = [
      /\.\./,
      /[<>:"|?*]/,
      /\0/,
      /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i,
      /^\./,
      /\.(bat|cmd|com|exe|scr|vbs|js)$/i
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(file.originalname)) {
        return cb(new Error('Filename contains invalid characters or patterns') as any);
      }
    }
    
    cb(null, true);
  } catch (error) {
    cb(new Error('File validation failed') as any);
  }
};

// Secure multer storage configuration for grievance creation
const grievanceStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = getUploadDir();
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const secureFilename = generateSecureFilename(file.originalname);
    cb(null, secureFilename);
  }
});

// Multer configuration for grievance creation
export const grievanceUpload = multer({
  storage: grievanceStorage,
  fileFilter: grievanceFileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
    fieldNameSize: 50,
    fieldSize: 1024,
    headerPairs: 20
  }
});

// Rate limiting for grievance attachment uploads
const uploadAttempts = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_UPLOADS_PER_WINDOW = 20; // More restrictive for grievance creation

const checkUploadRateLimit = (identifier: string): boolean => {
  const now = Date.now();
  const attempts = uploadAttempts.get(identifier) || [];
  
  // Clean old attempts
  const recentAttempts = attempts.filter((time: number) => now - time < RATE_LIMIT_WINDOW);
  
  if (recentAttempts.length >= MAX_UPLOADS_PER_WINDOW) {
    return false;
  }
  
  recentAttempts.push(now);
  uploadAttempts.set(identifier, recentAttempts);
  return true;
};

/**
 * Upload attachment for grievance creation
 * This endpoint allows users to upload attachments that will be linked to a grievance during creation
 * Requires JWT authentication and returns a temporary attachment ID that can be used when creating the grievance
 */
export const uploadGrievanceAttachment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    console.log('[GRIEVANCE_UPLOAD] Starting grievance attachment upload process');
    
    // Check authentication
    const userRollno = req.User?.rollno || req.user?.rollNumber;
    if (!userRollno) {
      res.status(401).json({
        success: false,
        message: 'Authentication required. Please provide valid JWT token'
      });
      return;
    }
    
    // Check rate limiting
    if (!checkUploadRateLimit(userRollno)) {
      res.status(429).json({
        success: false,
        message: 'Too many upload attempts. Please wait before trying again'
      });
      return;
    }
    
    // Check if file was uploaded
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'No file uploaded. Please select a file to upload'
      });
      return;
    }
    
    console.log('[GRIEVANCE_UPLOAD] File uploaded:', {
      originalname: req.file.originalname,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
    
    // Validate the uploaded file
    const validation = await validateFile(req.file.path, req.file.mimetype);
    if (!validation.isValid) {
      // Clean up invalid file
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('[GRIEVANCE_UPLOAD] Failed to cleanup invalid file:', cleanupError);
      }
      
      res.status(400).json({
        success: false,
        message: `File validation failed: ${validation.error}`
      });
      return;
    }
    
    // For Vercel compatibility, convert file to base64 if needed
    let fileData = null;
    if (process.env.VERCEL) {
      try {
        const buffer = fs.readFileSync(req.file.path);
        fileData = buffer.toString('base64');
        
        // Clean up temp file on Vercel
        fs.unlinkSync(req.file.path);
        console.log('[GRIEVANCE_UPLOAD] File converted to base64 for Vercel compatibility');
      } catch (error) {
        console.error('[GRIEVANCE_UPLOAD] Failed to convert file to base64:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to process file for cloud storage'
        });
        return;
      }
    }
    
    // Create a temporary attachment record (without grievance ID for now)
    // This will be linked to a grievance when the grievance is created
    const result = await getPool().query(`
      INSERT INTO attachment (
        Issuse_Id, FileName, OriginalFileName, FilePath, FileData, MimeType, FileSize, UploadedBy
      ) VALUES (
        -1, $1, $2, $3, $4, $5, $6, $7
      ) RETURNING id, FileName, OriginalFileName, MimeType, FileSize, UploadedAt
    `, [
      req.file.filename,
      req.file.originalname,
      process.env.VERCEL ? null : req.file.path,
      fileData,
      req.file.mimetype,
      req.file.size,
      userRollno
    ]);
    
    const attachment = result.rows[0];
    
    console.log('[GRIEVANCE_UPLOAD] Temporary attachment created:', {
      id: attachment.id,
      filename: attachment.filename,
      uploader: userRollno
    });
    
    res.status(201).json({
      success: true,
      message: 'Attachment uploaded successfully. Use the attachment_id when creating your grievance',
      data: {
        attachment_id: attachment.id,
        filename: attachment.filename,
        original_filename: attachment.originalfilename,
        mimetype: attachment.mimetype,
        size: attachment.filesize,
        uploaded_at: attachment.uploadedat
      }
    });
    
  } catch (error: unknown) {
    console.error('[GRIEVANCE_UPLOAD] Error uploading attachment:', error);
    
    // Clean up file if it exists and there was an error
    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('[GRIEVANCE_UPLOAD] Failed to cleanup file after error:', cleanupError);
      }
    }
    
    res.status(500).json({
      success: false,
      message: 'Internal server error while uploading attachment',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Link temporary attachment to a grievance
 * This is called internally when a grievance is created with attachment_ids
 */
export const linkAttachmentToGrievance = async (attachmentId: number, grievanceId: number): Promise<boolean> => {
  try {
    const result = await getPool().query(`
      UPDATE attachment 
      SET Issuse_Id = $1, UpdatedAt = (NOW() AT TIME ZONE 'Asia/Kolkata')
      WHERE id = $2 AND Issuse_Id = -1
      RETURNING id
    `, [grievanceId, attachmentId]);
    
    return result.rows.length > 0;
  } catch (error) {
    console.error('[GRIEVANCE_UPLOAD] Error linking attachment to grievance:', error);
    return false;
  }
};

/**
 * Clean up orphaned temporary attachments
 * This should be called periodically to remove attachments that were uploaded but never linked to a grievance
 */
export const cleanupOrphanedAttachments = async (): Promise<void> => {
  try {
    // Delete attachments older than 24 hours that are still unlinked (Issuse_Id = -1)
    const result = await getPool().query(`
      DELETE FROM attachment 
      WHERE Issuse_Id = -1 
      AND UploadedAt < (NOW() AT TIME ZONE 'Asia/Kolkata') - INTERVAL '24 hours'
      RETURNING id, FileName, FilePath
    `);
    
    // Clean up physical files if not on Vercel
    if (!process.env.VERCEL) {
      for (const attachment of result.rows) {
        if (attachment.filepath && fs.existsSync(attachment.filepath)) {
          try {
            fs.unlinkSync(attachment.filepath);
            console.log('[CLEANUP] Removed orphaned file:', attachment.filepath);
          } catch (error) {
            console.error('[CLEANUP] Failed to remove orphaned file:', attachment.filepath, error);
          }
        }
      }
    }
    
    console.log(`[CLEANUP] Removed ${result.rows.length} orphaned attachments`);
  } catch (error) {
    console.error('[CLEANUP] Error cleaning up orphaned attachments:', error);
  }
};

/**
 * Get temporary attachment info
 * Allows users to verify their uploaded attachment before creating grievance
 */
export const getTemporaryAttachment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { attachment_id } = req.params;
    const userRollno = req.User?.rollno || req.user?.rollNumber;
    
    if (!userRollno) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }
    
    if (!attachment_id) {
      res.status(400).json({
        success: false,
        message: 'Attachment ID is required'
      });
      return;
    }
    
    const result = await getPool().query(`
      SELECT id, FileName, OriginalFileName, MimeType, FileSize, UploadedAt
      FROM attachment 
      WHERE id = $1 AND UploadedBy = $2 AND Issuse_Id = -1
    `, [attachment_id, userRollno]);
    
    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Temporary attachment not found or access denied'
      });
      return;
    }
    
    const attachment = result.rows[0];
    
    res.status(200).json({
      success: true,
      data: {
        attachment_id: attachment.id,
        filename: attachment.filename,
        original_filename: attachment.originalfilename,
        mimetype: attachment.mimetype,
        size: attachment.filesize,
        uploaded_at: attachment.uploadedat,
        status: 'temporary'
      }
    });
    
  } catch (error) {
    console.error('[GRIEVANCE_UPLOAD] Error getting temporary attachment:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export default {
  uploadGrievanceAttachment,
  linkAttachmentToGrievance,
  cleanupOrphanedAttachments,
  getTemporaryAttachment,
  grievanceUpload
};

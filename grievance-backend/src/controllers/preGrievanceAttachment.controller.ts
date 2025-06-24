import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { getPool } from '../db/index';

// Security configuration for pre-grievance attachments
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
const ALLOWED_EXTENSIONS = ['.pdf', '.jpeg', '.jpg', '.png', '.gif'];
const MAX_FILENAME_LENGTH = 100;

// For Vercel compatibility - use temp directory for file uploads
const getUploadDir = () => {
  const tempDir = process.env.VERCEL ? '/tmp/uploads/pre-grievance' : path.join(process.cwd(), 'uploads', 'pre-grievance');
  
  // Ensure upload directory exists with proper permissions
  if (!fs.existsSync(tempDir)) {
    try {
      fs.mkdirSync(tempDir, { recursive: true, mode: 0o755 });
      console.log(`[PRE_GRIEVANCE_UPLOAD] Created upload directory: ${tempDir}`);
    } catch (error) {
      console.error(`[PRE_GRIEVANCE_UPLOAD] Failed to create upload directory: ${tempDir}`, error);
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

// Generate secure filename for pre-grievance uploads
const generateSecureFilename = (originalName: string, userRollno: string): string => {
  const timestamp = Date.now();
  const randomBytes = crypto.randomBytes(8).toString('hex');
  const sanitizedName = sanitizeFilename(originalName);
  const extension = path.extname(sanitizedName).toLowerCase();
  const nameWithoutExt = path.basename(sanitizedName, extension);
  
  return `pre_grievance_${userRollno}_${timestamp}_${randomBytes}_${nameWithoutExt}${extension}`;
};

// Advanced file validation
const validateFile = async (filePath: string, mimetype: string): Promise<{ isValid: boolean; error?: string }> => {
  try {
    const buffer = fs.readFileSync(filePath);
    
    // Check minimum file size
    if (buffer.length < 10) {
      return { isValid: false, error: 'File is too small or corrupted' };
    }
    
    // Check maximum file size (additional check)
    if (buffer.length > MAX_FILE_SIZE) {
      return { isValid: false, error: 'File is too large' };
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
      const isGIF = header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46;
      
      if (mimetype === 'image/jpeg' || mimetype === 'image/jpg') {
        if (!isJPEG) {
          return { isValid: false, error: 'Invalid JPEG file format' };
        }
      } else if (mimetype === 'image/png') {
        if (!isPNG) {
          return { isValid: false, error: 'Invalid PNG file format' };
        }
      } else if (mimetype === 'image/gif') {
        if (!isGIF) {
          return { isValid: false, error: 'Invalid GIF file format' };
        }
      }
    }
    
    // Check for suspicious content
    const bufferString = buffer.toString('binary', 0, Math.min(buffer.length, 10000));
    const suspiciousPatterns = [
      /<script/i,
      /eval\s*\(/i,
      /unescape\s*\(/i,
      /javascript:/i,
      /<iframe/i,
      /<object/i,
      /<embed/i
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

// Enhanced file filter
const preGrievanceFileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
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

// Secure multer storage configuration
const preGrievanceStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = getUploadDir();
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Get user rollno from JWT (set by auth middleware)
    const userRollno = req.User?.rollno || req.user?.rollNumber || 'unknown';
    const secureFilename = generateSecureFilename(file.originalname, userRollno);
    cb(null, secureFilename);
  }
});

// Multer configuration for pre-grievance uploads
export const preGrievanceUpload = multer({
  storage: preGrievanceStorage,
  fileFilter: preGrievanceFileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
    fieldNameSize: 50,
    fieldSize: 1024,
    headerPairs: 20
  }
});

// Rate limiting for uploads (simple in-memory implementation)
const uploadAttempts = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_UPLOADS_PER_WINDOW = 10; // Limit uploads per user

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
 * Upload attachment for future grievance creation
 * This endpoint allows users to upload attachments that will be linked to a grievance when created
 * 
 * @route POST /api/v1/pre-grievance/upload-attachment
 * @access Private (JWT required)
 * @param {file} attachment - The file to upload (PDF, JPG, PNG, GIF)
 * @returns {object} - Attachment details with temporary ID for grievance creation
 */
export const uploadPreGrievanceAttachment = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('[PRE_GRIEVANCE_UPLOAD] Starting pre-grievance attachment upload process');
    
    // Check authentication
    const userRollno = req.User?.rollno || req.user?.rollNumber;
    const userName = req.User?.name || req.user?.name || 'Unknown User';
    
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
    
    console.log('[PRE_GRIEVANCE_UPLOAD] File uploaded:', {
      originalname: req.file.originalname,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
      user: userRollno
    });
    
    // Validate the uploaded file
    const validation = await validateFile(req.file.path, req.file.mimetype);
    if (!validation.isValid) {
      // Clean up invalid file
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('[PRE_GRIEVANCE_UPLOAD] Failed to cleanup invalid file:', cleanupError);
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
        console.log('[PRE_GRIEVANCE_UPLOAD] File converted to base64 for Vercel compatibility');
      } catch (error) {
        console.error('[PRE_GRIEVANCE_UPLOAD] Failed to convert file to base64:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to process file for cloud storage'
        });
        return;
      }
    }    // Create a temporary attachment record (Issuse_Id = NULL for temporary uploads)
    // This will be linked to a grievance when the grievance is created
    // Note: Using existing attachment table with NULL Issuse_Id for temporary records
    const result = await getPool().query(`
      INSERT INTO attachment (
        Issuse_Id, FileName, FilePath, UploadedBy
      ) VALUES (
        NULL, $1, $2, $3
      ) RETURNING id, FileName, FilePath, UploadedBy, UploadedAt
    `, [
      `${req.file.originalname}|${req.file.filename}|${req.file.mimetype}|${req.file.size}`, // Store metadata in FileName
      process.env.VERCEL ? (fileData || 'base64_data') : req.file.path,
      userRollno
    ]);const attachment = result.rows[0];
    
    console.log('[PRE_GRIEVANCE_UPLOAD] Temporary attachment created:', {
      id: attachment.id,
      filename: attachment.filename,
      uploader: userRollno
    });
    
    res.status(201).json({
      success: true,
      message: 'Attachment uploaded successfully. Use the attachment_id when creating your grievance.',
      data: {
        attachment_id: attachment.id,
        filename: attachment.filename,
        original_filename: attachment.original_filename,
        mimetype: attachment.mimetype,
        size: attachment.filesize,
        uploaded_at: attachment.uploaded_at,
        uploaded_by: userRollno,
        temporary: true // Indicates this is a temporary attachment
      }
    });
    
  } catch (error: unknown) {
    console.error('[PRE_GRIEVANCE_UPLOAD] Error uploading attachment:', error);
    
    // Clean up file if it exists and there was an error
    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('[PRE_GRIEVANCE_UPLOAD] Failed to cleanup file after error:', cleanupError);
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
 * Get temporary attachment details
 * This endpoint allows users to verify their uploaded attachment before creating grievance
 * 
 * @route GET /api/v1/pre-grievance/attachment/:attachment_id
 * @access Private (JWT required)
 * @param {string} attachment_id - The ID of the temporary attachment
 * @returns {object} - Attachment details
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
    }    // Get temporary attachment (Issuse_Id IS NULL)
    const result = await getPool().query(`
      SELECT * FROM attachment 
      WHERE id = $1 AND Issuse_Id IS NULL AND UploadedBy = $2
    `, [attachment_id, userRollno]);
    
    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Temporary attachment not found or access denied'
      });
      return;
    }    const attachment = result.rows[0];
    
    // Parse metadata from FileName field (format: originalname|filename|mimetype|size)
    const [originalName, secureFilename, mimetype, fileSize] = attachment.filename.split('|');
    
    // Check if file still exists (for non-Vercel environments)
    let fileExists = true;
    if (!process.env.VERCEL && attachment.filepath) {
      fileExists = fs.existsSync(attachment.filepath);
    }
    
    res.status(200).json({
      success: true,
      message: 'Temporary attachment details retrieved',
      data: {
        attachment_id: attachment.id,
        filename: secureFilename,
        original_filename: originalName,
        mimetype: mimetype,
        size: parseInt(fileSize) || 0,
        uploaded_at: attachment.uploadedat,
        uploaded_by: attachment.uploadedby,
        file_exists: fileExists,
        status: 'temporary' // Indicates this is a temporary upload
      }
    });
    
  } catch (error: unknown) {
    console.error('[PRE_GRIEVANCE_UPLOAD] Error getting temporary attachment:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while retrieving attachment',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Delete temporary attachment
 * This endpoint allows users to delete their temporary attachments
 * 
 * @route DELETE /api/v1/pre-grievance/attachment/:attachment_id
 * @access Private (JWT required)
 * @param {string} attachment_id - The ID of the temporary attachment to delete
 * @returns {object} - Success message
 */
export const deleteTemporaryAttachment = async (req: Request, res: Response): Promise<void> => {
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
    }    // Get and delete temporary attachment (Issuse_Id IS NULL)
    const result = await getPool().query(`
      DELETE FROM attachment 
      WHERE id = $1 AND Issuse_Id IS NULL AND UploadedBy = $2
      RETURNING *
    `, [attachment_id, userRollno]);
    
    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Temporary attachment not found or access denied'
      });
      return;
    }
      const deletedAttachment = result.rows[0];
    
    // Clean up physical file if it exists
    if (!process.env.VERCEL && deletedAttachment.filepath && fs.existsSync(deletedAttachment.filepath)) {
      try {
        fs.unlinkSync(deletedAttachment.filepath);
        console.log('[PRE_GRIEVANCE_UPLOAD] Deleted physical file:', deletedAttachment.filepath);
      } catch (error) {
        console.error('[PRE_GRIEVANCE_UPLOAD] Failed to delete physical file:', error);
        // Don't fail the request if file deletion fails
      }
    }
    
    console.log('[PRE_GRIEVANCE_UPLOAD] Temporary attachment deleted:', {
      id: deletedAttachment.id,
      filename: deletedAttachment.filename,
      user: userRollno
    });
    
    res.status(200).json({
      success: true,
      message: 'Temporary attachment deleted successfully',
      data: {
        deleted_attachment_id: deletedAttachment.id,
        filename: deletedAttachment.filename
      }
    });
    
  } catch (error: unknown) {
    console.error('[PRE_GRIEVANCE_UPLOAD] Error deleting temporary attachment:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while deleting attachment',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * List user's temporary attachments
 * This endpoint allows users to see all their temporary attachments
 * 
 * @route GET /api/v1/pre-grievance/attachments
 * @access Private (JWT required)
 * @returns {object} - List of temporary attachments
 */
export const listTemporaryAttachments = async (req: Request, res: Response): Promise<void> => {
  try {
    const userRollno = req.User?.rollno || req.user?.rollNumber;
    
    if (!userRollno) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }    // Get all temporary attachments for this user (Issuse_Id IS NULL)
    const result = await getPool().query(`
      SELECT * FROM attachment 
      WHERE Issuse_Id IS NULL AND UploadedBy = $1
      ORDER BY UploadedAt DESC
    `, [userRollno]);

    const attachments = result.rows.map(attachment => {
      // Parse metadata from FileName field (format: originalname|filename|mimetype|size)
      const [originalName, secureFilename, mimetype, fileSize] = attachment.filename.split('|');
      
      // Check if file still exists (for non-Vercel environments)
      let fileExists = true;
      if (!process.env.VERCEL && attachment.filepath) {
        fileExists = fs.existsSync(attachment.filepath);
      }
      
      return {
        attachment_id: attachment.id,
        filename: secureFilename,
        original_filename: originalName,
        mimetype: mimetype,
        size: parseInt(fileSize) || 0,
        uploaded_at: attachment.uploadedat,
        file_exists: fileExists,
        status: 'temporary'
      };
    });
    
    res.status(200).json({
      success: true,
      message: 'Temporary attachments retrieved successfully',
      data: {
        attachments,
        total_count: attachments.length
      }
    });
    
  } catch (error: unknown) {
    console.error('[PRE_GRIEVANCE_UPLOAD] Error listing temporary attachments:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while retrieving attachments',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Link temporary attachment to a grievance
 * This function is called internally when a grievance is created with attachment_ids
 * 
 * @param attachmentId - The ID of the temporary attachment
 * @param grievanceId - The database ID of the created grievance
 * @param userRollno - The roll number of the user creating the grievance
 * @returns Promise<boolean> - Success status
 */
export const linkAttachmentToGrievance = async (
  attachmentId: number, 
  grievanceId: number, 
  userRollno: string
): Promise<boolean> => {
  try {
    // Update the temporary attachment to link it to the grievance
    const result = await getPool().query(`
      UPDATE attachment 
      SET Issuse_Id = $1, UpdatedAt = (NOW() AT TIME ZONE 'Asia/Kolkata')
      WHERE id = $2 AND Issuse_Id IS NULL AND UploadedBy = $3
      RETURNING id
    `, [grievanceId, attachmentId, userRollno]);
    
    const success = result.rows.length > 0;
    
    if (success) {
      console.log('[PRE_GRIEVANCE_UPLOAD] Attachment linked to grievance:', {
        attachmentId,
        grievanceId,
        userRollno
      });
    } else {
      console.warn('[PRE_GRIEVANCE_UPLOAD] Failed to link attachment - not found or access denied:', {
        attachmentId,
        grievanceId,
        userRollno
      });
    }
    
    return success;
  } catch (error) {
    console.error('[PRE_GRIEVANCE_UPLOAD] Error linking attachment to grievance:', error);
    return false;
  }
};

/**
 * Clean up orphaned temporary attachments
 * This function should be called periodically to remove temporary attachments older than 24 hours
 * 
 * @returns Promise<void>
 */
export const cleanupOrphanedAttachments = async (): Promise<void> => {
  try {
    // Delete temporary attachments older than 24 hours
    const result = await getPool().query(`
      DELETE FROM temporary_attachments 
      WHERE uploaded_at < (NOW() AT TIME ZONE 'Asia/Kolkata') - INTERVAL '24 hours'
      OR expires_at < (NOW() AT TIME ZONE 'Asia/Kolkata')
      RETURNING id, filename, filepath
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
    
    console.log(`[CLEANUP] Removed ${result.rows.length} orphaned temporary attachments`);
  } catch (error) {
    console.error('[CLEANUP] Error cleaning up orphaned temporary attachments:', error);
  }
};

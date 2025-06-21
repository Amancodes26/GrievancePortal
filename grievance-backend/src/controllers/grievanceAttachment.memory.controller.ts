import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { db } from '../db/queries';
import { AttachmentQueries } from '../db/queries';
import * as grievanceService from '../services/grievance.service';

// Security configuration
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIME_TYPES = ['application/pdf'];
const ALLOWED_EXTENSIONS = ['.pdf'];
const MAX_FILENAME_LENGTH = 100;

// Enhanced filename sanitization
const sanitizeFilename = (filename: string): string => {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Remove special characters
    .replace(/\.{2,}/g, '_') // Replace multiple dots
    .replace(/^\.+|\.+$/g, '') // Remove leading/trailing dots
    .substring(0, MAX_FILENAME_LENGTH); // Limit length
};

// Generate secure filename
const generateSecureFilename = (originalName: string): string => {
  const timestamp = Date.now();
  const randomBytes = crypto.randomBytes(16).toString('hex');
  const sanitizedName = sanitizeFilename(originalName);
  const extension = path.extname(sanitizedName).toLowerCase();
  const nameWithoutExt = path.basename(sanitizedName, extension);
  
  return `${timestamp}_${randomBytes}_${nameWithoutExt}${extension}`;
};

// Advanced PDF validation using magic numbers
const validatePDFBuffer = (buffer: Buffer): { isValid: boolean; error?: string } => {
  try {
    // Check minimum file size
    if (buffer.length < 10) {
      return { isValid: false, error: 'File too small to be a valid PDF' };
    }
    
    // Check PDF magic number (header)
    const pdfHeader = buffer.slice(0, 4).toString();
    if (pdfHeader !== '%PDF') {
      return { isValid: false, error: 'Invalid PDF header - file is not a PDF' };
    }
    
    // Check for suspicious content
    const bufferString = buffer.toString('binary', 0, Math.min(buffer.length, 50000));
    const suspiciousPatterns = [
      /\/JavaScript\s*\(/i,
      /\/JS\s*\(/i,
      /\/OpenAction\s*\(/i,
      /<script/i,
      /eval\s*\(/i,
      /unescape\s*\(/i
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(bufferString)) {
        return { isValid: false, error: 'PDF contains potentially malicious content' };
      }
    }
    
    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: 'Failed to validate PDF file' };
  }
};

// Enhanced file filter
const secureFileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  try {
    // Check file extension
    const fileExtension = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
      return cb(new Error(`Invalid file extension. Only ${ALLOWED_EXTENSIONS.join(', ')} files are allowed`) as any);
    }
    
    // Check MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new Error(`Invalid MIME type. Only ${ALLOWED_MIME_TYPES.join(', ')} files are allowed`) as any);
    }
    
    // Check filename length
    if (file.originalname.length > MAX_FILENAME_LENGTH) {
      return cb(new Error(`Filename too long. Maximum ${MAX_FILENAME_LENGTH} characters allowed`) as any);
    }
    
    // Check for suspicious filename patterns
    const suspiciousPatterns = [
      /\.\./,           // Path traversal
      /[<>:"|?*]/,      // Invalid filename characters
      /\0/,             // Null bytes
      /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i, // Windows reserved names
      /^\./,            // Hidden files
      /\.(bat|cmd|com|exe|scr|vbs|js)$/i // Executable extensions
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(file.originalname)) {
        return cb(new Error('Suspicious filename detected') as any);
      }
    }
    
    cb(null, true);
  } catch (error) {
    cb(new Error('File validation failed') as any);
  }
};

// Memory storage for Vercel compatibility
const memoryStorage = multer.memoryStorage();

// Multer configuration with memory storage
const upload = multer({
  storage: memoryStorage,
  fileFilter: secureFileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
    fieldNameSize: 50,
    fieldSize: 1024,
    headerPairs: 20
  }
});

// Rate limiting helper
const uploadAttempts = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_UPLOADS_PER_WINDOW = 5;

const checkRateLimit = (identifier: string): boolean => {
  const now = Date.now();
  const attempts = uploadAttempts.get(identifier) || [];
  
  const recentAttempts = attempts.filter((time: number) => now - time < RATE_LIMIT_WINDOW);
  
  if (recentAttempts.length >= MAX_UPLOADS_PER_WINDOW) {
    return false;
  }
  
  recentAttempts.push(now);
  uploadAttempts.set(identifier, recentAttempts);
  return true;
};

// Enhanced upload attachment with memory storage
export const uploadAttachment = [
  upload.single('attachment'),
  async (req: Request, res: Response, next: NextFunction) => {
    const uploadStartTime = Date.now();
    
    try {
      // Rate limiting check
      const userIdentifier = req.User?.rollno || req.ip || 'anonymous';
      if (!checkRateLimit(userIdentifier)) {
        return res.status(429).json({
          message: 'Too many upload attempts. Please try again later.',
          success: false
        });
      }
      
      if (!req.file) {
        return res.status(400).json({
          message: 'No file uploaded. Please select a PDF file to upload.',
          success: false
        });
      }
      
      const { issue_id, test_user_rollno } = req.body;
      
      if (!issue_id) {
        return res.status(400).json({
          message: 'Grievance issue_id is required',
          success: false
        });
      }
      
      // Get user rollno
      const userRollno = req.User?.rollno || test_user_rollno;
      if (!userRollno) {
        return res.status(401).json({
          message: 'User authentication required',
          success: false
        });
      }
      
      // Verify grievance exists and user has access
      const grievance = await grievanceService.getGrievanceByIssueId(issue_id);
      if (!grievance) {
        return res.status(404).json({
          message: 'Grievance not found',
          success: false
        });
      }
      
      if (grievance.rollno !== userRollno) {
        return res.status(403).json({
          message: 'Access denied - You can only upload attachments to your own grievances',
          success: false
        });
      }
      
      // Validate PDF file from buffer
      const pdfValidation = validatePDFBuffer(req.file.buffer);
      if (!pdfValidation.isValid) {
        console.error(`[SECURITY] Invalid PDF rejected: ${pdfValidation.error}`);
        return res.status(400).json({
          message: `Invalid PDF file: ${pdfValidation.error}`,
          success: false
        });
      }
      
      // Generate secure filename
      const secureFilename = generateSecureFilename(req.file.originalname);
      
      // Convert buffer to base64 for database storage
      const fileData = req.file.buffer.toString('base64');
      
      // Save attachment metadata and data to database
      const attachmentId = await AttachmentQueries.createAttachment({
        issue_id: parseInt(issue_id),
        filename: secureFilename,
        original_filename: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        file_data: fileData, // Store base64 encoded file data
        uploaded_by: userRollno,
        upload_date: new Date()
      });
      
      const uploadEndTime = Date.now();
      const uploadDuration = uploadEndTime - uploadStartTime;
      
      console.log(`[SUCCESS] File uploaded successfully: ${secureFilename}, Size: ${req.file.size} bytes, Duration: ${uploadDuration}ms`);
      
      res.status(201).json({
        message: 'File uploaded successfully',
        success: true,
        data: {
          attachment_id: attachmentId,
          filename: secureFilename,
          original_filename: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
          upload_date: new Date().toISOString(),
          upload_duration_ms: uploadDuration
        }
      });
      
    } catch (error: any) {
      console.error('[ERROR] Upload failed:', error);
      
      res.status(500).json({
        message: 'File upload failed due to server error',
        success: false,
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
];

// Download attachment from database
export const downloadAttachment = async (req: Request, res: Response) => {
  try {
    const { attachment_id } = req.params;
    const userRollno = req.User?.rollno || req.body.test_user_rollno;
    
    if (!userRollno) {
      return res.status(401).json({
        message: 'User authentication required',
        success: false
      });
    }
    
    if (!attachment_id) {
      return res.status(400).json({
        message: 'Attachment ID is required',
        success: false
      });
    }
    
    // Get attachment metadata
    const attachment = await AttachmentQueries.getAttachmentById(parseInt(attachment_id));
    if (!attachment) {
      return res.status(404).json({
        message: 'Attachment not found',
        success: false
      });
    }
    
    // Verify user has access to this attachment
    const grievance = await grievanceService.getGrievanceByIssueId(attachment.issue_id);
    if (!grievance || grievance.rollno !== userRollno) {
      return res.status(403).json({
        message: 'Access denied - You can only download attachments from your own grievances',
        success: false
      });
    }
    
    // Validate stored PDF data
    const fileBuffer = Buffer.from(attachment.file_data, 'base64');
    const pdfValidation = validatePDFBuffer(fileBuffer);
    if (!pdfValidation.isValid) {
      console.error(`[SECURITY] Corrupted file detected during download: ${attachment.filename}`);
      return res.status(400).json({
        message: 'File validation failed - corrupted or invalid PDF',
        success: false
      });
    }
    
    // Set appropriate headers for PDF download
    res.setHeader('Content-Type', attachment.mimetype);
    res.setHeader('Content-Length', fileBuffer.length.toString());
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.original_filename}"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    console.log(`[DOWNLOAD] File served: ${attachment.filename}, Size: ${fileBuffer.length} bytes`);
    
    // Send the file buffer
    res.send(fileBuffer);
    
  } catch (error: any) {
    console.error('[ERROR] Download failed:', error);
    res.status(500).json({
      message: 'File download failed',
      success: false,
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// List attachments for a grievance
export const listAttachments = async (req: Request, res: Response) => {
  try {
    const { issue_id } = req.params;
    const userRollno = req.User?.rollno || req.body.test_user_rollno;
    
    if (!userRollno) {
      return res.status(401).json({
        message: 'User authentication required',
        success: false
      });
    }
    
    if (!issue_id) {
      return res.status(400).json({
        message: 'Issue ID is required',
        success: false
      });
    }
    
    // Verify user has access to this grievance
    const grievance = await grievanceService.getGrievanceByIssueId(issue_id);
    if (!grievance || grievance.rollno !== userRollno) {
      return res.status(403).json({
        message: 'Access denied - You can only view attachments from your own grievances',
        success: false
      });
    }
    
    // Get attachments (without file_data for listing)
    const attachments = await AttachmentQueries.getAttachmentsByIssueId(parseInt(issue_id));
    
    // Remove file_data from response for performance
    const attachmentList = attachments.map(attachment => ({
      attachment_id: attachment.attachment_id,
      filename: attachment.filename,
      original_filename: attachment.original_filename,
      mimetype: attachment.mimetype,
      size: attachment.size,
      upload_date: attachment.upload_date,
      uploaded_by: attachment.uploaded_by
    }));
    
    res.status(200).json({
      message: 'Attachments retrieved successfully',
      success: true,
      data: {
        issue_id: parseInt(issue_id),
        attachments: attachmentList,
        total_count: attachmentList.length
      }
    });
    
  } catch (error: any) {
    console.error('[ERROR] List attachments failed:', error);
    res.status(500).json({
      message: 'Failed to retrieve attachments',
      success: false,
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Delete attachment
export const deleteAttachment = async (req: Request, res: Response) => {
  try {
    const { attachment_id } = req.params;
    const userRollno = req.User?.rollno || req.body.test_user_rollno;
    
    if (!userRollno) {
      return res.status(401).json({
        message: 'User authentication required',
        success: false
      });
    }
    
    if (!attachment_id) {
      return res.status(400).json({
        message: 'Attachment ID is required',
        success: false
      });
    }
    
    // Get attachment to verify ownership
    const attachment = await AttachmentQueries.getAttachmentById(parseInt(attachment_id));
    if (!attachment) {
      return res.status(404).json({
        message: 'Attachment not found',
        success: false
      });
    }
    
    // Verify user has access to this attachment
    const grievance = await grievanceService.getGrievanceByIssueId(attachment.issue_id);
    if (!grievance || grievance.rollno !== userRollno) {
      return res.status(403).json({
        message: 'Access denied - You can only delete attachments from your own grievances',
        success: false
      });
    }
    
    // Delete attachment from database
    await AttachmentQueries.deleteAttachment(parseInt(attachment_id));
    
    console.log(`[DELETE] Attachment deleted: ${attachment.filename}`);
    
    res.status(200).json({
      message: 'Attachment deleted successfully',
      success: true,
      data: {
        attachment_id: parseInt(attachment_id),
        filename: attachment.filename
      }
    });
    
  } catch (error: any) {
    console.error('[ERROR] Delete attachment failed:', error);
    res.status(500).json({
      message: 'Failed to delete attachment',
      success: false,
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Health check endpoint
export const getAttachmentSystemHealth = async (req: Request, res: Response) => {
  try {
    const health = {
      storage_type: 'database (base64)',
      vercel_compatible: true,
      security_features: {
        pdf_validation: 'enabled',
        rate_limiting: 'enabled',
        filename_sanitization: 'enabled'
      },
      limits: {
        max_file_size: `${MAX_FILE_SIZE / (1024 * 1024)}MB`,
        allowed_types: ALLOWED_MIME_TYPES,
        max_uploads_per_window: MAX_UPLOADS_PER_WINDOW,
        rate_limit_window: `${RATE_LIMIT_WINDOW / (60 * 1000)} minutes`
      },
      timestamp: new Date().toISOString()
    };

    res.status(200).json({
      message: 'Attachment system is healthy',
      success: true,
      data: health
    });
    
  } catch (error: any) {
    console.error('[ERROR] Health check failed:', error);
    res.status(500).json({
      message: 'Health check failed',
      success: false,
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

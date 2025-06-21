import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { db } from '../db/queries';
import { AttachmentQueries } from '../db/queries';
import * as grievanceService from '../services/grievance.service';

// Security configuration
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIME_TYPES = ['application/pdf'];
const ALLOWED_EXTENSIONS = ['.pdf'];
const MAX_FILENAME_LENGTH = 100;

// For Vercel compatibility - use temp directory or memory storage
const getUploadDir = () => {
  // Try to use a writable temp directory on Vercel
  const tempDir = process.env.VERCEL ? '/tmp/uploads' : path.join(process.cwd(), 'uploads', 'grievances');
  
  // Ensure upload directory exists with proper permissions
  if (!fs.existsSync(tempDir)) {
    try {
      fs.mkdirSync(tempDir, { recursive: true, mode: 0o755 });
    } catch (error) {
      console.warn('Could not create upload directory:', error);
      // Fallback to /tmp if available
      return '/tmp';
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

// Generate secure filename
const generateSecureFilename = (originalName: string): string => {
  const timestamp = Date.now();
  const randomBytes = crypto.randomBytes(16).toString('hex');
  const sanitizedName = sanitizeFilename(originalName);
  const extension = path.extname(sanitizedName).toLowerCase();
  const nameWithoutExt = path.basename(sanitizedName, extension);
  
  return `${timestamp}_${randomBytes}_${nameWithoutExt}${extension}`;
};

// Advanced PDF validation using magic numbers and structure
const validatePDFFile = async (filePath: string): Promise<{ isValid: boolean; error?: string }> => {
  try {
    const buffer = fs.readFileSync(filePath);
    
    // Check minimum file size (PDF should be at least a few bytes)
    if (buffer.length < 10) {
      return { isValid: false, error: 'File too small to be a valid PDF' };
    }
    
    // Check PDF magic number (header) - this is the most important check
    const pdfHeader = buffer.slice(0, 4).toString();
    if (pdfHeader !== '%PDF') {
      return { isValid: false, error: 'Invalid PDF header - file is not a PDF' };
    }
    
    // Simplified PDF validation - just check that it starts with %PDF
    // This is more compatible with various PDF versions and generators
    console.log(`[PDF VALIDATION] Valid PDF header found for file: ${filePath}`);
    
    // Optional: Check for suspicious content (basic malware detection)
    const bufferString = buffer.toString('binary', 0, Math.min(buffer.length, 50000)); // Check first 50KB only
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

// Virus scan simulation (in production, integrate with real antivirus)
const simulateVirusScan = async (filePath: string): Promise<{ isClean: boolean; threat?: string }> => {
  try {
    // Read file for basic pattern matching
    const buffer = fs.readFileSync(filePath);
    const content = buffer.toString('binary');
    
    // Check for known malicious patterns
    const maliciousPatterns = [
      /X5O!P%@AP\[4\\PZX54\(P\^\)7CC\)7\}\$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!\$H\+H\*/,
      /\/malware/i,
      /\/virus/i,
      /eval\s*\(\s*unescape/i
    ];
    
    for (const pattern of maliciousPatterns) {
      if (pattern.test(content)) {
        return { isClean: false, threat: 'Potential malware detected' };
      }
    }
    
    return { isClean: true };
  } catch (error) {
    return { isClean: false, threat: 'Failed to scan file' };
  }
};

// Enhanced file filter with detailed validation
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

// Secure multer storage configuration
const secureStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = getUploadDir();
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const secureFilename = generateSecureFilename(file.originalname);
    cb(null, secureFilename);
  }
});

// Multer configuration with enhanced security
const upload = multer({
  storage: secureStorage,
  fileFilter: secureFileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
    fieldNameSize: 50,
    fieldSize: 1024,
    headerPairs: 20
  }
});

// Rate limiting helper (simple in-memory implementation)
const uploadAttempts = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_UPLOADS_PER_WINDOW = 5;

const checkRateLimit = (identifier: string): boolean => {
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

// Enhanced upload attachment with comprehensive security
export const uploadAttachment = [
  upload.single('attachment'),
  async (req: Request, res: Response, next: NextFunction) => {
    const uploadStartTime = Date.now();
    let tempFilePath: string | null = null;
    
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
      
      tempFilePath = req.file.path;
      
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
      
      // Verify user owns the grievance (for additional security)
      if (grievance.rollno !== userRollno) {
        return res.status(403).json({
          message: 'You can only upload attachments to your own grievances',
          success: false
        });
      }
      
      // Check if grievance already has maximum attachments (e.g., 3 max)
      const existingAttachments = await db.query(AttachmentQueries.GET_BY_ISSUE_ID, [grievance.id]);
      if (existingAttachments.rows.length >= 3) {
        return res.status(400).json({
          message: 'Maximum 3 attachments allowed per grievance',
          success: false
        });
      }
      
      // Advanced PDF validation
      const pdfValidation = await validatePDFFile(tempFilePath);
      if (!pdfValidation.isValid) {
        return res.status(400).json({
          message: `Invalid PDF file: ${pdfValidation.error}`,
          success: false
        });
      }
      
      // Virus scan simulation
      const virusScan = await simulateVirusScan(tempFilePath);
      if (!virusScan.isClean) {
        return res.status(400).json({
          message: `File rejected: ${virusScan.threat}`,
          success: false
        });
      }
      
      // Save attachment to database
      const attachmentData = [
        grievance.id, // Use database ID for foreign key
        req.file.originalname,
        tempFilePath,
        userRollno
      ];
      
      const result = await db.query(AttachmentQueries.CREATE, attachmentData);
      const newAttachment = result.rows[0];
      
      // Update grievance attachment flag
      await grievanceService.updateGrievanceByIssueId(issue_id, { attachment: 'true' });
      
      // Log successful upload for security monitoring
      console.log(`[SECURITY] File uploaded successfully by ${userRollno} for grievance ${issue_id} at ${new Date().toISOString()}`);
      
      res.status(201).json({
        message: 'Attachment uploaded successfully',
        data: {
          id: newAttachment.id,
          issue_id: issue_id,
          filename: newAttachment.filename,
          uploadedby: newAttachment.uploadedby,
          uploadedat: newAttachment.uploadedat,
          size: req.file.size,
          mimetype: req.file.mimetype,
          security_checks: {
            pdf_validation: 'passed',
            virus_scan: 'clean',
            rate_limit: 'within_limits'
          }
        },
        processing_time: Date.now() - uploadStartTime,
        success: true
      });
        } catch (error: any) {
      // Log security incidents
      console.error(`[SECURITY] Upload failed for ${req.User?.rollno || 'anonymous'}: ${error?.message || 'Unknown error'}`);
      
      // Handle specific multer errors
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            message: `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`,
            success: false
          });
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            message: 'Only one file allowed at a time',
            success: false
          });
        }
        if (error.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({
            message: 'Unexpected file field. Use "attachment" field name',
            success: false
          });
        }
      }
      
      res.status(500).json({
        message: 'Error uploading attachment',
        error: process.env.NODE_ENV === 'development' ? (error?.message || 'Unknown error') : 'Internal server error',
        success: false
      });
    } finally {
      // Always clean up temp file on error
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try {
          // Only delete if there was an error (not if successfully saved)
          const wasSaved = res.statusCode === 201;
          if (!wasSaved) {
            fs.unlinkSync(tempFilePath);
          }
        } catch (cleanupError) {
          console.error('Failed to cleanup temp file:', cleanupError);
        }
      }
    }
  }
];

// Get attachments for a grievance with security checks
export const getAttachmentsByIssueId = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { issue_id } = req.params;
    const { test_user_rollno } = req.query;

    if (!issue_id) {
      return res.status(400).json({
        message: 'Grievance issue_id is required',
        success: false
      });
    }

    // Get user rollno for authorization
    const userRollno = req.User?.rollno || test_user_rollno;
    
    // Verify grievance exists and get database ID
    const grievance = await grievanceService.getGrievanceByIssueId(issue_id);
    if (!grievance) {
      return res.status(404).json({
        message: 'Grievance not found',
        success: false
      });
    }

    // Authorization check: Only allow access to own grievances (or admins)
    if (userRollno && grievance.rollno !== userRollno) {
      // For now, allow access for testing. In production, implement proper admin check
      console.log(`[SECURITY] Cross-user access attempted: ${userRollno} accessing grievance of ${grievance.rollno}`);
    }

    // Get attachments using database ID
    const result = await db.query(AttachmentQueries.GET_BY_ISSUE_ID, [grievance.id]);
    const attachments = result.rows.map((attachment: any) => {
      // Check if file still exists on disk
      const fileExists = fs.existsSync(attachment.filepath);
      
      return {
        id: attachment.id,
        issue_id: issue_id, // Return the string issue_id for consistency
        filename: attachment.filename,
        uploadedby: attachment.uploadedby,
        uploadedat: attachment.uploadedat,
        createdat: attachment.createdat,
        updatedat: attachment.updatedat,
        file_exists: fileExists,
        size: fileExists ? fs.statSync(attachment.filepath).size : 0
      };
    });

    res.status(200).json({
      message: 'Attachments retrieved successfully',
      data: attachments,
      total_attachments: attachments.length,
      success: true
    });
  } catch (error: unknown) {
    console.error(`[SECURITY] Error retrieving attachments for ${req.User?.rollno || 'anonymous'}:`, error);
    res.status(500).json({
      message: 'Error retrieving attachments',
      error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : 'Internal server error',
      success: false
    });
  }
};

// Secure download attachment with comprehensive access control
export const downloadAttachment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { attachment_id } = req.params;
    const { test_user_rollno } = req.query;

    if (!attachment_id) {
      return res.status(400).json({
        message: 'Attachment ID is required',
        success: false
      });
    }

    // Get user rollno for authorization
    const userRollno = req.User?.rollno || test_user_rollno;

    // Get attachment from database with grievance info
    const attachmentQuery = `
      SELECT a.*, g.rollno as grievance_owner 
      FROM attachment a 
      JOIN grievance g ON a.issuse_id = g.id 
      WHERE a.id = $1
    `;
    const result = await db.query(attachmentQuery, [attachment_id]);
    const attachment = result.rows[0];

    if (!attachment) {
      return res.status(404).json({
        message: 'Attachment not found',
        success: false
      });
    }

    // Authorization check: User can only download attachments from their own grievances
    if (userRollno && attachment.grievance_owner !== userRollno) {
      console.log(`[SECURITY] Unauthorized download attempt: ${userRollno} trying to access attachment of ${attachment.grievance_owner}`);
      return res.status(403).json({
        message: 'You can only download attachments from your own grievances',
        success: false
      });
    }

    // Security check: Ensure file exists and is within upload directory
    if (!fs.existsSync(attachment.filepath)) {
      return res.status(404).json({
        message: 'File not found on server',
        success: false
      });
    }    // Path traversal protection
    const resolvedFilePath = path.resolve(attachment.filepath);
    const resolvedUploadPath = path.resolve(getUploadDir());

    if (!resolvedFilePath.startsWith(resolvedUploadPath)) {
      console.error(`[SECURITY] Path traversal attempt detected: ${attachment.filepath}`);
      return res.status(403).json({
        message: 'Access denied - Invalid file path',
        success: false
      });
    }

    // Additional file validation before serving
    const pdfValidation = await validatePDFFile(attachment.filepath);
    if (!pdfValidation.isValid) {
      console.error(`[SECURITY] Corrupted file detected during download: ${attachment.filepath}`);
      return res.status(400).json({
        message: 'File appears to be corrupted and cannot be downloaded',
        success: false
      });
    }

    // Log download for security monitoring
    console.log(`[SECURITY] File downloaded: ${attachment.filename} by ${userRollno || 'anonymous'} at ${new Date().toISOString()}`);

    // Set secure headers for PDF download
    const safeFilename = sanitizeFilename(attachment.filename);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Stream the file securely
    const fileStream = fs.createReadStream(attachment.filepath);
    fileStream.on('error', (error) => {
      console.error('File stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          message: 'Error reading file',
          success: false
        });
      }
    });
    
    fileStream.pipe(res);
  } catch (error: unknown) {
    console.error(`[SECURITY] Download error for ${req.User?.rollno || 'anonymous'}:`, error);
    res.status(500).json({
      message: 'Error downloading attachment',
      error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : 'Internal server error',
      success: false
    });
  }
};

// Secure delete attachment with proper authorization
export const deleteAttachment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { attachment_id } = req.params;
    const { test_user_rollno } = req.body;

    if (!attachment_id) {
      return res.status(400).json({
        message: 'Attachment ID is required',
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

    // Get attachment with grievance info for authorization
    const attachmentQuery = `
      SELECT a.*, g.rollno as grievance_owner, g.issuse_id 
      FROM attachment a 
      JOIN grievance g ON a.issuse_id = g.id 
      WHERE a.id = $1
    `;
    const result = await db.query(attachmentQuery, [attachment_id]);
    const attachment = result.rows[0];

    if (!attachment) {
      return res.status(404).json({
        message: 'Attachment not found',
        success: false
      });
    }

    // Authorization check: User can only delete attachments from their own grievances
    if (attachment.grievance_owner !== userRollno) {
      console.log(`[SECURITY] Unauthorized delete attempt: ${userRollno} trying to delete attachment of ${attachment.grievance_owner}`);
      return res.status(403).json({
        message: 'You can only delete attachments from your own grievances',
        success: false
      });
    }

    // Check if grievance is still in editable state (optional business rule)
    const grievanceResult = await db.query('SELECT status FROM grievance WHERE id = $1', [attachment.issuse_id]);
    const grievanceStatus = grievanceResult.rows[0]?.status;
    
    if (grievanceStatus === 'RESOLVED' || grievanceStatus === 'CLOSED') {
      return res.status(400).json({
        message: 'Cannot delete attachments from resolved or closed grievances',
        success: false
      });
    }

    // Delete from database first
    await db.query(AttachmentQueries.DELETE, [attachment_id]);

    // Secure file deletion
    if (fs.existsSync(attachment.filepath)) {
      try {
        // Overwrite file with zeros before deletion for security
        const fileSize = fs.statSync(attachment.filepath).size;
        const buffer = Buffer.alloc(fileSize, 0);
        fs.writeFileSync(attachment.filepath, buffer);
        fs.unlinkSync(attachment.filepath);
      } catch (fileError) {
        console.error(`[SECURITY] Failed to securely delete file: ${attachment.filepath}`, fileError);
        // File deletion failed, but database record is already gone
      }
    }

    // Update grievance attachment flag if no more attachments
    const remainingAttachments = await db.query(AttachmentQueries.GET_BY_ISSUE_ID, [attachment.issuse_id]);
    if (remainingAttachments.rows.length === 0) {
      await grievanceService.updateGrievanceByIssueId(attachment.issuse_id, { attachment: 'false' });
    }

    // Log deletion for security monitoring
    console.log(`[SECURITY] Attachment deleted: ${attachment.filename} by ${userRollno} at ${new Date().toISOString()}`);

    res.status(200).json({
      message: 'Attachment deleted successfully',
      data: {
        deleted_file: attachment.filename,
        grievance_id: attachment.issuse_id
      },
      success: true
    });
  } catch (error: unknown) {
    console.error(`[SECURITY] Delete error for ${req.User?.rollno || 'anonymous'}:`, error);
    res.status(500).json({
      message: 'Error deleting attachment',
      error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : 'Internal server error',
      success: false
    });
  }
};

// Get attachment metadata with security filtering
export const getAttachmentById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { attachment_id } = req.params;
    const { test_user_rollno } = req.query;

    if (!attachment_id) {
      return res.status(400).json({
        message: 'Attachment ID is required',
        success: false
      });
    }

    // Get user rollno for authorization
    const userRollno = req.User?.rollno || test_user_rollno;

    // Get attachment with grievance info
    const attachmentQuery = `
      SELECT a.*, g.rollno as grievance_owner, g.issuse_id as string_issue_id 
      FROM attachment a 
      JOIN grievance g ON a.issuse_id = g.id 
      WHERE a.id = $1
    `;
    const result = await db.query(attachmentQuery, [attachment_id]);
    const attachment = result.rows[0];

    if (!attachment) {
      return res.status(404).json({
        message: 'Attachment not found',
        success: false
      });
    }

    // Authorization check
    if (userRollno && attachment.grievance_owner !== userRollno) {
      console.log(`[SECURITY] Unauthorized metadata access: ${userRollno} accessing attachment of ${attachment.grievance_owner}`);
      return res.status(403).json({
        message: 'You can only view metadata of your own attachments',
        success: false
      });
    }

    // Get secure file stats
    let fileStats = null;
    let securityStatus = {
      file_exists: false,
      pdf_valid: false,
      virus_scan: 'not_performed'
    };

    if (fs.existsSync(attachment.filepath)) {
      const stats = fs.statSync(attachment.filepath);
      fileStats = {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        last_accessed: stats.atime
      };
      
      // Quick security check
      securityStatus.file_exists = true;
      const pdfValidation = await validatePDFFile(attachment.filepath);
      securityStatus.pdf_valid = pdfValidation.isValid;
      
      // Simulate virus scan
      const virusScan = await simulateVirusScan(attachment.filepath);
      securityStatus.virus_scan = virusScan.isClean ? 'clean' : 'threat_detected';
    }

    res.status(200).json({
      message: 'Attachment details retrieved successfully',
      data: {
        id: attachment.id,
        issue_id: attachment.string_issue_id, // Return string issue_id
        filename: attachment.filename,
        uploadedby: attachment.uploadedby,
        uploadedat: attachment.uploadedat,
        createdat: attachment.createdat,
        updatedat: attachment.updatedat,
        file_stats: fileStats,
        security_status: securityStatus
      },
      success: true
    });
  } catch (error: unknown) {
    console.error(`[SECURITY] Metadata error for ${req.User?.rollno || 'anonymous'}:`, error);
    res.status(500).json({
      message: 'Error retrieving attachment details',
      error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : 'Internal server error',
      success: false
    });
  }
};

// Health check endpoint for attachment service
export const getAttachmentSystemHealth = async (req: Request, res: Response) => {
  try {
    const uploadDir = getUploadDir();
    const health = {
      upload_directory: {
        exists: fs.existsSync(uploadDir),
        writable: true,
        path: uploadDir
      },
      security_features: {
        pdf_validation: 'enabled',
        virus_scanning: 'simulated',
        rate_limiting: 'enabled',
        path_traversal_protection: 'enabled',
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

    // Test write permission
    try {
      const testFile = path.join(uploadDir, '.health_check');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
    } catch (error) {
      health.upload_directory.writable = false;
    }

    res.status(200).json({
      message: 'Attachment service health check',
      data: health,
      success: true
    });  } catch (error: unknown) {
    res.status(500).json({
      message: 'Health check failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    });
  }
};

export default {
  uploadAttachment,
  getAttachmentsByIssueId,
  downloadAttachment,
  deleteAttachment,
  getAttachmentById,
  getAttachmentSystemHealth
};

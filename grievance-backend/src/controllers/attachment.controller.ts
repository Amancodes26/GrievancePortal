import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { getPool } from '../db';
import { AttachmentQueries, GrievanceQueries } from '../db/queries';

// Security configuration
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const ALLOWED_EXTENSIONS = ['.pdf', '.jpeg', '.jpg', '.png'];
const MAX_FILENAME_LENGTH = 100;

// For Vercel compatibility - use temp directory for file uploads
const getUploadDir = () => {
  const tempDir = process.env.VERCEL ? '/tmp/uploads' : path.join(process.cwd(), 'uploads', 'grievances');
  
  if (!fs.existsSync(tempDir)) {
    try {
      fs.mkdirSync(tempDir, { recursive: true, mode: 0o755 });
    } catch (error) {
      console.warn('Could not create upload directory:', error);
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
const generateSecureFilename = (originalName: string, grievanceId: string): string => {
  const timestamp = Date.now();
  const randomBytes = crypto.randomBytes(8).toString('hex');
  const sanitizedName = sanitizeFilename(originalName);
  const extension = path.extname(sanitizedName).toLowerCase();
  const nameWithoutExt = path.basename(sanitizedName, extension);
  
  return `${grievanceId}_${timestamp}_${randomBytes}_${nameWithoutExt}${extension}`;
};

// File validation
const validateFile = (file: Express.Multer.File): { isValid: boolean; error?: string } => {
  // Check file type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return { isValid: false, error: `File type not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}` };
  }

  // Check file extension
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { isValid: false, error: `File extension not allowed. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}` };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return { isValid: false, error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB` };
  }

  return { isValid: true };
};

// Multer configuration for single file upload
export const attachmentUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = getUploadDir();
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const grievanceId = req.params.grievanceId || 'temp';
      const secureFilename = generateSecureFilename(file.originalname, grievanceId);
      cb(null, secureFilename);
    }
  }),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const validation = validateFile(file);
    if (validation.isValid) {
      cb(null, true);
    } else {
      cb(new Error(validation.error));
    }
  }
});

/**
 * Upload attachment to existing grievance
 * POST /api/v1/attachments/grievance/:grievanceId
 */
export const uploadToGrievance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { grievanceId } = req.params;
    const uploadedFile = req.file;

    if (!uploadedFile) {
      res.status(400).json({
        message: 'No file uploaded',
        success: false,
      });
      return;
    }

    // Verify grievance exists and belongs to user
    const grievanceResult = await getPool().query(GrievanceQueries.GET_BY_ID, [grievanceId]);
    
    if (grievanceResult.rows.length === 0) {
      // Clean up uploaded file
      if (fs.existsSync(uploadedFile.path)) {
        fs.unlinkSync(uploadedFile.path);
      }
      res.status(404).json({
        message: 'Grievance not found',
        success: false,
      });
      return;
    }

    const grievance = grievanceResult.rows[0];
    
    // Check if user owns the grievance (or is admin)
    if (grievance.rollno !== req.user?.rollNumber && !req.admin) {
      // Clean up uploaded file
      if (fs.existsSync(uploadedFile.path)) {
        fs.unlinkSync(uploadedFile.path);
      }
      res.status(403).json({
        message: 'Not authorized to upload to this grievance',
        success: false,
      });
      return;
    }

    // Save attachment to database
    const attachmentData = [
      grievanceId,
      uploadedFile.originalname, // Store original filename
      uploadedFile.path,
      uploadedFile.mimetype,
      uploadedFile.size,
      req.user?.rollNumber || req.admin?.AdminId
    ];

    const result = await getPool().query(AttachmentQueries.CREATE, attachmentData);
    const attachment = result.rows[0];

    // Update grievance hasAttachments flag
    await getPool().query(
      'UPDATE Grievance SET HasAttachments = true WHERE GrievanceId = $1',
      [grievanceId]
    );

    res.status(201).json({
      message: 'Attachment uploaded successfully',
      success: true,
      data: {
        id: attachment.id,
        filename: attachment.filename,
        mimeType: attachment.mimetype,
        size: attachment.filesize,
        uploadedAt: attachment.uploadedat,
        uploadedBy: attachment.uploadedby
      }
    });

  } catch (error: any) {
    console.error('Error uploading attachment:', error);
    
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    }

    res.status(500).json({
      message: 'Internal server error',
      success: false,
      error: error.message,
    });
  }
};

/**
 * Get all attachments for a grievance
 * GET /api/v1/attachments/grievance/:grievanceId
 */
export const getGrievanceAttachments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { grievanceId } = req.params;

    // Verify grievance exists
    const grievanceResult = await getPool().query(GrievanceQueries.GET_BY_ID, [grievanceId]);
    
    if (grievanceResult.rows.length === 0) {
      res.status(404).json({
        message: 'Grievance not found',
        success: false,
      });
      return;
    }

    const grievance = grievanceResult.rows[0];

    // Check access permissions
    const hasAccess = req.user?.rollNumber === grievance.rollno || req.admin;
    
    if (!hasAccess) {
      res.status(403).json({
        message: 'Not authorized to view attachments for this grievance',
        success: false,
      });
      return;
    }

    // Get attachments
    const result = await getPool().query(AttachmentQueries.GET_BY_GRIEVANCE_ID, [grievanceId]);

    res.status(200).json({
      message: 'Attachments retrieved successfully',
      success: true,
      data: result.rows.map(attachment => ({
        id: attachment.id,
        filename: attachment.filename,
        mimeType: attachment.mimetype,
        size: attachment.filesize,
        uploadedAt: attachment.uploadedat,
        uploadedBy: attachment.uploadedby
      }))
    });

  } catch (error: any) {
    console.error('Error getting attachments:', error);
    res.status(500).json({
      message: 'Internal server error',
      success: false,
      error: error.message,
    });
  }
};

/**
 * Download attachment by ID
 * GET /api/v1/attachments/:attachmentId/download
 */
export const downloadAttachment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { attachmentId } = req.params;

    // Get attachment details
    const result = await getPool().query(AttachmentQueries.GET_BY_ID, [attachmentId]);
    
    if (result.rows.length === 0) {
      res.status(404).json({
        message: 'Attachment not found',
        success: false,
      });
      return;
    }

    const attachment = result.rows[0];

    // Verify grievance access
    const grievanceResult = await getPool().query(GrievanceQueries.GET_BY_ID, [attachment.grievanceid]);
    
    if (grievanceResult.rows.length === 0) {
      res.status(404).json({
        message: 'Associated grievance not found',
        success: false,
      });
      return;
    }

    const grievance = grievanceResult.rows[0];

    // Check access permissions
    const hasAccess = req.user?.rollNumber === grievance.rollno || req.admin;
    
    if (!hasAccess) {
      res.status(403).json({
        message: 'Not authorized to download this attachment',
        success: false,
      });
      return;
    }

    // Check if file exists
    if (!fs.existsSync(attachment.filepath)) {
      res.status(404).json({
        message: 'File not found on server',
        success: false,
      });
      return;
    }

    // Set headers for download
    res.setHeader('Content-Type', attachment.mimetype);
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.filename}"`);
    res.setHeader('Content-Length', attachment.filesize);

    // Stream file to response
    const fileStream = fs.createReadStream(attachment.filepath);
    fileStream.pipe(res);

  } catch (error: any) {
    console.error('Error downloading attachment:', error);
    res.status(500).json({
      message: 'Internal server error',
      success: false,
      error: error.message,
    });
  }
};

/**
 * Delete attachment by ID
 * DELETE /api/v1/attachments/:attachmentId
 */
export const deleteAttachment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { attachmentId } = req.params;

    // Get attachment details
    const result = await getPool().query(AttachmentQueries.GET_BY_ID, [attachmentId]);
    
    if (result.rows.length === 0) {
      res.status(404).json({
        message: 'Attachment not found',
        success: false,
      });
      return;
    }

    const attachment = result.rows[0];

    // Verify grievance access
    const grievanceResult = await getPool().query(GrievanceQueries.GET_BY_ID, [attachment.grievanceid]);
    
    if (grievanceResult.rows.length === 0) {
      res.status(404).json({
        message: 'Associated grievance not found',
        success: false,
      });
      return;
    }

    const grievance = grievanceResult.rows[0];

    // Check permissions (only owner or admin can delete)
    const canDelete = req.user?.rollNumber === grievance.rollno || req.admin;
    
    if (!canDelete) {
      res.status(403).json({
        message: 'Not authorized to delete this attachment',
        success: false,
      });
      return;
    }

    // Delete from database
    await getPool().query(AttachmentQueries.DELETE, [attachmentId]);

    // Delete physical file
    if (fs.existsSync(attachment.filepath)) {
      try {
        fs.unlinkSync(attachment.filepath);
      } catch (fileError) {
        console.warn('Could not delete physical file:', fileError);
      }
    }

    // Check if grievance has remaining attachments
    const remainingAttachments = await getPool().query(
      AttachmentQueries.GET_BY_GRIEVANCE_ID, 
      [attachment.grievanceid]
    );

    // Update hasAttachments flag if no attachments remain
    if (remainingAttachments.rows.length === 0) {
      await getPool().query(
        'UPDATE Grievance SET HasAttachments = false WHERE GrievanceId = $1',
        [attachment.grievanceid]
      );
    }

    res.status(200).json({
      message: 'Attachment deleted successfully',
      success: true,
    });

  } catch (error: any) {
    console.error('Error deleting attachment:', error);
    res.status(500).json({
      message: 'Internal server error',
      success: false,
      error: error.message,
    });
  }
};

/**
 * Get attachment details by ID
 * GET /api/v1/attachments/:attachmentId
 */
export const getAttachmentById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { attachmentId } = req.params;

    // Get attachment details
    const result = await getPool().query(AttachmentQueries.GET_BY_ID, [attachmentId]);
    
    if (result.rows.length === 0) {
      res.status(404).json({
        message: 'Attachment not found',
        success: false,
      });
      return;
    }

    const attachment = result.rows[0];

    // Verify grievance access
    const grievanceResult = await getPool().query(GrievanceQueries.GET_BY_ID, [attachment.grievanceid]);
    
    if (grievanceResult.rows.length === 0) {
      res.status(404).json({
        message: 'Associated grievance not found',
        success: false,
      });
      return;
    }

    const grievance = grievanceResult.rows[0];

    // Check access permissions
    const hasAccess = req.user?.rollNumber === grievance.rollno || req.admin;
    
    if (!hasAccess) {
      res.status(403).json({
        message: 'Not authorized to view this attachment',
        success: false,
      });
      return;
    }

    res.status(200).json({
      message: 'Attachment details retrieved successfully',
      success: true,
      data: {
        id: attachment.id,
        grievanceId: attachment.grievanceid,
        filename: attachment.filename,
        mimeType: attachment.mimetype,
        size: attachment.filesize,
        uploadedAt: attachment.uploadedat,
        uploadedBy: attachment.uploadedby
      }
    });

  } catch (error: any) {
    console.error('Error getting attachment details:', error);
    res.status(500).json({
      message: 'Internal server error',
      success: false,
      error: error.message,
    });
  }
};

/**
 * Cleanup orphaned files (admin only)
 * DELETE /api/v1/attachments/cleanup
 */
export const cleanupOrphanedFiles = async (req: Request, res: Response): Promise<void> => {
  try {
    // Only admins can run cleanup
    if (!req.admin) {
      res.status(403).json({
        message: 'Admin access required for cleanup',
        success: false,
      });
      return;
    }

    const uploadDir = getUploadDir();
    let deletedCount = 0;
    let errors: string[] = [];

    // Get all files in upload directory
    if (fs.existsSync(uploadDir)) {
      const files = fs.readdirSync(uploadDir);

      for (const file of files) {
        const filePath = path.join(uploadDir, file);
        
        try {
          // Check if file exists in database
          const result = await getPool().query(
            'SELECT COUNT(*) as count FROM Attachment WHERE FileName = $1',
            [file]
          );

          if (parseInt(result.rows[0].count) === 0) {
            // File not in database, delete it
            fs.unlinkSync(filePath);
            deletedCount++;
          }
        } catch (error) {
          errors.push(`Error processing ${file}: ${error}`);
        }
      }
    }

    res.status(200).json({
      message: 'Cleanup completed',
      success: true,
      data: {
        deletedFiles: deletedCount,
        errors: errors
      }
    });

  } catch (error: any) {
    console.error('Error during cleanup:', error);
    res.status(500).json({
      message: 'Internal server error',
      success: false,
      error: error.message,
    });
  }
};

/**
 * Get attachment system health
 * GET /api/v1/attachments/health
 */
export const getSystemHealth = async (req: Request, res: Response): Promise<void> => {
  try {
    const uploadDir = getUploadDir();
    
    // Get statistics
    const attachmentCountResult = await getPool().query('SELECT COUNT(*) as count FROM Attachment');
    const totalAttachments = parseInt(attachmentCountResult.rows[0].count);
    
    const uploadDirExists = fs.existsSync(uploadDir);
    
    let diskUsage = 0;
    let fileCount = 0;
    
    if (uploadDirExists) {
      const files = fs.readdirSync(uploadDir);
      fileCount = files.length;
      
      for (const file of files) {
        try {
          const stat = fs.statSync(path.join(uploadDir, file));
          diskUsage += stat.size;
        } catch (error) {
          // Skip files that can't be read
        }
      }
    }

    res.status(200).json({
      message: 'System health retrieved successfully',
      success: true,
      data: {
        uploadDirectory: {
          path: uploadDir,
          exists: uploadDirExists,
          writable: uploadDirExists
        },
        statistics: {
          totalAttachmentsInDB: totalAttachments,
          totalFilesOnDisk: fileCount,
          diskUsageBytes: diskUsage,
          diskUsageMB: Math.round(diskUsage / 1024 / 1024 * 100) / 100
        },
        configuration: {
          maxFileSize: MAX_FILE_SIZE,
          allowedTypes: ALLOWED_MIME_TYPES,
          allowedExtensions: ALLOWED_EXTENSIONS
        },
        status: uploadDirExists ? 'healthy' : 'warning'
      }
    });

  } catch (error: any) {
    console.error('Error getting system health:', error);
    res.status(500).json({
      message: 'Internal server error',
      success: false,
      error: error.message,
    });
  }
};

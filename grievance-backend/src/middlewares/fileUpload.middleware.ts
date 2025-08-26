import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { Request, Response, NextFunction } from 'express';
import { ALLOWED_MIME_TYPES, FILE_SIZE_LIMITS, FileSecurityUtils } from '../validators/attachment.validator';
import { AppError } from '../utils/errorHandler';

/**
 * Multer configuration for file uploads with enterprise security
 * Handles file storage, validation, and security checks
 */

// Configure memory storage for processing before saving to disk
const storage = multer.memoryStorage();

// File filter with comprehensive security validation
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback): void => {
  try {
    console.info('[FileUploadMiddleware] Processing file:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });

    // Check MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype as any)) {
      const error = new AppError(
        `File type '${file.mimetype}' not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
        400,
        'INVALID_FILE_TYPE'
      );
      return cb(error as any, false);
    }

    // Check filename security
    if (!file.originalname) {
      const error = new AppError('Filename is required', 400, 'MISSING_FILENAME');
      return cb(error as any, false);
    }

    // Validate filename format and security
    const dangerousPatterns = [
      /\.(exe|bat|cmd|com|pif|scr|vbs|js|jar|app|deb|pkg|dmg)$/i,
      /\.\./,  // Directory traversal
      /[<>:"|?*]/,  // Invalid filename characters
      /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i  // Reserved Windows names
    ];

    const hasInvalidPattern = dangerousPatterns.some(pattern => pattern.test(file.originalname));
    if (hasInvalidPattern) {
      const error = new AppError(
        'Filename contains invalid or potentially dangerous characters',
        400,
        'INVALID_FILENAME'
      );
      return cb(error as any, false);
    }

    // All validations passed
    cb(null, true);

  } catch (error) {
    console.error('[FileUploadMiddleware] File filter error:', error);
    cb(error as any, false);
  }
};

// Configure multer with security settings
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: FILE_SIZE_LIMITS.MAX_FILE_SIZE,
    files: FILE_SIZE_LIMITS.MAX_FILES_PER_GRIEVANCE,
    fields: 10, // Limit form fields
    fieldSize: 1024 * 1024, // 1MB per field
    fieldNameSize: 100, // Limit field name length
    headerPairs: 2000 // Limit header pairs
  }
});

/**
 * Middleware for single file upload with enhanced validation
 */
export const uploadSingleFile = (fieldName: string = 'file') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const singleUpload = upload.single(fieldName);
    
    singleUpload(req, res, (error: any) => {
      try {
        if (error) {
          console.error('[FileUploadMiddleware] Upload error:', error);

          // Handle specific multer errors
          if (error instanceof multer.MulterError) {
            switch (error.code) {
              case 'LIMIT_FILE_SIZE':
                res.status(400).json({
                  success: false,
                  status: 400,
                  message: `File too large. Maximum size allowed is ${FILE_SIZE_LIMITS.MAX_FILE_SIZE / (1024 * 1024)}MB`,
                  errorCode: 'FILE_TOO_LARGE',
                  timestamp: new Date().toISOString()
                });
                return;
              
              case 'LIMIT_FILE_COUNT':
                res.status(400).json({
                  success: false,
                  status: 400,
                  message: `Too many files. Maximum ${FILE_SIZE_LIMITS.MAX_FILES_PER_GRIEVANCE} files allowed`,
                  errorCode: 'TOO_MANY_FILES',
                  timestamp: new Date().toISOString()
                });
                return;
              
              case 'LIMIT_UNEXPECTED_FILE':
                res.status(400).json({
                  success: false,
                  status: 400,
                  message: 'Unexpected file field',
                  errorCode: 'UNEXPECTED_FILE_FIELD',
                  timestamp: new Date().toISOString()
                });
                return;
              
              default:
                res.status(400).json({
                  success: false,
                  status: 400,
                  message: `File upload error: ${error.message}`,
                  errorCode: 'UPLOAD_ERROR',
                  timestamp: new Date().toISOString()
                });
                return;
            }
          }

          // Handle custom validation errors
          if (error instanceof AppError) {
            res.status(error.status).json({
              success: false,
              status: error.status,
              message: error.message,
              errorCode: error.code,
              timestamp: new Date().toISOString()
            });
            return;
          }

          // Handle unknown errors
          res.status(500).json({
            success: false,
            status: 500,
            message: 'File upload failed',
            errorCode: 'UPLOAD_FAILED',
            timestamp: new Date().toISOString()
          });
          return;
        }

        // Validate file was uploaded
        if (!req.file) {
          res.status(400).json({
            success: false,
            status: 400,
            message: 'No file uploaded',
            errorCode: 'NO_FILE_UPLOADED',
            timestamp: new Date().toISOString()
          });
          return;
        }

        // Additional security validation on file content
        const isValidSignature = FileSecurityUtils.validateFileSignature(
          req.file.buffer,
          req.file.mimetype
        );

        if (!isValidSignature) {
          console.warn('[FileUploadMiddleware] File signature mismatch:', {
            filename: req.file.originalname,
            declaredMimeType: req.file.mimetype,
            actualSignature: req.file.buffer.subarray(0, 8).toString('hex')
          });
          
          res.status(400).json({
            success: false,
            status: 400,
            message: 'File content does not match declared file type',
            errorCode: 'FILE_SIGNATURE_MISMATCH',
            timestamp: new Date().toISOString()
          });
          return;
        }

        console.info('[FileUploadMiddleware] File upload successful:', {
          filename: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          sizeFormatted: FileSecurityUtils.formatFileSize(req.file.size)
        });

        next();

      } catch (processingError) {
        console.error('[FileUploadMiddleware] Processing error:', processingError);
        
        res.status(500).json({
          success: false,
          status: 500,
          message: 'File processing failed',
          errorCode: 'FILE_PROCESSING_ERROR',
          timestamp: new Date().toISOString()
        });
        return;
      }
    });
  };
};

/**
 * Middleware for multiple file upload
 */
export const uploadMultipleFiles = (fieldName: string = 'files', maxCount: number = FILE_SIZE_LIMITS.MAX_FILES_PER_GRIEVANCE) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const multipleUpload = upload.array(fieldName, maxCount);
    
    multipleUpload(req, res, (error: any) => {
      try {
        if (error) {
          console.error('[FileUploadMiddleware] Multiple upload error:', error);

          // Handle multer errors (same as single upload)
          if (error instanceof multer.MulterError) {
            switch (error.code) {
              case 'LIMIT_FILE_SIZE':
                res.status(400).json({
                  success: false,
                  status: 400,
                  message: `One or more files too large. Maximum size allowed is ${FILE_SIZE_LIMITS.MAX_FILE_SIZE / (1024 * 1024)}MB per file`,
                  errorCode: 'FILE_TOO_LARGE',
                  timestamp: new Date().toISOString()
                });
                return;
              
              case 'LIMIT_FILE_COUNT':
                res.status(400).json({
                  success: false,
                  status: 400,
                  message: `Too many files. Maximum ${maxCount} files allowed`,
                  errorCode: 'TOO_MANY_FILES',
                  timestamp: new Date().toISOString()
                });
                return;
              
              default:
                res.status(400).json({
                  success: false,
                  status: 400,
                  message: `File upload error: ${error.message}`,
                  errorCode: 'UPLOAD_ERROR',
                  timestamp: new Date().toISOString()
                });
                return;
            }
          }

          // Handle custom errors
          res.status(500).json({
            success: false,
            status: 500,
            message: 'Multiple file upload failed',
            errorCode: 'MULTIPLE_UPLOAD_FAILED',
            timestamp: new Date().toISOString()
          });
          return;
        }

        // Validate files were uploaded
        const files = req.files as Express.Multer.File[];
        if (!files || files.length === 0) {
          res.status(400).json({
            success: false,
            status: 400,
            message: 'No files uploaded',
            errorCode: 'NO_FILES_UPLOADED',
            timestamp: new Date().toISOString()
          });
          return;
        }

        // Validate total size
        const totalSize = files.reduce((sum, file) => sum + file.size, 0);
        if (totalSize > FILE_SIZE_LIMITS.MAX_TOTAL_SIZE_PER_GRIEVANCE) {
          res.status(400).json({
            success: false,
            status: 400,
            message: `Total file size too large. Maximum ${FILE_SIZE_LIMITS.MAX_TOTAL_SIZE_PER_GRIEVANCE / (1024 * 1024)}MB allowed per grievance`,
            errorCode: 'TOTAL_SIZE_TOO_LARGE',
            timestamp: new Date().toISOString()
          });
          return;
        }

        // Validate each file signature
        for (const file of files) {
          const isValidSignature = FileSecurityUtils.validateFileSignature(
            file.buffer,
            file.mimetype
          );

          if (!isValidSignature) {
            console.warn('[FileUploadMiddleware] File signature mismatch in batch:', {
              filename: file.originalname,
              declaredMimeType: file.mimetype
            });
            
            res.status(400).json({
              success: false,
              status: 400,
              message: `File '${file.originalname}' content does not match declared file type`,
              errorCode: 'FILE_SIGNATURE_MISMATCH',
              timestamp: new Date().toISOString()
            });
            return;
          }
        }

        console.info('[FileUploadMiddleware] Multiple files upload successful:', {
          fileCount: files.length,
          totalSize: FileSecurityUtils.formatFileSize(totalSize),
          fileNames: files.map(f => f.originalname)
        });

        next();

      } catch (processingError) {
        console.error('[FileUploadMiddleware] Multiple file processing error:', processingError);
        
        res.status(500).json({
          success: false,
          status: 500,
          message: 'Multiple file processing failed',
          errorCode: 'MULTIPLE_FILE_PROCESSING_ERROR',
          timestamp: new Date().toISOString()
        });
        return;
      }
    });
  };
};

/**
 * Utility function to ensure upload directory exists
 */
export const ensureUploadDirectory = async (grievanceId: string): Promise<string> => {
  const uploadDir = path.join(process.cwd(), 'uploads', grievanceId);
  
  try {
    await fs.access(uploadDir);
  } catch {
    // Directory doesn't exist, create it
    await fs.mkdir(uploadDir, { recursive: true });
    console.info('[FileUploadMiddleware] Created upload directory:', uploadDir);
  }
  
  return uploadDir;
};

/**
 * Utility function to save file to disk with security measures
 */
export const saveFileToDir = async (
  file: Express.Multer.File,
  grievanceId: string,
  uploadedBy: string
): Promise<{ filePath: string; safeFileName: string; fileHash: string }> => {
  try {
    // Ensure upload directory exists
    const uploadDir = await ensureUploadDirectory(grievanceId);
    
    // Generate safe filename
    const safeFileName = FileSecurityUtils.generateSafeFileName(
      file.originalname,
      grievanceId,
      uploadedBy
    );
    
    // Calculate file hash for integrity
    const fileHash = FileSecurityUtils.calculateFileHash(file.buffer);
    
    // Full file path
    const filePath = path.join(uploadDir, safeFileName);
    
    // Save file to disk
    await fs.writeFile(filePath, file.buffer);
    
    console.info('[FileUploadMiddleware] File saved successfully:', {
      originalName: file.originalname,
      safeFileName,
      filePath,
      fileHash: fileHash.substring(0, 16) + '...' // Log partial hash
    });
    
    return {
      filePath,
      safeFileName,
      fileHash
    };
    
  } catch (error) {
    console.error('[FileUploadMiddleware] File save error:', error);
    throw new AppError('Failed to save file to disk', 500, 'FILE_SAVE_ERROR', error);
  }
};

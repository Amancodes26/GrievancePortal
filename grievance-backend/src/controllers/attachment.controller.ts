import { Request, Response, NextFunction } from 'express';
import { AttachmentService } from '../services/attachment.service';
import { 
  FileUploadSchema,
  AttachmentListQuerySchema,
  FileSecurityUtils 
} from '../validators/attachment.validator';
import { AppError } from '../utils/errorHandler';
import { ResponseService } from '../services/response.service';
import fs from 'fs/promises';

/**
 * Controller class for Attachment endpoints
 * Handles file upload, download, list, and deletion operations
 * 
 * Principal Engineer Standards:
 * - Comprehensive input validation
 * - Proper error handling and response formatting
 * - Security controls and audit logging
 * - Performance optimization
 * - Enterprise-grade file management
 */
export class AttachmentController {
  private attachmentService: AttachmentService;

  constructor() {
    this.attachmentService = new AttachmentService();
  }

  /**
   * Uploads a single file attachment for a grievance
   * 
   * POST /api/v1/attachments
   * 
   * @param req - Express request with file upload
   * @param res - Express response
   * @param next - Express next function
   */
  uploadAttachment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const startTime = Date.now();

      // Extract file and metadata from request
      const file = req.file;
      const { grievanceId, uploadedBy } = req.body;

      if (!file) {
        throw new AppError('No file provided', 400, 'FILE_REQUIRED');
      }

      // Validate input data
      const validationResult = FileUploadSchema.safeParse({
        grievanceId,
        uploadedBy,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        buffer: file.buffer
      });

      if (!validationResult.success) {
        console.warn('[AttachmentController.uploadAttachment] Validation failed:', validationResult.error.flatten());
        throw new AppError(
          `Validation failed: ${validationResult.error.issues.map((i: any) => i.message).join(', ')}`,
          400,
          'VALIDATION_ERROR'
        );
      }

      console.info('[AttachmentController.uploadAttachment] Processing file upload', {
        grievanceId,
        uploadedBy,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size
      });

      // Upload file using service
      const uploadResult = await this.attachmentService.uploadAttachment(
        file,
        grievanceId,
        uploadedBy
      );

      const processingTime = Date.now() - startTime;

      // Log successful upload
      console.info('[AttachmentController.uploadAttachment] File upload completed', {
        attachmentId: uploadResult.attachment.id,
        grievanceId,
        processingTimeMs: processingTime,
        fileName: uploadResult.attachment.fileName
      });

      // Return success response
      res.status(201).json({
        success: true,
        message: 'File uploaded successfully',
        data: {
          attachment: uploadResult.attachment,
          processingTime: `${processingTime}ms`
        }
      });

    } catch (error) {
      console.error('[AttachmentController.uploadAttachment] Error:', error);
      next(error);
    }
  };

  /**
   * Retrieves attachment list for a grievance with pagination
   * 
   * GET /api/v1/attachments/:grievanceId
   * 
   * @param req - Express request with grievance ID and query parameters
   * @param res - Express response
   * @param next - Express next function
   */
  getAttachmentList = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { grievanceId } = req.params;
      const requestingAdminId = (req as any).adminId || 'unknown'; // From auth middleware
      
      // Validate and sanitize query parameters
      const queryValidation = AttachmentListQuerySchema.safeParse({
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as string
      });

      if (!queryValidation.success) {
        console.warn('[AttachmentController.getAttachmentList] Query validation failed:', queryValidation.error.flatten());
        throw new AppError(
          `Invalid query parameters: ${queryValidation.error.issues.map(i => i.message).join(', ')}`,
          400,
          'VALIDATION_ERROR'
        );
      }

      const queryParams = queryValidation.data;

      console.info('[AttachmentController.getAttachmentList] Fetching attachment list', {
        grievanceId,
        requestingAdminId,
        queryParams
      });

      // Get attachment list from service
      const attachmentList = await this.attachmentService.getAttachmentList(
        grievanceId,
        queryParams,
        requestingAdminId
      );

      console.info('[AttachmentController.getAttachmentList] Retrieved attachment list', {
        grievanceId,
        totalAttachments: attachmentList.attachments.length,
        totalPages: attachmentList.pagination.totalPages
      });

      res.status(200).json({
        success: true,
        message: 'Attachment list retrieved successfully',
        data: attachmentList
      });

    } catch (error) {
      console.error('[AttachmentController.getAttachmentList] Error:', error);
      next(error);
    }
  };

  /**
   * Downloads an attachment file
   * 
   * GET /api/v1/attachments/download/:attachmentId
   * 
   * @param req - Express request with attachment ID
   * @param res - Express response
   * @param next - Express next function
   */
  downloadAttachment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const attachmentId = parseInt(req.params.attachmentId);
      const requestingAdminId = (req as any).adminId || 'unknown'; // From auth middleware

      if (isNaN(attachmentId)) {
        throw new AppError('Invalid attachment ID', 400, 'INVALID_ATTACHMENT_ID');
      }

      console.info('[AttachmentController.downloadAttachment] Processing download request', {
        attachmentId,
        requestingAdminId
      });

      // Get file information from service
      const downloadInfo = await this.attachmentService.downloadAttachment(
        attachmentId,
        requestingAdminId
      );

      const { filePath, attachment } = downloadInfo;

      // Set response headers for file download
      const safeFileName = attachment.originalFileName || attachment.fileName;
      
      res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}"`);
      res.setHeader('Content-Type', attachment.mimeType);
      res.setHeader('Content-Length', attachment.fileSize.toString());
      res.setHeader('X-Attachment-ID', attachment.id.toString());
      res.setHeader('X-Grievance-ID', attachment.grievanceId);

      // Stream file to response
      const fileStream = await fs.readFile(filePath);
      
      console.info('[AttachmentController.downloadAttachment] File download completed', {
        attachmentId,
        fileName: attachment.fileName,
        fileSize: attachment.fileSize
      });

      res.send(fileStream);

    } catch (error) {
      console.error('[AttachmentController.downloadAttachment] Error:', error);
      next(error);
    }
  };

  /**
   * Deletes an attachment (soft delete by default)
   * 
   * DELETE /api/v1/attachments/:attachmentId
   * 
   * @param req - Express request with attachment ID and optional hard delete flag
   * @param res - Express response
   * @param next - Express next function
   */
  deleteAttachment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const attachmentId = parseInt(req.params.attachmentId);
      const requestingAdminId = (req as any).adminId || 'unknown'; // From auth middleware
      const hardDelete = req.query.hardDelete === 'true';

      if (isNaN(attachmentId)) {
        throw new AppError('Invalid attachment ID', 400, 'INVALID_ATTACHMENT_ID');
      }

      console.info('[AttachmentController.deleteAttachment] Processing deletion request', {
        attachmentId,
        requestingAdminId,
        hardDelete
      });

      // Delete attachment using service
      const deleteResult = await this.attachmentService.deleteAttachment(
        attachmentId,
        requestingAdminId,
        hardDelete
      );

      console.info('[AttachmentController.deleteAttachment] Attachment deleted successfully', {
        attachmentId,
        hardDelete,
        success: deleteResult.success
      });

      res.status(200).json({
        success: true,
        message: `Attachment ${hardDelete ? 'permanently deleted' : 'moved to trash'} successfully`,
        data: {
          attachmentId,
          hardDelete,
          deletedFilePath: deleteResult.deletedFilePath
        }
      });

    } catch (error) {
      console.error('[AttachmentController.deleteAttachment] Error:', error);
      next(error);
    }
  };

  /**
   * Gets attachment statistics for a grievance
   * 
   * GET /api/v1/attachments/:grievanceId/stats
   * 
   * @param req - Express request with grievance ID
   * @param res - Express response  
   * @param next - Express next function
   */
  getAttachmentStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { grievanceId } = req.params;
      const requestingAdminId = (req as any).adminId || 'unknown'; // From auth middleware

      console.info('[AttachmentController.getAttachmentStats] Fetching attachment statistics', {
        grievanceId,
        requestingAdminId
      });

      // Get statistics from service
      const stats = await this.attachmentService.getAttachmentStats(grievanceId);

      console.info('[AttachmentController.getAttachmentStats] Retrieved attachment statistics', {
        grievanceId,
        totalFiles: stats.totalFiles,
        totalSizeMB: stats.totalSizeMB
      });

      res.status(200).json({
        success: true,
        message: 'Attachment statistics retrieved successfully',
        data: stats
      });

    } catch (error) {
      console.error('[AttachmentController.getAttachmentStats] Error:', error);
      next(error);
    }
  };

  /**
   * Bulk upload multiple files for a grievance
   * 
   * POST /api/v1/attachments/bulk
   * 
   * @param req - Express request with multiple files
   * @param res - Express response
   * @param next - Express next function
   */
  bulkUploadAttachments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const startTime = Date.now();
      const files = req.files as Express.Multer.File[];
      const { grievanceId, uploadedBy } = req.body;

      if (!files || files.length === 0) {
        throw new AppError('No files provided', 400, 'FILES_REQUIRED');
      }

      console.info('[AttachmentController.bulkUploadAttachments] Processing bulk file upload', {
        grievanceId,
        uploadedBy,
        fileCount: files.length,
        totalSize: files.reduce((sum, f) => sum + f.size, 0)
      });

      // Upload each file sequentially to maintain transaction integrity
      const uploadResults = [];
      const errors = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const uploadResult = await this.attachmentService.uploadAttachment(
            file,
            grievanceId,
            uploadedBy
          );
          uploadResults.push(uploadResult);
        } catch (error) {
          console.error(`[AttachmentController.bulkUploadAttachments] Failed to upload file ${i + 1}:`, error);
          errors.push({
            fileIndex: i,
            fileName: file.originalname,
            error: error instanceof AppError ? error.message : 'Unknown error'
          });
        }
      }

      const processingTime = Date.now() - startTime;

      console.info('[AttachmentController.bulkUploadAttachments] Bulk upload completed', {
        grievanceId,
        totalFiles: files.length,
        successfulUploads: uploadResults.length,
        failedUploads: errors.length,
        processingTimeMs: processingTime
      });

      const statusCode = errors.length > 0 ? 207 : 201; // 207 Multi-Status if some uploads failed
      res.status(statusCode).json({
        success: true,
        message: `Bulk upload completed: ${uploadResults.length} successful, ${errors.length} failed`,
        data: {
          successful: uploadResults.map(r => r.attachment),
          failed: errors,
          summary: {
            totalFiles: files.length,
            successfulUploads: uploadResults.length,
            failedUploads: errors.length,
            processingTime: `${processingTime}ms`
          }
        }
      });

    } catch (error) {
      console.error('[AttachmentController.bulkUploadAttachments] Error:', error);
      next(error);
    }
  };
}

import { Pool, PoolClient } from 'pg';
import ConnectionManager from '../db/connectionManager';
import { AppError } from '../utils/errorHandler';
import { AttachmentMetadata, AttachmentListResponse, AttachmentListQuery } from '../validators/attachment.validator';
import fs from 'fs/promises';
import path from 'path';

/**
 * Repository class for Attachment data access operations
 * Implements Repository pattern with comprehensive error handling and file management
 * 
 * Principal Engineer Standards:
 * - Database transaction management
 * - File system operations with atomic transactions
 * - Comprehensive error handling
 * - Performance optimization
 * - Security controls
 */
export class AttachmentRepository {

  /**
   * Creates a new attachment record with database transaction
   * 
   * @param attachmentData - Validated attachment metadata
   * @returns Promise<AttachmentMetadata> - Created attachment record
   */
  async createAttachment(attachmentData: {
    grievanceId: string;
    fileName: string;
    filePath: string;
    mimeType: string;
    fileSize: number;
    uploadedBy: string;
  }): Promise<AttachmentMetadata> {
    const client = await ConnectionManager.getClient();
    
    try {
      await client.query('BEGIN');

      // Verify grievance exists before creating attachment (use correct table/column names)
      const grievanceCheck = await client.query(
        'SELECT id FROM "Grievance" WHERE id = $1',
        [attachmentData.grievanceId]
      );

      if (grievanceCheck.rows.length === 0) {
        throw new AppError(
          `Grievance with ID ${attachmentData.grievanceId} not found`,
          404,
          'GRIEVANCE_NOT_FOUND'
        );
      }

      // Check attachment count limit per grievance (business rule: max 10 files)
      const countCheck = await client.query(
        'SELECT COUNT(*) as file_count FROM "Attachment" WHERE grievance_id = $1 AND deleted_at IS NULL',
        [attachmentData.grievanceId]
      );

      const currentCount = parseInt(countCheck.rows[0]?.file_count || '0');
      if (currentCount >= 10) {
        throw new AppError(
          `Maximum file limit (10) reached for grievance ${attachmentData.grievanceId}`,
          400,
          'FILE_LIMIT_EXCEEDED'
        );
      }

      // Insert attachment record using correct column names
      const insertQuery = `
        INSERT INTO "Attachment" (
          grievance_id,
          file_name,
          file_path,
          mime_type,
          file_size,
          uploaded_by,
          uploaded_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING 
          id,
          grievance_id,
          file_name,
          file_path,
          mime_type,
          file_size,
          uploaded_by,
          uploaded_at,
          deleted_at
      `;

      const result = await client.query(insertQuery, [
        attachmentData.grievanceId,
        attachmentData.fileName,
        attachmentData.filePath,
        attachmentData.mimeType,
        attachmentData.fileSize,
        attachmentData.uploadedBy
      ]);

      await client.query('COMMIT');

      const createdAttachment = result.rows[0];

      console.info(`[AttachmentRepository] Created attachment record`, {
        attachmentId: createdAttachment.id,
        grievanceId: attachmentData.grievanceId,
        fileName: attachmentData.fileName
      });

      return this.mapRowToAttachmentMetadata(createdAttachment);

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[AttachmentRepository.createAttachment] Error:', error);
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Failed to create attachment record', 500, 'DATABASE_ERROR', error);
    } finally {
      client.release();
    }
  }

  /**
   * Retrieves attachment by ID
   * 
   * @param attachmentId - Target attachment ID
   * @returns Promise<AttachmentMetadata | null> - Attachment metadata or null if not found
   */
  async getAttachmentById(attachmentId: number): Promise<AttachmentMetadata | null> {
    try {
      const query = `
        SELECT 
          a.id,
          a.grievance_id,
          a.file_name,
          a.file_path,
          a.mime_type,
          a.file_size,
          a.uploaded_by,
          a.uploaded_at,
          a.deleted_at,
          ai.first_name || ' ' || ai.last_name as uploader_name
        FROM "Attachment" a
        LEFT JOIN "AdminInfo" ai ON a.uploaded_by = ai.admin_id
        WHERE a.id = $1 AND a.deleted_at IS NULL
        LIMIT 1
      `;

      const result = await ConnectionManager.query(query, [attachmentId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToAttachmentMetadata(result.rows[0]);

    } catch (error) {
      console.error('[AttachmentRepository.getAttachmentById] Error:', error);
      throw new AppError('Failed to retrieve attachment', 500, 'DATABASE_ERROR', error);
    }
  }

  /**
   * Retrieves attachments for a grievance with pagination
   * 
   * @param grievanceId - Target grievance ID  
   * @param queryParams - Pagination and filtering parameters
   * @returns Promise<AttachmentListResponse> - Paginated attachment list
   */
  async getAttachmentsByGrievanceId(
    grievanceId: string,
    queryParams: AttachmentListQuery
  ): Promise<AttachmentListResponse> {
    try {
      const { page = 1, limit = 10, sortBy = 'uploaded_at', sortOrder = 'desc' } = queryParams;
      const offset = (page - 1) * limit;

      // Validate sort parameters
      const validSortFields = ['uploaded_at', 'file_name', 'file_size', 'mime_type'];
      const validSortOrders = ['asc', 'desc'];
      
      const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'uploaded_at';
      const safeSortOrder = validSortOrders.includes(sortOrder.toLowerCase()) ? sortOrder.toLowerCase() : 'desc';

      // Get total count for pagination
      const countQuery = `
        SELECT COUNT(*) as total_count
        FROM "Attachment" 
        WHERE grievance_id = $1 AND deleted_at IS NULL
      `;
      const countResult = await ConnectionManager.query(countQuery, [grievanceId]);
      const totalCount = parseInt(countResult.rows[0]?.total_count || '0');

      // Get attachments with pagination
      const attachmentsQuery = `
        SELECT 
          a.id,
          a.grievance_id,
          a.file_name,
          a.file_path,
          a.mime_type,
          a.file_size,
          a.uploaded_by,
          a.uploaded_at,
          a.deleted_at,
          ai.first_name || ' ' || ai.last_name as uploader_name
        FROM "Attachment" a
        LEFT JOIN "AdminInfo" ai ON a.uploaded_by = ai.admin_id
        WHERE a.grievance_id = $1 AND a.deleted_at IS NULL
        ORDER BY a.${safeSortBy} ${safeSortOrder.toUpperCase()}
        LIMIT $2 OFFSET $3
      `;

      const attachmentsResult = await ConnectionManager.query(attachmentsQuery, [
        grievanceId, 
        limit, 
        offset
      ]);

      // Get summary statistics
      const summaryQuery = `
        SELECT 
          COUNT(*) as total_files,
          COALESCE(SUM(file_size), 0) as total_size,
          COUNT(DISTINCT mime_type) as unique_file_types,
          COUNT(DISTINCT uploaded_by) as unique_uploaders
        FROM "Attachment" 
        WHERE grievance_id = $1 AND deleted_at IS NULL
      `;
      const summaryResult = await ConnectionManager.query(summaryQuery, [grievanceId]);
      const summary = summaryResult.rows[0];

      // Map results
      const attachments = attachmentsResult.rows.map(row => this.mapRowToAttachmentMetadata(row));

      const response: AttachmentListResponse = {
        grievanceId: grievanceId,
        attachments,
        pagination: {
          page: page,
          limit: limit,
          totalCount: totalCount,
          totalPages: Math.ceil(totalCount / limit),
          currentPage: page,
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPrevPage: page > 1
        },
        summary: {
          totalFiles: parseInt(summary.total_files || '0'),
          totalSize: parseInt(summary.total_size || '0'),
          totalSizeMB: Math.round((parseInt(summary.total_size || '0')) / (1024 * 1024) * 100) / 100,
          fileTypes: [], // Will be filled with actual file types from the query
          uniqueFileTypes: parseInt(summary.unique_file_types || '0')
        }
      };

      console.info(`[AttachmentRepository] Retrieved ${attachments.length} attachments for grievance: ${grievanceId}`);

      return response;

    } catch (error) {
      console.error('[AttachmentRepository.getAttachmentsByGrievanceId] Error:', error);
      throw new AppError('Failed to retrieve attachments', 500, 'DATABASE_ERROR', error);
    }
  }

  /**
   * Soft or hard deletes an attachment
   * 
   * @param attachmentId - Target attachment ID
   * @param hardDelete - Whether to permanently delete (default: false)
   * @returns Promise<{ success: boolean; filePath: string | null }> - Deletion result
   */
  async deleteAttachment(
    attachmentId: number, 
    hardDelete: boolean = false
  ): Promise<{ success: boolean; filePath: string | null }> {
    const client = await ConnectionManager.getClient();
    
    try {
      await client.query('BEGIN');

      // Get attachment record for file cleanup
      const selectQuery = `
        SELECT id, file_path, file_name, grievance_id
        FROM "Attachment" 
        WHERE id = $1 AND deleted_at IS NULL
        LIMIT 1
      `;
      
      const selectResult = await client.query(selectQuery, [attachmentId]);
      
      if (selectResult.rows.length === 0) {
        throw new AppError(
          `Attachment with ID ${attachmentId} not found or already deleted`,
          404,
          'ATTACHMENT_NOT_FOUND'
        );
      }

      const attachment = selectResult.rows[0];
      let deletedFilePath: string | null = attachment.file_path;

      if (hardDelete) {
        // Hard delete: Remove from database completely
        const deleteQuery = 'DELETE FROM "Attachment" WHERE id = $1';
        await client.query(deleteQuery, [attachmentId]);

        // Remove file from disk
        if (attachment.file_path) {
          try {
            await fs.unlink(attachment.file_path);
            console.info(`[AttachmentRepository] File deleted from disk: ${attachment.file_path}`);
          } catch (fileError) {
            console.warn(`[AttachmentRepository] Failed to delete file from disk: ${attachment.file_path}`, fileError);
          }
        }

      } else {
        // Soft delete: Set deleted_at timestamp
        const softDeleteQuery = `
          UPDATE "Attachment" 
          SET deleted_at = NOW() 
          WHERE id = $1
        `;
        await client.query(softDeleteQuery, [attachmentId]);
      }

      await client.query('COMMIT');

      console.info(`[AttachmentRepository] Attachment ${hardDelete ? 'hard' : 'soft'} deleted successfully`, {
        attachmentId,
        fileName: attachment.file_name
      });

      return {
        success: true,
        filePath: deletedFilePath
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[AttachmentRepository.deleteAttachment] Error:', error);
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Failed to delete attachment', 500, 'DATABASE_ERROR', error);
    } finally {
      client.release();
    }
  }

  /**
   * Gets attachment statistics for a grievance
   * 
   * @param grievanceId - Target grievance ID
   * @returns Promise<object> - Detailed attachment statistics
   */
  async getAttachmentStats(grievanceId: string): Promise<{
    totalFiles: number;
    totalSize: number;
    totalSizeMB: number;
    fileTypes: { mimeType: string; count: number }[];
    uploaders: { uploadedBy: string; uploaderName?: string; count: number }[];
  }> {
    try {
      // Get file type distribution
      const fileTypeQuery = `
        SELECT 
          mime_type,
          COUNT(*) as count
        FROM "Attachment" 
        WHERE grievance_id = $1 AND deleted_at IS NULL
        GROUP BY mime_type
        ORDER BY count DESC
      `;
      const fileTypeResult = await ConnectionManager.query(fileTypeQuery, [grievanceId]);

      // Get uploader distribution
      const uploaderQuery = `
        SELECT 
          a.uploaded_by,
          ai.first_name || ' ' || ai.last_name as uploader_name,
          COUNT(*) as count
        FROM "Attachment" a
        LEFT JOIN "AdminInfo" ai ON a.uploaded_by = ai.admin_id
        WHERE a.grievance_id = $1 AND a.deleted_at IS NULL
        GROUP BY a.uploaded_by, uploader_name
        ORDER BY count DESC
      `;
      const uploaderResult = await ConnectionManager.query(uploaderQuery, [grievanceId]);

      // Get total statistics
      const totalQuery = `
        SELECT 
          COUNT(*) as total_files,
          COALESCE(SUM(file_size), 0) as total_size
        FROM "Attachment" 
        WHERE grievance_id = $1 AND deleted_at IS NULL
      `;
      const totalResult = await ConnectionManager.query(totalQuery, [grievanceId]);
      const totals = totalResult.rows[0];

      return {
        totalFiles: parseInt(totals.total_files || '0'),
        totalSize: parseInt(totals.total_size || '0'),
        totalSizeMB: Math.round((parseInt(totals.total_size || '0')) / (1024 * 1024) * 100) / 100,
        fileTypes: fileTypeResult.rows.map(row => ({
          mimeType: row.mime_type,
          count: parseInt(row.count)
        })),
        uploaders: uploaderResult.rows.map(row => ({
          uploadedBy: row.uploaded_by,
          uploaderName: row.uploader_name,
          count: parseInt(row.count)
        }))
      };

    } catch (error) {
      console.error('[AttachmentRepository.getAttachmentStats] Error:', error);
      throw new AppError('Failed to retrieve attachment statistics', 500, 'DATABASE_ERROR', error);
    }
  }

  /**
   * Maps database row to AttachmentMetadata type
   * @private
   */
  private mapRowToAttachmentMetadata(row: any): AttachmentMetadata {
    return {
      id: row.id,
      attachmentId: row.id?.toString() || '', // Convert to string for attachmentId
      grievanceId: row.grievance_id,
      fileName: row.file_name,
      originalFileName: row.original_filename || row.file_name, // Use original_filename if available
      filePath: row.file_path,
      mimeType: row.mime_type,
      fileSize: row.file_size,
      uploadedBy: row.uploaded_by,
      uploaderName: row.uploader_name,
      uploadedAt: row.uploaded_at,
      deletedAt: row.deleted_at
    };
  }
}

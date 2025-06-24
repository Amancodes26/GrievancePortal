import { getPool } from '../db/index';
import fs from 'fs';
import { linkAttachmentToGrievance } from '../controllers/preGrievanceAttachment.controller';

export interface AttachmentLinkResult {
  success: boolean;
  linkedCount: number;
  failedCount: number;
  errors: string[];
}

/**
 * Link multiple temporary attachments to a grievance
 * This is used when creating a grievance with pre-uploaded attachments
 * 
 * @param attachmentIds - Array of temporary attachment IDs
 * @param grievanceId - Database ID of the created grievance
 * @param userRollno - Roll number of the user creating the grievance
 * @returns Promise<AttachmentLinkResult>
 */
export const linkMultipleAttachmentsToGrievance = async (
  attachmentIds: number[],
  grievanceId: number,
  userRollno: string
): Promise<AttachmentLinkResult> => {
  const result: AttachmentLinkResult = {
    success: true,
    linkedCount: 0,
    failedCount: 0,
    errors: []
  };

  if (!attachmentIds || attachmentIds.length === 0) {
    return result;
  }

  console.log('[ATTACHMENT_SERVICE] Linking attachments to grievance:', {
    attachmentIds,
    grievanceId,
    userRollno
  });

  for (const attachmentId of attachmentIds) {
    try {
      const linked = await linkAttachmentToGrievance(attachmentId, grievanceId, userRollno);
      
      if (linked) {
        result.linkedCount++;
      } else {
        result.failedCount++;
        result.errors.push(`Failed to link attachment ${attachmentId} - not found or access denied`);
      }
    } catch (error) {
      result.failedCount++;
      result.errors.push(`Error linking attachment ${attachmentId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  result.success = result.failedCount === 0;

  console.log('[ATTACHMENT_SERVICE] Attachment linking completed:', result);

  return result;
};

/**
 * Validate that temporary attachments exist and belong to the user
 * This is used before creating a grievance to ensure all attachment IDs are valid
 * 
 * @param attachmentIds - Array of attachment IDs to validate
 * @param userRollno - Roll number of the user
 * @returns Promise<{ valid: boolean; validIds: number[]; invalidIds: number[] }>
 */
export const validateTemporaryAttachments = async (
  attachmentIds: number[],
  userRollno: string
): Promise<{ valid: boolean; validIds: number[]; invalidIds: number[] }> => {
  if (!attachmentIds || attachmentIds.length === 0) {
    return { valid: true, validIds: [], invalidIds: [] };
  }

  const validIds: number[] = [];
  const invalidIds: number[] = [];

  try {    // Check each attachment ID in attachment table (temporary attachments have Issuse_Id = NULL)
    for (const attachmentId of attachmentIds) {
      const result = await getPool().query(`
        SELECT id FROM attachment 
        WHERE id = $1 AND Issuse_Id IS NULL AND UploadedBy = $2
      `, [attachmentId, userRollno]);

      if (result.rows.length > 0) {
        validIds.push(attachmentId);
      } else {
        invalidIds.push(attachmentId);
      }
    }

    return {
      valid: invalidIds.length === 0,
      validIds,
      invalidIds
    };
  } catch (error) {
    console.error('[ATTACHMENT_SERVICE] Error validating attachments:', error);
    return {
      valid: false,
      validIds: [],
      invalidIds: attachmentIds
    };
  }
};

/**
 * Get attachment details for temporary attachments
 * Used to provide attachment info when creating grievances
 * 
 * @param attachmentIds - Array of attachment IDs
 * @param userRollno - Roll number of the user
 * @returns Promise<Array<AttachmentInfo>>
 */
export interface AttachmentInfo {
  id: number;
  filename: string;
  originalFilename: string;
  mimetype: string;
  size: number;
  uploadedAt: Date;
}

export const getTemporaryAttachmentDetails = async (
  attachmentIds: number[],
  userRollno: string
): Promise<AttachmentInfo[]> => {
  if (!attachmentIds || attachmentIds.length === 0) {
    return [];
  }
  try {
    const placeholders = attachmentIds.map((_, index) => `$${index + 2}`).join(',');    const query = `
      SELECT id, FileName as filename, UploadedAt as uploadedAt
      FROM attachment 
      WHERE Issuse_Id IS NULL AND UploadedBy = $1 AND id IN (${placeholders})
      ORDER BY UploadedAt DESC
    `;

    const result = await getPool().query(query, [userRollno, ...attachmentIds]);
    
    return result.rows.map(row => {
      // Parse metadata from filename (temporary solution until DB is migrated)
      const [originalFilename, mimetype, size] = row.filename.split('|');
      
      return {
        id: row.id,
        filename: row.filename,
        originalFilename: originalFilename,
        mimetype: mimetype,
        size: parseInt(size),
        uploadedAt: row.uploadedat
      };
    });
  } catch (error) {
    console.error('[ATTACHMENT_SERVICE] Error getting attachment details:', error);
    return [];
  }
};

/**
 * Update grievance attachment flag
 * Updates the grievance record to indicate it has attachments
 * 
 * @param grievanceId - Database ID of the grievance
 * @param hasAttachments - Whether the grievance has attachments
 * @returns Promise<boolean>
 */
export const updateGrievanceAttachmentFlag = async (
  grievanceId: number,
  hasAttachments: boolean
): Promise<boolean> => {
  try {
    await getPool().query(`
      UPDATE grievance 
      SET Attachment = $1, UpdatedAt = (NOW() AT TIME ZONE 'Asia/Kolkata')
      WHERE id = $2
    `, [hasAttachments ? 'true' : 'false', grievanceId]);

    return true;
  } catch (error) {
    console.error('[ATTACHMENT_SERVICE] Error updating grievance attachment flag:', error);
    return false;
  }
};

/**
 * Get attachment count for a grievance
 * 
 * @param grievanceId - Database ID of the grievance
 * @returns Promise<number>
 */
export const getGrievanceAttachmentCount = async (grievanceId: number): Promise<number> => {
  try {
    const result = await getPool().query(`
      SELECT COUNT(*) as count FROM attachment WHERE Issuse_Id = $1
    `, [grievanceId]);

    return parseInt(result.rows[0].count, 10);
  } catch (error) {
    console.error('[ATTACHMENT_SERVICE] Error getting attachment count:', error);
    return 0;
  }
};

/**
 * Clean up failed attachment uploads
 * Removes temporary attachments that failed to link to a grievance
 * 
 * @param attachmentIds - Array of attachment IDs to clean up
 * @param userRollno - Roll number of the user
 * @returns Promise<void>
 */
export const cleanupFailedAttachmentUploads = async (
  attachmentIds: number[],
  userRollno: string
): Promise<void> => {
  if (!attachmentIds || attachmentIds.length === 0) {
    return;
  }

  try {
    const placeholders = attachmentIds.map((_, index) => `$${index + 2}`).join(',');    const query = `
      DELETE FROM attachment 
      WHERE Issuse_Id IS NULL AND UploadedBy = $1 AND id IN (${placeholders})
      RETURNING FilePath
    `;

    const result = await getPool().query(query, [userRollno, ...attachmentIds]);

    // Clean up physical files if not on Vercel
    if (!process.env.VERCEL) {
      for (const row of result.rows) {
        if (row.filepath && fs.existsSync(row.filepath)) {
          try {
            fs.unlinkSync(row.filepath);
            console.log('[ATTACHMENT_SERVICE] Cleaned up failed upload file:', row.filepath);
          } catch (error) {
            console.error('[ATTACHMENT_SERVICE] Failed to clean up file:', row.filepath, error);
          }
        }
      }
    }

    console.log(`[ATTACHMENT_SERVICE] Cleaned up ${result.rows.length} failed attachments`);
  } catch (error) {
    console.error('[ATTACHMENT_SERVICE] Error cleaning up failed attachments:', error);
  }
};

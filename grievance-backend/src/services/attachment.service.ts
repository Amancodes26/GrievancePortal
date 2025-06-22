import ConnectionManager from '../db/connectionManager';
import { AttachmentQueries } from '../db/queries';
import fs from 'fs';
import path from 'path';

interface AttachmentData {
  grievanceId: string;
  uploadedBy: string;
  filePath: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

export const saveAttachment = async (data: AttachmentData) => {
  try {
    const result = await ConnectionManager.query(AttachmentQueries.CREATE, [
      data.grievanceId,
      data.fileName,
      data.fileName, // OriginalFileName
      data.filePath,
      data.mimeType,
      data.fileSize,
      data.uploadedBy
    ]);
    
    return {
      id: result.rows[0].id,
      issue_id: result.rows[0].issuse_id,
      file_name: result.rows[0].filename,
      file_path: result.rows[0].filepath,
      uploaded_by: result.rows[0].uploadedby,
      uploaded_at: result.rows[0].uploadedat,
      file_size: data.fileSize,
      mime_type: data.mimeType
    };
  } catch (error) {
    // Clean up file if database save fails
    if (fs.existsSync(data.filePath)) {
      fs.unlinkSync(data.filePath);
    }
    throw error;
  }
};

export const getAttachmentById = async (id: string) => {
  try {
    const result = await ConnectionManager.query('SELECT * FROM attachment WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const attachment = result.rows[0];
    return {
      id: attachment.id,
      issue_id: attachment.issuse_id,
      file_name: attachment.filename,
      file_path: attachment.filepath,
      uploaded_by: attachment.uploadedby,
      uploaded_at: attachment.uploadedat
    };
  } catch (error) {
    throw error;
  }
};

export const getAttachmentsByGrievanceId = async (issueId: string) => {
  try {
    const result = await ConnectionManager.query(AttachmentQueries.GET_BY_ISSUE_ID, [issueId]);
    
    return result.rows.map(attachment => ({
      id: attachment.id,
      issue_id: attachment.issuse_id,
      file_name: attachment.filename,
      file_path: attachment.filepath,
      uploaded_by: attachment.uploadedby,
      uploaded_at: attachment.uploadedat
    }));
  } catch (error) {
    throw error;
  }
};

export const deleteAttachment = async (id: string, userId?: string) => {
  try {
    // First get the attachment to check ownership and get file path
    const attachment = await getAttachmentById(id);
    
    if (!attachment) {
      return false;
    }
    
    // If userId is provided, check ownership
    if (userId && attachment.uploaded_by !== userId) {
      throw new Error('Unauthorized: You can only delete your own attachments');
    }
    
    // Delete from database
    const result = await ConnectionManager.query(AttachmentQueries.DELETE, [id]);
    
    if (result.rows.length === 0) {
      return false;
    }
    
    // Delete physical file
    try {
      if (fs.existsSync(attachment.file_path)) {
        fs.unlinkSync(attachment.file_path);
      }
    } catch (fileError) {
      console.error('Error deleting physical file:', fileError);
      // Don't throw error here as database deletion was successful
    }
    
    return true;
  } catch (error) {
    throw error;
  }
};

export const validateAttachmentAccess = async (attachmentId: string, userId: string) => {
  try {
    const attachment = await getAttachmentById(attachmentId);
    
    if (!attachment) {
      return { hasAccess: false, message: 'Attachment not found' };
    }
    
    // Check if user uploaded the file
    if (attachment.uploaded_by === userId) {
      return { hasAccess: true, attachment };
    }
    
    // Check if user has access to the grievance
    const grievanceQuery = `
      SELECT g.*, pi.id as user_id 
      FROM grievance g 
      JOIN personalinfo pi ON g.rollno = pi.rollno 
      WHERE g.issuse_id = $1 AND pi.id = $2
    `;
    
    const grievanceResult = await ConnectionManager.query(grievanceQuery, [attachment.issue_id, userId]);
    
    if (grievanceResult.rows.length > 0) {
      return { hasAccess: true, attachment };
    }
    
    return { hasAccess: false, message: 'Unauthorized access to attachment' };
  } catch (error) {
    throw error;
  }
};

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
      grievanceId: result.rows[0].grievanceid,
      fileName: result.rows[0].filename,
      filePath: result.rows[0].filepath,
      uploadedBy: result.rows[0].uploadedby,
      uploadedAt: result.rows[0].uploadedat,
      fileSize: data.fileSize,
      mimeType: data.mimeType
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
    const result = await ConnectionManager.query(AttachmentQueries.GET_BY_ID, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const attachment = result.rows[0];
    return {
      id: attachment.id,
      grievanceId: attachment.grievanceid,
      fileName: attachment.filename,
      filePath: attachment.filepath,
      uploadedBy: attachment.uploadedby,
      uploadedAt: attachment.uploadedat
    };
  } catch (error) {
    throw error;
  }
};

export const getAttachmentsByGrievanceId = async (grievanceId: string) => {
  try {
    const result = await ConnectionManager.query(AttachmentQueries.GET_BY_GRIEVANCE_ID, [grievanceId]);
    
    return result.rows.map(attachment => ({
      id: attachment.id,
      grievanceId: attachment.grievanceid,
      fileName: attachment.filename,
      filePath: attachment.filepath,
      uploadedBy: attachment.uploadedby,
      uploadedAt: attachment.uploadedat
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
    if (userId && attachment.uploadedBy !== userId) {
      throw new Error('Unauthorized: You can only delete your own attachments');
    }
    
    // Delete from database
    const result = await ConnectionManager.query(AttachmentQueries.DELETE, [id]);
    
    if (result.rows.length === 0) {
      return false;
    }
    
    // Delete physical file
    try {
      if (fs.existsSync(attachment.filePath)) {
        fs.unlinkSync(attachment.filePath);
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
    if (attachment.uploadedBy === userId) {
      return { hasAccess: true, attachment };
    }
    
    // Check if user has access to the grievance
    const grievanceQuery = `
      SELECT g.*, si.rollno 
      FROM grievance g 
      JOIN studentinfo si ON g.rollno = si.rollno 
      WHERE g.grievanceid = $1 AND si.rollno = $2
    `;
    
    const grievanceResult = await ConnectionManager.query(grievanceQuery, [attachment.grievanceId, userId]);
    
    if (grievanceResult.rows.length > 0) {
      return { hasAccess: true, attachment };
    }
    
    return { hasAccess: false, message: 'Unauthorized access to attachment' };
  } catch (error) {
    throw error;
  }
};

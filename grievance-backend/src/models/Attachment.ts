// Attachment interface for grievance file uploads
export interface Attachment {
  id?: number;                   // Primary key (matches SQL: id SERIAL)
  grievanceId: string;           // FK to Grievance.grievanceId (better than issue_id)
  fileName: string;              // Original file name
  filePath: string;              // File storage path/URL
  mimeType: string;              // File MIME type (e.g., 'application/pdf')
  fileSize: number;              // File size in bytes
  uploadedAt?: Date;             // When file was uploaded
  uploadedBy: string;            // Who uploaded (rollno or adminId)
}

// Interface for creating new attachments
export interface CreateAttachmentData {
  grievanceId: string;           // FK to link with grievance
  fileName: string;              // Original file name
  filePath: string;              // Where file is stored
  mimeType: string;              // File type
  fileSize: number;              // File size
  uploadedBy: string;            // Who uploaded the file
}

// Interface for updating attachments (rarely needed)
export interface UpdateAttachmentData {
  fileName?: string;
  filePath?: string;
  uploadedAt?: Date;
}

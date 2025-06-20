export interface Attachment {
  attachment_id?: number;
  issue_id: number;
  filename: string;
  original_filename: string;
  mimetype: string; // e.g., 'application/pdf'
  size: number; // in bytes
  file_data?: string; // base64 encoded file data
  filepath?: string; // legacy field for backward compatibility
  uploaded_by: string;
  upload_date: Date;
}

// Legacy interface for backward compatibility
export interface LegacyAttachment {
  id: string;
  issuse_id: string;
  uploaded_by: string;
  file_path: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  uploaded_at: Date;
}

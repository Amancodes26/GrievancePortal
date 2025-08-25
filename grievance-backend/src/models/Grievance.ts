// Grievance interface for student grievance submissions
export interface Grievance {
  id?: number;
  grievanceId: string;           // Unique tracking ID (e.g., "GRV-2025-001", ISSUE-202508-00001)
  rollno: string;                // FK to PersonalInfo.rollno
  campusId: number;              // FK to CampusInfo.campusid (auto-filled from student)
  issueCode: number;             // FK to IssueList.issueCode
  subject: string;               // Grievance subject/title
  description: string;           // Detailed description
  hasAttachments: boolean;       // Whether attachments are included
  createdAt?: Date;
  updatedAt?: Date;
  // Additional fields from joins
  studentName?: string;
  campusName?: string;
  issueTitle?: string;
}

// Interface for creating new grievances
export interface CreateGrievanceData {
  rollno: string;                // Will be auto-filled from authenticated user
  issueCode: number;             // Selected from IssueList
  subject: string;
  description: string;
  hasAttachments: boolean;
}

// Interface for updating grievances (admin/system use)
export interface UpdateGrievanceData {
  subject?: string;
  description?: string;
  hasAttachments?: boolean;
  updatedAt?: Date;
}
// Tracking interface for grievance status updates and admin responses
// Each admin action creates a new tracking entry (history-based approach)
export interface Tracking {
  id?: number;
  grievanceId: string;           // FK to Grievance.grievanceId
  responseText: string;          // Admin's response/update message
  adminStatus: 'NEW' | 'PENDING' | 'REDIRECTED' | 'RESOLVED' | 'REJECTED'; // Admin workflow status
  studentStatus: 'SUBMITTED' | 'UNDER_REVIEW' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED'; // Student view status
  responseBy: string;            // AdminId who provided the update
  responseAt: Date;              // When this update was made
  redirectTo?: string;           // AdminId if redirected to another admin
  redirectFrom?: string;         // AdminId who redirected this grievance
  isRedirect: boolean;           // Whether this is a redirect action
  hasAttachments: boolean;       // Whether this update has attachments
}

// Interface for creating new tracking entries (admin responses)
export interface CreateTrackingData {
  grievanceId: string;
  responseText: string;
  adminStatus: 'NEW' | 'PENDING' | 'REDIRECTED' | 'RESOLVED' | 'REJECTED';
  studentStatus: 'SUBMITTED' | 'UNDER_REVIEW' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';
  responseBy: string;
  redirectTo?: string;           // AdminId if redirecting to another admin
  redirectFrom?: string;         // AdminId who redirected this grievance  
  isRedirect: boolean;
  hasAttachments: boolean;
}

// Interface for updating tracking entries
export interface UpdateTrackingData {
  responseText?: string;
  adminStatus?: 'NEW' | 'PENDING' | 'REDIRECTED' | 'RESOLVED' | 'REJECTED';
  studentStatus?: 'SUBMITTED' | 'UNDER_REVIEW' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';
  redirectTo?: string;
  redirectFrom?: string;
  isRedirect?: boolean;
  hasAttachments?: boolean;
}

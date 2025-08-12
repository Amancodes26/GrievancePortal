// Issue list interface for grievance types available to students
export interface IssueList {
  id?: number;
  issueCode: number;
  issueTitle: string;
  category: 'ACADEMIC' | 'EXAM' | 'OTHER';
  requiredAttachments: string[];
  issuelevel: 'CAMPUS_LEVEL' | 'UNIVERSITY_LEVEL';
  isactive?: boolean;
  createdat?: Date;
  updatedat?: Date;
}

// Interface for creating new issue types
export interface CreateIssueListData {
  issueCode: number;
  issueTitle: string;
  category: 'ACADEMIC' | 'EXAM' | 'OTHER';
  requiredAttachments: string[];
  issuelevel: 'CAMPUS_LEVEL' | 'UNIVERSITY_LEVEL';
}

// Interface for updating issue types
export interface UpdateIssueListData {
  issueTitle?: string;
  category?: 'ACADEMIC' | 'EXAM' | 'OTHER';
  requiredAttachments?: string[];
  issuelevel?: 'CAMPUS_LEVEL' | 'UNIVERSITY_LEVEL';
  isactive?: boolean;
  updatedat?: Date;
}

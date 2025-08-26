// Issue list interface for grievance types available to students
export interface IssueList {
  Id?: number;
  IssueCode: number;
  IssueTitle: string;
  Category: 'ACADEMIC' | 'EXAM' | 'OTHER';
  RequiredAttachments: string[];
  IssueLevel: 'CAMPUS_LEVEL' | 'UNIVERSITY_LEVEL';
  IsActive?: boolean;
  CreatedAt?: Date;
  UpdatedAt?: Date;
}

// Interface for creating new issue types
export interface CreateIssueListData {
  IssueCode: number;
  IssueTitle: string;
  Category: 'ACADEMIC' | 'EXAM' | 'OTHER';
  RequiredAttachments: string[];
  IssueLevel: 'CAMPUS_LEVEL' | 'UNIVERSITY_LEVEL';
}

// Interface for updating issue types
export interface UpdateIssueListData {
  IssueTitle?: string;
  Category?: 'ACADEMIC' | 'EXAM' | 'OTHER';
  RequiredAttachments?: string[];
  IssueLevel?: 'CAMPUS_LEVEL' | 'UNIVERSITY_LEVEL';
  IsActive?: boolean;
  UpdatedAt?: Date;
}

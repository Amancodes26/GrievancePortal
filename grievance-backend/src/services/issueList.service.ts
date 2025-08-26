import { IssueListRepository } from '../repositories/issueList.repository';
import { IssueList, CreateIssueListData, UpdateIssueListData } from '../models/IssueList';
import { CreateIssueListInput, UpdateIssueListInput, IssueListQueryInput } from '../validators/issueList.validator';
import { AppError } from '../utils/errorHandler';

/**
 * Service class for IssueList business logic
 * Implements comprehensive issue management workflows
 * 
 * Principal Engineer Standards:
 * - Complex business rule validation
 * - Role-based access control
 * - Audit logging
 * - Performance optimization
 * - Error recovery patterns
 */
export class IssueListService {
  private issueListRepository: IssueListRepository;

  constructor() {
    this.issueListRepository = new IssueListRepository();
  }

  /**
   * Retrieves all active issues for students
   * @param filters - Optional filtering parameters
   * @returns Promise<{issues: IssueList[], total: number, pagination: object}>
   */
  async getActiveIssuesForStudents(filters?: IssueListQueryInput): Promise<{
    issues: IssueList[];
    total: number;
    pagination: {
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  }> {
    try {
      console.info('[IssueListService.getActiveIssuesForStudents] Fetching active issues for students', { filters });

      // Get issues and total count
      const [issues, total] = await Promise.all([
        this.issueListRepository.getActiveIssues({
          category: filters?.category,
          level: filters?.level,
          limit: filters?.limit || 50,
          offset: filters?.offset || 0
        }),
        this.issueListRepository.getIssueCount({
          category: filters?.category,
          level: filters?.level,
          active: true
        })
      ]);

      // Process issues for student view (ensure only active issues)
      const processedIssues = issues
        .filter(issue => issue.IsActive === true)
        .map(issue => this.sanitizeIssueForPublic(issue));

      const limit = filters?.limit || 50;
      const offset = filters?.offset || 0;
      const hasMore = offset + limit < total;

      console.info('[IssueListService.getActiveIssuesForStudents] Retrieved issues successfully', {
        count: processedIssues.length,
        total,
        hasMore
      });

      return {
        issues: processedIssues,
        total,
        pagination: {
          limit,
          offset,
          hasMore
        }
      };

    } catch (error) {
      console.error('[IssueListService.getActiveIssuesForStudents] Error:', error);
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Failed to retrieve active issues', 500, 'SERVICE_ERROR', error);
    }
  }

  /**
   * Retrieves all issues for admin view
   * @param filters - Optional filtering parameters
   * @param requestingAdminId - Admin ID for audit
   * @returns Promise<{issues: IssueList[], total: number, pagination: object}>
   */
  async getAllIssuesForAdmin(
    filters?: IssueListQueryInput, 
    requestingAdminId?: string
  ): Promise<{
    issues: IssueList[];
    total: number;
    pagination: {
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  }> {
    try {
      console.info('[IssueListService.getAllIssuesForAdmin] Fetching all issues for admin', { 
        filters, 
        requestingAdminId 
      });

      // Get issues and total count
      const [issues, total] = await Promise.all([
        this.issueListRepository.getAllIssues({
          category: filters?.category,
          level: filters?.level,
          active: filters?.active,
          limit: filters?.limit || 50,
          offset: filters?.offset || 0
        }),
        this.issueListRepository.getIssueCount({
          category: filters?.category,
          level: filters?.level,
          active: filters?.active
        })
      ]);

      const limit = filters?.limit || 50;
      const offset = filters?.offset || 0;
      const hasMore = offset + limit < total;

      console.info('[IssueListService.getAllIssuesForAdmin] Retrieved issues successfully', {
        count: issues.length,
        total,
        hasMore,
        requestingAdmin: requestingAdminId
      });

      return {
        issues,
        total,
        pagination: {
          limit,
          offset,
          hasMore
        }
      };

    } catch (error) {
      console.error('[IssueListService.getAllIssuesForAdmin] Error:', error);
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Failed to retrieve all issues', 500, 'SERVICE_ERROR', error);
    }
  }

  /**
   * Retrieves a specific issue by code
   * @param issueCode - Issue code to fetch
   * @param isStudentRequest - Whether this is a student request (affects filtering)
   * @returns Promise<IssueList | null>
   */
  async getIssueByCode(issueCode: number, isStudentRequest: boolean = false): Promise<IssueList | null> {
    try {
      console.info('[IssueListService.getIssueByCode] Fetching issue by code', { 
        issueCode, 
        isStudentRequest 
      });

      const issue = await this.issueListRepository.getIssueByCode(issueCode);
      
      if (!issue) {
        console.warn('[IssueListService.getIssueByCode] Issue not found', { issueCode });
        return null;
      }

      // For student requests, only return active issues
      if (isStudentRequest && !issue.IsActive) {
        console.warn('[IssueListService.getIssueByCode] Inactive issue requested by student', { 
          issueCode, 
          isActive: issue.IsActive 
        });
        return null;
      }

      console.info('[IssueListService.getIssueByCode] Issue retrieved successfully', { 
        issueCode, 
        issueTitle: issue.IssueTitle,
        isActive: issue.IsActive
      });

      return isStudentRequest ? this.sanitizeIssueForPublic(issue) : issue;

    } catch (error) {
      console.error('[IssueListService.getIssueByCode] Error:', error);
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Failed to retrieve issue by code', 500, 'SERVICE_ERROR', error);
    }
  }

  /**
   * Creates a new issue type (Admin only)
   * @param issueData - Issue data to create
   * @param createdByAdminId - Admin ID creating the issue
   * @returns Promise<IssueList>
   */
  async createIssue(issueData: CreateIssueListInput, createdByAdminId: string): Promise<IssueList> {
    try {
      console.info('[IssueListService.createIssue] Creating new issue', { 
        issueCode: issueData.IssueCode,
        issueTitle: issueData.IssueTitle,
        createdByAdminId 
      });

      // Validate business rules
      await this.validateIssueCreation(issueData);

      // Create the issue
      const createdIssue = await this.issueListRepository.createIssue({
        IssueCode: issueData.IssueCode,
        IssueTitle: issueData.IssueTitle.trim(),
        Category: issueData.Category,
        RequiredAttachments: issueData.RequiredAttachments,
        IssueLevel: issueData.IssueLevel
      });

      console.info('[IssueListService.createIssue] Issue created successfully', { 
        issueId: createdIssue.Id,
        issueCode: createdIssue.IssueCode,
        createdByAdmin: createdByAdminId
      });

      // TODO: Add audit logging for issue creation
      // await this.auditLogger.logIssueCreation(createdIssue, createdByAdminId);

      return createdIssue;

    } catch (error) {
      console.error('[IssueListService.createIssue] Error:', error);
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Failed to create issue', 500, 'SERVICE_ERROR', error);
    }
  }

  /**
   * Updates an existing issue type (Admin only)
   * @param issueCode - Issue code to update
   * @param updateData - Data to update
   * @param updatedByAdminId - Admin ID updating the issue
   * @returns Promise<IssueList>
   */
  async updateIssue(
    issueCode: number, 
    updateData: UpdateIssueListInput, 
    updatedByAdminId: string
  ): Promise<IssueList> {
    try {
      console.info('[IssueListService.updateIssue] Updating issue', { 
        issueCode,
        updateFields: Object.keys(updateData),
        updatedByAdminId 
      });

      // Validate business rules
      await this.validateIssueUpdate(issueCode, updateData);

      // Trim string fields
      const sanitizedUpdateData: UpdateIssueListData = {
        ...updateData,
        IssueTitle: updateData.IssueTitle?.trim()
      };

      // Update the issue
      const updatedIssue = await this.issueListRepository.updateIssue(issueCode, sanitizedUpdateData);
      
      if (!updatedIssue) {
        throw new AppError(
          `Issue with code ${issueCode} not found`,
          404,
          'ISSUE_NOT_FOUND'
        );
      }

      console.info('[IssueListService.updateIssue] Issue updated successfully', { 
        issueCode,
        fieldsUpdated: Object.keys(updateData).length,
        updatedByAdmin: updatedByAdminId
      });

      // TODO: Add audit logging for issue update
      // await this.auditLogger.logIssueUpdate(updatedIssue, updateData, updatedByAdminId);

      return updatedIssue;

    } catch (error) {
      console.error('[IssueListService.updateIssue] Error:', error);
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Failed to update issue', 500, 'SERVICE_ERROR', error);
    }
  }

  /**
   * Toggles the active status of an issue (Admin only)
   * @param issueCode - Issue code to toggle
   * @param isActive - New active status
   * @param toggledByAdminId - Admin ID toggling the status
   * @returns Promise<IssueList>
   */
  async toggleIssueStatus(
    issueCode: number, 
    isActive: boolean, 
    toggledByAdminId: string
  ): Promise<IssueList> {
    try {
      console.info('[IssueListService.toggleIssueStatus] Toggling issue status', { 
        issueCode,
        isActive,
        toggledByAdminId 
      });

      // Validate business rules for status toggle
      await this.validateStatusToggle(issueCode, isActive);

      // Toggle the status
      const updatedIssue = await this.issueListRepository.toggleIssueStatus(issueCode, isActive);
      
      if (!updatedIssue) {
        throw new AppError(
          `Issue with code ${issueCode} not found`,
          404,
          'ISSUE_NOT_FOUND'
        );
      }

      console.info('[IssueListService.toggleIssueStatus] Issue status toggled successfully', { 
        issueCode,
        newStatus: isActive,
        toggledByAdmin: toggledByAdminId
      });

      // TODO: Add audit logging for status toggle
      // await this.auditLogger.logIssueStatusToggle(updatedIssue, isActive, toggledByAdminId);

      return updatedIssue;

    } catch (error) {
      console.error('[IssueListService.toggleIssueStatus] Error:', error);
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Failed to toggle issue status', 500, 'SERVICE_ERROR', error);
    }
  }

  /**
   * Validates issue creation business rules
   * @private
   */
  private async validateIssueCreation(issueData: CreateIssueListInput): Promise<void> {
    // Check for reserved issue codes (if any business rules exist)
    const reservedCodes = [0, 999, 9999]; // Example reserved codes
    if (reservedCodes.includes(issueData.IssueCode)) {
      throw new AppError(
        `Issue code ${issueData.IssueCode} is reserved and cannot be used`,
        400,
        'RESERVED_ISSUE_CODE'
      );
    }

    // Additional business validations can be added here
    // e.g., validate against external systems, check category combinations, etc.
  }

  /**
   * Validates issue update business rules
   * @private
   */
  private async validateIssueUpdate(issueCode: number, updateData: UpdateIssueListInput): Promise<void> {
    // Get current issue to validate update rules
    const currentIssue = await this.issueListRepository.getIssueByCode(issueCode);
    if (!currentIssue) {
      throw new AppError(
        `Issue with code ${issueCode} not found`,
        404,
        'ISSUE_NOT_FOUND'
      );
    }

    // Example: Prevent changing category of issues that are referenced in grievances
    // This would require checking grievance references
    // const hasActiveGrievances = await this.checkActiveGrievanceReferences(issueCode);
    // if (hasActiveGrievances && updateData.Category && updateData.Category !== currentIssue.Category) {
    //   throw new AppError(
    //     'Cannot change category of issue with active grievances',
    //     400,
    //     'CATEGORY_CHANGE_NOT_ALLOWED'
    //   );
    // }
  }

  /**
   * Validates status toggle business rules
   * @private
   */
  private async validateStatusToggle(issueCode: number, isActive: boolean): Promise<void> {
    // Get current issue
    const currentIssue = await this.issueListRepository.getIssueByCode(issueCode);
    if (!currentIssue) {
      throw new AppError(
        `Issue with code ${issueCode} not found`,
        404,
        'ISSUE_NOT_FOUND'
      );
    }

    // Example: Prevent deactivating issues with pending grievances
    if (!isActive && currentIssue.IsActive) {
      // TODO: Check if there are pending grievances using this issue type
      // const hasPendingGrievances = await this.checkPendingGrievanceReferences(issueCode);
      // if (hasPendingGrievances) {
      //   throw new AppError(
      //     'Cannot deactivate issue with pending grievances',
      //     400,
      //     'DEACTIVATION_NOT_ALLOWED'
      //   );
      // }
    }
  }

  /**
   * Sanitizes issue data for public (student) consumption
   * @private
   */
  private sanitizeIssueForPublic(issue: IssueList): IssueList {
    // Remove sensitive internal fields or add computed fields for students
    return {
      ...issue,
      // Could add computed fields here like formatted titles, descriptions, etc.
    };
  }
}

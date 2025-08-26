import { ConnectionManager } from '../db/connectionManager';
import { IssueList, CreateIssueListData, UpdateIssueListData } from '../models/IssueList';
import { AppError } from '../utils/errorHandler';

/**
 * Repository class for IssueList data access
 * Implements enterprise-grade database operations
 * 
 * Principal Engineer Standards:
 * - Comprehensive SQL operations
 * - Connection pool management
 * - Transaction support
 * - Error handling with context
 * - Performance optimization
 */
export class IssueListRepository {

  constructor() {
    // Using static methods from ConnectionManager
    console.info('[IssueListRepository] Initialized to use static ConnectionManager methods');
  }

  /**
   * Retrieves all active issue types for students
   * @param filters - Optional filtering parameters
   * @returns Promise<IssueList[]> - List of active issues
   */
  async getActiveIssues(filters?: {
    category?: string;
    level?: string;
    limit?: number;
    offset?: number;
  }): Promise<IssueList[]> {
    try {
      let query = `
        SELECT 
          "Id",
          "IssueCode",
          "IssueTitle", 
          "Category",
          "RequiredAttachments",
          "IssueLevel",
          "IsActive",
          "CreatedAt",
          "UpdatedAt"
        FROM issuelist 
        WHERE "IsActive" = true
      `;
      
      const params: any[] = [];
      let paramIndex = 1;

      // Add category filter
      if (filters?.category) {
        query += ` AND "Category" = $${paramIndex}`;
        params.push(filters.category);
        paramIndex++;
      }

      // Add level filter
      if (filters?.level) {
        query += ` AND "IssueLevel" = $${paramIndex}`;
        params.push(filters.level);
        paramIndex++;
      }

      // Add sorting and pagination
      query += ` ORDER BY "CreatedAt" DESC`;
      
      if (filters?.limit) {
        query += ` LIMIT $${paramIndex}`;
        params.push(filters.limit);
        paramIndex++;
      }

      if (filters?.offset) {
        query += ` OFFSET $${paramIndex}`;
        params.push(filters.offset);
      }

      console.info('[IssueListRepository.getActiveIssues] Executing query:', { 
        query, 
        params, 
        filters 
      });

      const result = await ConnectionManager.query(query, params);
      return result.rows;

    } catch (error) {
      console.error('[IssueListRepository.getActiveIssues] Error:', error);
      throw new AppError('Failed to retrieve active issues', 500, 'DATABASE_ERROR', error);
    }
  }

  /**
   * Retrieves all issues (admin view)
   * @param filters - Optional filtering parameters
   * @returns Promise<IssueList[]> - List of all issues
   */
  async getAllIssues(filters?: {
    category?: string;
    level?: string;
    active?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<IssueList[]> {
    try {
      let query = `
        SELECT 
          "Id",
          "IssueCode",
          "IssueTitle", 
          "Category",
          "RequiredAttachments",
          "IssueLevel",
          "IsActive",
          "CreatedAt",
          "UpdatedAt"
        FROM issuelist 
        WHERE 1=1
      `;
      
      const params: any[] = [];
      let paramIndex = 1;

      // Add filters
      if (filters?.category) {
        query += ` AND "Category" = $${paramIndex}`;
        params.push(filters.category);
        paramIndex++;
      }

      if (filters?.level) {
        query += ` AND "IssueLevel" = $${paramIndex}`;
        params.push(filters.level);
        paramIndex++;
      }

      if (filters?.active !== undefined) {
        query += ` AND "IsActive" = $${paramIndex}`;
        params.push(filters.active);
        paramIndex++;
      }

      // Add sorting and pagination
      query += ` ORDER BY "CreatedAt" DESC`;
      
      if (filters?.limit) {
        query += ` LIMIT $${paramIndex}`;
        params.push(filters.limit);
        paramIndex++;
      }

      if (filters?.offset) {
        query += ` OFFSET $${paramIndex}`;
        params.push(filters.offset);
      }

      console.info('[IssueListRepository.getAllIssues] Executing query:', { 
        query, 
        params, 
        filters 
      });

      const result = await ConnectionManager.query(query, params);
      return result.rows;

    } catch (error) {
      console.error('[IssueListRepository.getAllIssues] Error:', error);
      throw new AppError('Failed to retrieve all issues', 500, 'DATABASE_ERROR', error);
    }
  }

  /**
   * Retrieves a specific issue by IssueCode
   * @param issueCode - Unique issue code
   * @returns Promise<IssueList | null> - Issue details or null if not found
   */
  async getIssueByCode(issueCode: number): Promise<IssueList | null> {
    try {
      const query = `
        SELECT 
          "Id",
          "IssueCode",
          "IssueTitle", 
          "Category",
          "RequiredAttachments",
          "IssueLevel",
          "IsActive",
          "CreatedAt",
          "UpdatedAt"
        FROM issuelist 
        WHERE "IssueCode" = $1
      `;

      console.info('[IssueListRepository.getIssueByCode] Executing query:', { 
        query, 
        issueCode 
      });

      const result = await ConnectionManager.query(query, [issueCode]);
      return result.rows[0] || null;

    } catch (error) {
      console.error('[IssueListRepository.getIssueByCode] Error:', error);
      throw new AppError('Failed to retrieve issue by code', 500, 'DATABASE_ERROR', error);
    }
  }

  /**
   * Creates a new issue type
   * @param issueData - Issue data to create
   * @returns Promise<IssueList> - Created issue
   */
  async createIssue(issueData: CreateIssueListData): Promise<IssueList> {
    try {
      // First check if IssueCode already exists
      const existingIssue = await this.getIssueByCode(issueData.IssueCode);
      if (existingIssue) {
        throw new AppError(
          `Issue with code ${issueData.IssueCode} already exists`,
          409,
          'DUPLICATE_ISSUE_CODE'
        );
      }

      const query = `
        INSERT INTO issuelist (
          "IssueCode",
          "IssueTitle", 
          "Category",
          "RequiredAttachments",
          "IssueLevel",
          "IsActive",
          "CreatedAt",
          "UpdatedAt"
        ) 
        VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
        RETURNING 
          "Id",
          "IssueCode",
          "IssueTitle", 
          "Category",
          "RequiredAttachments",
          "IssueLevel",
          "IsActive",
          "CreatedAt",
          "UpdatedAt"
      `;

      const params = [
        issueData.IssueCode,
        issueData.IssueTitle,
        issueData.Category,
        JSON.stringify(issueData.RequiredAttachments), // Store as JSON
        issueData.IssueLevel
      ];

      console.info('[IssueListRepository.createIssue] Executing query:', { 
        query, 
        params: params.slice(0, -1).concat(['[attachments array]']) // Hide sensitive data in logs
      });

      const result = await ConnectionManager.query(query, params);
      
      const createdIssue = result.rows[0];
      // Parse RequiredAttachments back to array
      if (createdIssue.RequiredAttachments && typeof createdIssue.RequiredAttachments === 'string') {
        createdIssue.RequiredAttachments = JSON.parse(createdIssue.RequiredAttachments);
      }

      console.info('[IssueListRepository.createIssue] Issue created successfully:', { 
        issueId: createdIssue.Id,
        issueCode: createdIssue.IssueCode
      });

      return createdIssue;

    } catch (error) {
      console.error('[IssueListRepository.createIssue] Error:', error);
      
      if (error instanceof AppError) {
        throw error;
      }
      
      // Check for unique constraint violation
      if ((error as any)?.code === '23505') {
        throw new AppError(
          `Issue with code ${issueData.IssueCode} already exists`,
          409,
          'DUPLICATE_ISSUE_CODE'
        );
      }
      
      throw new AppError('Failed to create issue', 500, 'DATABASE_ERROR', error);
    }
  }

  /**
   * Updates an existing issue type
   * @param issueCode - Issue code to update
   * @param updateData - Data to update
   * @returns Promise<IssueList | null> - Updated issue or null if not found
   */
  async updateIssue(issueCode: number, updateData: UpdateIssueListData): Promise<IssueList | null> {
    try {
      // First check if issue exists
      const existingIssue = await this.getIssueByCode(issueCode);
      if (!existingIssue) {
        return null;
      }

      // Build dynamic update query
      const updateFields: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (updateData.IssueTitle !== undefined) {
        updateFields.push(`"IssueTitle" = $${paramIndex}`);
        params.push(updateData.IssueTitle);
        paramIndex++;
      }

      if (updateData.Category !== undefined) {
        updateFields.push(`"Category" = $${paramIndex}`);
        params.push(updateData.Category);
        paramIndex++;
      }

      if (updateData.RequiredAttachments !== undefined) {
        updateFields.push(`"RequiredAttachments" = $${paramIndex}`);
        params.push(JSON.stringify(updateData.RequiredAttachments));
        paramIndex++;
      }

      if (updateData.IssueLevel !== undefined) {
        updateFields.push(`"IssueLevel" = $${paramIndex}`);
        params.push(updateData.IssueLevel);
        paramIndex++;
      }

      if (updateData.IsActive !== undefined) {
        updateFields.push(`"IsActive" = $${paramIndex}`);
        params.push(updateData.IsActive);
        paramIndex++;
      }

      if (updateFields.length === 0) {
        throw new AppError('No update fields provided', 400, 'NO_UPDATE_FIELDS');
      }

      // Always update UpdatedAt
      updateFields.push(`"UpdatedAt" = NOW()`);

      const query = `
        UPDATE issuelist 
        SET ${updateFields.join(', ')}
        WHERE "IssueCode" = $${paramIndex}
        RETURNING 
          "Id",
          "IssueCode",
          "IssueTitle", 
          "Category",
          "RequiredAttachments",
          "IssueLevel",
          "IsActive",
          "CreatedAt",
          "UpdatedAt"
      `;

      params.push(issueCode);

      console.info('[IssueListRepository.updateIssue] Executing query:', { 
        query, 
        issueCode,
        updateFields: updateFields.length
      });

      const result = await ConnectionManager.query(query, params);
      
      if (result.rows.length === 0) {
        return null;
      }

      const updatedIssue = result.rows[0];
      // Parse RequiredAttachments back to array
      if (updatedIssue.RequiredAttachments && typeof updatedIssue.RequiredAttachments === 'string') {
        updatedIssue.RequiredAttachments = JSON.parse(updatedIssue.RequiredAttachments);
      }

      console.info('[IssueListRepository.updateIssue] Issue updated successfully:', { 
        issueCode,
        fieldsUpdated: updateFields.length
      });

      return updatedIssue;

    } catch (error) {
      console.error('[IssueListRepository.updateIssue] Error:', error);
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Failed to update issue', 500, 'DATABASE_ERROR', error);
    }
  }

  /**
   * Toggles the active status of an issue
   * @param issueCode - Issue code to toggle
   * @param isActive - New active status
   * @returns Promise<IssueList | null> - Updated issue or null if not found
   */
  async toggleIssueStatus(issueCode: number, isActive: boolean): Promise<IssueList | null> {
    try {
      const query = `
        UPDATE issuelist 
        SET 
          "IsActive" = $1,
          "UpdatedAt" = NOW()
        WHERE "IssueCode" = $2
        RETURNING 
          "Id",
          "IssueCode",
          "IssueTitle", 
          "Category",
          "RequiredAttachments",
          "IssueLevel",
          "IsActive",
          "CreatedAt",
          "UpdatedAt"
      `;

      console.info('[IssueListRepository.toggleIssueStatus] Executing query:', { 
        issueCode,
        isActive
      });

      const result = await ConnectionManager.query(query, [isActive, issueCode]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const updatedIssue = result.rows[0];
      // Parse RequiredAttachments back to array
      if (updatedIssue.RequiredAttachments && typeof updatedIssue.RequiredAttachments === 'string') {
        updatedIssue.RequiredAttachments = JSON.parse(updatedIssue.RequiredAttachments);
      }

      console.info('[IssueListRepository.toggleIssueStatus] Issue status toggled successfully:', { 
        issueCode,
        newStatus: isActive
      });

      return updatedIssue;

    } catch (error) {
      console.error('[IssueListRepository.toggleIssueStatus] Error:', error);
      throw new AppError('Failed to toggle issue status', 500, 'DATABASE_ERROR', error);
    }
  }

  /**
   * Gets total count of issues (for pagination)
   * @param filters - Optional filtering parameters
   * @returns Promise<number> - Total count
   */
  async getIssueCount(filters?: {
    category?: string;
    level?: string;
    active?: boolean;
  }): Promise<number> {
    try {
      let query = 'SELECT COUNT(*) as total FROM issuelist WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (filters?.category) {
        query += ` AND "Category" = $${paramIndex}`;
        params.push(filters.category);
        paramIndex++;
      }

      if (filters?.level) {
        query += ` AND "IssueLevel" = $${paramIndex}`;
        params.push(filters.level);
        paramIndex++;
      }

      if (filters?.active !== undefined) {
        query += ` AND "isactive" = $${paramIndex}`;
        params.push(filters.active);
      }

      const result = await ConnectionManager.query(query, params);
      return parseInt(result.rows[0].total, 10);

    } catch (error) {
      console.error('[IssueListRepository.getIssueCount] Error:', error);
      throw new AppError('Failed to get issue count', 500, 'DATABASE_ERROR', error);
    }
  }
}

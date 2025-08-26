import { Pool, PoolClient } from 'pg';
import { GrievanceQueries, TrackingQueries } from '../db/queries';
import ConnectionManager from '../db/connectionManager';
import { Grievance, CreateGrievanceData, UpdateGrievanceData } from '../models/Grievance';
import { AppError } from '../utils/errorHandler';

/**
 * Repository class for Grievance data access operations
 * Follows Repository pattern to abstract database operations
 */
export class GrievanceRepository {
  
  /**
   * Creates a new grievance record with initial tracking
   * Uses database transaction to ensure data consistency
   */
  async create(data: CreateGrievanceData & { grievanceId: string; campusId: number }): Promise<Grievance> {
    const client = await ConnectionManager.getClient();
    
    try {
      await client.query('BEGIN');

      // Insert grievance record
      const grievanceValues = [
        data.grievanceId,
        data.rollno,
        data.campusId,
        data.issueCode,
        data.subject,
        data.description,
        data.hasAttachments || false
      ];

      const grievanceResult = await client.query(GrievanceQueries.CREATE, grievanceValues);
      
      if (!grievanceResult.rows[0]) {
        throw new AppError('Failed to create grievance record', 500, 'CREATION_FAILED');
      }

      // Create initial tracking entry
      const trackingValues = [
        data.grievanceId,
        'Grievance submitted successfully. Under review by admin.',
        'NEW',
        'SUBMITTED',
        'SYSTEM',
        null,
        null,
        false,
        data.hasAttachments || false
      ];

      await client.query(TrackingQueries.CREATE, trackingValues);
      await client.query('COMMIT');

      return this.mapDatabaseRowToGrievance(grievanceResult.rows[0]);

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[GrievanceRepository.create] Error:', error);
      
      if (error instanceof AppError) {
        throw error;
      }
      
      // Handle unique constraint violations
      if ((error as any).code === '23505') {
        throw new AppError('Grievance ID already exists', 409, 'DUPLICATE_GRIEVANCE_ID');
      }
      
      throw new AppError('Failed to create grievance', 500, 'DATABASE_ERROR', error);
    } finally {
      client.release();
    }
  }

  /**
   * Retrieves a grievance by its unique ID
   */
  async findById(id: string): Promise<Grievance | null> {
    try {
      const result = await ConnectionManager.query(GrievanceQueries.GET_BY_GRIEVANCE_ID, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapDatabaseRowToGrievance(result.rows[0]);
    } catch (error) {
      console.error('[GrievanceRepository.findById] Error:', error);
      throw new AppError('Failed to retrieve grievance', 500, 'DATABASE_ERROR', error);
    }
  }

  /**
   * Retrieves grievances with optional filtering and pagination
   */
  async findMany(filters: {
    rollno?: string;
    issueCode?: number;
    campusId?: number;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<{ grievances: Grievance[]; total: number }> {
    try {
      let baseQuery = `
        SELECT g.*, s.Name as StudentName, c.CampusName, i.IssueTitle 
        FROM Grievance g
        LEFT JOIN PersonalInfo s ON g.RollNo = s.RollNo
        LEFT JOIN CampusInfo c ON g.CampusId = c.CampusId
        LEFT JOIN IssueList i ON g.IssueCode = i.IssueCode
      `;
      
      const conditions: string[] = [];
      const values: any[] = [];
      let paramCount = 0;

      // Add WHERE conditions based on filters
      if (filters.rollno) {
        conditions.push(`g.RollNo = $${++paramCount}`);
        values.push(filters.rollno);
      }

      if (filters.issueCode) {
        conditions.push(`g.IssueCode = $${++paramCount}`);
        values.push(filters.issueCode);
      }

      if (filters.campusId) {
        conditions.push(`g.CampusId = $${++paramCount}`);
        values.push(filters.campusId);
      }

      if (conditions.length > 0) {
        baseQuery += ` WHERE ${conditions.join(' AND ')}`;
      }

      // Get total count for pagination
      const countQuery = `SELECT COUNT(*) as total FROM (${baseQuery}) as counted`;
      const countResult = await ConnectionManager.query(countQuery, values);
      const total = parseInt(countResult.rows[0].total);

      // Add sorting and pagination
      const sortBy = filters.sortBy === 'subject' ? 'g.Subject' : 
                    filters.sortBy === 'updatedAt' ? 'g.UpdatedAt' : 'g.CreatedAt';
      const sortOrder = filters.sortOrder === 'ASC' ? 'ASC' : 'DESC';
      
      baseQuery += ` ORDER BY ${sortBy} ${sortOrder}`;

      if (filters.limit) {
        baseQuery += ` LIMIT $${++paramCount}`;
        values.push(filters.limit);
      }

      if (filters.offset) {
        baseQuery += ` OFFSET $${++paramCount}`;
        values.push(filters.offset);
      }

      const result = await ConnectionManager.query(baseQuery, values);
      const grievances = result.rows.map(row => this.mapDatabaseRowToGrievance(row));

      return { grievances, total };
    } catch (error) {
      console.error('[GrievanceRepository.findMany] Error:', error);
      throw new AppError('Failed to retrieve grievances', 500, 'DATABASE_ERROR', error);
    }
  }

  /**
   * Updates a grievance record
   * Note: This should be used carefully as it modifies core grievance data
   */
  async update(id: string, data: UpdateGrievanceData): Promise<Grievance | null> {
    try {
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramCount = 0;

      // Build dynamic update query based on provided fields
      if (data.subject) {
        updateFields.push(`Subject = $${++paramCount}`);
        values.push(data.subject);
      }

      if (data.description) {
        updateFields.push(`Description = $${++paramCount}`);
        values.push(data.description);
      }

      if (data.hasAttachments !== undefined) {
        updateFields.push(`HasAttachments = $${++paramCount}`);
        values.push(data.hasAttachments);
      }

      if (updateFields.length === 0) {
        throw new AppError('No fields to update', 400, 'NO_UPDATE_FIELDS');
      }

      // Always update the timestamp
      updateFields.push(`UpdatedAt = (NOW() AT TIME ZONE 'Asia/Kolkata')`);
      
      // Add the ID parameter for WHERE clause
      values.push(id);
      const whereParam = ++paramCount;

      const updateQuery = `
        UPDATE Grievance 
        SET ${updateFields.join(', ')}
        WHERE GrievanceId = $${whereParam}
        RETURNING *
      `;

      const result = await ConnectionManager.query(updateQuery, values);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapDatabaseRowToGrievance(result.rows[0]);
    } catch (error) {
      console.error('[GrievanceRepository.update] Error:', error);
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Failed to update grievance', 500, 'DATABASE_ERROR', error);
    }
  }

  /**
   * Soft delete a grievance by marking it as resolved/closed
   * Actual deletion is not performed to maintain audit trail
   */
  async softDelete(id: string): Promise<boolean> {
    const client = await ConnectionManager.getClient();
    
    try {
      await client.query('BEGIN');

      // Check if grievance exists
      const grievanceCheck = await client.query(GrievanceQueries.GET_BY_GRIEVANCE_ID, [id]);
      
      if (grievanceCheck.rows.length === 0) {
        return false;
      }

      // Add tracking entry for soft deletion
      const trackingValues = [
        id,
        'Grievance has been closed/archived by system.',
        'RESOLVED',
        'RESOLVED',
        'SYSTEM',
        null,
        null,
        false,
        false
      ];

      await client.query(TrackingQueries.CREATE, trackingValues);
      await client.query('COMMIT');

      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[GrievanceRepository.softDelete] Error:', error);
      throw new AppError('Failed to delete grievance', 500, 'DATABASE_ERROR', error);
    } finally {
      client.release();
    }
  }

  /**
   * Generates a unique grievance ID in the format GRV-YYYY-NNNNNN
   */
  generateGrievanceId(): string {
    const year = new Date().getFullYear();
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const sequence = timestamp.toString().slice(-3) + randomSuffix;
    
    return `GRV-${year}-${sequence}`;
  }

  /**
   * Maps database row to Grievance model
   * Handles field name differences between database and TypeScript interfaces
   */
  private mapDatabaseRowToGrievance(row: any): Grievance {
    return {
      id: row.id,
      grievanceId: row.grievanceid,
      rollno: row.rollno,
      campusId: row.campusid,
      issueCode: row.issuecode,
      subject: row.subject,
      description: row.description,
      hasAttachments: row.hasattachments || false,
      createdAt: row.createdat,
      updatedAt: row.updatedat,
      // Additional fields from joins
      studentName: row.studentname,
      campusName: row.campusname,
      issueTitle: row.issuetitle
    };
  }
}

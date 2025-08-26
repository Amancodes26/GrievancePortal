import { Pool, PoolClient } from 'pg';
import ConnectionManager from '../db/connectionManager';
import { TrackingQueries } from '../db/queries';
import { CreateTrackingInput, TrackingEntry, TrackingHistoryResponse } from '../validators/tracking.validator';
import { AppError } from '../utils/errorHandler';

/**
 * Repository class for Tracking data access operations
 * Implements Repository pattern with comprehensive error handling and logging
 * 
 * Principal Engineer Standards:
 * - Database transaction management
 * - Connection pool optimization
 * - Comprehensive error handling
 * - Audit logging
 * - Performance monitoring
 */
export class TrackingRepository {

  /**
   * Creates a new tracking entry with full validation
   * Uses database transaction for consistency
   * 
   * @param data - Validated tracking entry data
   * @returns Promise<TrackingEntry> - Created tracking entry
   */
  async createTrackingEntry(data: CreateTrackingInput): Promise<TrackingEntry> {
    const client = await ConnectionManager.getClient();
    
    try {
      await client.query('BEGIN');

      // Verify grievance exists before creating tracking entry
      const grievanceCheck = await client.query(
        'SELECT GrievanceId FROM Grievance WHERE GrievanceId = $1',
        [data.grievanceId]
      );

      if (grievanceCheck.rows.length === 0) {
        throw new AppError(
          `Grievance with ID ${data.grievanceId} not found`,
          404,
          'GRIEVANCE_NOT_FOUND'
        );
      }

      // Verify admin exists
      const adminCheck = await client.query(
        'SELECT AdminId, Name, Role FROM Admin WHERE AdminId = $1 AND IsActive = true',
        [data.responseBy]
      );

      if (adminCheck.rows.length === 0) {
        throw new AppError(
          `Active admin with ID ${data.responseBy} not found`,
          404,
          'ADMIN_NOT_FOUND'
        );
      }

      // If redirecting, verify target admin exists
      if (data.isRedirect && data.redirectTo) {
        const targetAdminCheck = await client.query(
          'SELECT AdminId FROM Admin WHERE AdminId = $1 AND IsActive = true',
          [data.redirectTo]
        );

        if (targetAdminCheck.rows.length === 0) {
          throw new AppError(
            `Target admin for redirection ${data.redirectTo} not found`,
            404,
            'REDIRECT_TARGET_NOT_FOUND'
          );
        }
      }

      // Insert tracking entry
      const trackingValues = [
        data.grievanceId,
        data.responseText,
        data.adminStatus,
        data.studentStatus,
        data.responseBy,
        data.redirectTo || null,
        data.redirectFrom || null,
        data.isRedirect,
        data.hasAttachments
      ];

      console.info(`[TrackingRepository] Creating tracking entry for grievance: ${data.grievanceId} by admin: ${data.responseBy}`);
      
      const result = await client.query(TrackingQueries.CREATE, trackingValues);
      
      if (!result.rows[0]) {
        throw new AppError('Failed to create tracking entry', 500, 'TRACKING_CREATION_FAILED');
      }

      await client.query('COMMIT');

      const createdEntry = result.rows[0];
      const adminData = adminCheck.rows[0];

      console.info(`[TrackingRepository] Tracking entry created successfully: ID ${createdEntry.id}`);

      return this.mapDatabaseRowToTrackingEntry(createdEntry, adminData);

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[TrackingRepository.createTrackingEntry] Error:', error);
      
      if (error instanceof AppError) {
        throw error;
      }
      
      // Handle database constraint violations
      if ((error as any).code === '23505') {
        throw new AppError('Duplicate tracking entry detected', 409, 'DUPLICATE_TRACKING_ENTRY');
      }
      
      if ((error as any).code === '23503') {
        throw new AppError('Referenced record not found (foreign key violation)', 400, 'FOREIGN_KEY_VIOLATION');
      }
      
      throw new AppError('Failed to create tracking entry', 500, 'DATABASE_ERROR', error);
    } finally {
      client.release();
    }
  }

  /**
   * Retrieves complete tracking history for a grievance
   * Returns entries sorted by ResponseAt ASC (chronological order)
   * 
   * @param grievanceId - Unique grievance identifier
   * @returns Promise<TrackingHistoryResponse> - Complete tracking history
   */
  async getTrackingHistory(grievanceId: string): Promise<TrackingHistoryResponse> {
    try {
      console.info(`[TrackingRepository] Fetching tracking history for grievance: ${grievanceId}`);

      // First verify grievance exists
      const grievanceCheck = await ConnectionManager.query(
        'SELECT GrievanceId, CreatedAt FROM Grievance WHERE GrievanceId = $1',
        [grievanceId]
      );

      if (grievanceCheck.rows.length === 0) {
        throw new AppError(
          `Grievance with ID ${grievanceId} not found`,
          404,
          'GRIEVANCE_NOT_FOUND'
        );
      }

      // Get tracking history with admin details
      const historyQuery = `
        SELECT 
          t.Id,
          t.GrievanceId,
          t.ResponseText,
          t.AdminStatus,
          t.StudentStatus,
          t.ResponseBy,
          t.ResponseAt,
          t.RedirectTo,
          t.RedirectFrom,
          t.IsRedirect,
          t.HasAttachments,
          a.Name as AdminName,
          a.Role as AdminRole
        FROM Tracking t
        LEFT JOIN Admin a ON t.ResponseBy = a.AdminId
        WHERE t.GrievanceId = $1
        ORDER BY t.ResponseAt ASC
      `;

      const historyResult = await ConnectionManager.query(historyQuery, [grievanceId]);
      
      const entries: TrackingEntry[] = historyResult.rows.map(row => 
        this.mapDatabaseRowToTrackingEntry(row, row)
      );

      // Build summary information
      const latestEntry = entries[entries.length - 1];
      const firstEntry = entries[0];

      const summary = {
        totalEntries: entries.length,
        currentStatus: {
          admin: latestEntry?.adminStatus || 'NEW',
          student: latestEntry?.studentStatus || 'SUBMITTED'
        },
        lastUpdated: latestEntry?.responseAt || grievanceCheck.rows[0].createdat,
        createdAt: firstEntry?.responseAt || grievanceCheck.rows[0].createdat
      };

      console.info(`[TrackingRepository] Retrieved ${entries.length} tracking entries for grievance: ${grievanceId}`);

      return {
        grievanceId,
        entries,
        summary
      };

    } catch (error) {
      console.error('[TrackingRepository.getTrackingHistory] Error:', error);
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Failed to retrieve tracking history', 500, 'DATABASE_ERROR', error);
    }
  }

  /**
   * Maps database row to TrackingEntry object
   * Handles column name variations and data transformations
   * 
   * @private
   */
  private mapDatabaseRowToTrackingEntry(trackingRow: any, adminRow?: any): TrackingEntry {
    return {
      id: trackingRow.id,
      grievanceId: trackingRow.grievanceid || trackingRow.GrievanceId,
      responseText: trackingRow.responsetext || trackingRow.ResponseText,
      adminStatus: trackingRow.adminstatus || trackingRow.AdminStatus,
      studentStatus: trackingRow.studentstatus || trackingRow.StudentStatus,
      responseBy: trackingRow.responseby || trackingRow.ResponseBy,
      responseAt: (trackingRow.responseat || trackingRow.ResponseAt)?.toISOString(),
      redirectTo: trackingRow.redirectto || trackingRow.RedirectTo || null,
      redirectFrom: trackingRow.redirectfrom || trackingRow.RedirectFrom || null,
      isRedirect: trackingRow.isredirect ?? trackingRow.IsRedirect ?? false,
      hasAttachments: trackingRow.hasattachments ?? trackingRow.HasAttachments ?? false,
      // Admin context (optional)
      ...(adminRow && {
        adminName: adminRow.adminname || adminRow.AdminName || adminRow.Name,
        adminRole: adminRow.adminrole || adminRow.AdminRole || adminRow.Role
      })
    };
  }

  /**
   * Gets the latest tracking status for a grievance
   * Used for quick status checks without full history
   * 
   * @param grievanceId - Unique grievance identifier
   * @returns Promise<TrackingEntry | null> - Latest tracking entry or null
   */
  async getLatestTrackingStatus(grievanceId: string): Promise<TrackingEntry | null> {
    try {
      const query = `
        SELECT 
          t.Id,
          t.GrievanceId,
          t.ResponseText,
          t.AdminStatus,
          t.StudentStatus,
          t.ResponseBy,
          t.ResponseAt,
          t.RedirectTo,
          t.RedirectFrom,
          t.IsRedirect,
          t.HasAttachments,
          a.Name as AdminName,
          a.Role as AdminRole
        FROM Tracking t
        LEFT JOIN Admin a ON t.ResponseBy = a.AdminId
        WHERE t.GrievanceId = $1
        ORDER BY t.ResponseAt DESC
        LIMIT 1
      `;

      const result = await ConnectionManager.query(query, [grievanceId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapDatabaseRowToTrackingEntry(result.rows[0], result.rows[0]);

    } catch (error) {
      console.error('[TrackingRepository.getLatestTrackingStatus] Error:', error);
      throw new AppError('Failed to retrieve latest tracking status', 500, 'DATABASE_ERROR', error);
    }
  }

  /**
   * Validates if a grievance exists in the database
   * 
   * @param grievanceId - Target grievance ID
   * @returns Promise<boolean> - True if grievance exists
   */
  async validateGrievanceExists(grievanceId: string): Promise<boolean> {
    try {
      const query = 'SELECT 1 FROM Grievance WHERE GrievanceId = $1 LIMIT 1';
      const result = await ConnectionManager.query(query, [grievanceId]);
      return result.rows.length > 0;
    } catch (error) {
      console.error('[TrackingRepository.validateGrievanceExists] Error:', error);
      throw new AppError('Failed to validate grievance existence', 500, 'DATABASE_ERROR', error);
    }
  }

  /**
   * Validates if an admin has authorization for a specific grievance
   * Currently allows any active admin to redirect any grievance
   * TODO: Implement role-based and department-based authorization
   * 
   * @param grievanceId - Target grievance ID
   * @param adminId - Admin ID to validate
   * @returns Promise<boolean> - True if admin is authorized
   */
  async validateAdminAuthorization(grievanceId: string, adminId: string): Promise<boolean> {
    try {
      // Check if admin is active
      const adminQuery = 'SELECT 1 FROM Admin WHERE AdminId = $1 AND IsActive = true LIMIT 1';
      const adminResult = await ConnectionManager.query(adminQuery, [adminId]);
      
      if (adminResult.rows.length === 0) {
        return false;
      }

      // TODO: Add role-based authorization logic
      // For now, any active admin can redirect any grievance
      
      // Check if grievance exists
      return await this.validateGrievanceExists(grievanceId);
      
    } catch (error) {
      console.error('[TrackingRepository.validateAdminAuthorization] Error:', error);
      throw new AppError('Failed to validate admin authorization', 500, 'DATABASE_ERROR', error);
    }
  }

  /**
   * Validates if an admin exists and is active
   * 
   * @param adminId - Target admin ID
   * @returns Promise<boolean> - True if admin exists and is active
   */
  async validateAdminExists(adminId: string): Promise<boolean> {
    try {
      const query = 'SELECT 1 FROM Admin WHERE AdminId = $1 AND IsActive = true LIMIT 1';
      const result = await ConnectionManager.query(query, [adminId]);
      return result.rows.length > 0;
    } catch (error) {
      console.error('[TrackingRepository.validateAdminExists] Error:', error);
      throw new AppError('Failed to validate admin existence', 500, 'DATABASE_ERROR', error);
    }
  }
}

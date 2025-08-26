import { TrackingRepository } from '../repositories/tracking.repository';
import { CreateTrackingInput, TrackingEntry, TrackingHistoryResponse, AdminStatus, StudentStatus } from '../validators/tracking.validator';
import { AppError } from '../utils/errorHandler';

/**
 * Service class for Tracking business logic
 * Implements comprehensive tracking workflows and business rules
 * 
 * Principal Engineer Standards:
 * - Complex business rule validation
 * - Status transition logic
 * - Audit logging
 * - Performance optimization
 * - Error recovery patterns
 */
export class TrackingService {
  private trackingRepository: TrackingRepository;

  constructor() {
    this.trackingRepository = new TrackingRepository();
  }

  /**
   * Creates a new tracking entry with full business logic validation
   * Enforces status transition rules and business constraints
   * 
   * @param data - Validated tracking input data
   * @param adminId - Admin creating the tracking entry (for audit)
   * @returns Promise<TrackingEntry> - Created tracking entry
   */
  async createTrackingEntry(data: CreateTrackingInput, adminId: string): Promise<TrackingEntry> {
    try {
      console.info(`[TrackingService] Creating tracking entry for grievance: ${data.grievanceId} by admin: ${adminId}`);

      // Validate admin authorization
      if (data.responseBy !== adminId) {
        throw new AppError(
          'Admin can only create tracking entries on their own behalf',
          403,
          'UNAUTHORIZED_TRACKING_CREATION'
        );
      }

      // Get current tracking status to validate transitions
      const currentStatus = await this.trackingRepository.getLatestTrackingStatus(data.grievanceId);
      
      // Validate status transitions
      this.validateStatusTransition(currentStatus, data.adminStatus, data.studentStatus);

      // Validate redirection logic
      this.validateRedirectionRules(data, currentStatus);

      // Create the tracking entry
      const trackingEntry = await this.trackingRepository.createTrackingEntry(data);

      console.info(`[TrackingService] Tracking entry created successfully: ${trackingEntry.id}`);

      return trackingEntry;

    } catch (error) {
      console.error('[TrackingService.createTrackingEntry] Error:', error);
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Failed to create tracking entry', 500, 'TRACKING_SERVICE_ERROR', error);
    }
  }

  /**
   * Retrieves complete tracking history for a grievance
   * Includes status summaries and transition analysis
   * 
   * @param grievanceId - Unique grievance identifier
   * @param requestingAdminId - Admin requesting the history (for authorization)
   * @returns Promise<TrackingHistoryResponse> - Complete tracking history
   */
  async getTrackingHistory(grievanceId: string, requestingAdminId: string): Promise<TrackingHistoryResponse> {
    try {
      console.info(`[TrackingService] Fetching tracking history for grievance: ${grievanceId} by admin: ${requestingAdminId}`);

      // TODO: Add admin authorization logic based on role/department
      // For now, all active admins can view any tracking history

      const trackingHistory = await this.trackingRepository.getTrackingHistory(grievanceId);

      // Add business intelligence data
      this.enrichTrackingHistory(trackingHistory);

      console.info(`[TrackingService] Retrieved tracking history with ${trackingHistory.entries.length} entries for grievance: ${grievanceId}`);

      return trackingHistory;

    } catch (error) {
      console.error('[TrackingService.getTrackingHistory] Error:', error);
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Failed to retrieve tracking history', 500, 'TRACKING_SERVICE_ERROR', error);
    }
  }

  /**
   * Gets current tracking status for a grievance
   * Optimized for dashboard and quick status checks
   * 
   * @param grievanceId - Unique grievance identifier
   * @returns Promise<TrackingEntry | null> - Latest tracking status
   */
  async getCurrentTrackingStatus(grievanceId: string): Promise<TrackingEntry | null> {
    try {
      console.info(`[TrackingService] Fetching current status for grievance: ${grievanceId}`);

      const currentStatus = await this.trackingRepository.getLatestTrackingStatus(grievanceId);

      if (!currentStatus) {
        console.warn(`[TrackingService] No tracking history found for grievance: ${grievanceId}`);
        return null;
      }

      return currentStatus;

    } catch (error) {
      console.error('[TrackingService.getCurrentTrackingStatus] Error:', error);
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Failed to get current tracking status', 500, 'TRACKING_SERVICE_ERROR', error);
    }
  }

  /**
   * Redirects a grievance to another admin
   * Creates a tracking entry with redirect-specific business logic
   * 
   * @param grievanceId - Target grievance ID
   * @param redirectFrom - Admin ID who is redirecting (authenticated admin)
   * @param redirectTo - Target admin ID to redirect to
   * @param comment - Redirect reason/comment
   * @returns Promise<TrackingEntry> - Created redirect tracking entry
   */
  async redirectGrievance(
    grievanceId: string, 
    redirectFrom: string, 
    redirectTo: string, 
    comment: string
  ): Promise<TrackingEntry> {
    try {
      console.info(`[TrackingService] Processing grievance redirect from ${redirectFrom} to ${redirectTo} for grievance: ${grievanceId}`);

      // Validate grievance exists
      const grievanceExists = await this.trackingRepository.validateGrievanceExists(grievanceId);
      if (!grievanceExists) {
        throw new AppError(
          `Grievance with ID ${grievanceId} not found`,
          404,
          'GRIEVANCE_NOT_FOUND'
        );
      }

      // Validate redirectFrom admin has authorization for this grievance
      const isAuthorized = await this.trackingRepository.validateAdminAuthorization(grievanceId, redirectFrom);
      if (!isAuthorized) {
        throw new AppError(
          `Admin ${redirectFrom} is not authorized to redirect grievance ${grievanceId}`,
          403,
          'UNAUTHORIZED_REDIRECT'
        );
      }

      // Validate redirectTo admin exists
      const targetAdminExists = await this.trackingRepository.validateAdminExists(redirectTo);
      if (!targetAdminExists) {
        throw new AppError(
          `Target admin ${redirectTo} not found`,
          404,
          'TARGET_ADMIN_NOT_FOUND'
        );
      }

      // Prevent self-redirect
      if (redirectFrom === redirectTo) {
        throw new AppError(
          'Cannot redirect grievance to yourself',
          400,
          'INVALID_SELF_REDIRECT'
        );
      }

      // Create redirect tracking entry
      const redirectData: CreateTrackingInput = {
        grievanceId,
        responseText: comment,
        adminStatus: 'REDIRECTED',
        studentStatus: 'UNDER_REVIEW', 
        responseBy: redirectFrom,
        redirectFrom,
        redirectTo,
        isRedirect: true,
        hasAttachments: false
      };

      const trackingEntry = await this.trackingRepository.createTrackingEntry(redirectData);

      console.info(`[TrackingService] Grievance redirect completed successfully: ${trackingEntry.id}`);

      return trackingEntry;

    } catch (error) {
      console.error('[TrackingService.redirectGrievance] Error:', error);
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Failed to redirect grievance', 500, 'REDIRECT_SERVICE_ERROR', error);
    }
  }

  /**
   * Validates status transitions based on business rules
   * @private
   */
  private validateStatusTransition(
    currentStatus: TrackingEntry | null, 
    newAdminStatus: string, 
    newStudentStatus: string
  ): void {
    // Business rule validation logic
    if (currentStatus?.adminStatus === 'RESOLVED' && newAdminStatus !== 'RESOLVED') {
      throw new AppError(
        'Cannot change status of a resolved grievance',
        400,
        'INVALID_STATUS_TRANSITION'
      );
    }

    if (currentStatus?.adminStatus === 'REJECTED' && newAdminStatus !== 'REJECTED') {
      throw new AppError(
        'Cannot change status of a rejected grievance',
        400,
        'INVALID_STATUS_TRANSITION'
      );
    }
  }

  /**
   * Validates redirection business rules
   * @private
   */
  private validateRedirectionRules(data: CreateTrackingInput, currentStatus: TrackingEntry | null): void {
    if (data.isRedirect) {
      if (!data.redirectTo) {
        throw new AppError(
          'RedirectTo must be specified for redirect actions',
          400,
          'MISSING_REDIRECT_TARGET'
        );
      }

      if (data.adminStatus !== 'REDIRECTED') {
        throw new AppError(
          'AdminStatus must be REDIRECTED for redirect actions',
          400,
          'INVALID_REDIRECT_STATUS'
        );
      }
    }
  }

  /**
   * Enriches tracking history with business intelligence data
   * @private
   */
  private enrichTrackingHistory(history: TrackingHistoryResponse): void {
    if (history.entries.length === 0) return;

    // Calculate resolution time if resolved
    const latestEntry = history.entries[history.entries.length - 1];
    const firstEntry = history.entries[0];

    if (latestEntry.studentStatus === StudentStatus.RESOLVED || 
        latestEntry.studentStatus === StudentStatus.REJECTED) {
      
      const createdTime = new Date(firstEntry.responseAt).getTime();
      const resolvedTime = new Date(latestEntry.responseAt).getTime();
      const resolutionTimeMs = resolvedTime - createdTime;
      
      // Add resolution metrics to summary
      (history.summary as any).resolutionTime = {
        totalMs: resolutionTimeMs,
        totalHours: Math.round(resolutionTimeMs / (1000 * 60 * 60) * 10) / 10,
        totalDays: Math.round(resolutionTimeMs / (1000 * 60 * 60 * 24) * 10) / 10
      };
    }

    // Count redirections
    const redirectionCount = history.entries.filter(entry => entry.isRedirect).length;
    if (redirectionCount > 0) {
      (history.summary as any).redirections = redirectionCount;
    }

    // Track admin involvement
    const involvedAdmins = [...new Set(history.entries.map(entry => entry.responseBy))];
    (history.summary as any).involvedAdmins = involvedAdmins.length;
  }
}

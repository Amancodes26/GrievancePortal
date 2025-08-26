import { GrievanceRepository } from '../repositories/grievance.repository';
import { Grievance, CreateGrievanceData, UpdateGrievanceData } from '../models/Grievance';
import { CreateGrievanceInput, UpdateGrievanceInput, GetGrievancesQuery } from '../validators/grievance.validator';
import { AppError } from '../utils/errorHandler';
import ConnectionManager from '../db/connectionManager';

/**
 * Service class for Grievance business logic
 * Implements business rules and coordinates between controller and repository
 */
export class GrievanceService {
  private grievanceRepository: GrievanceRepository;

  constructor() {
    this.grievanceRepository = new GrievanceRepository();
  }

  /**
   * Creates a new grievance with business validation
   * Validates issue code and campus existence before creation
   */
  async createGrievance(data: CreateGrievanceInput): Promise<Grievance> {
    try {
      // Validate issue code exists and is active
      await this.validateIssueCode(data.issueCode);
      
      // Validate campus exists
      await this.validateCampusId(data.campusId);
      
      // Validate student exists and belongs to the campus
      await this.validateStudentAccess(data.rollno, data.campusId);
      
      // Generate unique grievance ID
      const grievanceId = this.grievanceRepository.generateGrievanceId();
      
      // Create the grievance
      const grievanceData = {
        ...data,
        grievanceId,
        hasAttachments: data.hasAttachments || false
      };
      
      const createdGrievance = await this.grievanceRepository.create(grievanceData);
      
      // Log business event
      console.info(`[GrievanceService] Grievance created: ${grievanceId} for student: ${data.rollno}`);
      
      return createdGrievance;
    } catch (error) {
      console.error('[GrievanceService.createGrievance] Error:', error);
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Failed to create grievance', 500, 'CREATION_FAILED', error);
    }
  }

  /**
   * Retrieves a grievance by ID with access control
   */
  async getGrievanceById(id: string, requestorRollNo?: string, isAdmin: boolean = false): Promise<Grievance> {
    try {
      const grievance = await this.grievanceRepository.findById(id);
      
      if (!grievance) {
        throw new AppError('Grievance not found', 404, 'GRIEVANCE_NOT_FOUND');
      }
      
      // Access control: Students can only view their own grievances
      if (!isAdmin && requestorRollNo && grievance.rollno !== requestorRollNo) {
        throw new AppError('Access denied to this grievance', 403, 'ACCESS_DENIED');
      }
      
      return grievance;
    } catch (error) {
      console.error('[GrievanceService.getGrievanceById] Error:', error);
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Failed to retrieve grievance', 500, 'RETRIEVAL_FAILED', error);
    }
  }

  /**
   * Retrieves grievances with filtering, pagination and access control
   */
  async getGrievances(
    query: GetGrievancesQuery, 
    requestorRollNo?: string, 
    isAdmin: boolean = false
  ): Promise<{ grievances: Grievance[]; total: number; pagination: any }> {
    try {
      const filters = {
        rollno: query.rollno,
        issueCode: query.issueCode,
        campusId: query.campusId,
        limit: query.limit || 10,
        offset: ((query.page || 1) - 1) * (query.limit || 10),
        sortBy: query.sortBy || 'createdAt',
        sortOrder: query.sortOrder || 'DESC'
      };
      
      // Access control: Non-admin users can only see their own grievances
      if (!isAdmin && requestorRollNo) {
        filters.rollno = requestorRollNo;
      }
      
      const result = await this.grievanceRepository.findMany(filters);
      
      // Prepare pagination metadata
      const pagination = {
        currentPage: query.page || 1,
        totalPages: Math.ceil(result.total / (query.limit || 10)),
        totalItems: result.total,
        itemsPerPage: query.limit || 10,
        hasNextPage: (query.page || 1) * (query.limit || 10) < result.total,
        hasPreviousPage: (query.page || 1) > 1
      };
      
      return {
        grievances: result.grievances,
        total: result.total,
        pagination
      };
    } catch (error) {
      console.error('[GrievanceService.getGrievances] Error:', error);
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Failed to retrieve grievances', 500, 'RETRIEVAL_FAILED', error);
    }
  }

  /**
   * Updates a grievance with proper authorization
   * Only admins should be able to update grievance metadata
   */
  async updateGrievance(
    id: string, 
    data: UpdateGrievanceInput, 
    isAdmin: boolean = false
  ): Promise<Grievance> {
    try {
      if (!isAdmin) {
        throw new AppError('Only admins can update grievances', 403, 'INSUFFICIENT_PRIVILEGES');
      }
      
      // Check if grievance exists
      const existingGrievance = await this.grievanceRepository.findById(id);
      if (!existingGrievance) {
        throw new AppError('Grievance not found', 404, 'GRIEVANCE_NOT_FOUND');
      }
      
      const updatedGrievance = await this.grievanceRepository.update(id, data);
      
      if (!updatedGrievance) {
        throw new AppError('Failed to update grievance', 500, 'UPDATE_FAILED');
      }
      
      // Log business event
      console.info(`[GrievanceService] Grievance updated: ${id}`);
      
      return updatedGrievance;
    } catch (error) {
      console.error('[GrievanceService.updateGrievance] Error:', error);
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Failed to update grievance', 500, 'UPDATE_FAILED', error);
    }
  }

  /**
   * Soft deletes a grievance (marks as resolved/closed)
   */
  async deleteGrievance(id: string, isAdmin: boolean = false): Promise<void> {
    try {
      if (!isAdmin) {
        throw new AppError('Only admins can delete grievances', 403, 'INSUFFICIENT_PRIVILEGES');
      }
      
      const deleted = await this.grievanceRepository.softDelete(id);
      
      if (!deleted) {
        throw new AppError('Grievance not found', 404, 'GRIEVANCE_NOT_FOUND');
      }
      
      // Log business event
      console.info(`[GrievanceService] Grievance deleted: ${id}`);
    } catch (error) {
      console.error('[GrievanceService.deleteGrievance] Error:', error);
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Failed to delete grievance', 500, 'DELETE_FAILED', error);
    }
  }

  /**
   * Private helper methods for validation
   */
  
  private async validateIssueCode(issueCode: number): Promise<void> {
    const result = await ConnectionManager.query(
      'SELECT 1 FROM IssueList WHERE IssueCode = $1 AND IsActive = true',
      [issueCode]
    );
    
    if (result.rows.length === 0) {
      throw new AppError('Invalid or inactive issue code', 400, 'INVALID_ISSUE_CODE');
    }
  }
  
  private async validateCampusId(campusId: number): Promise<void> {
    const result = await ConnectionManager.query(
      'SELECT 1 FROM CampusInfo WHERE CampusId = $1',
      [campusId]
    );
    
    if (result.rows.length === 0) {
      throw new AppError('Invalid campus ID', 400, 'INVALID_CAMPUS_ID');
    }
  }
  
  private async validateStudentAccess(rollno: string, campusId: number): Promise<void> {
    const result = await ConnectionManager.query(
      'SELECT CampusId FROM PersonalInfo WHERE RollNo = $1 AND IsVerified = true',
      [rollno]
    );
    
    if (result.rows.length === 0) {
      throw new AppError('Student not found or not verified', 400, 'INVALID_STUDENT');
    }
    
    const studentCampusId = result.rows[0].campusid;
    if (studentCampusId !== campusId) {
      throw new AppError('Student does not belong to the specified campus', 400, 'CAMPUS_MISMATCH');
    }
  }
}

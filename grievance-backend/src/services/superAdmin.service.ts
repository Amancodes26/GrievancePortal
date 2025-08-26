import bcrypt from 'bcryptjs';
import ConnectionManager from '../db/connectionManager';
import { AdminQueries, AdminAuditLogQueries, StatsQueries } from '../db/queries';
import { Department, DatabaseAdminRole } from '../types/common';

/**
 * DSEU Super Admin Service
 * Updated for init.sql schema with proper audit logging and department management
 */

interface CreateAdminInput {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: DatabaseAdminRole;
  department: 'ACADEMIC' | 'EXAM' | 'CAMPUS' | 'SYSTEM';
  campusId?: number;
}

interface AuditLogInput {
  adminId: string;
  actionType: string;
  actionDetails: any;
  ipAddress?: string;
  email: string;
  accessedResource: string;
  role: DatabaseAdminRole;
}

// Main campus ID (DSEU Dwarka Campus from init.sql)
const MAIN_CAMPUS_ID = 1016; // DDC - DSEU DWARKA CAMPUS

export class SuperAdminService {
  // Create a new admin with proper role-department validation
  static async createAdmin({ name, email, phone, password, role, department, campusId }: CreateAdminInput): Promise<any> {
    try {
      // Validate role-department combination
      const isValidCombination = await ConnectionManager.query(`
        SELECT CASE 
          WHEN $1 = 'SUPER_ADMIN' AND $2 = 'SYSTEM' THEN true
          WHEN $1 = 'CAMPUS_ADMIN' AND $2 = 'CAMPUS' THEN true
          WHEN $1 = 'DEPT_ADMIN' AND $2 IN ('ACADEMIC', 'EXAM') THEN true
          ELSE false
        END as is_valid
      `, [role, department]);

      if (!isValidCombination.rows[0].is_valid) {
        throw new Error(`Invalid role-department combination: ${role} - ${department}`);
      }

      // Check if email already exists
      const existing = await ConnectionManager.query('SELECT * FROM Admin WHERE Email = $1', [email]);
      if (existing.rows.length > 0) {
        throw new Error('Email already exists');
      }
      
      // Generate admin ID
      const adminId = `ADMIN_${Date.now()}_${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);
      
      // Use main campus if no campus specified (except for SUPER_ADMIN)
      const finalCampusId = role === 'SUPER_ADMIN' ? null : (campusId || MAIN_CAMPUS_ID);
      
      // Create admin with proper department field
      const result = await ConnectionManager.query(AdminQueries.CREATE, [
        adminId, name, email, phone || null, hashedPassword, role, department, false, true, finalCampusId
      ]);
      
      return result.rows[0];
      
    } catch (error) {
      throw error;
    }
  }

  // Get all admins
  static async getAllAdmins(): Promise<any[]> {
    const result = await ConnectionManager.query(AdminQueries.GET_ALL);
    return result.rows;
  }

  // Get admin by ID  
  static async getAdminById(adminId: string): Promise<any> {
    const result = await ConnectionManager.query(AdminQueries.GET_BY_ID, [adminId]);
    return result.rows[0] || null;
  }

  // Get admins by campus
  static async getAdminsByCampus(campusId: number): Promise<any[]> {
    const result = await ConnectionManager.query(AdminQueries.GET_BY_CAMPUS, [campusId]);
    return result.rows;
  }

  // Update admin
  static async updateAdmin(adminId: string, updates: Record<string, any>): Promise<any> {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    
    if (fields.length === 0) {
      throw new Error('No fields to update');
    }
    
    // Hash password if being updated
    if (updates.password) {
      const passwordIndex = fields.indexOf('password');
      values[passwordIndex] = await bcrypt.hash(updates.password, 12);
    }
    
    const query = AdminQueries.UPDATE(fields);
    const result = await ConnectionManager.query(query, [adminId, ...values]);
    return result.rows[0];
  }

  // Get main campus ID
  static getMainCampusId(): number {
    return MAIN_CAMPUS_ID;
  }

  // Log admin action using new AdminAuditLogQueries
  static async logAdminAction(data: AuditLogInput): Promise<any> {
    try {
      const result = await ConnectionManager.query(AdminAuditLogQueries.CREATE, [
        data.adminId,
        data.actionType,
        data.email,
        data.accessedResource,
        data.ipAddress || 'unknown',
        true, // IsActive
        JSON.stringify(data.actionDetails), // Query field
        data.role
      ]);
      
      return result.rows[0];
    } catch (error) {
      console.error('Error logging admin action:', error);
      // Don't throw error for audit logging failures
      return null;
    }
  }

  // Get admin audit logs using new queries
  static async getAdminAuditLogs(adminId?: string, limit: number = 100): Promise<any[]> {
    if (adminId) {
      const result = await ConnectionManager.query(AdminAuditLogQueries.GET_BY_ADMIN, [adminId]);
      return result.rows.slice(0, limit);
    } else {
      const result = await ConnectionManager.query(AdminAuditLogQueries.GET_RECENT, [limit]);
      return result.rows;
    }
  }

  // Get system statistics using new StatsQueries
  static async getSystemStats(): Promise<any> {
    try {
      const result = await ConnectionManager.query(StatsQueries.GET_SYSTEM_STATS);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Get admin activity statistics
  static async getAdminActivityStats(): Promise<any[]> {
    try {
      const result = await ConnectionManager.query(StatsQueries.GET_ADMIN_ACTIVITY_STATS);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Get campus admin statistics using new schema
  static async getCampusAdminStats(): Promise<any[]> {
    try {
      const result = await ConnectionManager.query(StatsQueries.GET_CAMPUS_GRIEVANCE_STATS);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Get department admins by campus with proper department enum
  static async getDepartmentAdminsByCampus(campusId: number, department: 'ACADEMIC' | 'EXAM' | 'CAMPUS' | 'SYSTEM'): Promise<any[]> {
    const result = await ConnectionManager.query(AdminQueries.GET_BY_CAMPUS_AND_DEPARTMENT, [campusId, department]);
    return result.rows;
  }

  // Get main campus department admins
  static async getMainCampusDepartmentAdmins(department: 'ACADEMIC' | 'EXAM' | 'CAMPUS' | 'SYSTEM'): Promise<any[]> {
    return this.getDepartmentAdminsByCampus(MAIN_CAMPUS_ID, department);
  }

  // Clean up old audit logs (maintenance function)
  static async cleanupOldAuditLogs(daysToKeep: number = 90): Promise<number> {
    try {
      const result = await ConnectionManager.query(AdminAuditLogQueries.DELETE_OLD_LOGS, [daysToKeep]);
      return result.rows[0]?.deleted_count || 0;
    } catch (error) {
      throw error;
    }
  }

  // Get database health status
  static async getDatabaseHealth(): Promise<any> {
    try {
      const [healthResult, tablesResult] = await Promise.all([
        ConnectionManager.query(`
          SELECT 
            'Database Connected' as status,
            NOW() AT TIME ZONE 'Asia/Kolkata' as server_time,
            version() as postgres_version
        `),
        ConnectionManager.query(`SELECT * FROM get_table_status() ORDER BY tbl_name`)
      ]);

      return {
        status: healthResult.rows[0],
        tables: tablesResult.rows
      };
    } catch (error) {
      throw error;
    }
  }

  // Validate admin permissions for action
  static async validateAdminAction(adminId: string, action: string, resource: string): Promise<boolean> {
    try {
      const admin = await this.getAdminById(adminId);
      if (!admin || !admin.isactive) return false;

      // Basic role-based validation
      switch (admin.role) {
        case 'SUPER_ADMIN':
          return true; // Super admin has all permissions
        case 'CAMPUS_ADMIN':
          return ['grievance', 'student', 'attachment'].includes(resource);
        case 'DEPT_ADMIN':
          return ['grievance'].includes(resource) && admin.department === 'ACADEMIC';
        default:
          return false;
      }
    } catch (error) {
      return false;
    }
  }
}

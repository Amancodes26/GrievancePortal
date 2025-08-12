import bcrypt from 'bcryptjs';
import ConnectionManager from '../db/connectionManager';
import { AdminQueries } from '../db/queries';
import { Department, DatabaseAdminRole } from '../types/common';

interface CreateAdminInput {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: DatabaseAdminRole;
  department?: string;
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

// Main campus ID (DSEU Dwarka Campus)
const MAIN_CAMPUS_ID = 1016; // DDC - DSEU DWARKA CAMPUS

export class SuperAdminService {
  // Create a new admin
  static async createAdmin({ name, email, phone, password, role, department, campusId }: CreateAdminInput): Promise<any> {
    try {
      // Check if email already exists
      const existing = await ConnectionManager.query('SELECT * FROM Admin WHERE Email = $1', [email]);
      if (existing.rows.length > 0) {
        throw new Error('Email already exists');
      }
      
      // Generate admin ID
      const adminId = `ADMIN_${Date.now()}_${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);
      
      // Use main campus if no campus specified
      const finalCampusId = campusId || MAIN_CAMPUS_ID;
      
      // Create admin
      const result = await ConnectionManager.query(AdminQueries.CREATE, [
        adminId, name, email, phone || null, hashedPassword, role, department || null, false, true, finalCampusId
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

  // Log admin action
  static async logAdminAction(data: AuditLogInput): Promise<any> {
    try {
      const result = await ConnectionManager.query(`
        INSERT INTO Admin_Audit_Log (AdminId, Action_Type, Email, AccessedResource, IP_Address, Role, Query)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        data.adminId,
        data.actionType,
        data.email,
        data.accessedResource,
        data.ipAddress || 'unknown',
        data.role,
        JSON.stringify(data.actionDetails)
      ]);
      
      return result.rows[0];
    } catch (error) {
      console.error('Error logging admin action:', error);
      // Don't throw error for audit logging failures
      return null;
    }
  }

  // Get admin audit logs
  static async getAdminAuditLogs(adminId?: string, limit: number = 100, offset: number = 0): Promise<any[]> {
    let query = `
      SELECT * FROM Admin_Audit_Log
      WHERE IsActive = true
    `;
    const params: any[] = [];
    
    if (adminId) {
      query += ' AND AdminId = $1';
      params.push(adminId);
      query += ' ORDER BY Timestamp DESC LIMIT $2 OFFSET $3';
      params.push(limit, offset);
    } else {
      query += ' ORDER BY Timestamp DESC LIMIT $1 OFFSET $2';
      params.push(limit, offset);
    }
    
    const result = await ConnectionManager.query(query, params);
    return result.rows;
  }

  // Get system statistics
  static async getSystemStats(): Promise<any> {
    try {
      const [adminsResult, grievancesResult, campusResult] = await Promise.all([
        ConnectionManager.query('SELECT COUNT(*) as total_admins, COUNT(CASE WHEN IsActive = true THEN 1 END) as active_admins FROM Admin'),
        ConnectionManager.query('SELECT COUNT(*) as total_grievances FROM Grievance'),
        ConnectionManager.query('SELECT COUNT(*) as total_campuses FROM CampusInfo')
      ]);

      return {
        admins: {
          total: parseInt(adminsResult.rows[0].total_admins),
          active: parseInt(adminsResult.rows[0].active_admins)
        },
        grievances: {
          total: parseInt(grievancesResult.rows[0].total_grievances)
        },
        campuses: {
          total: parseInt(campusResult.rows[0].total_campuses)
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Get campus admin statistics  
  static async getCampusAdminStats(): Promise<any[]> {
    try {
      const result = await ConnectionManager.query(`
        SELECT 
          c.CampusId,
          c.CampusCode,
          c.CampusName,
          COUNT(a.AdminId) as admin_count,
          COUNT(CASE WHEN a.IsActive = true THEN 1 END) as active_admins
        FROM CampusInfo c
        LEFT JOIN Admin a ON c.CampusId = a.CampusId
        GROUP BY c.CampusId, c.CampusCode, c.CampusName
        ORDER BY c.CampusName
      `);
      
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Get department admins by campus
  static async getDepartmentAdminsByCampus(campusId: number, department: Department): Promise<any[]> {
    const result = await ConnectionManager.query(`
      SELECT * FROM Admin 
      WHERE CampusId = $1 AND Role = $2 AND IsActive = true
      ORDER BY Name
    `, [campusId, department]);
    
    return result.rows;
  }

  // Get main campus department admins
  static async getMainCampusDepartmentAdmins(department: Department): Promise<any[]> {
    return this.getDepartmentAdminsByCampus(MAIN_CAMPUS_ID, department);
  }

  // Assign admin to campus (simplified version for current schema)
  static async assignAdminToCampus(data: { adminId: string; campusId: number; department: Department; isPrimary?: boolean }): Promise<any> {
    // In our current schema, we just update the admin's campus
    const result = await ConnectionManager.query(`
      UPDATE Admin SET CampusId = $1 WHERE AdminId = $2
      RETURNING *
    `, [data.campusId, data.adminId]);
    
    return result.rows[0];
  }
}

import bcrypt from 'bcryptjs';
import { getPool } from "../db";
import { AdminRole, AdminInfo, AdminCampusAssignment, AdminAuditLog } from '../types/common';

interface CreateAdminInput {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: AdminRole;
  campusId?: number;
  isMainCampus?: boolean;
}

interface AdminCampusAssignmentInput {
  adminId: string;
  campusId: number;
  department: AdminRole;
  isPrimary?: boolean;
}

interface AuditLogInput {
  adminId: string;
  actionType: string;
  actionDetails: any;
  ipAddress?: string;
  userAgent?: string;
}

// Main campus ID (DSEU Dwarka Campus)
const MAIN_CAMPUS_ID = 1016; // DDC - DSEU DWARKA CAMPUS

export class SuperAdminService {
  // Create a new admin with campus assignment
  static async createAdmin({ name, email, phone, password, role, campusId, isMainCampus }: CreateAdminInput): Promise<AdminInfo> {
    const client = await getPool().connect();
    
    try {
      await client.query('BEGIN');
      
      // Ensure main campus exists before proceeding
      await this.ensureMainCampusExists();
      
      // Check if email already exists
      const existing = await client.query('SELECT * FROM Admin WHERE Email = $1', [email]);
      if (existing.rows.length > 0) {
        throw new Error('Email already exists');
      }
      
      // Validate campus exists if campusId is provided
      if (campusId) {
        const campusExists = await client.query('SELECT CampusId FROM CampusInfo WHERE CampusId = $1', [campusId]);
        if (campusExists.rows.length === 0) {
          throw new Error(`Campus with ID ${campusId} does not exist. Please create the campus first or use an existing campus ID.`);
        }
      }
      
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Generate a unique AdminId
      const adminId = `${role.toUpperCase()}_${Date.now().toString().slice(-6)}`;
      
      // Use default campus (1016) if no campusId provided
      const finalCampusId = campusId || MAIN_CAMPUS_ID;
      
      // Insert admin
      const insertResult = await client.query(
        `INSERT INTO Admin (AdminId, Name, Email, Password, Role, CampusId, IsActive)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING AdminId, Name, Email, Role, CampusId, IsActive, CreatedAt, UpdatedAt`,
        [adminId, name, email, hashedPassword, role, finalCampusId, true]
      );
      
      const admin = insertResult.rows[0];
      
      // Create campus assignment
      await client.query(
        `INSERT INTO Admin_Campus_Assignment (admin_id, campus_id, department, is_primary)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (admin_id, campus_id, department) DO NOTHING`,
        [adminId, finalCampusId, role, isMainCampus || false]
      );
      
      await client.query('COMMIT');
      return admin;
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Assign admin to campus
  static async assignAdminToCampus({ adminId, campusId, department, isPrimary = false }: AdminCampusAssignmentInput): Promise<AdminCampusAssignment> {
    const result = await getPool().query(
      `INSERT INTO Admin_Campus_Assignment (admin_id, campus_id, department, is_primary)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (admin_id, campus_id, department) 
       DO UPDATE SET is_primary = $4, assigned_at = NOW()
       RETURNING *`,
      [adminId, campusId, department, isPrimary]
    );
    
    return result.rows[0];
  }

  // Get all admins with their campus assignments
  static async getAllAdmins(): Promise<AdminInfo[]> {
    const result = await getPool().query(`
      SELECT 
        a.AdminId, a.Name, a.Email, a.Role, a.CampusId, a.IsActive, a.CreatedAt, a.UpdatedAt,
        c.CampusCode, c.CampusName,
        array_agg(aca.campus_id) as assigned_campuses
      FROM Admin a
      LEFT JOIN CampusInfo c ON a.CampusId = c.CampusId
      LEFT JOIN Admin_Campus_Assignment aca ON a.AdminId = aca.admin_id
      WHERE a.IsActive = true
      GROUP BY a.AdminId, a.Name, a.Email, a.Role, a.CampusId, a.IsActive, a.CreatedAt, a.UpdatedAt, c.CampusCode, c.CampusName
      ORDER BY a.CreatedAt DESC
    `);
    
    return result.rows;
  }

  // Get admins by campus
  static async getAdminsByCampus(campusId: number): Promise<AdminInfo[]> {
    const result = await getPool().query(`
      SELECT 
        a.AdminId, a.Name, a.Email, a.Role, a.CampusId, a.IsActive, a.CreatedAt, a.UpdatedAt,
        c.CampusCode, c.CampusName
      FROM Admin a
      LEFT JOIN CampusInfo c ON a.CampusId = c.CampusId
      WHERE a.CampusId = $1 AND a.IsActive = true
      ORDER BY a.Role, a.Name
    `, [campusId]);
    
    return result.rows;
  }

  // Get department admins for a specific campus
  static async getDepartmentAdminsByCampus(campusId: number, department: AdminRole): Promise<AdminInfo[]> {
    const result = await getPool().query(`
      SELECT 
        a.AdminId, a.Name, a.Email, a.Role, a.CampusId, a.IsActive, a.CreatedAt, a.UpdatedAt,
        c.CampusCode, c.CampusName
      FROM Admin a
      LEFT JOIN CampusInfo c ON a.CampusId = c.CampusId
      WHERE a.CampusId = $1 AND a.Role = $2 AND a.IsActive = true
      ORDER BY a.Name
    `, [campusId, department]);
    
    return result.rows;
  }

  // Get main campus department admins
  static async getMainCampusDepartmentAdmins(department: AdminRole): Promise<AdminInfo[]> {
    return this.getDepartmentAdminsByCampus(MAIN_CAMPUS_ID, department);
  }

  // Get all campuses with their admin counts
  static async getCampusAdminStats(): Promise<any[]> {
    const result = await getPool().query(`
      SELECT 
        c.CampusId, c.CampusCode, c.CampusName,
        COUNT(DISTINCT a.AdminId) as total_admins,
        COUNT(DISTINCT CASE WHEN a.Role = 'academic' THEN a.AdminId END) as academic_admins,
        COUNT(DISTINCT CASE WHEN a.Role = 'exam' THEN a.AdminId END) as exam_admins,
        COUNT(DISTINCT CASE WHEN a.Role = 'campus' THEN a.AdminId END) as campus_admins
      FROM CampusInfo c
      LEFT JOIN Admin a ON c.CampusId = a.CampusId AND a.IsActive = true
      GROUP BY c.CampusId, c.CampusCode, c.CampusName
      ORDER BY c.CampusCode
    `);
    
    return result.rows;
  }

  // Update admin information
  static async updateAdmin(adminId: string, updates: Partial<AdminInfo>): Promise<AdminInfo> {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (updates.Name !== undefined) {
      fields.push('Name');
      values.push(updates.Name);
      paramCount++;
    }
    if (updates.Email !== undefined) {
      fields.push('Email');
      values.push(updates.Email);
      paramCount++;
    }
    if (updates.Role !== undefined) {
      fields.push('Role');
      values.push(updates.Role);
      paramCount++;
    }
    if (updates.CampusId !== undefined) {
      fields.push('CampusId');
      values.push(updates.CampusId);
      paramCount++;
    }
    if (updates.IsActive !== undefined) {
      fields.push('IsActive');
      values.push(updates.IsActive);
      paramCount++;
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const query = `
      UPDATE Admin 
      SET ${setClause}, UpdatedAt = NOW() 
      WHERE AdminId = $1 
      RETURNING *
    `;

    const result = await getPool().query(query, [adminId, ...values]);
    
    if (result.rows.length === 0) {
      throw new Error('Admin not found');
    }
    
    return result.rows[0];
  }

  // Deactivate admin
  static async deactivateAdmin(adminId: string): Promise<void> {
    const result = await getPool().query(
      'UPDATE Admin SET IsActive = false, UpdatedAt = NOW() WHERE AdminId = $1',
      [adminId]
    );
    
    if (result.rowCount === 0) {
      throw new Error('Admin not found');
    }
  }

  // Log admin action
  static async logAdminAction({ adminId, actionType, actionDetails, ipAddress, userAgent }: AuditLogInput): Promise<void> {
    await getPool().query(
      `INSERT INTO Admin_Audit_Log (admin_id, action_type, action_details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [adminId, actionType, JSON.stringify(actionDetails), ipAddress, userAgent]
    );
  }

  // Get admin audit logs
  static async getAdminAuditLogs(adminId?: string, limit: number = 100, offset: number = 0): Promise<AdminAuditLog[]> {
    let query = `
      SELECT * FROM Admin_Audit_Log
    `;
    const params: any[] = [];
    
    if (adminId) {
      query += ' WHERE admin_id = $1';
      params.push(adminId);
    }
    
    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);
    
    const result = await getPool().query(query, params);
    return result.rows;
  }

  // Get system statistics
  static async getSystemStats(): Promise<any> {
    const [
      adminCount,
      campusCount,
      grievanceCount,
      activeGrievanceCount,
      campusStats
    ] = await Promise.all([
      getPool().query('SELECT COUNT(*) as count FROM Admin WHERE IsActive = true'),
      getPool().query('SELECT COUNT(*) as count FROM CampusInfo'),
      getPool().query('SELECT COUNT(*) as count FROM Grievance'),
      getPool().query('SELECT COUNT(*) as count FROM Grievance WHERE Status IN (\'PENDING\', \'IN_PROGRESS\')'),
      this.getCampusAdminStats()
    ]);

    return {
      totalAdmins: parseInt(adminCount.rows[0].count),
      totalCampuses: parseInt(campusCount.rows[0].count),
      totalGrievances: parseInt(grievanceCount.rows[0].count),
      activeGrievances: parseInt(activeGrievanceCount.rows[0].count),
      campusStats: campusStats
    };
  }

  // Get main campus ID
  static getMainCampusId(): number {
    return MAIN_CAMPUS_ID;
  }

  // Get all available campuses
  static async getAllCampuses(): Promise<any[]> {
    const result = await getPool().query(`
      SELECT CampusId, CampusCode, CampusName, CreatedAt, UpdatedAt
      FROM CampusInfo
      ORDER BY CampusCode
    `);
    
    return result.rows;
  }

  // Initialize default campuses if none exist
  static async initializeDefaultCampuses(): Promise<void> {
    const campusCount = await getPool().query('SELECT COUNT(*) FROM CampusInfo');
    
    if (parseInt(campusCount.rows[0].count) === 0) {
      console.log('[SUPER_ADMIN] No campuses found, initializing default campuses...');
      
      const defaultCampuses = [
        { id: 1016, code: 'DDC', name: 'DSEU Dwarka Campus' },
        { id: 1001, code: 'DSC', name: 'DSEU Shakarpur Campus' },
        { id: 1002, code: 'DKC', name: 'DSEU Kashmere Gate Campus' },
        { id: 1003, code: 'DPC', name: 'DSEU Pusa Campus' },
        { id: 1004, code: 'DVC', name: 'DSEU Vivek Vihar Campus' }
      ];
      
      for (const campus of defaultCampuses) {
        await getPool().query(
          `INSERT INTO CampusInfo (CampusId, CampusCode, CampusName) 
           VALUES ($1, $2, $3) 
           ON CONFLICT (CampusId) DO NOTHING`,
          [campus.id, campus.code, campus.name]
        );
      }
      
      console.log('[SUPER_ADMIN] Default campuses initialized successfully');
    }
  }

  // Ensure main campus exists
  static async ensureMainCampusExists(): Promise<void> {
    const mainCampus = await getPool().query('SELECT CampusId FROM CampusInfo WHERE CampusId = $1', [MAIN_CAMPUS_ID]);
    
    if (mainCampus.rows.length === 0) {
      console.log('[SUPER_ADMIN] Main campus not found, creating default main campus...');
      
      await getPool().query(
        `INSERT INTO CampusInfo (CampusId, CampusCode, CampusName) 
         VALUES ($1, $2, $3)`,
        [MAIN_CAMPUS_ID, 'DDC', 'DSEU Dwarka Campus']
      );
      
      console.log('[SUPER_ADMIN] Main campus created successfully');
    }
  }
}

// Legacy function for backward compatibility
export async function createAdmin({ name, email, phone, password, role }: CreateAdminInput): Promise<AdminInfo> {
  return SuperAdminService.createAdmin({ name, email, phone, password, role });
}

// Dummy export to keep module status
export const dummy = true;

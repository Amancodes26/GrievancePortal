import ConnectionManager from "../db/connectionManager";
import { 
  GrievanceQueries, 
  TrackingQueries, 
  AttachmentQueries, 
  AdminQueries,
  CampusInfoQueries,
  StudentInfoQueries,
  IssueListQueries
} from "../db/queries";

// Campus type for TS
export interface CampusData {
  CampusCode: string;
  CampusName: string;
  CampusId?: number; // Optional for creation, required for updates
}

export class DatabaseService {
  // Campus related functions
  static async getAllCampuses() {
    const result = await ConnectionManager.query(CampusInfoQueries.GET_ALL);
    return result.rows;
  }

  static async getCampusById(id: number) {
    const result = await ConnectionManager.query(CampusInfoQueries.GET_BY_ID, [id]);
    return result.rows[0] || null;
  }

  static async createCampus(data: CampusData) {
    const values = [data.CampusCode, data.CampusName];
    const result = await ConnectionManager.query(CampusInfoQueries.CREATE, values);
    return result.rows[0];
  }

  static async updateCampus(id: number, data: Partial<CampusData>) {
    const fields = Object.keys(data);
    const values = Object.values(data);
    
    if (fields.length === 0) {
      throw new Error('No fields to update');
    }
    
    const query = CampusInfoQueries.UPDATE(fields);
    const result = await ConnectionManager.query(query, [id, ...values]);
    return result.rows[0];
  }

  static async deleteCampus(id: number) {
    const result = await ConnectionManager.query(CampusInfoQueries.DELETE, [id]);
    return result.rows[0];
  }

  // Student Info related functions
  static async getAllStudentInfo() {
    const result = await ConnectionManager.query(StudentInfoQueries.GET_ALL);
    return result.rows;
  }

  static async getStudentInfoByRollNo(rollNo: string) {
    const result = await ConnectionManager.query(StudentInfoQueries.GET_BY_ROLLNO, [rollNo]);
    return result.rows[0] || null;
  }

  static async createStudentInfo(data: any) {
    const values = [
      data.rollNo,
      data.campusId,
      data.fullName,
      data.fatherName,
      data.cgpa || 0,
      data.email,
      data.phone
    ];
    const result = await ConnectionManager.query(StudentInfoQueries.CREATE, values);
    return result.rows[0];
  }

  // Issue List related functions
  static async getAllIssueTypes() {
    const result = await ConnectionManager.query(IssueListQueries.GET_ALL);
    return result.rows;
  }

  static async getIssueTypeByCode(issueCode: string) {
    const result = await ConnectionManager.query(IssueListQueries.GET_BY_CODE, [issueCode]);
    return result.rows[0] || null;
  }

  // Admin related functions
  static async getAllAdmins() {
    const result = await ConnectionManager.query(AdminQueries.GET_ALL);
    return result.rows;
  }

  static async getAdminById(adminId: string) {
    const result = await ConnectionManager.query(AdminQueries.GET_BY_ID, [adminId]);
    return result.rows[0] || null;
  }

  // Database health and utility functions
  static async checkDatabaseHealth() {
    try {
      const result = await ConnectionManager.query('SELECT NOW() as current_time');
      return {
        status: 'healthy',
        timestamp: result.rows[0].current_time
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static async getTableCounts() {
    try {
      const tables = [
        'grievance',
        'tracking', 
        'attachment',
        'admin',
        'campusinfo',
        'studentinfo',
        'issuelist',
        'academicinfo',
        'programinfo'
      ];

      const countPromises = tables.map(async (tableName) => {
        try {
          const result = await ConnectionManager.query(`SELECT COUNT(*) as count FROM ${tableName}`);
          return { table: tableName, count: parseInt(result.rows[0].count) };
        } catch (error) {
          return { table: tableName, count: -1, error: error instanceof Error ? error.message : 'Unknown error' };
        }
      });

      const counts = await Promise.all(countPromises);
      return counts;
    } catch (error) {
      throw error;
    }
  }
}
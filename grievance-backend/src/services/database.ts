import { Course, CreateCourseData, UpdateCourseData } from "../models/Course";
import { CourseCrudQueries } from "../db/queries";
import { CourseEval, CreateCourseEvalData, UpdateCourseEvalData } from "../models/CourseEval";
import { CourseEvalCrudQueries } from "../db/queries";
import { ProgramOptions, CreateProgramOptionsData, UpdateProgramOptionsData } from "../models/ProgramOptions";
import { ProgramOptionsCrudQueries } from "../db/queries";
import { AcademicInfo, CreateAcademicInfoData, UpdateAcademicInfoData } from "../models/AcademicInfo";
import { AcademicInfoCrudQueries } from "../db/queries";
import { ProgramInfo, CreateProgramInfoData, UpdateProgramInfoData } from "../models/ProgramInfo";
import { ProgramInfoCrudQueries } from "../db/queries";
import { CourseProgram, CreateCourseProgramData, UpdateCourseProgramData } from "../models/CourseProgram";
import { CourseProgramCrudQueries } from "../db/queries";
 
// PersonalInfo CRUD
import { getPool, getPoolSafe } from "../db";
import ConnectionManager from "../db/connectionManager";
import { AdminOTP, CreateAdminOTPData } from "../models/OTP";
import { PersonalInfo, CreatePersonalInfoData, UpdatePersonalInfoData } from "../models/PersonalInfo";
import { OTP, CreateOTPData } from "../models/OTP";
import { PersonalInfoQueries, OTPQueries, AdminQueries, ValidationQueries, AdminOTPQueries, TemporaryDataQueries, MarksValidationQueries } from "../db/queries";

import { CampusQueries, PersonalInfoCrudQueries } from "../db/queries";
import { get } from "http";

// Campus type for TS
export interface CampusData {
  CampusCode: string;
  CampusName: string;
  CampusId?: number; // Optional for creation, required for updates
}

export class DatabaseService {  // CourseProgram CRUD
  static async getAllCourseProgram() {
    const result = await ConnectionManager.query(CourseProgramCrudQueries.GET_ALL);
    return result.rows;
  }

  static async getCourseProgramByCompositeKey(programId: number, courseId: number, batch: number) {
    const result = await ConnectionManager.query(CourseProgramCrudQueries.GET_BY_COMPOSITE_KEY, [programId, courseId, batch]);
    return result.rows[0] || null;
  }

  static async createCourseProgram(data: CreateCourseProgramData) {
    const values = [
      data.ProgramId,
      data.CourseId,
      data.Batch,
      data.IsActive !== undefined ? data.IsActive : true
    ];
    const result = await ConnectionManager.query(CourseProgramCrudQueries.CREATE, values);
    return result.rows[0];
  }

  static async updateCourseProgramByCompositeKey(programId: number, courseId: number, batch: number, data: UpdateCourseProgramData) {
    if (Object.keys(data).length === 0) return null;
    if ('ProgramId' in data) delete (data as any).ProgramId;
    if ('CourseId' in data) delete (data as any).CourseId;
    if ('Batch' in data) delete (data as any).Batch;
    const fields = Object.keys(data);
    const values = [programId, courseId, batch, ...fields.map(f => (data as any)[f])];
    const query = CourseProgramCrudQueries.UPDATE_BY_COMPOSITE_KEY(fields);
    const result = await ConnectionManager.query(query, values);
    return result.rows[0] || null;
  }

  static async deleteCourseProgramByCompositeKey(programId: number, courseId: number, batch: number) {
    const result = await ConnectionManager.query(CourseProgramCrudQueries.DELETE_BY_COMPOSITE_KEY, [programId, courseId, batch]);
    return result.rows[0] || null;
  }
  // ...existing methods...

  // CourseEval CRUD
  static async getAllCourseEval() {
    const result = await ConnectionManager.query(CourseEvalCrudQueries.GET_ALL);
    return result.rows;
  }

  static async getCourseEvalById(id: number) {
    const result = await getPool().query(CourseEvalCrudQueries.GET_BY_ID, [id]);
    return result.rows[0] || null;
  }

  static async createCourseEval(data: CreateCourseEvalData) {
    const values = [
      data.CourseId,
      data.Lect ?? 0,
      data.Pract ?? 0,
      data.CompTypes ?? 'default',
    ];
    const result = await getPool().query(CourseEvalCrudQueries.CREATE, values);
    return result.rows[0];
  }

  static async updateCourseEval(id: number, data: UpdateCourseEvalData) {
    if (Object.keys(data).length === 0) return null;
    const fields = Object.keys(data);
    const values = [id, ...fields.map(f => (data as any)[f])];
    const query = CourseEvalCrudQueries.UPDATE(fields);
    const result = await getPool().query(query, values);
    return result.rows[0] || null;
  }

  static async deleteCourseEval(id: number) {
    const result = await getPool().query(CourseEvalCrudQueries.DELETE, [id]);
    return result.rows[0] || null;
  }

  // Course CRUD
  static async getAllCourses() {
    const result = await getPool().query(CourseCrudQueries.GET_ALL);
    return result.rows;
  }

  static async getCourseById(id: number) {
    const result = await getPool().query(CourseCrudQueries.GET_BY_ID, [id]);
    return result.rows[0] || null;
  }

  static async getCourseByCode(code: string) {
    const result = await getPool().query(CourseCrudQueries.GET_BY_CODE, [code]);
    return result.rows[0] || null;
  }

  static async createCourse(data: CreateCourseData) {
    const values = [
      data.CourseCode,
      data.CourseName,
      data.Term,
      data.CourseType,
      data.Credit
    ];
    const result = await getPool().query(CourseCrudQueries.CREATE, values);
    return result.rows[0];
  }

  static async updateCourse(id: number, data: UpdateCourseData) {
    if (Object.keys(data).length === 0) return null;
    if ('CourseId' in data) delete (data as any).CourseId;
    const fields = Object.keys(data);
    const values = [id, ...fields.map(f => (data as any)[f])];
    const query = CourseCrudQueries.UPDATE(fields);
    const result = await getPool().query(query, values);
    return result.rows[0] || null;
  }

  static async deleteCourse(id: number) {
    const result = await getPool().query(CourseCrudQueries.DELETE, [id]);
    return result.rows[0] || null;
  }

  // ProgramOptions CRUD
  static async getAllProgramOptions() {
    const result = await getPool().query(ProgramOptionsCrudQueries.GET_ALL);
    return result.rows;
  }

  static async getProgramOptionsByProgramIdTermBatch(programId: number, term: number, batch: number) {
    const result = await getPool().query(ProgramOptionsCrudQueries.GET_BY_PROGRAMID_TERM_BATCH, [programId, term, batch]);
    return result.rows;
  }

  static async createProgramOptions(data: CreateProgramOptionsData) {
    const values = [
      data.ProgramId,
      data.Term,
      data.Batch,
      data.GradingType
    ];
    const result = await getPool().query(ProgramOptionsCrudQueries.CREATE, values);
    return result.rows[0];
  }

  static async updateProgramOptionsByProgramIdTermBatch(programId: number, term: number, batch: number, data: UpdateProgramOptionsData) {
    if (Object.keys(data).length === 0) return null;
    if ('Id' in data) delete (data as any).Id;
    if ('ProgramId' in data) delete (data as any).ProgramId;
    if ('Term' in data) delete (data as any).Term;
    if ('Batch' in data) delete (data as any).Batch;
    const fields = Object.keys(data);
    const values = [programId, term, batch, ...fields.map(f => (data as any)[f])];
    const query = ProgramOptionsCrudQueries.UPDATE_BY_PROGRAMID_TERM_BATCH(fields);
    const result = await getPool().query(query, values);
    return result.rows[0] || null;
  }

  static async deleteProgramOptionsByProgramIdTermBatch(programId: number, term: number, batch: number) {
    const result = await getPool().query(ProgramOptionsCrudQueries.DELETE_BY_PROGRAMID_TERM_BATCH, [programId, term, batch]);
    return result.rows[0] || null;
  }
  // AcademicInfo CRUD
  static async getAllAcademicInfo() {
    const result = await getPool().query(AcademicInfoCrudQueries.GET_ALL);
    return result.rows;
  }

  static async getAcademicInfoByRollNoAndTerm(rollno: string, term: number) {
    const result = await getPool().query(AcademicInfoCrudQueries.GET_BY_ROLLNO_AND_TERM, [rollno, term]);
    return result.rows;
  }

  static async createAcademicInfo(data: CreateAcademicInfoData) {
    const values = [
      data.RollNo,
      data.ProgramId,
      data.AcademicYear,
      data.Term,
      data.CampusId,
      data.Batch
    ];
    const result = await getPool().query(AcademicInfoCrudQueries.CREATE, values);
    return result.rows[0];
  }

  static async updateAcademicInfoByRollNoAndTerm(rollno: string, term: number, data: UpdateAcademicInfoData) {
    if (Object.keys(data).length === 0) return null;
    if ('Id' in data) delete (data as any).Id;
    if ('RollNo' in data) delete (data as any).RollNo;
    if ('Term' in data) delete (data as any).Term;
    const fields = Object.keys(data);
    const values = [rollno, term, ...fields.map(f => (data as any)[f])];
    const query = AcademicInfoCrudQueries.UPDATE_BY_ROLLNO_AND_TERM(fields);
    const result = await getPool().query(query, values);
    return result.rows[0] || null;
  }

  static async deleteAcademicInfoByRollNoAndTerm(rollno: string, term: number) {
    const result = await getPool().query(
      `DELETE FROM AcademicInfo WHERE RollNo = $1 AND Term = $2 RETURNING *`,
      [rollno, term]
    );
    return result.rows[0] || null;
  }

   // ProgramInfo CRUD
  static async getAllProgramInfo() {
    const result = await getPool().query(ProgramInfoCrudQueries.GET_ALL);
    return result.rows;
  }

  static async getProgramInfoById(programId: number) {
    const result = await getPool().query(ProgramInfoCrudQueries.GET_BY_ID, [programId]);
    return result.rows[0] || null;
  }

  static async createProgramInfo(data: CreateProgramInfoData) {
    const values = [
       data.ProgramId,
      data.ProgramCode,
      data.ProgramName,
      data.ProgramType,
      data.TermType,
      data.Specialisation ?? false,
      data.SpecialCode ?? null,
      data.SpecialName ?? null
    ];
    const result = await getPool().query(ProgramInfoCrudQueries.CREATE, values);
    return result.rows[0];
  }

  static async updateProgramInfo(programId: number, data: UpdateProgramInfoData) {
    if (Object.keys(data).length === 0) return null;
    if ('ProgramId' in data) delete (data as any).ProgramId;
    const fields = Object.keys(data);
    const values = [programId, ...fields.map(f => (data as any)[f])];
    const query = ProgramInfoCrudQueries.UPDATE(fields);
    const result = await getPool().query(query, values);
    return result.rows[0] || null;
  }

  static async deleteProgramInfo(programId: number) {
    const result = await getPool().query(ProgramInfoCrudQueries.DELETE, [programId]);
    return (result.rowCount ?? 0) > 0;
  }


  static async getAllPersonalInfo() {
    const result = await getPool().query(PersonalInfoCrudQueries.GET_ALL);
    return result.rows;
  }

  static async getPersonalInfoByRollNo(rollno: string) {
    const result = await getPool().query(PersonalInfoCrudQueries.GET_BY_ROLL_NO, [rollno]);
    return result.rows[0] || null;
  }

  static async createPersonalInfo(data: any) {
    const values = [
      data.RollNo,
      data.Name,
      data.Father,
      data.Mother,
      data.Abc,
      data.DOB,
      data.Category,
      data.Gender,
      data.Pwd,
      data.Phone,
      data.Email,
      data.Password,
      data.IsVerified,
      data.AdmissionYear,
      data.LE
    ];
    const result = await getPool().query(PersonalInfoCrudQueries.CREATE, values);
    return result.rows[0];
  }

 static async updatePersonalInfo(rollno: string, data: any) {
    // Remove RollNo from update fields if present
    const updateData = { ...data };
    delete updateData.RollNo;

    const fields = Object.keys(updateData);
    if (fields.length === 0) return null;

    const values = [rollno, ...fields.map(f => updateData[f])];
    const query = PersonalInfoCrudQueries.UPDATE(fields);
    const result = await getPool().query(query, values);
    const updatedPersonal = result.rows[0] || null;

    // --- Batch update logic for AcademicInfo ---
    // If LE or AdmissionYear is being updated, update AcademicInfo.Batch accordingly
    if (('LE' in updateData) || ('le' in updateData) || ('admissionyear' in updateData) || ('AdmissionYear' in updateData)) {
        // Get the latest values (from update or DB)
        let le = updateData.LE !== undefined ? updateData.LE : updateData.le;
        let admissionYear = updateData.AdmissionYear !== undefined ? updateData.AdmissionYear : updateData.admissionyear;

        // Convert string to boolean if needed
        if (typeof le === 'string') {
            le = le.toLowerCase() === 'true';
        }
        // Convert string to number if needed
        if (typeof admissionYear === 'string') {
            admissionYear = parseInt(admissionYear, 10);
        }

        if (le === undefined || admissionYear === undefined) {
            // Fetch from DB if not present in update
            const personal = await getPool().query(PersonalInfoCrudQueries.GET_BY_ROLL_NO, [rollno]);
            if (le === undefined) le = personal.rows[0]?.le;
            if (admissionYear === undefined) admissionYear = personal.rows[0]?.admissionyear;
        }
        // Only proceed if both are available and valid
        if (admissionYear !== undefined && admissionYear !== null) {
            let batch = (le ? admissionYear - 1 : admissionYear);
            await getPool().query(
                `UPDATE AcademicInfo SET Batch = $1, UpdatedAt = (NOW() AT TIME ZONE 'Asia/Kolkata') WHERE RollNo = $2`,
                [batch, rollno]
            );
        }
    }

    return updatedPersonal;
}

  static async deletePersonalInfo(rollno: string) {
    const result = await getPool().query(PersonalInfoCrudQueries.DELETE, [rollno]);
    return result.rows[0] || null;
  }
  // Campuses CRUD
  static async getAllCampuses() {
    const result = await getPool().query(CampusQueries.GET_ALL);
    return result.rows;
  }

  static async getCampusById(id: number) {
    const result = await getPool().query(CampusQueries.GET_BY_ID, [id]);
    return result.rows[0] || null;
  }

  static async createCampus(data: CampusData) {
    const result = await getPool().query(CampusQueries.CREATE, [data.CampusId,data.CampusCode, data.CampusName]);
    return result.rows[0];
  }

  static async updateCampus(id: number, data: Partial<CampusData>) {
    // Only update provided fields
    const fields: string[] = [];
    const values: any[] = [];
    if (data.CampusCode !== undefined) {
      fields.push('CampusCode');
      values.push(data.CampusCode);
    }
    if (data.CampusName !== undefined) {
      fields.push('CampusName');
      values.push(data.CampusName);
    }
    if (fields.length === 0) return null;
    // Build dynamic SQL
    const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
    const query = `UPDATE CampusInfo SET ${setClause}, UpdatedAt = (NOW() AT TIME ZONE 'Asia/Kolkata') WHERE CampusId = $${fields.length + 1} RETURNING *`;
    values.push(id);
    const result = await getPool().query(query, values);
    return result.rows[0] || null;
  }

  static async deleteCampus(id: number) {
    const result = await getPool().query(CampusQueries.DELETE, [id]);
    return (result.rowCount ?? 0) > 0;
  }
  
  // AdminOTP operations
  static async createAdminOTP(otpData: CreateAdminOTPData): Promise<AdminOTP> {
    try {
      const values = [otpData.adminid, otpData.otp, otpData.email, otpData.attempt || 3, otpData.createdat || new Date()];
      const result = await getPool().query(AdminOTPQueries.CREATE_ADMIN_OTP, values);
      return result.rows[0];
    } catch (error) {
      console.error("Error creating Admin OTP:", error);
      throw new Error("Failed to create Admin OTP");
    }
  }

  static async findLatestAdminOTP(adminid: string, email: string): Promise<AdminOTP | null> {
    try {
      const result = await getPool().query(AdminOTPQueries.FIND_LATEST_ADMIN_OTP, [adminid, email]);
      return result.rows[0] || null;
    } catch (error) {
      console.error("Error finding latest Admin OTP:", error);
      throw new Error("Database query failed");
    }
  }

  static async updateAdminOTPAttempt(adminid: string, email: string, attempt: number, createdat: Date, otp: number | null): Promise<AdminOTP | null> {
    try {
      const result = await getPool().query(AdminOTPQueries.UPDATE_ADMIN_OTP_ATTEMPT, [adminid, email, attempt, createdat, otp]);
      return result.rows[0] || null;
    } catch (error) {
      console.error("Error updating Admin OTP attempt:", error);
      throw new Error("Failed to update Admin OTP attempt");
    }
  }

  static async expireAdminOTP(adminid: string, email: string): Promise<void> {
    try {
      await getPool().query(AdminOTPQueries.EXPIRE_ADMIN_OTP, [adminid, email]);
    } catch (error) {
      console.error("Error expiring Admin OTP:", error);
      throw new Error("Failed to expire Admin OTP");
    }
  }
  // ... rest of DatabaseService class ...
  // PersonalInfo operations
  static async findUserByRollNumber(rollno: string): Promise<PersonalInfo | null> {
    try {
      const result = await getPool().query(PersonalInfoQueries.FIND_BY_ROLLNO, [rollno]);
      return result.rows[0] || null;
    } catch (error) {
      console.error("Error finding user by roll number:", error);
      throw new Error("Database query failed");
    }
  }

  static async findUserByEmail(email: string): Promise<PersonalInfo | null> {
    try {
      const result = await getPool().query(PersonalInfoQueries.FIND_BY_EMAIL, [email]);
      return result.rows[0] || null;
    } catch (error) {
      console.error("Error finding user by email:", error);
      throw new Error("Database query failed");
    }
  }

  static async createUser(userData: CreatePersonalInfoData): Promise<PersonalInfo> {
    try {
      const values = [
        userData.rollno,
        userData.name,
        userData.email,
        userData.father,
        userData.mother,
        userData.abc,
        userData.dob,
        userData.category,
        userData.gender,
        userData.pwd,
        userData.phone,
        userData.admissionyear,
        userData.le
      ];
      const result = await getPool().query(PersonalInfoQueries.CREATE_USER, values);
      return result.rows[0];
    } catch (error) {
      console.error("Error creating user:", error);
      throw new Error("Failed to create user");
    }
  }

  static async updateUser(rollno: string, updateData: UpdatePersonalInfoData): Promise<PersonalInfo | null> {
    try {
      // Handle password update with verification
      if (updateData.password !== undefined) {
        const result = await getPool().query(
          PersonalInfoQueries.UPDATE_PASSWORD, 
          [updateData.password, updateData.isverified || true, rollno]
        );
        return result.rows[0] || null;
      }

      // Handle phone update
      if (updateData.phone !== undefined) {
        const result = await getPool().query(
          PersonalInfoQueries.UPDATE_PHONE, 
          [updateData.phone, rollno]
        );
        return result.rows[0] || null;
      }

      // Handle verification status update
      if (updateData.isverified !== undefined) {
        const result = await getPool().query(
          PersonalInfoQueries.UPDATE_VERIFICATION, 
          [updateData.isverified, rollno]
        );
        return result.rows[0] || null;
      }

      return null;
    } catch (error) {
      console.error("Error updating user:", error);
      throw new Error("Failed to update user");
    }
  }

  static async userExists(rollno: string): Promise<boolean> {
    try {
      const result = await getPool().query(PersonalInfoQueries.USER_EXISTS, [rollno]);
      return result.rows[0]?.exists || false;
    } catch (error) {
      console.error("Error checking user existence:", error);
      throw new Error("Database query failed");
    }
  }

  static async getUserStats(): Promise<any> {
    try {
      const result = await getPool().query(PersonalInfoQueries.GET_USER_STATS);
      return result.rows[0];
    } catch (error) {
      console.error("Error getting user stats:", error);
      throw new Error("Database query failed");
    }
  }  // OTP operations
  static async createOTP(otpData: CreateOTPData): Promise<OTP> {
    try {
      // No longer automatically delete existing OTP - preserve time records
      const pool = await getPoolSafe();// This waits for initialization
      const values = [otpData.rollno, otpData.otp, otpData.email, otpData.attempt || 3, otpData.createdat || new Date()];
      const result = await getPool().query(OTPQueries.CREATE_OTP, values);
      return result.rows[0];
    } catch (error) {
      console.error("Error creating OTP:", error);
      throw new Error("Failed to create OTP");
    }
  }

  // Create or update OTP record (preserves time records)
  static async createOrUpdateOTP(otpData: CreateOTPData): Promise<OTP> {
    try {
      // Check if record exists
      const existing = await this.findLatestOTP(otpData.rollno, otpData.email);
      
      if (existing) {
        // Update existing record
        return await this.updateOTPAttempt(
          otpData.rollno, 
          otpData.email, 
          otpData.attempt === 0 ? 0 : (otpData.attempt ?? 3), 
          otpData.createdat || new Date(), 
          otpData.otp
        ) || existing;
      } else {
        // Create new record
        return await this.createOTP(otpData);
      }
    } catch (error) {
      console.error("Error creating or updating OTP:", error);
      throw new Error("Failed to create or update OTP");
    }
  }

  static async findLatestOTP(rollno: string, email: string): Promise<OTP | null> {
    try {
      const result = await getPool().query(OTPQueries.FIND_LATEST_OTP, [rollno, email]);
      return result.rows[0] || null;
    } catch (error) {
      console.error("Error finding latest OTP:", error);
      throw new Error("Database query failed");
    }
  }

  static async getOTPAttemptCount(rollno: string, email: string): Promise<number> {
    try {
      const result = await getPool().query(OTPQueries.GET_ATTEMPT_COUNT, [rollno, email]);
      return parseInt(result.rows[0]?.attempt_count || '0');
    } catch (error) {
      console.error("Error getting OTP attempt count:", error);
      return 0;
    }
  }  static async deleteOTP(rollno: string, email: string): Promise<void> {
    try {
      const query = "DELETE FROM OTP WHERE rollno = $1 AND email = $2";
      await getPool().query(query, [rollno, email]);
    } catch (error) {
      console.error("Error deleting OTP:", error);
      throw new Error("Failed to delete OTP");
    }
  }

  // New method to expire OTP (set OTP to null) instead of deleting
  static async expireOTP(rollno: string, email: string): Promise<void> {
    try {
      const query = "UPDATE OTP SET otp = NULL WHERE rollno = $1 AND email = $2";
      await getPool().query(query, [rollno, email]);
    } catch (error) {
      console.error("Error expiring OTP:", error);
      throw new Error("Failed to expire OTP");
    }
  }
  static async getOTPCount(rollno: string, email: string): Promise<number> {
    try {
      const query = "SELECT COUNT(*) as count FROM OTP WHERE rollno = $1 AND email = $2";
      const result = await getPool().query(query, [rollno, email]);
      return parseInt(result.rows[0]?.count || '0');
    } catch (error) {
      console.error("Error getting OTP count:", error);
      return 0;
    }
  }

  static async cleanupDuplicateOTPs(rollno: string, email: string): Promise<void> {
    try {
      await getPool().query(OTPQueries.CLEANUP_DUPLICATE_OTPS, [rollno, email]);
    } catch (error) {
      console.error("Error cleaning up duplicate OTPs:", error);
      throw new Error("Failed to cleanup duplicate OTPs");
    }
  }
  static async updateOTPAttempt(rollno: string, email: string, attempt: number, createdat: Date, otp: number | null): Promise<OTP | null> {
    try {
      const result = await getPool().query(OTPQueries.UPDATE_OTP_ATTEMPT, [rollno, email, attempt, createdat, otp]);
      return result.rows[0] || null;
    } catch (error) {
      console.error("Error updating OTP attempt:", error);
      throw new Error("Failed to update OTP attempt");
    }
  }

  static async updateAttemptCount(rollno: string, email: string, attempt: number): Promise<OTP | null> {
    try {
      const result = await getPool().query(OTPQueries.UPDATE_ATTEMPT_COUNT, [rollno, email, attempt]);
      return result.rows[0] || null;
    } catch (error) {
      console.error("Error updating attempt count:", error);
      throw new Error("Failed to update attempt count");
    }
  }

  static async deleteExpiredOTPs(): Promise<void> {
    try {
      await getPool().query(OTPQueries.DELETE_EXPIRED_OTPS);
    } catch (error) {
      console.error("Error deleting expired OTPs:", error);
    }
  }

  static async cleanupOldOTPs(): Promise<void> {
    try {
      await getPool().query(OTPQueries.CLEANUP_OLD_OTPS);
    } catch (error) {
      console.error("Error cleaning up old OTPs:", error);
    }
  }

  // Validation operations
  static async emailExists(email: string): Promise<boolean> {
    try {
      const result = await getPool().query(ValidationQueries.EMAIL_EXISTS, [email]);
      return result.rows[0]?.exists || false;
    } catch (error) {
      console.error("Error checking email existence:", error);
      return false;
    }
  }

  static async validateRollNoFormat(rollno: string): Promise<boolean> {
    try {
      const result = await getPool().query(ValidationQueries.VALIDATE_ROLLNO_FORMAT, [rollno]);
      return result.rows[0]?.is_valid || false;
    } catch (error) {
      console.error("Error validating roll number format:", error);
      return false;
    }
  }

  // Admin operations
  static async getDBHealth(): Promise<any> {
    try {
      const result = await getPool().query(AdminQueries.GET_DB_HEALTH);
      return result.rows[0];
    } catch (error) {
      console.error("Error getting DB health:", error);
      throw new Error("Database query failed");
    }
  }

  static async getUserActivity(limit: number = 50, offset: number = 0): Promise<any[]> {
    try {
      const result = await getPool().query(AdminQueries.GET_USER_ACTIVITY, [limit, offset]);
      return result.rows;
    } catch (error) {
      console.error("Error getting user activity:", error);
      throw new Error("Database query failed");
    }
  }

  static async getFailedAttempts(): Promise<any[]> {
    try {
      const result = await getPool().query(AdminQueries.GET_FAILED_ATTEMPTS);
      return result.rows;
    } catch (error) {
      console.error("Error getting failed attempts:", error);
      throw new Error("Database query failed");
    }
  }
  static async insertTempData() : Promise<void> {
    try {
      await getPool().query(TemporaryDataQueries.SAMPLE_DATA);
    } catch (error) {
      console.error("Error inserting temporary data:", error);
      throw new Error("Failed to insert temporary data");
    }
  }
  static async deleteTempData(): Promise<void> {
    try {
      await getPool().query(TemporaryDataQueries.DELETE_DATA);
    } catch (error) {
      console.error("Error deleting temporary data:", error);
      throw new Error("Failed to delete temporary data");
    }
  }
  static async insertTempPersonalData(): Promise<void> {
    try {
      await getPool().query(TemporaryDataQueries.SAMPLE_PERSONAL_DATA);
    } catch (error) {
      console.error("Error inserting temporary personal data:", error);
      throw new Error("Failed to insert temporary personal data");
    }
  }

  static async getMaxCampusId(): Promise<number | null> {
    try {
      const result = await getPool().query(
        `SELECT MAX(CampusId) as max_id FROM CampusInfo`
      );
      return result.rows[0].max_id;
    } catch (error) {
      console.error('Error getting max campus ID:', error);
      throw error;
    }
  }

  static async getMaxProgramId(): Promise<number | null> {
    try {
      const result = await getPool().query(
        `SELECT MAX(ProgramId) as max_id FROM ProgramInfo`
      );
      return result.rows[0].max_id;
    } catch (error) {
      console.error('Error getting max program ID:', error);
      throw error;
    }
  }

  // Marks Entry Validation Methods
  static async validateCourseCode(courseCode: string): Promise<boolean> {
    try {
      const result = await getPool().query(MarksValidationQueries.COURSE_CODE_EXISTS, [courseCode]);
      return result.rows[0]?.exists || false;
    } catch (error) {
      console.error("Error validating course code:", error);
      return false;
    }
  }  static async getCourseDetailsForValidation(courseCode: string): Promise<any> {
    try {
      const result = await getPool().query(MarksValidationQueries.GET_COURSE_BY_CODE, [courseCode]);
      return result.rows[0] || null;
    } catch (error) {
      console.error("Error getting course by code:", error);
      return null;
    }
  }

  static async validateCourseName(courseCode: string, expectedCourseName: string): Promise<{ isValid: boolean; actualCourseName?: string }> {
    try {
      const result = await getPool().query(MarksValidationQueries.GET_COURSE_BY_CODE, [courseCode]);
      if (result.rows.length === 0) {
        return { isValid: false };
      }
      
      const actualCourseName = result.rows[0].coursename;
      const isValid = actualCourseName.toLowerCase().trim() === expectedCourseName.toLowerCase().trim();
      
      return { isValid, actualCourseName };
    } catch (error) {
      console.error("Error validating course name:", error);
      return { isValid: false };
    }
  }

  static async validateRollNumber(rollNumber: string): Promise<boolean> {
    try {
      const result = await getPool().query(MarksValidationQueries.ROLLNO_EXISTS, [rollNumber]);
      return result.rows[0]?.exists || false;
    } catch (error) {
      console.error("Error validating roll number:", error);
      return false;
    }
  }

  static async validateStudentName(rollNumber: string, expectedName: string): Promise<{ isValid: boolean; actualName?: string }> {
    try {
      const pool = await getPoolSafe();
      const result = await getPool().query(MarksValidationQueries.GET_STUDENT_BY_ROLLNO, [rollNumber]);
      if (result.rows.length === 0) {
        return { isValid: false };
      }
      
      const actualName = result.rows[0].name;
      const isValid = actualName.toLowerCase().trim() === expectedName.toLowerCase().trim();
      
      return { isValid, actualName };
    } catch (error) {
      console.error("Error validating student name:", error);
      return { isValid: false };
    }
  }

  static async validateStudentEnrollment(rollNumber: string): Promise<boolean> {
    try {
      const result = await getPool().query(MarksValidationQueries.STUDENT_ENROLLED, [rollNumber]);
      return result.rows[0]?.enrolled || false;
    } catch (error) {
      console.error("Error validating student enrollment:", error);
      return false;
    }
  }

  static async getStudentAcademicInfo(rollNumber: string): Promise<any> {
    try {
      const result = await getPool().query(MarksValidationQueries.GET_STUDENT_ACADEMIC_INFO, [rollNumber]);
      return result.rows[0] || null;
    } catch (error) {
      console.error("Error getting student academic info:", error);
      return null;
    }
  }

  static async validateCourseForProgram(courseCode: string, programId: number, batch: number): Promise<boolean> {
    try {
      const result = await getPool().query(MarksValidationQueries.COURSE_PROGRAM_MATCH, [courseCode, programId, batch]);
      return result.rows[0]?.course_offered || false;
    } catch (error) {
      console.error("Error validating course program match:", error);
      return false;
    }
  }

  static async validateMarksEntry(marksData: any[]): Promise<any[]> {
    const validationResults: any[] = [];

    for (let i = 0; i < marksData.length; i++) {
      const entry = marksData[i];
      const validationResult = {
        ...entry,
        remark: "No issues",
        rowNumber: i + 2 // Assuming row 1 is header
      };

      try {        // Validate course code exists
        const courseExists = await DatabaseService.validateCourseCode(entry.courseCode);
        if (!courseExists) {
          validationResult.remark = `Course code '${entry.courseCode}' does not exist in the database`;
          validationResults.push(validationResult);
          continue;
        }

        // Validate course name matches
        const courseNameValidation = await DatabaseService.validateCourseName(entry.courseCode, entry.course);
        if (!courseNameValidation.isValid) {
          validationResult.remark = `Course name mismatch. Expected: '${courseNameValidation.actualCourseName}', Found: '${entry.course}'`;
          validationResults.push(validationResult);
          continue;
        }

        // Validate roll number exists
        const rollNumberExists = await DatabaseService.validateRollNumber(entry.rollNumber);
        if (!rollNumberExists) {
          validationResult.remark = `Roll number '${entry.rollNumber}' does not exist in the database`;
          validationResults.push(validationResult);
          continue;
        }

        // Validate student name matches
        const studentNameValidation = await DatabaseService.validateStudentName(entry.rollNumber, entry.studentName || "");
        if (!studentNameValidation.isValid && entry.studentName) {
          validationResult.remark = `Student name mismatch. Expected: '${studentNameValidation.actualName}', Found: '${entry.studentName}'`;
          validationResults.push(validationResult);
          continue;
        }

        // Validate student enrollment
        const isEnrolled = await DatabaseService.validateStudentEnrollment(entry.rollNumber);
        if (!isEnrolled) {
          validationResult.remark = `Student with roll number '${entry.rollNumber}' is not enrolled in the academic system`;
          validationResults.push(validationResult);
          continue;
        }

        // Get student academic info for further validation
        const academicInfo = await DatabaseService.getStudentAcademicInfo(entry.rollNumber);
        if (academicInfo) {
          // Validate if course is offered for the student's program and batch
          const courseOffered = await DatabaseService.validateCourseForProgram(entry.courseCode, academicInfo.programid, academicInfo.batch);
          if (!courseOffered) {
            validationResult.remark = `Course '${entry.courseCode}' is not offered for program '${academicInfo.programcode}' batch ${academicInfo.batch}`;
            validationResults.push(validationResult);
            continue;
          }
        }

        // Validate marks obtained
        if (entry.marksObtained !== undefined && entry.marksObtained !== null) {
          const marks = parseFloat(entry.marksObtained);
          const maxMarks = parseFloat(entry.maximumMarks || 100);

          if (isNaN(marks) && entry.marksObtained !== 'X' && entry.marksObtained !== 'U') {
            validationResult.remark = "MARKS_OBTAINED must be a valid number, 'X', or 'U'";
            validationResults.push(validationResult);
            continue;
          }

          if (!isNaN(marks) && marks > maxMarks) {
            validationResult.remark = "MARKS_OBTAINED cannot exceed MAXIMUM_MARKS";
            validationResults.push(validationResult);
            continue;
          }

          if (!isNaN(marks) && marks < 0) {
            validationResult.remark = "MARKS_OBTAINED cannot be negative";
            validationResults.push(validationResult);
            continue;
          }
        }

        // If we reach here, no issues found
        validationResults.push(validationResult);

      } catch (error) {
        console.error(`Error validating entry at row ${i + 2}:`, error);
        validationResult.remark = "Internal validation error occurred";
        validationResults.push(validationResult);
      }
    }

    return validationResults;
  }

  static async getStudentByRollNumber(rollNumber: string): Promise<any> {
    try {
      const result = await getPool().query(MarksValidationQueries.GET_STUDENT_BY_ROLLNO, [rollNumber]);
      return result.rows[0] || null;
    } catch (error) {
      console.error("Error getting student by roll number:", error);
      return null;
    }
  }

  static async isStudentEnrolled(rollNumber: string): Promise<boolean> {
    try {
      const result = await getPool().query(MarksValidationQueries.STUDENT_ENROLLED, [rollNumber]);
      return result.rows[0]?.enrolled || false;
    } catch (error) {
      console.error("Error checking student enrollment:", error);
      return false;
    }
  }

  static async validateCourseProgramMatch(courseCode: string, programId: number, batch: number): Promise<boolean> {
    try {
      const result = await getPool().query(MarksValidationQueries.COURSE_PROGRAM_MATCH, [courseCode, programId, batch]);
      return result.rows[0]?.course_offered || false;
    } catch (error) {
      console.error("Error validating course program match:", error);
      return false;
    }
  }
}


// we will add neccesary service logic regarding grievance
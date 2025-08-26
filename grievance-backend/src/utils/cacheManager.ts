/**
 * Cache Manager for Grievance Portal
 * Provides high-level caching strategies for different data types
 */

import cache, { CacheKeys, CacheTTL, CacheUtils } from './cache';
import { AdminInfo } from '../models/AdminInfo';
import { PersonalInfo } from '../models/PersonalInfo';
import { CampusInfo } from '../models/CampusInfo';
import { Grievance } from '../models/Grievance';
import { Tracking } from '../models/Tracking';

export class CacheManager {
  /**
   * Admin-related caching methods
   */
  static async cacheAdminData(adminId: string, adminData: AdminInfo): Promise<void> {
    const key = CacheKeys.adminById(adminId);
    cache.set(key, adminData, CacheTTL.MEDIUM);
    
    // Also cache by department and campus if available
    if (adminData.Department) {
      const deptKey = CacheKeys.adminsByDepartment(adminData.Department);
      const existingDeptAdmins = cache.get<AdminInfo[]>(deptKey) || [];
      const updatedDeptAdmins = [...existingDeptAdmins.filter(a => a.AdminID !== adminId), adminData];
      cache.set(deptKey, updatedDeptAdmins, CacheTTL.MEDIUM);
    }
    
    if (adminData.CampusId) {
      const campusKey = CacheKeys.adminsByCampus(adminData.CampusId);
      const existingCampusAdmins = cache.get<AdminInfo[]>(campusKey) || [];
      const updatedCampusAdmins = [...existingCampusAdmins.filter(a => a.AdminID !== adminId), adminData];
      cache.set(campusKey, updatedCampusAdmins, CacheTTL.MEDIUM);
    }
  }

  static async getAdminData(adminId: string): Promise<AdminInfo | null> {
    return cache.get<AdminInfo>(CacheKeys.adminById(adminId));
  }

  static async invalidateAdminCache(adminId: string): Promise<void> {
    cache.delete(CacheKeys.adminById(adminId));
    // Invalidate related caches
    CacheUtils.invalidatePattern('admins:');
  }

  /**
   * Student-related caching methods
   */
  static async cacheStudentData(rollno: string, studentData: PersonalInfo): Promise<void> {
    const key = CacheKeys.studentByRollNo(rollno);
    cache.set(key, studentData, CacheTTL.MEDIUM);
  }

  static async getStudentData(rollno: string): Promise<PersonalInfo | null> {
    return cache.get<PersonalInfo>(CacheKeys.studentByRollNo(rollno));
  }

  static async invalidateStudentCache(rollno: string): Promise<void> {
    cache.delete(CacheKeys.studentByRollNo(rollno));
  }

  /**
   * Campus-related caching methods
   */
  static async cacheCampusData(campusId: number, campusData: CampusInfo): Promise<void> {
    const key = CacheKeys.campusById(campusId);
    cache.set(key, campusData, CacheTTL.LONG);
    
    // Update all campuses cache
    const allCampusesKey = CacheKeys.allCampuses();
    const existingCampuses = cache.get<CampusInfo[]>(allCampusesKey) || [];
    const updatedCampuses = [...existingCampuses.filter(c => c.campusid !== campusId), campusData];
    cache.set(allCampusesKey, updatedCampuses, CacheTTL.LONG);
  }

  static async getCampusData(campusId: number): Promise<CampusInfo | null> {
    return cache.get<CampusInfo>(CacheKeys.campusById(campusId));
  }

  static async getAllCampuses(): Promise<CampusInfo[] | null> {
    return cache.get<CampusInfo[]>(CacheKeys.allCampuses());
  }

  static async cacheAllCampuses(campuses: CampusInfo[]): Promise<void> {
    cache.set(CacheKeys.allCampuses(), campuses, CacheTTL.LONG);
    
    // Cache individual campuses too
    campuses.forEach(campus => {
      cache.set(CacheKeys.campusById(campus.campusid), campus, CacheTTL.LONG);
    });
  }

  /**
   * Grievance-related caching methods
   */
  static async cacheGrievanceData(grievanceId: string, grievanceData: Grievance): Promise<void> {
    const key = CacheKeys.grievanceById(grievanceId);
    cache.set(key, grievanceData, CacheTTL.SHORT); // Grievances change frequently
  }

  static async getGrievanceData(grievanceId: string): Promise<Grievance | null> {
    return cache.get<Grievance>(CacheKeys.grievanceById(grievanceId));
  }

  static async invalidateGrievanceCache(grievanceId: string): Promise<void> {
    cache.delete(CacheKeys.grievanceById(grievanceId));
    // Invalidate status-based caches
    CacheUtils.invalidatePattern('grievances:status:');
    CacheUtils.invalidatePattern('grievances:admin:');
  }

  /**
   * Statistics caching methods
   */
  static async cacheSystemStats(stats: any): Promise<void> {
    cache.set(CacheKeys.systemStats(), stats, CacheTTL.MEDIUM);
  }

  static async getSystemStats(): Promise<any | null> {
    return cache.get(CacheKeys.systemStats());
  }

  static async cacheCampusStats(campusId: number, stats: any): Promise<void> {
    cache.set(CacheKeys.campusStats(campusId), stats, CacheTTL.MEDIUM);
  }

  static async getCampusStats(campusId: number): Promise<any | null> {
    return cache.get(CacheKeys.campusStats(campusId));
  }

  static async cacheDepartmentStats(department: string, stats: any): Promise<void> {
    cache.set(CacheKeys.departmentStats(department), stats, CacheTTL.MEDIUM);
  }

  static async getDepartmentStats(department: string): Promise<any | null> {
    return cache.get(CacheKeys.departmentStats(department));
  }

  /**
   * Issue list caching methods
   */
  static async cacheIssueList(issues: any[]): Promise<void> {
    cache.set(CacheKeys.issueList(), issues, CacheTTL.VERY_LONG);
  }

  static async getIssueList(): Promise<any[] | null> {
    return cache.get<any[]>(CacheKeys.issueList());
  }

  static async cacheIssuesByCategory(category: string, issues: any[]): Promise<void> {
    cache.set(CacheKeys.issuesByCategory(category), issues, CacheTTL.VERY_LONG);
  }

  static async getIssuesByCategory(category: string): Promise<any[] | null> {
    return cache.get<any[]>(CacheKeys.issuesByCategory(category));
  }

  /**
   * Program and academic info caching
   */
  static async cacheAllPrograms(programs: any[]): Promise<void> {
    cache.set(CacheKeys.allPrograms(), programs, CacheTTL.STATIC);
  }

  static async getAllPrograms(): Promise<any[] | null> {
    return cache.get<any[]>(CacheKeys.allPrograms());
  }

  static async cacheAcademicInfo(academicInfo: any[]): Promise<void> {
    cache.set(CacheKeys.academicInfo(), academicInfo, CacheTTL.STATIC);
  }

  static async getAcademicInfo(): Promise<any[] | null> {
    return cache.get<any[]>(CacheKeys.academicInfo());
  }

  /**
   * Cache maintenance methods
   */
  static async clearAllCaches(): Promise<void> {
    cache.clear();
  }

  static async invalidateStatsCaches(): Promise<void> {
    CacheUtils.invalidatePattern('stats:');
  }

  static async invalidateUserCaches(): Promise<void> {
    CacheUtils.invalidatePattern('admin:');
    CacheUtils.invalidatePattern('student:');
    CacheUtils.invalidatePattern('admins:');
  }

  static async warmupCache(): Promise<void> {
    // Pre-populate frequently accessed data
    console.log('Starting cache warmup...');
    
    try {
      // This would be called during application startup
      // to pre-populate cache with essential data
      console.log('Cache warmup completed successfully');
    } catch (error) {
      console.error('Cache warmup failed:', error);
    }
  }

  /**
   * Get cache statistics
   */
  static getCacheStats() {
    return {
      ...cache.getStats(),
      keyCount: cache.size(),
      memoryUsage: process.memoryUsage()
    };
  }

  /**
   * Initialize cache manager
   */
  static initialize(): void {
    // Start cleanup schedule
    CacheUtils.startCleanupSchedule();
    
    // Warmup cache
    this.warmupCache();
    
    console.log('Cache Manager initialized successfully');
  }
}

// Export utilities
export { CacheKeys, CacheTTL, CacheUtils };
export default CacheManager;

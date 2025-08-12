/**
 * In-memory cache utility for the grievance portal
 * Optimized for frequently accessed data like admin lists, campus info, etc.
 */

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class MemoryCache {
  private cache = new Map<string, CacheItem<any>>();
  private readonly maxSize: number;
  private readonly defaultTTL: number;

  constructor(maxSize: number = 1000, defaultTTL: number = 5 * 60 * 1000) { // 5 minutes default
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  /**
   * Set a value in cache with optional TTL
   */
  set<T>(key: string, data: T, ttl?: number): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    });
  }

  /**
   * Get a value from cache (returns null if expired or not found)
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // Check if expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete a specific key
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * Get all cache keys
   */
  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    totalRequests: number;
    totalHits: number;
  } {
    // Basic stats - can be enhanced with hit/miss tracking
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0, // Would need hit/miss tracking
      totalRequests: 0,
      totalHits: 0
    };
  }
}

// Singleton cache instance
const cache = new MemoryCache();

// Cache key generators for different data types
export const CacheKeys = {
  // Admin-related cache keys
  adminById: (adminId: string) => `admin:${adminId}`,
  adminsByCampus: (campusId: number) => `admins:campus:${campusId}`,
  adminsByDepartment: (department: string) => `admins:dept:${department}`,
  
  // Campus-related cache keys
  campusById: (campusId: number) => `campus:${campusId}`,
  allCampuses: () => 'campuses:all',
  
  // Grievance-related cache keys
  grievanceById: (grievanceId: string) => `grievance:${grievanceId}`,
  grievancesByStatus: (status: string) => `grievances:status:${status}`,
  grievancesByAdmin: (adminId: string) => `grievances:admin:${adminId}`,
  
  // Statistics cache keys
  systemStats: () => 'stats:system',
  campusStats: (campusId: number) => `stats:campus:${campusId}`,
  departmentStats: (department: string) => `stats:dept:${department}`,
  
  // Issue list cache
  issueList: () => 'issues:all',
  issuesByCategory: (category: string) => `issues:category:${category}`,
  
  // Student info cache
  studentByRollNo: (rollno: string) => `student:${rollno}`,
  
  // Program and academic info
  allPrograms: () => 'programs:all',
  academicInfo: () => 'academic:all'
} as const;

// Cache TTL constants (in milliseconds)
export const CacheTTL = {
  SHORT: 1 * 60 * 1000,      // 1 minute
  MEDIUM: 5 * 60 * 1000,     // 5 minutes
  LONG: 15 * 60 * 1000,      // 15 minutes
  VERY_LONG: 60 * 60 * 1000, // 1 hour
  STATIC: 24 * 60 * 60 * 1000 // 24 hours (for rarely changing data)
} as const;

// Exported cache utilities
export const CacheUtils = {
  /**
   * Get or set with a fallback function
   */
  async getOrSet<T>(
    key: string, 
    fallback: () => Promise<T>, 
    ttl: number = CacheTTL.MEDIUM
  ): Promise<T> {
    let data = cache.get<T>(key);
    
    if (data === null) {
      data = await fallback();
      cache.set(key, data, ttl);
    }
    
    return data;
  },

  /**
   * Invalidate related cache entries by pattern
   */
  invalidatePattern(pattern: string): number {
    let deletedCount = 0;
    
    for (const key of cache.getKeys()) {
      if (key.includes(pattern)) {
        cache.delete(key);
        deletedCount++;
      }
    }
    
    return deletedCount;
  },

  /**
   * Cache admin data
   */
  cacheAdmin: (adminId: string, adminData: any, ttl: number = CacheTTL.MEDIUM) => {
    cache.set(CacheKeys.adminById(adminId), adminData, ttl);
  },

  /**
   * Cache campus data
   */
  cacheCampus: (campusId: number, campusData: any, ttl: number = CacheTTL.LONG) => {
    cache.set(CacheKeys.campusById(campusId), campusData, ttl);
  },

  /**
   * Cache grievance data
   */
  cacheGrievance: (grievanceId: string, grievanceData: any, ttl: number = CacheTTL.SHORT) => {
    cache.set(CacheKeys.grievanceById(grievanceId), grievanceData, ttl);
  },

  /**
   * Get cache instance for direct access
   */
  getInstance: () => cache,

  /**
   * Setup periodic cleanup
   */
  startCleanupSchedule: (intervalMs: number = 10 * 60 * 1000) => { // 10 minutes
    setInterval(() => {
      const cleaned = cache.cleanup();
      if (cleaned > 0) {
        console.log(`Cache cleanup: removed ${cleaned} expired entries`);
      }
    }, intervalMs);
  }
};

// Export the main cache instance
export default cache;

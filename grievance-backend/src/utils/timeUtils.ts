/**
 * Utility functions for handling time operations in IST (Indian Standard Time)
 */

/**
 * Get current time in IST
 * @returns Date object in IST
 */
export const getCurrentISTTime = (): Date => {
  const now = new Date();
  // IST is UTC+5:30
  const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
  const utc = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
  return new Date(utc + istOffset);
};

/**
 * Convert a date to IST
 * @param date - Date to convert
 * @returns Date object in IST
 */
export const toIST = (date: Date): Date => {
  const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
  const utc = date.getTime() + (date.getTimezoneOffset() * 60 * 1000);
  return new Date(utc + istOffset);
};

/**
 * Get time difference in minutes between two dates
 * @param date1 - First date
 * @param date2 - Second date
 * @returns Difference in minutes
 */
export const getTimeDifferenceInMinutes = (date1: Date, date2: Date): number => {
  return Math.abs(date2.getTime() - date1.getTime()) / (1000 * 60);
};

/**
 * Get time difference in hours between two dates
 * @param date1 - First date
 * @param date2 - Second date
 * @returns Difference in hours
 */
export const getTimeDifferenceInHours = (date1: Date, date2: Date): number => {
  return Math.abs(date2.getTime() - date1.getTime()) / (1000 * 60 * 60);
};

/**
 * Check if a date is older than specified minutes
 * @param date - Date to check
 * @param minutes - Minutes to compare
 * @returns boolean
 */
export const isOlderThanMinutes = (date: Date, minutes: number): boolean => {
  const now = getCurrentISTTime();
  return getTimeDifferenceInMinutes(date, now) >= minutes;
};

/**
 * Check if a date is older than specified hours
 * @param date - Date to check
 * @param hours - Hours to compare
 * @returns boolean
 */
export const isOlderThanHours = (date: Date, hours: number): boolean => {
  const now = getCurrentISTTime();
  return getTimeDifferenceInHours(date, now) >= hours;
};

/**
 * Format date for display in Indian format
 * @param date - Date to format
 * @returns Formatted date string (DD/MM/YYYY HH:MM)
 */
export const formatIndianDate = (date: Date): string => {
  const istDate = toIST(date);
  const day = String(istDate.getDate()).padStart(2, '0');
  const month = String(istDate.getMonth() + 1).padStart(2, '0');
  const year = istDate.getFullYear();
  const hours = String(istDate.getHours()).padStart(2, '0');
  const minutes = String(istDate.getMinutes()).padStart(2, '0');
  
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

/**
 * Format date for database storage (ISO string)
 * @param date - Date to format
 * @returns ISO string in UTC
 */
export const formatForDatabase = (date: Date = new Date()): string => {
  return date.toISOString();
};

/**
 * Parse date from various input formats
 * @param input - Date input (string, number, or Date)
 * @returns Date object or null if invalid
 */
export const parseDate = (input: string | number | Date): Date | null => {
  try {
    if (input instanceof Date) {
      return input;
    }
    
    const parsed = new Date(input);
    return isNaN(parsed.getTime()) ? null : parsed;
  } catch {
    return null;
  }
};

/**
 * Get time ago string (e.g., "2 hours ago", "3 days ago")
 * @param date - Date to compare
 * @returns Human readable time ago string
 */
export const getTimeAgo = (date: Date): string => {
  const now = getCurrentISTTime();
  const diffMs = now.getTime() - date.getTime();
  
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return formatIndianDate(date);
};

/**
 * Generate grievance ID with timestamp
 * @returns Formatted grievance ID (ISSUE-YYYYMM-XXXXX)
 */
export const generateGrievanceId = (): string => {
  const now = getCurrentISTTime();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const randomId = String(Math.floor(Math.random() * 99999) + 1).padStart(5, '0');
  
  return `ISSUE-${year}${month}-${randomId}`;
};

/**
 * Check if two dates are on the same day (IST)
 * @param date1 - First date
 * @param date2 - Second date
 * @returns boolean
 */
export const isSameDay = (date1: Date, date2: Date): boolean => {
  const ist1 = toIST(date1);
  const ist2 = toIST(date2);
  
  return ist1.getDate() === ist2.getDate() &&
         ist1.getMonth() === ist2.getMonth() &&
         ist1.getFullYear() === ist2.getFullYear();
};

import { PaginationParams, PaginatedResponse } from '../types/global';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../constants/grievanceConstants';

// Pagination utility functions aligned with current models
export class PaginationHelper {
  /**
   * Parse and validate pagination parameters from request query
   */
  static parseParams(query: any): PaginationParams {
    const page = Math.max(1, parseInt(query.page as string) || 1);
    const limit = Math.min(
      MAX_PAGE_SIZE, 
      Math.max(1, parseInt(query.limit as string) || DEFAULT_PAGE_SIZE)
    );
    const offset = (page - 1) * limit;

    return { page, limit, offset };
  }

  /**
   * Create paginated response with metadata
   */
  static createResponse<T>(
    data: T[],
    total: number,
    params: PaginationParams
  ): PaginatedResponse<T> {
    const { page, limit } = params;
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      data,
      total,
      page,
      limit,
      totalPages,
      hasNext,
      hasPrev
    };
  }

  /**
   * Generate SQL LIMIT and OFFSET clause
   */
  static getSQLClause(params: PaginationParams): string {
    return `LIMIT ${params.limit} OFFSET ${params.offset}`;
  }

  /**
   * Calculate pagination info for display
   */
  static getDisplayInfo(params: PaginationParams, total: number): {
    start: number;
    end: number;
    total: number;
    page: number;
    totalPages: number;
  } {
    const { page, limit, offset } = params;
    const totalPages = Math.ceil(total / limit);
    const start = offset + 1;
    const end = Math.min(offset + limit, total);

    return {
      start: total > 0 ? start : 0,
      end,
      total,
      page,
      totalPages
    };
  }

  /**
   * Validate pagination parameters
   */
  static validateParams(params: PaginationParams): { valid: boolean; error?: string } {
    const { page, limit } = params;

    if (page < 1) {
      return { valid: false, error: 'Page must be greater than 0' };
    }

    if (limit < 1 || limit > MAX_PAGE_SIZE) {
      return { valid: false, error: `Limit must be between 1 and ${MAX_PAGE_SIZE}` };
    }

    return { valid: true };
  }

  /**
   * Get pagination metadata for API responses
   */
  static getMetadata(params: PaginationParams, total: number) {
    const { page, limit } = params;
    const totalPages = Math.ceil(total / limit);
    
    return {
      pagination: {
        currentPage: page,
        pageSize: limit,
        totalItems: total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
        nextPage: page < totalPages ? page + 1 : null,
        prevPage: page > 1 ? page - 1 : null
      }
    };
  }
}

// Utility function for quick pagination
export function paginate<T>(
  data: T[],
  page: number = 1,
  limit: number = DEFAULT_PAGE_SIZE
): PaginatedResponse<T> {
  const params = PaginationHelper.parseParams({ page, limit });
  const startIndex = params.offset;
  const endIndex = startIndex + params.limit;
  const paginatedData = data.slice(startIndex, endIndex);
  
  return PaginationHelper.createResponse(paginatedData, data.length, params);
}

// Export types for use in other modules
export type { PaginationParams, PaginatedResponse };

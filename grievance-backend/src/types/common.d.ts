export type Role = 'STUDENT' | 'DEPT_ADMIN' | 'CAMPUS_ADMIN' | 'SUPER_ADMIN';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
export interface ErrorResponse {
  success: false;
  error: string;
}
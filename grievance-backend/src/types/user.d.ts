export interface User {
  id: string;
  rollNumber: string;
  name: string;
  email: string;
  role: 'STUDENT' | 'DEPT_ADMIN' | 'CAMPUS_ADMIN' | 'SUPER_ADMIN';
  campus?: string;
  branch?: string;
}
export interface UserWithToken extends User {
  token: string;
}
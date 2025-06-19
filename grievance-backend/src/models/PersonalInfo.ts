export interface PersonalInfo {
  id?: number;
  rollno: string;
  name: string;
  father?: string;
  mother?: string;
  abc?: string;
  dob?: Date;
  category?: string;
  gender?: string;
  pwd?: boolean;
  phone?: string;
  email: string;
  password?: string;
  isverified?: boolean;
  admissionyear?: number;
  role: 'STUDENT' | 'DEPT_ADMIN' | 'CAMPUS_ADMIN' | 'SUPER_ADMIN';
  le?: boolean;
  createdat?: Date;
  updatedat?: Date;
}

export interface CreatePersonalInfoData {
  rollno: string;
  name: string;
  email: string;
  father?: string;
  mother?: string;
  abc?: string;
  dob?: Date;
  category?: string;
  gender?: string;
  pwd?: boolean;
  phone?: string;
  admissionyear?: number;
  le?: boolean;
}

export interface UpdatePersonalInfoData {
  password?: string;
  isverified?: boolean;
  phone?: string;
  updatedat?: Date;
}

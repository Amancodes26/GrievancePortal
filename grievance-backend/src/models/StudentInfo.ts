// Student information interface
export interface StudentInfo {
  id?: number;
  rollno: string;
  name: string;
  email: string;
  phone?: string;
  password?: string;
  isverified?: boolean;
  admissionyear?: number;
  gender?: string;
  campusid: number; // FK to CampusInfo.campusid
  createdat?: Date;
  updatedat?: Date;
}

// Interface for creating new student records
export interface CreateStudentInfoData {
  rollno: string;
  name: string;
  email: string;
  phone?: string;
  admissionyear?: number;
  gender?: string;
  campusid: number; // Required during student registration
}

// Interface for updating student records
export interface UpdateStudentInfoData {
  password?: string;
  isverified?: boolean;
  phone?: string;
  admissionyear?: number;
  gender?: string;
  updatedat?: Date;
}

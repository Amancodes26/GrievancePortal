// Academic enrollment information interface
export interface AcademicInfo {
  id: number;
  rollno: string;
  programid: number;
  academicyear: string;
  term: number;
  campusid: number;
  batch: number;
  status?: string;
  createdat?: Date;
  updatedat?: Date;
}

// Interface for creating new academic records
export interface CreateAcademicInfoData {
  rollno: string;
  programid: number;
  academicyear: string;
  term: number;
  campusid: number;
  batch: number;
  status?: string;
}

// Interface for updating academic records
export interface UpdateAcademicInfoData {
  programid?: number;
  academicyear?: string;
  term?: number;
  campusid?: number;
  batch?: number;
  status?: string;
  updatedat?: Date;
}

// Interface for student program information (with joined data for frontend)
export interface StudentProgramInfo {
  rollno: string;
  studentname: string;
  programid: number;
  programname: string;
  programcode: string;
  programtype: string;
  academicyear: string;
  term: number;
  batch: number;
  campusname: string;
  status: string;
}

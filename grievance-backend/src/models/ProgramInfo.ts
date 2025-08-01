// Program information interface
export interface ProgramInfo {
  programid: number;
  programcode: string;
  programname: string;
  programtype: string;
  termtype: string; // 'semester' | 'annual'
  specialisation?: boolean;
  specialcode?: string;
  specialname?: string;
  createdat?: Date;
  updatedat?: Date;
}

// Interface for creating new program records
export interface CreateProgramInfoData {
  programcode: string;
  programname: string;
  programtype: string;
  termtype: string;
  specialisation?: boolean;
  specialcode?: string;
  specialname?: string;
}

// Interface for updating program records
export interface UpdateProgramInfoData {
  programcode?: string;
  programname?: string;
  programtype?: string;
  termtype?: string;
  specialisation?: boolean;
  specialcode?: string;
  specialname?: string;
  updatedat?: Date;
}

// Interface for frontend display (minimal data)
export interface ProgramInfoDisplay {
  programid: number;
  programname: string;
  programcode: string;
  programtype: string;
}

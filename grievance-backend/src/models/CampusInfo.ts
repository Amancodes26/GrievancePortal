// Campus information interface
export interface CampusInfo {
  campusid: number;
  campuscode: string;
  campusname: string;
  createdat?: Date;
  updatedat?: Date;
}

// Interface for creating new campus records
export interface CreateCampusInfoData {
  campusid: number;
  campuscode: string;
  campusname: string;
}

// Interface for updating campus records
export interface UpdateCampusInfoData {
  campuscode?: string;
  campusname?: string;
  updatedat?: Date;
}

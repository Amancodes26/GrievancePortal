export interface AdminInfo {
    ID?: number;
    AdminID?: string;
    Name: string;
    Email: string;
    Phone?: string;
    Password?: string;
    Role?: 'DEPT_ADMIN' | 'CAMPUS_ADMIN' | 'SUPER_ADMIN';
    IsVerified?: boolean;
    IsActive: boolean;
    LastLogin?: Date;
    CreatedAt?: Date;
    UpdatedAt?: Date;
    CampusId?: number;
}

// Interface for creating new admin records
export interface CreateAdminInfoData {
    AdminID: string;
    Name: string;
    Email: string;
    Phone?: string;
    Role: 'DEPT_ADMIN' | 'CAMPUS_ADMIN' | 'SUPER_ADMIN';
    CampusId?: number;
}

// Interface for updating admin records
export interface UpdateAdminInfoData {
    Password?: string;
    IsVerified?: boolean;
    Phone?: string;
    Role?: 'DEPT_ADMIN' | 'CAMPUS_ADMIN' | 'SUPER_ADMIN';
    IsActive?: boolean;
    LastLogin?: Date;
    CampusId?: number;
    UpdatedAt?: Date;
}

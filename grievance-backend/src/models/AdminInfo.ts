export interface AdminInfo {
    ID?: number;
    AdminID?: string;
    Name: string;
    Email: string;
    Phone?: string;
    Password?: string;
    Role?: 'admin' | 'superadmin' | 'deptadmin';
    IsVerified?: boolean;
    IsActive: boolean;
    LastLogin?: Date;
    CreatedAt?: Date;
    UpdatedAt?: Date;
    CampusId?: number;
    permissions?: string[]; // Array of permission strings
}

export type StaffCategory = "TEACHING" | "NON_TEACHING";
export type StaffType = "PRINCIPAL" | "VICE_PRINCIPAL" | "DEAN" | "HOD" | "TEACHER" | "LECTURER" | "LAB_FACULTY" | "ADMIN_STAFF" | "SUPPORT_STAFF" | "OTHER";
export type EmploymentType = "FULL_TIME" | "PART_TIME" | "CONTRACT" | "VISITING";
export type EmployeeStatus = "ACTIVE" | "INACTIVE" | "ENDED";
export type EmployeeLoginStatus = "NONE" | "INVITED" | "ACTIVE" | "DISABLED" | "FAILED";

export interface Employee {
  id: string;
  employeeCode: string;
  fullName: string;
  email?: string;
  phone?: string;
  staffCategory: StaffCategory;
  staffType: StaffType;
  employmentType: EmploymentType;
  designation?: string;
  department?: string;
  primaryCampusId: string;
  campusIds: string[];
  joiningDate: string;
  status: EmployeeStatus;
  loginStatus: EmployeeLoginStatus;
  inviteAttempts: number;
  inviteError?: string;
  lastInviteAttemptAt?: string;
  invitedAt?: string;
  externalHrCode?: string;
  profilePhotoFileId?: string;
  templateId?: string;
  templateVersion?: number;
  customFields?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  endedAt?: string;
  endReason?: string;
}

export interface CreateEmployeeInput {
  fullName: string;
  email?: string;
  phone?: string;
  staffCategory: StaffCategory;
  staffType: StaffType;
  employmentType: EmploymentType;
  designation?: string;
  department?: string;
  primaryCampusId: string;
  campusIds: string[];
  joiningDate: string;
  loginEnabled: boolean;
  roleIds: string[];
  scopeType: "TENANT" | "CAMPUS";
  templateId: string;
  templateVersion: number;
  profilePhotoFileId?: string;
  customFields?: Record<string, unknown>;
}
export interface UpdateEmployeeInput {
  fullName?: string;
  phone?: string;
  staffCategory?: StaffCategory;
  staffType?: StaffType;
  employmentType?: EmploymentType;
  designation?: string;
  department?: string;
  primaryCampusId?: string;
  campusIds?: string[];
  joiningDate?: string;
  externalHrCode?: string;
  profilePhotoFileId?: string;
  customFields?: Record<string, unknown>;
}
export interface EmployeeInviteAttempt { id:string; employeeId:string; email:string; attemptNumber:number; status:"SENT"|"FAILED"; provider:string; error?:string; createdAt:string; }
export interface EmployeeInviteDeliveryEvent { id:string;messageId:string;eventType:"SEND"|"DELIVERY"|"DELIVERY_DELAY"|"BOUNCE"|"COMPLAINT"|"REJECT"|"RENDERING_FAILURE";occurredAt:string;recipients:string[] }
export interface EmployeePage { items:Employee[];page:number;pageSize:number;total:number;totalPages:number;sortBy:"fullName"|"employeeCode"|"joiningDate"|"createdAt";sortDirection:"ASC"|"DESC";summary:{total:number;active:number;teaching:number;nonTeaching:number;loginReady:number;inviteIssues:number}; }

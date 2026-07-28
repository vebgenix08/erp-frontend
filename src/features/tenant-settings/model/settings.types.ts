export type InstitutionType = "SCHOOL" | "COLLEGE" | "DEGREE_COLLEGE";
export interface InstitutionProfile { id: string; tenantId: string; name: string; shortName?: string; contactEmail?: string; contactPhone?: string; address?: string; logoUrl?: string; logoFileId?: string; createdAt: string; updatedAt: string; }
export interface Campus { id: string; tenantId: string; code: string; name: string; campusType: InstitutionType; status: "ACTIVE" | "INACTIVE"; address?: string; contactEmail?: string; contactPhone?: string; createdAt: string; updatedAt: string; deactivatedAt?: string; }
export interface AcademicYear { id: string; tenantId: string; code: string; name: string; startDate: string; endDate: string; status: "DRAFT" | "ACTIVE" | "CLOSED"; createdAt: string; updatedAt: string; activatedAt?: string; closedAt?: string; reopenedAt?: string; lifecycleReason?: string; }
export type InstitutionProfileInput = Partial<Pick<InstitutionProfile, "name" | "shortName" | "contactEmail" | "contactPhone" | "address" | "logoUrl" | "logoFileId">>;
export type CampusInput = Pick<Campus, "name" | "campusType"> & Pick<Partial<Campus>, "address" | "contactEmail" | "contactPhone">;
export type NumberingStream = "ENQUIRY" | "APPLICATION" | "ADMISSION" | "STUDENT_REGISTRATION" | "ROLL_NUMBER" | "EMPLOYEE" | "FEE_ORDER" | "INVOICE" | "PAYMENT" | "RECEIPT" | "BONAFIDE_CERTIFICATE" | "STUDY_CERTIFICATE" | "TRANSFER_CERTIFICATE" | "STUDENT_ID_CARD";
export type NumberingScope = "TENANT" | "CAMPUS" | "ACADEMIC_YEAR" | "PROGRAM" | "CLASS" | "SECTION";
export type NumberingReset = "NEVER" | "ACADEMIC_YEAR" | "CALENDAR_YEAR" | "MONTHLY";
export interface NumberingPolicy { id:string; stream:NumberingStream; name:string; format:string; prefix:string; separator:string; padding:number; scope:NumberingScope; reset:NumberingReset; nextNumber:number; active:boolean; issuedCount:number; sample:string; createdAt:string; updatedAt:string; }
export type NumberingPolicyInput = Pick<NumberingPolicy,"stream"|"name"|"format"|"prefix"|"separator"|"padding"|"scope"|"reset"|"active">;
export type NotificationEvent = "NEW_ENQUIRY"|"APPLICATION_SUBMITTED"|"APPLICATION_APPROVED"|"APPLICATION_REJECTED"|"FEE_PAID"|"STAFF_INVITED";
export type NotificationAudience = "TENANT_ADMINS"|"APPLICANT"|"PARENT_STUDENT"|"STAFF_MEMBER";
export interface NotificationEventPolicy { event:NotificationEvent;label:string;audience:NotificationAudience;email:boolean;sms:boolean; }
export interface NotificationPolicy { id:string;tenantId:string;adminEmail?:string;replyToEmail?:string;emailEnabled:boolean;smsEnabled:boolean;timezone:string;events:NotificationEventPolicy[];createdAt:string;updatedAt:string; }
export type NotificationPolicyInput = Pick<NotificationPolicy,"adminEmail"|"replyToEmail"|"emailEnabled"|"smsEnabled"|"timezone"|"events">;
export type AcademicYearInput = Pick<AcademicYear, "name" | "startDate" | "endDate">;
export interface ReadinessItem { key: string; label: string; status: "READY" | "ACTION_REQUIRED" | "OPTIONAL"; blocking: boolean; route: string; detail: string; }
export interface TenantReadiness { ready: boolean; completedRequired: number; totalRequired: number; percentage: number; items: ReadinessItem[]; evaluatedAt: string; }
export interface TenantAdminDashboardActivity { id:string;occurredAt:string;activity:string;module:string;subject:string;performedBy:string;status:string; }
export interface TenantAdminDashboard { activeStudents:number;activeStaff:number;applicationsAwaitingAction:number;admissionsConfirmed:number;collectedTodayMinor:number;outstandingMinor:number;openWorkItems:number;studentsMissingSections:number;studentsMissingFeeOrders:number;recentActivity:TenantAdminDashboardActivity[];generatedAt:string; }
export type TenantTemplateType = "FORM" | "EMAIL" | "PRINT";
export type TenantTemplateFieldType = "text" | "textarea" | "number" | "email" | "phone" | "date" | "select" | "checkbox" | "radio" | "document";
export type TenantTemplateFieldScope = "ENQUIRY" | "APPLICATION" | "BOTH";
export interface TenantTemplateSection { key: string; label: string; order: number; description?: string; }
export interface TenantTemplateField { key: string; label: string; type: TenantTemplateFieldType; order: number; required: boolean; visible: boolean; placeholder?: string; section?: string; scope?: TenantTemplateFieldScope; description?: string; options?: string[] | undefined; }
export interface TenantTemplate { id: string; tenantId: string; name: string; templateType: TenantTemplateType; status: "DRAFT" | "PUBLISHED" | "ARCHIVED"; version: number; publishedVersion?: number; description?: string; subject?: string; body?: string; layout?: string; sections: TenantTemplateSection[]; fields: TenantTemplateField[]; requiredSystemKeys: string[]; createdAt: string; updatedAt: string; publishedAt?: string; archivedAt?: string; }
export interface TenantTemplateInput { name: string; templateType: TenantTemplateType; description?: string; subject?: string; body?: string; layout?: string; sections?: TenantTemplateSection[]; fields?: TenantTemplateField[]; requiredSystemKeys?: string[]; }

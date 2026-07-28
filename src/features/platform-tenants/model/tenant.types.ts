export type TenantType = "INSTITUTION" | "SCHOOL" | "COLLEGE" | "DEGREE_COLLEGE";
export type TenantStatus = "ONBOARDING" | "ACTIVE" | "INACTIVE" | "SUSPENDED" | "DELETION_PENDING";

export interface TenantRecord {
  id: string;
  name: string;
  organizationName: string;
  slug: string;
  type: TenantType;
  status: TenantStatus;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  academicYearStartMonth?: number;
  createdAt: string;
  updatedAt: string;
  deactivatedAt?: string;
  deletionRequestedAt?: string;
  deletionRequestedBy?: string;
  deletionReason?: string;
  deletedAt?: string;
  deletedBy?: string;
  purgeEligibleAt?: string;
}

export interface ProvisionTenantInput {
  organizationName: string;
  slug: string;
  primaryAdminFullName: string;
  primaryAdminEmail: string;
}

export interface ProvisionTenantResult {
  tenantId: string;
  organizationName: string;
  slug: string;
  onboardingStatus: "ADMIN_ACTIVATION";
  primaryAdminInviteStatus: "PENDING" | "INVITED" | "FAILED";
  warnings: Array<{ code: string; message: string }>;
}

export interface TenantCreateInput {
  clientRequestId?: string;
  name: string;
  code: string;
  type: TenantType;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  academicYearStartMonth?: number;
}

export interface TenantUpdateInput extends Partial<TenantCreateInput> {
  status?: TenantStatus;
}

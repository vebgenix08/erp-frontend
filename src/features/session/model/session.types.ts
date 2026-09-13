export type Permission = string;

export interface SessionUserSnapshot {
  id: string;
  email?: string;
  fullName?: string;
  profilePhotoFileId?: string;
  role?: string;
  roles: Array<{ id?: string; code: string; name: string }>;
  permissions: Permission[];
  scopes: Array<{
    assignmentId: string;
    roleId: string;
    roleCode: string;
    scope: {
      scopeType: string;
      campusIds?: string[];
      programIds?: string[];
      classIds?: string[];
      sectionIds?: string[];
    };
  }>;
  source: "jwt-claims" | "headers" | "request" | "unknown";
}

export interface SessionTenantSnapshot {
  tenantId: string;
  tenantCode?: string;
  displayName?: string;
  source: "jwt-claims" | "headers" | "request" | "subdomain" | "unknown";
}

export interface SessionPayload {
  user: SessionUserSnapshot;
  tenant: SessionTenantSnapshot | null;
  selectedTenant: SessionTenantSnapshot | null;
  authenticatedAt: string;
}

export type SessionStatus = "loading" | "authenticated" | "anonymous" | "error";

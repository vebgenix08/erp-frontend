export type Permission = string;

export interface SessionUserSnapshot {
  id: string;
  email?: string;
  role?: string;
  permissions: Permission[];
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

export type SessionStatus = "loading" | "authenticated" | "anonymous";

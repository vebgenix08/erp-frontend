import { httpClient } from "../../../shared/api/http-client";
import type { SessionPayload, SessionTenantSnapshot } from "../model/session.types";
import { getCognitoIdToken } from "../../../shared/auth/cognito-token";
import { graphqlClient } from "../../../shared/api/graphql-client";

function decodeClaims(token: string): Record<string, unknown> {
  const payload = token.split(".")[1];
  if (!payload) throw new Error("Invalid Cognito ID token");
  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const claims = JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="))) as Record<string, unknown>;
  if (typeof claims.exp !== "number" || claims.exp * 1000 <= Date.now()) {
    throw new Error("Cognito session has expired");
  }
  return claims;
}

export async function fetchSession(): Promise<SessionPayload> {
  const token = await getCognitoIdToken();
  if (!token) throw new Error("No active Cognito session");
  const claims = decodeClaims(token);
  const groups = Array.isArray(claims["cognito:groups"]) ? claims["cognito:groups"] as string[] : [];
  const role = groups.includes("SUPER_ADMIN") ? "SUPER_ADMIN" : groups.includes("TENANT_ADMIN") ? "TENANT_ADMIN" : typeof claims["custom:role"] === "string" ? String(claims["custom:role"]) : undefined;
  if (!role) {
    return httpClient<SessionPayload>("/session/me");
  }
  const tenantId = typeof claims["custom:tenantId"] === "string" ? claims["custom:tenantId"].trim() : "";
  const email = typeof claims.email === "string" ? claims.email : null;
  return {
    user: {
      id: String(claims.sub ?? ""),
      ...(email ? { email } : {}),
      role,
      permissions: [],
      source: "jwt-claims",
    },
    tenant: tenantId ? { tenantId, source: "jwt-claims" } : null,
    selectedTenant: tenantId ? { tenantId, source: "jwt-claims" } : null,
    authenticatedAt: new Date().toISOString(),
  };
}

export interface CurrentTenantSummary {
  name: string;
  code: string;
  slug?: string;
  status: "ONBOARDING" | "ACTIVE" | "INACTIVE" | "SUSPENDED" | "DELETION_PENDING";
}

export async function fetchCurrentTenantSummary(): Promise<CurrentTenantSummary> {
  return (
    await graphqlClient<{ currentTenantSummary: CurrentTenantSummary }>(
      "query CurrentTenantSummary { currentTenantSummary { name code slug status } }",
    )
  ).currentTenantSummary;
}

export async function selectSessionTenant(
  input: { tenantId?: string },
): Promise<SessionPayload> {
  return httpClient<SessionPayload>("/session/select-tenant", {
    method: "POST",
    body: input,
  });
}

export async function logoutSession(): Promise<{ success: boolean }> {
  return httpClient<{ success: boolean }>("/session/logout", {
    method: "POST",
  });
}

export function getSessionDashboardPath(session: SessionPayload | null): string {
  const role = session?.user.role?.toLowerCase();
  if (!role) return "/login";

  const map: Record<string, string> = {
    super_admin: "/platform/dashboard",
    tenant_admin: "/admin/dashboard",
    admin: "/admin/dashboard",
    principal: "/principal/dashboard",
    hod: "/hod/dashboard",
    accountant: "/accountant/dashboard",
    admission_officer: "/admissions/dashboard",
    teacher: "/teacher/dashboard",
    class_teacher: "/class-teacher/dashboard",
    student: "/student/dashboard",
    parent: "/parent/dashboard",
    librarian: "/library/dashboard",
    transport_manager: "/transport/dashboard",
    hostel_warden: "/hostel/dashboard",
    exam_coordinator: "/exams/dashboard",
    hr_manager: "/hr/dashboard",
  };

  return map[role] ?? "/admin/dashboard";
}

export function getSessionTenantLabel(tenant: SessionTenantSnapshot | null): string {
  if (!tenant) {
    return "No tenant selected";
  }
  return tenant.displayName ?? tenant.tenantCode ?? "Tenant workspace";
}

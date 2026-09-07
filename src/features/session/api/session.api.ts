import { httpClient } from "../../../shared/api/http-client";
import type { SessionPayload, SessionTenantSnapshot } from "../model/session.types";
import { getCognitoIdToken } from "../../../shared/auth/cognito-token";
import { graphqlClient } from "../../../shared/api/graphql-client";

function decodeClaims(token: string): Record<string, unknown> {
  const payload = token.split(".")[1];
  if (!payload) throw new Error("Invalid Cognito ID token");
  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const claims = JSON.parse(
    atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")),
  ) as Record<string, unknown>;
  if (typeof claims.exp !== "number" || claims.exp * 1000 <= Date.now()) {
    throw new Error("Cognito session has expired");
  }
  return claims;
}

export async function fetchSession(): Promise<SessionPayload> {
  const token = await getCognitoIdToken();
  if (!token) throw new Error("No active Cognito session");
  decodeClaims(token);
  return httpClient<SessionPayload>("/session/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
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

export async function selectSessionTenant(input: { tenantId?: string }): Promise<SessionPayload> {
  const token = await getCognitoIdToken();
  if (!token) throw new Error("No active Cognito session");
  return httpClient<SessionPayload>("/session/select-tenant", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: input,
  });
}

export async function logoutSession(): Promise<{ success: boolean }> {
  const token = await getCognitoIdToken();
  if (!token) return { success: true };
  return httpClient<{ success: boolean }>("/session/logout", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function getSessionDashboardPath(session: SessionPayload | null): string {
  const role = session?.user.role?.toLowerCase();
  if (!role) return "/login";

  const map: Record<string, string> = {
    super_admin: "/platform/dashboard",
    tenant_admin: "/admin/dashboard",
    admin: "/admin/dashboard",
    principal: "/teacher/dashboard",
    dean: "/teacher/dashboard",
    vice_principal: "/teacher/dashboard",
    hod: "/teacher/dashboard",
    academic_coordinator: "/teacher/dashboard",
    accountant: "/accountant/dashboard",
    admission_officer: "/admissions/enquiries",
    teacher: "/teacher/dashboard",
    class_teacher: "/teacher/dashboard",
    student: "/not-found",
    parent: "/not-found",
    librarian: "/not-found",
    transport_manager: "/not-found",
    hostel_warden: "/not-found",
    exam_coordinator: "/not-found",
    hr_manager: "/not-found",
  };

  return map[role] ?? "/admin/dashboard";
}

export function getSessionTenantLabel(tenant: SessionTenantSnapshot | null): string {
  if (!tenant) {
    return "No tenant selected";
  }
  return tenant.displayName ?? tenant.tenantCode ?? "Tenant workspace";
}

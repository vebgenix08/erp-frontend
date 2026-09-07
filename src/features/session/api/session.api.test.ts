import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchSession,
  getSessionDashboardPath,
  logoutSession,
  selectSessionTenant,
} from "./session.api";
import type { SessionPayload } from "../model/session.types";

const token = createToken({ exp: Math.floor(Date.now() / 1000) + 3_600 });

function createToken(payload: Record<string, unknown>): string {
  return `header.${btoa(JSON.stringify(payload)).replaceAll("=", "")}.signature`;
}

afterEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
});

describe("session API authentication", () => {
  it("attaches the Cognito ID token to every authenticated session request", async () => {
    sessionStorage.setItem("erp.cognito.idToken", token);
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await fetchSession();
    await selectSessionTenant({ tenantId: "tenant_1" });
    await logoutSession();

    expect(fetchMock).toHaveBeenCalledTimes(3);
    for (const [, init] of fetchMock.mock.calls) {
      expect(new Headers(init?.headers).get("Authorization")).toBe(`Bearer ${token}`);
    }
  });

  it.each([
    "PRINCIPAL",
    "DEAN",
    "VICE_PRINCIPAL",
    "HOD",
    "ACADEMIC_COORDINATOR",
    "TEACHER",
    "CLASS_TEACHER",
  ])("routes %s into the unified Teacher Workspace", (role) => {
    const session = {
      user: {
        id: "user-1",
        role,
        roles: [],
        scopes: [],
        permissions: [],
        source: "jwt-claims",
      },
      tenant: null,
      selectedTenant: null,
      authenticatedAt: new Date().toISOString(),
    } as SessionPayload;

    expect(getSessionDashboardPath(session)).toBe("/teacher/dashboard");
  });
});

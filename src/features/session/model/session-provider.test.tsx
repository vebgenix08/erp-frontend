import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { SessionPayload } from "./session.types";
import { SESSION_EXPIRED_EVENT } from "../../../shared/auth/session-expiry";
import { ProtectedRoutes } from "../ui/protected-routes";

const { fetchSession } = vi.hoisted(() => ({
  fetchSession: vi.fn<() => Promise<SessionPayload>>(),
}));
vi.mock("../api/session.api", () => ({ fetchSession }));

import { SessionProvider, useSession } from "./session-provider";

const wrapper = ({ children }: { children: ReactNode }) => (
  <SessionProvider>{children}</SessionProvider>
);

describe("session provider recovery", () => {
  beforeEach(() => {
    fetchSession.mockReset();
    sessionStorage.clear();
  });

  it("shows a recoverable state instead of logging out after a transient failure", async () => {
    fetchSession.mockRejectedValueOnce(new Error("The service could not be reached"));
    const { result } = renderHook(() => useSession(), { wrapper });

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.error).toContain("could not be reached");
  });

  it("recovers the existing token when retry succeeds", async () => {
    const session = {
      user: { id: "user-1", roles: [], permissions: [], scopes: [], source: "jwt-claims" },
      tenant: null,
      selectedTenant: null,
      authenticatedAt: new Date().toISOString(),
    } satisfies SessionPayload;
    fetchSession
      .mockRejectedValueOnce(new Error("Temporary network failure"))
      .mockResolvedValueOnce(session);
    const { result } = renderHook(() => useSession(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe("error"));

    await act(async () => result.current.refreshSession());

    expect(result.current.status).toBe("authenticated");
    expect(result.current.session?.user.id).toBe("user-1");
  });

  it("becomes anonymous immediately when an API reports session expiry", async () => {
    const session = {
      user: { id: "user-1", roles: [], permissions: [], scopes: [], source: "jwt-claims" },
      tenant: null,
      selectedTenant: null,
      authenticatedAt: new Date().toISOString(),
    } satisfies SessionPayload;
    fetchSession.mockResolvedValueOnce(session);
    const { result } = renderHook(() => useSession(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe("authenticated"));

    act(() => window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT)));

    expect(result.current.status).toBe("anonymous");
    expect(result.current.session).toBeNull();
  });

  it("redirects a protected view to login when the active session expires", async () => {
    const session = {
      user: { id: "user-1", roles: [], permissions: [], scopes: [], source: "jwt-claims" },
      tenant: null,
      selectedTenant: null,
      authenticatedAt: new Date().toISOString(),
    } satisfies SessionPayload;
    fetchSession.mockResolvedValueOnce(session);
    render(
      <SessionProvider>
        <MemoryRouter initialEntries={["/teacher"]}>
          <Routes>
            <Route element={<ProtectedRoutes />}>
              <Route path="/teacher" element={<h1>Teacher workspace</h1>} />
            </Route>
            <Route path="/login" element={<h1>Login</h1>} />
          </Routes>
        </MemoryRouter>
      </SessionProvider>,
    );
    expect(await screen.findByRole("heading", { name: "Teacher workspace" })).toBeInTheDocument();

    act(() => window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT)));

    expect(await screen.findByRole("heading", { name: "Login" })).toBeInTheDocument();
  });
});

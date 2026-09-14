import { afterEach, describe, expect, it, vi } from "vitest";
import { httpClient } from "./http-client";
import { SESSION_EXPIRED_EVENT } from "../auth/session-expiry";
import { resetRequestSession } from "./request-coordinator";

describe("httpClient", () => {
  afterEach(() => {
    resetRequestSession();
    vi.unstubAllGlobals();
  });

  it("isolates session responses by authentication headers", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(
        async (_url, init) =>
          new Response(
            JSON.stringify({ identity: new Headers(init.headers).get("authorization") }),
            { headers: { "content-type": "application/json" } },
          ),
      );
    vi.stubGlobal("fetch", fetchMock);
    expect(await httpClient("/session/me", { headers: { Authorization: "Bearer first" } })).toEqual(
      { identity: "Bearer first" },
    );
    expect(
      await httpClient("/session/me", { headers: { authorization: "Bearer second" } }),
    ).toEqual({ identity: "Bearer second" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("uses bearer-token CORS without enabling cookie credentials", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await httpClient<{ ok: boolean }>("/session/me", {
      headers: { Authorization: "Bearer cognito-id-token" },
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: "GET",
      headers: {
        Authorization: "Bearer cognito-id-token",
        "Content-Type": "application/json",
      },
    });
    expect(fetchMock.mock.calls[0]?.[1]).not.toHaveProperty("credentials");
  });

  it("expires the local session after an unauthorized API response", async () => {
    sessionStorage.setItem("erp.cognito.idToken", "expired-token");
    const expired = vi.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, expired);
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Token has expired." } }),
            { status: 401, headers: { "content-type": "application/json" } },
          ),
        ),
    );

    await expect(httpClient("/protected")).rejects.toMatchObject({ status: 401 });
    expect(sessionStorage.getItem("erp.cognito.idToken")).toBeNull();
    expect(expired).toHaveBeenCalledOnce();
    window.removeEventListener(SESSION_EXPIRED_EVENT, expired);
  });

  it("preserves the session when the API denies a permitted authenticated action", async () => {
    sessionStorage.setItem("erp.cognito.idToken", "valid-token");
    const expired = vi.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, expired);
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ error: { code: "FORBIDDEN", message: "Permission is required." } }),
            { status: 403, headers: { "content-type": "application/json" } },
          ),
        ),
    );

    await expect(httpClient("/protected-action")).rejects.toMatchObject({ status: 403 });
    expect(sessionStorage.getItem("erp.cognito.idToken")).toBe("valid-token");
    expect(expired).not.toHaveBeenCalled();
    window.removeEventListener(SESSION_EXPIRED_EVENT, expired);
  });
});

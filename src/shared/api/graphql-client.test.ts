import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { graphqlClient } from "./graphql-client";
import { invalidateRequestCache } from "./request-coordinator";
import { SESSION_EXPIRED_EVENT } from "../auth/session-expiry";

const token = "header.payload.signature";

describe("graphql client reliability", () => {
  beforeEach(() => {
    sessionStorage.setItem("erp.cognito.idToken", token);
    invalidateRequestCache();
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("creates a fresh deadline for a retryable second attempt", async () => {
    vi.useFakeTimers();
    const signals: AbortSignal[] = [];
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockImplementationOnce(async (_url, init) => {
        signals.push(init?.signal as AbortSignal);
        return new Response(
          JSON.stringify({ errors: [{ message: "busy", extensions: { retryable: true } }] }),
          {
            status: 503,
            headers: { "content-type": "application/json" },
          },
        );
      })
      .mockImplementationOnce(async (_url, init) => {
        signals.push(init?.signal as AbortSignal);
        return new Response(JSON.stringify({ data: { ready: true } }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      });
    vi.stubGlobal("fetch", fetchMock);

    const result = graphqlClient<{ ready: boolean }>("query Reliability { ready }");
    await vi.advanceTimersByTimeAsync(500);

    await expect(result).resolves.toEqual({ ready: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(signals[0]).not.toBe(signals[1]);
    expect(signals[1]?.aborted).toBe(false);
  });

  it("retries a transient browser network failure", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { ready: true } }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = graphqlClient<{ ready: boolean }>("query NetworkRecovery { ready }");
    await vi.advanceTimersByTimeAsync(500);

    await expect(result).resolves.toEqual({ ready: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("expires the local session when AppSync reports an expired token", async () => {
    const expired = vi.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, expired);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            errors: [{ message: "Token has expired.", errorType: "UnauthorizedException" }],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    await expect(graphqlClient("query ExpiredSession { viewer { id } }")).rejects.toMatchObject({
      code: "SESSION_EXPIRED",
      status: 401,
    });
    expect(sessionStorage.getItem("erp.cognito.idToken")).toBeNull();
    expect(expired).toHaveBeenCalledOnce();
    window.removeEventListener(SESSION_EXPIRED_EVENT, expired);
  });
});

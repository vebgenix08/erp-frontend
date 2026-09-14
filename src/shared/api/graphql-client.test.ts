import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { graphqlClient } from "./graphql-client";
import { invalidateRequestCache } from "./request-coordinator";
import { SESSION_EXPIRED_EVENT } from "../auth/session-expiry";

const token = "header.payload.signature";

describe("graphql client reliability", () => {
  it("allows a response after 12 seconds and stops an uncertain write at 35 seconds without retry", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockImplementationOnce(async () => {
        await new Promise((resolve) => window.setTimeout(resolve, 15_000));
        return new Response(JSON.stringify({ data: { ready: true } }));
      })
      .mockImplementationOnce(
        async (_url, init) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener(
              "abort",
              () => reject(new DOMException("Aborted", "AbortError")),
              { once: true },
            );
          }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const read = graphqlClient("query Slow { ready }");
    await vi.advanceTimersByTimeAsync(15_000);
    await expect(read).resolves.toEqual({ ready: true });
    const write = graphqlClient("mutation SlowWrite { ready }");
    const failed = expect(write).rejects.toMatchObject({
      code: "REQUEST_TIMEOUT",
      retryable: false,
    });
    await vi.advanceTimersByTimeAsync(35_000);
    await failed;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  beforeEach(() => {
    sessionStorage.setItem("erp.cognito.idToken", token);
    invalidateRequestCache();
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("does not cache or retry writes and invalidates read results after a write", async () => {
    let value = 0;
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(async (_url, init) => {
      const { query } = JSON.parse(String(init?.body));
      if (query.startsWith("mutation")) value++;
      return new Response(JSON.stringify({ data: { value } }), {
        headers: { "content-type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    expect(await graphqlClient("query Value { value }")).toEqual({ value: 0 });
    await graphqlClient("mutation Save { value }");
    await graphqlClient("mutation Save { value }");
    expect(await graphqlClient("query Value { value }")).toEqual({ value: 2 });
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(graphqlClient("mutation Save { value }")).rejects.toMatchObject({
      code: "NETWORK_ERROR",
    });
    expect(fetchMock).toHaveBeenCalledTimes(5);
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

  it("keeps expensive read models warm for their configured cache window", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ data: { ready: true } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const options = { cacheKey: "teacher-workspace", cacheTimeMs: 60_000 };
    await graphqlClient<{ ready: boolean }>(
      "query Workspace { ready }",
      undefined,
      undefined,
      options,
    );
    await vi.advanceTimersByTimeAsync(2_000);
    await graphqlClient<{ ready: boolean }>(
      "query Workspace { ready }",
      undefined,
      undefined,
      options,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("never reuses a cached response after the signed-in account changes", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { viewer: "first" } }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { viewer: "second" } }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const options = { cacheKey: "viewer", cacheTimeMs: 60_000 };
    await graphqlClient<{ viewer: string }>(
      "query Viewer { viewer }",
      undefined,
      undefined,
      options,
    );
    sessionStorage.setItem("erp.cognito.idToken", "different.header.signature");
    await graphqlClient<{ viewer: string }>(
      "query Viewer { viewer }",
      undefined,
      undefined,
      options,
    );

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

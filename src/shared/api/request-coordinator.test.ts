import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./api-error";
import {
  coordinatedRequest,
  invalidateRequestCache,
  resetRequestSession,
} from "./request-coordinator";

describe("coordinatedRequest", () => {
  beforeEach(() => {
    invalidateRequestCache();
    vi.restoreAllMocks();
  });

  it("rejects late results from the previous session and never caches them", async () => {
    let resolve!: (value: string) => void;
    const old = coordinatedRequest(
      () =>
        new Promise<string>((done) => {
          resolve = done;
        }),
      { key: "session", cacheTimeMs: 60000 },
    );
    const rejected = expect(old).rejects.toMatchObject({ name: "AbortError" });
    resetRequestSession();
    resolve("old");
    await rejected;
    await expect(coordinatedRequest(async () => "new", { key: "session" })).resolves.toBe("new");
  });

  it("does not let a read started before a write repopulate the cache", async () => {
    let resolve!: (value: string) => void;
    const old = coordinatedRequest(
      () =>
        new Promise<string>((done) => {
          resolve = done;
        }),
      { key: "students", cacheTimeMs: 60000 },
    );
    await coordinatedRequest(async () => "saved", { key: "save", readOnly: false });
    resolve("old");
    await old;
    await expect(coordinatedRequest(async () => "new", { key: "students" })).resolves.toBe("new");
  });

  it("coalesces identical in-flight requests", async () => {
    let resolve!: (value: string) => void;
    const operation = vi.fn(
      () =>
        new Promise<string>((done) => {
          resolve = done;
        }),
    );
    const first = coordinatedRequest(operation, { key: "students:one" });
    const second = coordinatedRequest(operation, { key: "students:one" });
    resolve("ready");
    await expect(Promise.all([first, second])).resolves.toEqual(["ready", "ready"]);
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("retries one transient failure and does not retry permanent errors", async () => {
    const transient = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(
        new ApiError({
          code: "SERVICE_BUSY",
          message: "busy",
          retryable: true,
        }),
      )
      .mockResolvedValue("ready");
    await expect(coordinatedRequest(transient, { key: "dashboard:retry" })).resolves.toBe("ready");
    expect(transient).toHaveBeenCalledTimes(2);

    const permanent = vi.fn().mockRejectedValue(
      new ApiError({
        code: "VALIDATION_ERROR",
        message: "invalid",
        retryable: false,
      }),
    );
    await expect(coordinatedRequest(permanent, { key: "dashboard:invalid" })).rejects.toMatchObject(
      { code: "VALIDATION_ERROR" },
    );
    expect(permanent).toHaveBeenCalledTimes(1);
  });

  it("bounds concurrent requests so one page cannot exhaust Lambda concurrency", async () => {
    let active = 0;
    let peak = 0;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    const requests = Array.from({ length: 10 }, (_, index) =>
      coordinatedRequest(
        async () => {
          active += 1;
          peak = Math.max(peak, active);
          if (index < 6) await gate;
          active -= 1;
          return index;
        },
        { key: `parallel:${index}` },
      ),
    );

    await vi.waitFor(() => expect(peak).toBe(6));
    release();
    await expect(Promise.all(requests)).resolves.toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(peak).toBe(6);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./api-error";
import { coordinatedRequest, invalidateRequestCache } from "./request-coordinator";

describe("coordinatedRequest", () => {
  beforeEach(() => {
    invalidateRequestCache();
    vi.restoreAllMocks();
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
});

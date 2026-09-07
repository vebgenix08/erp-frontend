import { afterEach, describe, expect, it, vi } from "vitest";
import { createRequestSignal } from "./request-signal";

describe("request signal", () => {
  afterEach(() => vi.useRealTimers());

  it("aborts when the request deadline expires", async () => {
    vi.useFakeTimers();
    const request = createRequestSignal(1_000);

    await vi.advanceTimersByTimeAsync(1_000);

    expect(request.signal.aborted).toBe(true);
    expect(request.didTimeout()).toBe(true);
    request.cleanup();
  });

  it("forwards caller cancellation without reporting a timeout", () => {
    const caller = new AbortController();
    const request = createRequestSignal(1_000, caller.signal);

    caller.abort();

    expect(request.signal.aborted).toBe(true);
    expect(request.didTimeout()).toBe(false);
    request.cleanup();
  });
});

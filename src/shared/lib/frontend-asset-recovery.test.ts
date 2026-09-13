import { describe, expect, it, vi } from "vitest";
import { isAssetLoadFailure, recoverFromAssetLoadFailure } from "./frontend-asset-recovery";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe("frontend asset recovery", () => {
  it("recognizes stale lazy-page asset failures", () => {
    expect(isAssetLoadFailure(new Error("Failed to fetch dynamically imported module"))).toBe(true);
    expect(isAssetLoadFailure(new Error("error loading dynamically imported module"))).toBe(true);
    expect(isAssetLoadFailure(new Error("Failed to load module script"))).toBe(true);
    expect(isAssetLoadFailure(new Error("Validation failed"))).toBe(false);
  });

  it("reloads once and blocks a reload loop for the same path", () => {
    const storage = memoryStorage();
    const reload = vi.fn();
    const error = new Error("ChunkLoadError: Loading chunk 42 failed");

    expect(
      recoverFromAssetLoadFailure(error, { path: "/admin/students", now: 1_000, storage, reload }),
    ).toBe(true);
    expect(
      recoverFromAssetLoadFailure(error, { path: "/admin/students", now: 2_000, storage, reload }),
    ).toBe(false);
    expect(reload).toHaveBeenCalledOnce();
  });
});

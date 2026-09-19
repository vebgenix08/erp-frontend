import { beforeEach, describe, expect, it } from "vitest";
import {
  clearRequestPerformanceEntries,
  getRequestPerformanceEntries,
  graphqlOperationName,
  recordRequestPerformance,
} from "./request-performance";

describe("request performance diagnostics", () => {
  beforeEach(clearRequestPerformanceEntries);

  it("keeps the newest request first", () => {
    recordRequestPerformance({
      kind: "http",
      operation: "GET /health",
      durationMs: 12,
      outcome: "success",
    });
    recordRequestPerformance({
      kind: "graphql",
      operation: "TenantList",
      durationMs: 35,
      outcome: "error",
    });
    expect(getRequestPerformanceEntries().map((entry) => entry.operation)).toEqual([
      "TenantList",
      "GET /health",
    ]);
  });

  it("extracts named GraphQL operations", () => {
    expect(graphqlOperationName("mutation SaveTenant { saveTenant { id } }")).toBe("SaveTenant");
    expect(graphqlOperationName("{ apiHealth { ok } }")).toBe("Anonymous operation");
  });
});

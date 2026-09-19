export interface RequestPerformanceEntry {
  id: string;
  kind: "graphql" | "http";
  operation: string;
  durationMs: number;
  outcome: "success" | "error" | "cancelled";
  recordedAt: string;
}

const entries: RequestPerformanceEntry[] = [];
const maximumEntries = 100;
export const requestPerformanceEvent = "school-erp:request-performance";

export function recordRequestPerformance(
  entry: Omit<RequestPerformanceEntry, "id" | "recordedAt">,
) {
  const value: RequestPerformanceEntry = {
    ...entry,
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
    recordedAt: new Date().toISOString(),
  };
  entries.unshift(value);
  entries.splice(maximumEntries);
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(requestPerformanceEvent));
  return value;
}

export function getRequestPerformanceEntries() {
  return [...entries];
}

export function clearRequestPerformanceEntries() {
  entries.splice(0);
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(requestPerformanceEvent));
}

export function graphqlOperationName(query: string) {
  return query.match(/\b(?:query|mutation)\s+([A-Za-z0-9_]+)/)?.[1] ?? "Anonymous operation";
}

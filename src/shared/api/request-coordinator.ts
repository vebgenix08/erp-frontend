import { ApiError, isApiError } from "./api-error";

const pending = new Map<string, Promise<unknown>>();
const cache = new Map<string, { expiresAt: number; value: unknown }>();
const MAX_CONCURRENT_REQUESTS = 6;
let activeRequestCount = 0;
const requestQueue: Array<() => void> = [];

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

async function runWithRequestSlot<T>(operation: () => Promise<T>): Promise<T> {
  if (activeRequestCount >= MAX_CONCURRENT_REQUESTS) {
    await new Promise<void>((resolve) => requestQueue.push(resolve));
  }
  activeRequestCount += 1;
  try {
    return await operation();
  } finally {
    activeRequestCount -= 1;
    requestQueue.shift()?.();
  }
}

export interface CoordinatedRequestOptions {
  key: string;
  cacheTimeMs?: number;
  signal?: AbortSignal;
}

export async function coordinatedRequest<T>(
  operation: () => Promise<T>,
  options: CoordinatedRequestOptions,
): Promise<T> {
  const cached = cache.get(options.key);
  if (cached && cached.expiresAt > Date.now()) return cached.value as T;

  const existing = pending.get(options.key);
  if (existing) return existing as Promise<T>;

  const promise = (async () => {
    let failureCount = 0;
    for (;;) {
      if (options.signal?.aborted) throw new DOMException("Aborted", "AbortError");
      try {
        const value = await runWithRequestSlot(operation);
        if ((options.cacheTimeMs ?? 0) > 0) {
          cache.set(options.key, {
            expiresAt: Date.now() + (options.cacheTimeMs ?? 0),
            value,
          });
        }
        return value;
      } catch (error) {
        if (!isApiError(error) || !error.retryable || failureCount >= 1) throw error;
        failureCount += 1;
        await wait(250 + Math.floor(Math.random() * 150));
      }
    }
  })().finally(() => pending.delete(options.key));

  pending.set(options.key, promise);
  return promise;
}

export function invalidateRequestCache(prefix?: string): void {
  if (!prefix) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

export function apiErrorFromPayload(payload: unknown, fallback: ApiError): ApiError {
  if (!payload || typeof payload !== "object") return fallback;
  const root = payload as { error?: unknown };
  if (!root.error || typeof root.error !== "object") return fallback;
  const error = root.error as Record<string, unknown>;
  return new ApiError({
    code: typeof error.code === "string" ? error.code : fallback.code,
    message: typeof error.message === "string" ? error.message : fallback.message,
    retryable: error.retryable === true,
    ...(typeof error.traceId === "string" ? { traceId: error.traceId } : {}),
    ...(fallback.status !== undefined ? { status: fallback.status } : {}),
  });
}

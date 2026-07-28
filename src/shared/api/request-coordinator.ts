import { ApiError, isApiError } from "./api-error";

const pending = new Map<string, Promise<unknown>>();
const cache = new Map<string, { expiresAt: number; value: unknown }>();

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

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
        const value = await operation();
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

export function apiErrorFromPayload(
  payload: unknown,
  fallback: ApiError,
): ApiError {
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

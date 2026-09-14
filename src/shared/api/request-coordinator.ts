import { ApiError, isApiError } from "./api-error";

const pending = new Map<string, Promise<unknown>>();
const cache = new Map<string, { expiresAt: number; value: unknown }>();
let cacheGeneration = 0;
let sessionController = new AbortController();
const MAX_CONCURRENT_REQUESTS = 6;
let activeRequestCount = 0;
const requestQueue: Array<() => void> = [];

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

async function runWithRequestSlot<T>(operation: () => Promise<T>): Promise<T> {
  if (activeRequestCount >= MAX_CONCURRENT_REQUESTS) {
    await new Promise<void>((resolve) => requestQueue.push(resolve));
  } else activeRequestCount += 1;
  try {
    return await operation();
  } finally {
    const next = requestQueue.shift();
    if (next) next();
    else activeRequestCount -= 1;
  }
}

export interface CoordinatedRequestOptions {
  key: string;
  cacheTimeMs?: number;
  signal?: AbortSignal;
  readOnly?: boolean;
}

export async function coordinatedRequest<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  options: CoordinatedRequestOptions,
): Promise<T> {
  const readOnly = options.readOnly ?? true;
  const generation = cacheGeneration;
  const sessionSignal = sessionController.signal;
  const controller = new AbortController();
  const abort = () => controller.abort();
  const signal = controller.signal;
  if (sessionSignal.aborted || options.signal?.aborted) abort();
  sessionSignal.addEventListener("abort", abort, { once: true });
  options.signal?.addEventListener("abort", abort, { once: true });
  const cleanup = () => {
    sessionSignal.removeEventListener("abort", abort);
    options.signal?.removeEventListener("abort", abort);
  };
  if (signal.aborted) {
    cleanup();
    throw new DOMException("Aborted", "AbortError");
  }
  const cached = readOnly ? cache.get(options.key) : undefined;
  if (cached && cached.expiresAt > Date.now()) {
    cleanup();
    return cached.value as T;
  }
  if (cached) cache.delete(options.key);

  const share = readOnly && !options.signal;
  const existing = share ? pending.get(options.key) : undefined;
  if (existing) {
    cleanup();
    return existing as Promise<T>;
  }

  const promise = (async () => {
    let failureCount = 0;
    for (;;) {
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
      try {
        const value = await runWithRequestSlot(() => {
          if (signal.aborted) throw new DOMException("Aborted", "AbortError");
          return operation(signal);
        });
        if (signal.aborted) throw new DOMException("Aborted", "AbortError");
        if (readOnly && generation === cacheGeneration && (options.cacheTimeMs ?? 0) > 0) {
          if (cache.size >= 250) cache.delete(cache.keys().next().value!);
          cache.set(options.key, {
            expiresAt: Date.now() + (options.cacheTimeMs ?? 0),
            value,
          });
        }
        return value;
      } catch (error) {
        if (
          !readOnly ||
          signal.aborted ||
          !isApiError(error) ||
          !error.retryable ||
          failureCount >= 1
        )
          throw error;
        failureCount += 1;
        await wait(250 + Math.floor(Math.random() * 150));
      }
    }
  })().finally(() => {
    cleanup();
    if (!readOnly) invalidateRequestCache();
    if (pending.get(options.key) === promise) pending.delete(options.key);
  });

  if (share) pending.set(options.key, promise);
  return promise;
}

export function invalidateRequestCache(prefix?: string): void {
  cacheGeneration += 1;
  pending.clear();
  if (!prefix) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

export function resetRequestSession(): void {
  sessionController.abort();
  sessionController = new AbortController();
  invalidateRequestCache();
}

export function apiErrorFromPayload(payload: unknown, fallback: ApiError): ApiError {
  if (!payload || typeof payload !== "object") return fallback;
  const root = payload as { error?: unknown };
  const error = (root.error && typeof root.error === "object" ? root.error : payload) as Record<
    string,
    unknown
  >;
  return new ApiError({
    code: typeof error.code === "string" ? error.code : fallback.code,
    message: typeof error.message === "string" ? error.message : fallback.message,
    retryable: typeof error.retryable === "boolean" ? error.retryable : fallback.retryable,
    ...(typeof error.traceId === "string" ? { traceId: error.traceId } : {}),
    ...(fallback.status !== undefined ? { status: fallback.status } : {}),
  });
}

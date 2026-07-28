import { env } from "../config/env";
import { ApiError } from "./api-error";
import { apiErrorFromPayload, coordinatedRequest } from "./request-coordinator";

export type HttpRequestOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  signal?: AbortSignal;
};

const REQUEST_TIMEOUT_MS = 12000;

function resolveUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  const baseUrl = env.apiBaseUrl.trim();
  if (baseUrl) {
    return new URL(url, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).toString();
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost";
  return new URL(url, origin).toString();
}

export async function httpClient<T = unknown>(url: string, options: HttpRequestOptions = {}): Promise<T> {
  const resolvedUrl = resolveUrl(url);
  const method = options.method ?? "GET";
  return coordinatedRequest(async () => {
  const timeout = new AbortController();
  const timer = window.setTimeout(() => timeout.abort(), REQUEST_TIMEOUT_MS);
  const requestInit: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    credentials: "include",
    signal: options.signal ?? timeout.signal,
  };

  if (options.body !== undefined) {
    requestInit.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(resolvedUrl, requestInit);
    const contentType = response.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json") ? await response.json().catch(() => null) : await response.text();

    if (!response.ok) {
      throw apiErrorFromPayload(
        payload,
        new ApiError({
          code: response.status === 429 ? "SERVICE_BUSY" : "HTTP_ERROR",
          message:
            response.status === 429 || response.status === 503
              ? "The service is temporarily busy."
              : `Request failed with status ${response.status}`,
          retryable: response.status === 429 || response.status === 503,
          status: response.status,
        }),
      );
    }

    return payload as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError" && options.signal === undefined) {
      throw new ApiError({
        code: "REQUEST_TIMEOUT",
        message: `The request timed out after ${REQUEST_TIMEOUT_MS / 1000} seconds.`,
        retryable: true,
      });
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
  }, {
    key: `http:${method}:${resolvedUrl}:${JSON.stringify(options.body ?? null)}`,
    cacheTimeMs: method === "GET" ? 1_500 : 0,
    ...(options.signal ? { signal: options.signal } : {}),
  });
}

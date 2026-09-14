import { env } from "../config/env";
import { ApiError } from "./api-error";
import { apiErrorFromPayload, coordinatedRequest } from "./request-coordinator";
import { createRequestSignal } from "./request-signal";
import { expireClientSession, isSessionExpiredError } from "../auth/session-expiry";

export type HttpRequestOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  signal?: AbortSignal;
  timeoutMs?: number;
};

const REQUEST_TIMEOUT_MS = 35000;

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

export async function httpClient<T = unknown>(
  url: string,
  options: HttpRequestOptions = {},
): Promise<T> {
  const resolvedUrl = resolveUrl(url);
  const method = (options.method ?? "GET").toUpperCase();
  const readOnly = method === "GET" || method === "HEAD";
  const timeoutMs = options.timeoutMs ?? REQUEST_TIMEOUT_MS;
  const identity = JSON.stringify(Array.from(new Headers(options.headers).entries()).sort());
  return coordinatedRequest(
    async (signal) => {
      const requestSignal = createRequestSignal(timeoutMs, signal);
      const requestInit: RequestInit = {
        method,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        signal: requestSignal.signal,
      };

      if (options.body !== undefined) {
        requestInit.body = JSON.stringify(options.body);
      }

      try {
        const response = await fetch(resolvedUrl, requestInit);
        const contentType = response.headers.get("content-type") ?? "";
        const payload = contentType.includes("application/json")
          ? await response.json().catch(() => null)
          : await response.text();

        if (!response.ok) {
          const error = apiErrorFromPayload(
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
          if (isSessionExpiredError(error)) expireClientSession();
          throw error;
        }

        return payload as T;
      } catch (error) {
        if (requestSignal.didTimeout()) {
          throw new ApiError({
            code: "REQUEST_TIMEOUT",
            message: readOnly
              ? `The request timed out after ${timeoutMs / 1000} seconds.`
              : "The response was not received. Check whether the change was saved before trying again.",
            retryable: readOnly,
          });
        }
        if (error instanceof TypeError) {
          throw new ApiError({
            code: "NETWORK_ERROR",
            message: readOnly
              ? "The service could not be reached. Check the connection and try again."
              : "The response was lost. Check whether the change was saved before trying again.",
            retryable: readOnly,
          });
        }
        throw error;
      } finally {
        requestSignal.cleanup();
      }
    },
    {
      key: `http:${method}:${resolvedUrl}:${identity}:${JSON.stringify(options.body ?? null)}`,
      readOnly,
      cacheTimeMs: method === "GET" ? 1_500 : 0,
      ...(options.signal ? { signal: options.signal } : {}),
    },
  );
}

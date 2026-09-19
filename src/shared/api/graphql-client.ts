import { getCognitoIdToken } from "../auth/cognito-token";
import { env } from "../config/env";
import { ApiError } from "./api-error";
import { coordinatedRequest } from "./request-coordinator";
import { createRequestSignal } from "./request-signal";
import { expireClientSession, isSessionExpiredFailure } from "../auth/session-expiry";
import { graphqlOperationName, recordRequestPerformance } from "./request-performance";

interface GraphqlError {
  message?: string;
  errorType?: string;
  extensions?: { code?: string; retryable?: boolean; traceId?: string };
}

interface GraphqlResponse<T> {
  data?: T;
  errors?: GraphqlError[];
}

const REQUEST_TIMEOUT_MS = 35000;

export interface GraphqlClientOptions {
  cacheTimeMs?: number;
  cacheKey?: string;
  timeoutMs?: number;
}

export async function graphqlClient<
  TData,
  TVariables extends Record<string, unknown> = Record<string, never>,
>(
  query: string,
  variables?: TVariables,
  signal?: AbortSignal,
  options: GraphqlClientOptions = {},
): Promise<TData> {
  const endpoint =
    env.graphqlUrl.trim() ||
    "https://cvhvlqs5bjdp3hu4e5dfusigx4.appsync-api.ap-south-1.amazonaws.com/graphql";
  const token = await getCognitoIdToken();
  const readOnly = /^\s*(?:#[^\n]*\n\s*)*(?:query\b|\{)/.test(query);
  if (!token) {
    expireClientSession();
    throw new ApiError({
      code: "SESSION_EXPIRED",
      message: "Your session has expired. Sign in again.",
      retryable: false,
      status: 401,
    });
  }

  return coordinatedRequest(
    async (requestSessionSignal) => {
      const startedAt = performance.now();
      let outcome: "success" | "error" | "cancelled" = "error";
      const timeoutMs = options.timeoutMs ?? REQUEST_TIMEOUT_MS;
      const requestSignal = createRequestSignal(timeoutMs, requestSessionSignal);
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: token,
          },
          body: JSON.stringify({ query, variables: variables ?? {} }),
          signal: requestSignal.signal,
        });
        const payload = (await response.json()) as GraphqlResponse<TData>;
        const firstError = payload.errors?.[0];
        if (!response.ok || firstError || !payload.data) {
          const code = firstError?.extensions?.code ?? firstError?.errorType;
          if (
            isSessionExpiredFailure({
              status: response.status,
              ...(code ? { code } : {}),
              ...(firstError?.message ? { message: firstError.message } : {}),
            })
          ) {
            expireClientSession();
            throw new ApiError({
              code: "SESSION_EXPIRED",
              message: "Your session has expired. Sign in again.",
              retryable: false,
              status: 401,
            });
          }
          throw new ApiError({
            code: code ?? (response.status === 429 ? "SERVICE_BUSY" : "GRAPHQL_ERROR"),
            message:
              code === "SERVICE_BUSY" || response.status === 429
                ? "The service is temporarily busy."
                : (firstError?.message ?? `GraphQL request failed with status ${response.status}`),
            retryable:
              firstError?.extensions?.retryable === true ||
              response.status === 429 ||
              response.status === 503,
            status: response.status,
            ...(firstError?.extensions?.traceId ? { traceId: firstError.extensions.traceId } : {}),
          });
        }
        outcome = "success";
        return payload.data;
      } catch (error) {
        if (requestSignal.signal.aborted && !requestSignal.didTimeout()) outcome = "cancelled";
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
        recordRequestPerformance({
          kind: "graphql",
          operation: graphqlOperationName(query),
          durationMs: Math.round(performance.now() - startedAt),
          outcome,
        });
        requestSignal.cleanup();
      }
    },
    {
      key: `graphql:${endpoint}:${token}:${options.cacheKey ?? `${query}:${JSON.stringify(variables ?? {})}`}`,
      cacheTimeMs: readOnly ? (options.cacheTimeMs ?? 1_500) : 0,
      readOnly,
      ...(signal ? { signal } : {}),
    },
  );
}

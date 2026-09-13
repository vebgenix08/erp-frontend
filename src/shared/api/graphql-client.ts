import { getCognitoIdToken } from "../auth/cognito-token";
import { env } from "../config/env";
import { ApiError } from "./api-error";
import { coordinatedRequest } from "./request-coordinator";
import { createRequestSignal } from "./request-signal";
import { expireClientSession, isSessionExpiredFailure } from "../auth/session-expiry";

interface GraphqlError {
  message?: string;
  errorType?: string;
  extensions?: { code?: string; retryable?: boolean; traceId?: string };
}

interface GraphqlResponse<T> {
  data?: T;
  errors?: GraphqlError[];
}

const REQUEST_TIMEOUT_MS = 12000;

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
    async () => {
      const timeoutMs = options.timeoutMs ?? REQUEST_TIMEOUT_MS;
      const requestSignal = createRequestSignal(timeoutMs, signal);
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
        return payload.data;
      } catch (error) {
        if (requestSignal.didTimeout()) {
          throw new ApiError({
            code: "REQUEST_TIMEOUT",
            message: `The request timed out after ${timeoutMs / 1000} seconds.`,
            retryable: true,
          });
        }
        if (error instanceof TypeError) {
          throw new ApiError({
            code: "NETWORK_ERROR",
            message: "The service could not be reached. Check the connection and try again.",
            retryable: true,
          });
        }
        throw error;
      } finally {
        requestSignal.cleanup();
      }
    },
    {
      key: `graphql:${endpoint}:${token}:${options.cacheKey ?? `${query}:${JSON.stringify(variables ?? {})}`}`,
      cacheTimeMs: options.cacheTimeMs ?? 1_500,
      ...(signal ? { signal } : {}),
    },
  );
}

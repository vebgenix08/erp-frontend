import { getCognitoIdToken } from "../auth/cognito-token";
import { env } from "../config/env";
import { ApiError } from "./api-error";
import { coordinatedRequest } from "./request-coordinator";

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

export async function graphqlClient<TData, TVariables extends Record<string, unknown> = Record<string, never>>(
  query: string,
  variables?: TVariables,
  signal?: AbortSignal,
): Promise<TData> {
  const endpoint = env.graphqlUrl.trim() || "https://cvhvlqs5bjdp3hu4e5dfusigx4.appsync-api.ap-south-1.amazonaws.com/graphql";
  const token = await getCognitoIdToken();
  if (!token) throw new Error("Cognito session is required for GraphQL requests");

  const timeout = new AbortController();
  const timer = window.setTimeout(() => timeout.abort(), REQUEST_TIMEOUT_MS);

  return coordinatedRequest(async () => {
    try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: token,
      },
      body: JSON.stringify({ query, variables: variables ?? {} }),
      ...(signal ? { signal } : { signal: timeout.signal }),
    });
    const payload = await response.json() as GraphqlResponse<TData>;
    const firstError = payload.errors?.[0];
    if (!response.ok || firstError || !payload.data) {
      const code = firstError?.extensions?.code ?? firstError?.errorType;
      throw new ApiError({
        code: code ?? (response.status === 429 ? "SERVICE_BUSY" : "GRAPHQL_ERROR"),
        message:
          code === "SERVICE_BUSY" || response.status === 429
            ? "The service is temporarily busy."
            : firstError?.message ?? `GraphQL request failed with status ${response.status}`,
        retryable:
          firstError?.extensions?.retryable === true ||
          response.status === 429 ||
          response.status === 503,
        status: response.status,
        ...(firstError?.extensions?.traceId
          ? { traceId: firstError.extensions.traceId }
          : {}),
      });
    }
    return payload.data;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError" && signal === undefined) {
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
    key: `graphql:${endpoint}:${query}:${JSON.stringify(variables ?? {})}`,
    cacheTimeMs: 1_500,
    ...(signal ? { signal } : {}),
  });
}

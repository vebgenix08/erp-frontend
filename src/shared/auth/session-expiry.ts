import { clearCognitoIdToken } from "./cognito-token";

export const SESSION_EXPIRED_EVENT = "erp:session-expired";

const EXPIRY_CODES = new Set([
  "SESSION_EXPIRED",
  "TOKEN_EXPIRED",
  "UNAUTHENTICATED",
  "UNAUTHORIZED",
  "UNAUTHORIZED_EXCEPTION",
]);

const EXPIRY_MESSAGE =
  /token has expired|session has expired|cognito session has expired|invalid cognito id token|no active cognito session/i;

export interface SessionFailure {
  status?: number;
  code?: string;
  message?: string;
}

export function isSessionExpiredFailure(failure: SessionFailure): boolean {
  const code = failure.code
    ?.trim()
    .replaceAll(/[^A-Za-z0-9]+/g, "_")
    .toUpperCase();
  return (
    failure.status === 401 ||
    (code !== undefined && EXPIRY_CODES.has(code)) ||
    EXPIRY_MESSAGE.test(failure.message ?? "")
  );
}

export function isSessionExpiredError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return error instanceof Error && EXPIRY_MESSAGE.test(error.message);
  }
  const failure = error as SessionFailure;
  return isSessionExpiredFailure({
    ...(typeof failure.status === "number" ? { status: failure.status } : {}),
    ...(typeof failure.code === "string" ? { code: failure.code } : {}),
    ...(error instanceof Error
      ? { message: error.message }
      : typeof failure.message === "string"
        ? { message: failure.message }
        : {}),
  });
}

export function expireClientSession(): void {
  clearCognitoIdToken();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }
}

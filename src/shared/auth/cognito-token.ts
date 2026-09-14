import { resetRequestSession } from "../api/request-coordinator";

type TokenProvider = () => string | null | Promise<string | null>;

const STORAGE_KEY = "erp.cognito.idToken";

function readStoredToken(): string | null {
  return globalThis.sessionStorage?.getItem(STORAGE_KEY) ?? null;
}

let provider: TokenProvider = readStoredToken;

export function setCognitoIdTokenProvider(nextProvider: TokenProvider): void {
  resetRequestSession();
  provider = nextProvider;
}

export async function getCognitoIdToken(): Promise<string | null> {
  const token = await provider();
  return token?.trim() || null;
}

export function storeCognitoIdToken(token: string): void {
  resetRequestSession();
  globalThis.sessionStorage?.setItem(STORAGE_KEY, token);
}

export function clearCognitoIdToken(): void {
  resetRequestSession();
  globalThis.sessionStorage?.removeItem(STORAGE_KEY);
}

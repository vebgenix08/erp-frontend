import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { fetchSession } from "../api/session.api";
import { storeCognitoIdToken, clearCognitoIdToken } from "../../../shared/auth/cognito-token";
import type { SessionPayload, SessionStatus } from "./session.types";

interface SessionContextValue {
  status: SessionStatus;
  session: SessionPayload | null;
  error: string | null;
  refreshSession: () => Promise<void>;
  establishSession: (idToken: string) => Promise<void>;
  clearSession: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  const refreshSession = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const nextSession = await fetchSession();
      setSession(nextSession);
      setStatus("authenticated");
    } catch (err) {
      setSession(null);
      setStatus("anonymous");
      const message = err instanceof Error ? err.message : "Unable to load session";
      const staleLocalSession = /No active Cognito session|Cognito session has expired|Invalid Cognito ID token/.test(message);
      if (staleLocalSession) clearCognitoIdToken();
      setError(staleLocalSession ? null : message);
    }
  }, []);

  const establishSession = useCallback(async (idToken: string) => {
    storeCognitoIdToken(idToken);
    await refreshSession();
  }, [refreshSession]);

  const clearSession = useCallback(() => {
    clearCognitoIdToken();
    setSession(null);
    setStatus("anonymous");
    setError(null);
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const value = useMemo<SessionContextValue>(
    () => ({ status, session, error, refreshSession, establishSession, clearSession }),
    [clearSession, error, establishSession, refreshSession, session, status],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

// The hook intentionally shares this module with its provider so both use one private context.
// eslint-disable-next-line react-refresh/only-export-components
export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return context;
}

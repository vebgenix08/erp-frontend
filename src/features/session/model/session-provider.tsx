import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
  type ReactNode,
} from "react";
import { fetchSession } from "../api/session.api";
import { storeCognitoIdToken, clearCognitoIdToken } from "../../../shared/auth/cognito-token";
import type { SessionPayload, SessionStatus } from "./session.types";
import { isSessionExpiredError, SESSION_EXPIRED_EVENT } from "../../../shared/auth/session-expiry";

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
  const sessionRevision = useRef(0);

  const refreshSession = useCallback(async () => {
    const revision = ++sessionRevision.current;
    setStatus("loading");
    setError(null);
    try {
      const nextSession = await fetchSession();
      if (revision !== sessionRevision.current) return;
      setSession(nextSession);
      setStatus("authenticated");
    } catch (err) {
      if (revision !== sessionRevision.current) return;
      const message = err instanceof Error ? err.message : "Unable to load session";
      const staleLocalSession = isSessionExpiredError(err);
      if (staleLocalSession) {
        clearCognitoIdToken();
        setSession(null);
        setStatus("anonymous");
        setError(null);
      } else {
        setSession(null);
        setStatus("error");
        setError(message);
      }
    }
  }, []);

  const establishSession = useCallback(
    async (idToken: string) => {
      storeCognitoIdToken(idToken);
      await refreshSession();
    },
    [refreshSession],
  );

  const clearSession = useCallback(() => {
    sessionRevision.current += 1;
    clearCognitoIdToken();
    setSession(null);
    setStatus("anonymous");
    setError(null);
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    window.addEventListener(SESSION_EXPIRED_EVENT, clearSession);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, clearSession);
  }, [clearSession]);

  const value = useMemo<SessionContextValue>(
    () => ({
      status,
      session,
      error,
      refreshSession,
      establishSession,
      clearSession,
    }),
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

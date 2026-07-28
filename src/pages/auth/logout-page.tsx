import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { logoutSession } from "../../features/session/api/session.api";
import { useSession } from "../../features/session/model/session-provider";
import { LoadingState } from "../../shared/ui/page-state";

export function LogoutPage() {
  const { clearSession } = useSession();
  const navigate = useNavigate();
  useEffect(() => {
    let active = true;
    void logoutSession().catch(() => ({ success: false })).finally(() => {
      if (!active) return;
      clearSession();
      navigate("/login", { replace: true });
    });
    return () => { active = false; };
  }, [clearSession, navigate]);
  return <LoadingState label="Signing out"/>;
}

import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSession } from "../model/session-provider";

export function ProtectedRoutes({ children }: { children?: ReactNode }) {
  const { status } = useSession();
  const location = useLocation();

  if (status === "loading") {
    return <main aria-busy="true">Loading session...</main>;
  }

  if (status === "anonymous") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (children) return <>{children}</>;
  return <Outlet />;
}

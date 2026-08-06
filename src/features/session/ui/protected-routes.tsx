import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSession } from "../model/session-provider";

export function ProtectedRoutes({ children, allowedRoles }: { children?: ReactNode; allowedRoles?: readonly string[] }) {
  const { status, session } = useSession();
  const location = useLocation();

  if (status === "loading") {
    return <main aria-busy="true">Loading session...</main>;
  }

  if (status === "anonymous") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const role = session?.user.role?.trim().toUpperCase();
  if (allowedRoles?.length && (!role || !allowedRoles.includes(role))) {
    const destination = role === "SUPER_ADMIN"
      ? "/platform/dashboard"
      : role === "TENANT_ADMIN" || role === "ADMIN"
        ? "/admin/dashboard"
        : "/tenant-not-found";
    return <Navigate to={destination} replace />;
  }

  if (children) return <>{children}</>;
  return <Outlet />;
}

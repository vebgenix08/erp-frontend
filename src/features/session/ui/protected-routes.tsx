import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSession } from "../model/session-provider";
import { ErrorState } from "../../../shared/ui/page-state";

export function ProtectedRoutes({
  children,
  allowedRoles,
}: {
  children?: ReactNode;
  allowedRoles?: readonly string[];
}) {
  const { status, session, error, refreshSession } = useSession();
  const location = useLocation();

  if (status === "loading") {
    return (
      <main
        aria-busy="true"
        className="grid min-h-screen place-items-center bg-slate-50 text-sm font-medium text-slate-600"
      >
        Loading secure session...
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 px-5">
        <ErrorState
          message={error ?? "The secure session could not be loaded."}
          retry={() => void refreshSession()}
        />
      </main>
    );
  }

  if (status === "anonymous") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const role = session?.user.role?.trim().toUpperCase();
  if (allowedRoles?.length && (!role || !allowedRoles.includes(role))) {
    const destination =
      role === "SUPER_ADMIN"
        ? "/platform/dashboard"
        : role === "TENANT_ADMIN" || role === "ADMIN"
          ? "/admin/dashboard"
          : "/tenant-not-found";
    return <Navigate to={destination} replace />;
  }

  if (children) return <>{children}</>;
  return <Outlet />;
}

import type { ReactNode } from "react";
import { Outlet } from "react-router-dom";

export function ProtectedRoutes({ children }: { children?: ReactNode }) {
  if (children) return <>{children}</>;
  return <Outlet />;
}

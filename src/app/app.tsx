import { BrowserRouter } from "react-router-dom";
import { useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { AppProviders } from "./providers";
import { AppRoutes } from "./routes";
import { AppErrorBoundary } from "../shared/ui/app-error-boundary";

function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const location = useLocation();
  return (
    <AppErrorBoundary resetKey={`${location.pathname}${location.search}`}>
      {children}
    </AppErrorBoundary>
  );
}

export function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <RouteErrorBoundary>
          <AppRoutes />
        </RouteErrorBoundary>
      </BrowserRouter>
    </AppProviders>
  );
}

import { createBrowserRouter, RouterProvider, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { AppProviders } from "./providers";
import { AppRoutes } from "./routes";
import { AppErrorBoundary } from "../shared/ui/app-error-boundary";
import { UnsavedChangesProvider } from "../shared/navigation/unsaved-changes";

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
      <RouterProvider router={router} />
    </AppProviders>
  );
}

const router = createBrowserRouter([
  {
    path: "*",
    element: (
      <UnsavedChangesProvider>
        <RouteErrorBoundary>
          <AppRoutes />
        </RouteErrorBoundary>
      </UnsavedChangesProvider>
    ),
  },
]);

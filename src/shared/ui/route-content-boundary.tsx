import { Suspense, type ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { AppErrorBoundary } from "./app-error-boundary";

interface RouteContentBoundaryProps {
  children: ReactNode;
  resetKey: string;
}

export function RouteContentBoundary({ children, resetKey }: RouteContentBoundaryProps) {
  return (
    <AppErrorBoundary resetKey={resetKey} contained>
      <Suspense
        fallback={
          <div
            className="flex min-h-56 items-center justify-center gap-2 text-sm font-semibold text-slate-600"
            role="status"
          >
            <LoaderCircle className="h-5 w-5 animate-spin text-brand-600" aria-hidden="true" />
            Loading page...
          </div>
        }
      >
        {children}
      </Suspense>
    </AppErrorBoundary>
  );
}

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "./button";

interface AppErrorBoundaryState {
  error: Error | null;
}

export class AppErrorBoundary extends Component<{ children: ReactNode }, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("The ERP workspace could not be rendered", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 px-5">
        <section className="w-full max-w-md border border-slate-200 bg-white p-8 text-center shadow-sm">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-700">
            <AlertTriangle size={24} />
          </span>
          <h1 className="mt-4 text-xl font-bold text-slate-900">This page could not be opened</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            The page files or a required service did not load correctly. Reload the workspace to
            recover safely.
          </p>
          <Button className="mt-6" onClick={() => window.location.reload()}>
            <RefreshCw size={16} /> Reload workspace
          </Button>
        </section>
      </main>
    );
  }
}

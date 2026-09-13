import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, RotateCcw } from "lucide-react";
import { isAssetLoadFailure, recoverFromAssetLoadFailure } from "../lib/frontend-asset-recovery";
import { Button } from "./button";

interface AppErrorBoundaryState {
  error: Error | null;
}

interface AppErrorBoundaryProps {
  children: ReactNode;
  resetKey: string;
  contained?: boolean;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("The ERP workspace could not be rendered", error, info);
    recoverFromAssetLoadFailure(error);
  }

  componentDidUpdate(previousProps: AppErrorBoundaryProps) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const assetFailure = isAssetLoadFailure(error);

    return (
      <main
        className={
          this.props.contained
            ? "grid min-h-72 place-items-center px-5"
            : "grid min-h-screen place-items-center bg-slate-50 px-5"
        }
      >
        <section className="w-full max-w-md border border-slate-200 bg-white p-8 text-center shadow-sm">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-700">
            <AlertTriangle size={24} />
          </span>
          <h1 className="mt-4 text-xl font-bold text-slate-900">This page could not be opened</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {assetFailure
              ? "A newer page version could not be downloaded. Refresh once to load the latest files."
              : "This page encountered an unexpected rendering error. Other workspace pages remain available."}
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Button variant="outline" onClick={() => this.setState({ error: null })}>
              <RotateCcw size={16} /> Retry page
            </Button>
            <Button onClick={() => window.location.reload()}>
              <RefreshCw size={16} /> Refresh
            </Button>
          </div>
        </section>
      </main>
    );
  }
}

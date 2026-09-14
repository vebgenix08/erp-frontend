import { AlertCircle, Inbox } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Spinner } from "./spinner";
import { Button } from "./button";

export function LoadingState({ label = "Loading data" }: { label?: string }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    setSlow(false);
    const timer = window.setTimeout(() => setSlow(true), 5000);
    return () => window.clearTimeout(timer);
  }, [label]);
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500"
      aria-busy="true"
    >
      <Spinner className="h-6 w-6 text-accent-600" />
      <strong className="text-sm font-medium text-slate-600">{label}</strong>
      {slow ? (
        <p role="status" className="text-sm">
          Still loading. This is taking longer than usual.
        </p>
      ) : null}
    </div>
  );
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
        <AlertCircle size={24} />
      </span>
      <strong className="text-sm font-semibold text-slate-800">Unable to load this view</strong>
      <p className="max-w-sm text-center text-sm text-slate-500">{message}</p>
      {retry ? (
        <Button variant="outline" size="sm" onClick={retry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Inbox size={24} />
      </span>
      <strong className="text-sm font-semibold text-slate-800">{title}</strong>
      <p className="max-w-sm text-center text-sm text-slate-500">{description}</p>
      {action}
    </div>
  );
}

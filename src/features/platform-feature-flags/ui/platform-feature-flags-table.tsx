import { Flag } from "lucide-react";
import type { PlatformFeatureFlag } from "../model/platform-feature-flags.types";
import { EmptyState } from "../../../shared/ui/page-state";
import { Badge } from "../../../shared/ui/badge";
import { cn } from "../../../shared/ui/utils";
import { Spinner } from "../../../shared/ui/spinner";

export function PlatformFeatureFlagsTable({
  flags,
  onToggle,
  busyId,
}: {
  flags: PlatformFeatureFlag[];
  onToggle: (flag: PlatformFeatureFlag) => void;
  busyId?: string | null;
}) {
  if (!flags.length)
    return (
      <EmptyState
        title="No platform features"
        description="Feature catalog entries will appear here when configured."
      />
    );

  return (
    <div className="space-y-0 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white overflow-hidden">
      {flags.map((flag) => (
        <article key={flag.id} className="flex items-start gap-4 px-5 py-4 transition-colors hover:bg-slate-50">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            <Flag size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <strong className="text-sm font-semibold text-slate-900">{flag.name}</strong>
              <Badge variant={flag.isEnabled ? "success" : "secondary"}>
                {flag.isEnabled ? "Enabled" : "Disabled"}
              </Badge>
            </div>
            <p className="mt-0.5 text-sm text-slate-500">
              {flag.description || "No description provided."}
            </p>
            <code className="mt-1 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-slate-600">
              {flag.code}
            </code>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={flag.isEnabled}
            aria-label={`${flag.isEnabled ? "Disable" : "Enable"} ${flag.name}`}
            disabled={busyId === flag.id}
            onClick={() => onToggle(flag)}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
              flag.isEnabled ? "bg-accent-600" : "bg-slate-200",
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                flag.isEnabled ? "translate-x-6" : "translate-x-1",
              )}
            />
            {busyId === flag.id && (
              <Spinner className="absolute right-0.5 top-0.5 h-3 w-3 text-white" />
            )}
          </button>
        </article>
      ))}
    </div>
  );
}

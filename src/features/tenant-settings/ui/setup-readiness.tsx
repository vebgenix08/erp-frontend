import { AlertCircle, CheckCircle2, CircleDashed } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getTenantReadiness } from "../api/settings.api";
import type { TenantReadiness } from "../model/settings.types";
import { ErrorState, LoadingState } from "../../../shared/ui/page-state";
import { Badge } from "../../../shared/ui/badge";
import { Card } from "../../../shared/ui/card";
import { cn } from "../../../shared/ui/utils";

export function SetupReadiness() {
  const [readiness, setReadiness] = useState<TenantReadiness | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setError(null);
    getTenantReadiness()
      .then(setReadiness)
      .catch((value) =>
        setError(
          value instanceof Error
            ? value.message
            : "Unable to evaluate setup readiness",
        ),
      );
  };
  useEffect(load, []);

  if (error) return <ErrorState message={error} retry={load} />;
  if (!readiness) return <LoadingState label="Evaluating tenant setup" />;

  return (
    <section className="space-y-5">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Setup readiness</h2>
          <p className="mt-1 text-sm text-slate-500">
            Live checks derived from institution configuration. Checklist items cannot be manually marked complete.
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold",
            readiness.ready
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-amber-50 text-amber-700 border border-amber-200",
          )}
        >
          {readiness.percentage}% ready
        </span>
      </header>

      {/* Items */}
      <Card>
        <div className="divide-y divide-slate-100">
          {readiness.items.map((item) => {
            const Icon =
              item.status === "READY"
                ? CheckCircle2
                : item.status === "OPTIONAL"
                  ? CircleDashed
                  : AlertCircle;

            return (
              <Link
                key={item.key}
                to={item.route}
                className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50"
              >
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    item.status === "READY"
                      ? "bg-emerald-100 text-emerald-600"
                      : item.status === "OPTIONAL"
                        ? "bg-slate-100 text-slate-400"
                        : "bg-amber-100 text-amber-600",
                  )}
                >
                  <Icon size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                  <p className="text-xs text-slate-500">{item.detail}</p>
                </div>
                <Badge
                  variant={
                    item.status === "READY"
                      ? "success"
                      : item.status === "OPTIONAL"
                        ? "secondary"
                        : "warning"
                  }
                >
                  {item.status.replace("_", " ")}
                </Badge>
              </Link>
            );
          })}
        </div>
      </Card>
    </section>
  );
}

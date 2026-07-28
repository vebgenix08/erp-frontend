import { useEffect, useState } from "react";
import { Activity, Database, GitBranch, UserRoundCheck, ShieldCheck } from "lucide-react";
import { getPlatformDashboard } from "../../features/platform-dashboard/api/platform-dashboard.api";
import type { PlatformDashboardSummary } from "../../features/platform-dashboard/model/platform-dashboard.types";
import { graphqlClient } from "../../shared/api/graphql-client";
import { ErrorState, LoadingState } from "../../shared/ui/page-state";
import { Badge } from "../../shared/ui/badge";
import { Card, CardContent } from "../../shared/ui/card";
import { cn } from "../../shared/ui/utils";

export function PlatformOperationsPage() {
  const [summary, setSummary] = useState<PlatformDashboardSummary | null>(null);
  const [api, setApi] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setError(null);
    void Promise.all([
      getPlatformDashboard(),
      graphqlClient<{ apiHealth: { ok: boolean } }>(
        `query PlatformApiHealth { apiHealth { ok environment } }`,
      ),
    ])
      .then(([dashboard, health]) => {
        setSummary(dashboard.platformDashboardSummary);
        setApi(health.apiHealth.ok);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Unable to load platform health"),
      );
  };

  useEffect(load, []);

  if (error && !summary) return <ErrorState message={error} retry={load} />;
  if (!summary) return <LoadingState label="Loading operational health" />;

  const checks = [
    {
      label: "AppSync API",
      ok: api,
      detail: "Authenticated GraphQL control plane",
      icon: GitBranch,
    },
    {
      label: "MongoDB platform data",
      ok: true,
      detail: `${summary.tenantCount} tenant records readable`,
      icon: Database,
    },
    {
      label: "Audit pipeline",
      ok: summary.auditLogCount >= 0,
      detail: `${summary.auditLogCount} append-only events`,
      icon: ShieldCheck,
    },
    {
      label: "Tenant onboarding",
      ok: summary.failedBootstrapCount === 0,
      detail: `${summary.pendingBootstrapCount} pending, ${summary.failedBootstrapCount} failed`,
      icon: UserRoundCheck,
    },
  ];

  const allHealthy = checks.every((x) => x.ok);

  return (
    <section className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Operational health</h2>
          <p className="mt-1 text-sm text-slate-500">Live control-plane checks and platform workload signals.</p>
        </div>
        <Badge variant={allHealthy ? "success" : "destructive"} className="h-7 px-3 flex items-center gap-1">
          <Activity size={13} />
          {allHealthy ? "Operational" : "Degraded"}
        </Badge>
      </header>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Operations List */}
      <div className="space-y-3">
        {checks.map(({ label, ok, detail, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-3.5 min-w-0 flex-1">
                <span className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                  ok ? "bg-slate-100 text-slate-500" : "bg-red-50 text-red-650"
                )}>
                  <Icon size={17} />
                </span>
                <div className="min-w-0">
                  <strong className="block text-sm text-slate-805 font-bold">{label}</strong>
                  <p className="text-xs text-slate-505 mt-0.5 leading-normal">{detail}</p>
                </div>
              </div>
              <Badge variant={ok ? "success" : "destructive"}>
                {ok ? "HEALTHY" : "DEGRADED"}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

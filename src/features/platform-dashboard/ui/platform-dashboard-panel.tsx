import { Activity, Building2, Flag, ShieldCheck, UserRoundCheck } from "lucide-react";
import { Link } from "react-router-dom";
import type {
  PlatformDashboardActivityItem,
  PlatformDashboardSummary,
} from "../model/platform-dashboard.types";
import { Button } from "../../../shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../shared/ui/card";
import { Separator } from "../../../shared/ui/separator";
import { EmptyState } from "../../../shared/ui/page-state";

interface Props {
  summary: PlatformDashboardSummary;
  recentActivity: PlatformDashboardActivityItem[];
}

export function PlatformDashboardPanel({ summary, recentActivity }: Props) {
  const metrics = [
    { label: "Tenants", value: summary.tenantCount, note: `${summary.activeTenantCount} active`, icon: Building2 },
    { label: "Suspended", value: summary.suspendedTenantCount, note: "Requires review", icon: ShieldCheck },
    { label: "Onboarding", value: summary.onboardingTenantCount, note: `${summary.failedBootstrapCount} invite failures`, icon: UserRoundCheck },
    { label: "Audit events", value: summary.auditLogCount, note: "Recorded platform actions", icon: Activity },
  ];

  return (
    <section className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Platform overview</h2>
          <p className="mt-1 text-sm text-slate-500">
            Tenant health, onboarding state, and administrative activity.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/platform/audit-logs">View audit</Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/platform/tenants/new">Create tenant</Link>
          </Button>
        </div>
      </header>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {metrics.map(({ label, value, note, icon: Icon }) => (
          <Card key={label} className="relative overflow-hidden">
            <CardContent className="pt-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
              <p className="mt-0.5 text-xs text-slate-500">{note}</p>
              <span className="absolute right-4 top-4 text-accent-300 opacity-70">
                <Icon size={20} />
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Activity feed */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle>Recent platform activity</CardTitle>
            <Link to="/platform/audit-logs" className="text-xs font-medium text-accent-600 hover:underline">
              View all
            </Link>
          </CardHeader>
          <Separator />
          {recentActivity.length ? (
            <div className="divide-y divide-slate-50">
              {recentActivity.map((item) => (
                <div key={item.id} className="flex items-start gap-3 px-5 py-3.5">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent-500" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800">
                      {item.label.replaceAll("_", " ")}
                    </p>
                    <p className="text-xs text-slate-500">{item.detail || "Platform operation"}</p>
                  </div>
                  <time className="shrink-0 text-xs text-slate-400">{item.timestamp}</time>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No activity recorded"
              description="Platform actions will appear here as tenants and features are managed."
            />
          )}
        </Card>

        {/* System summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>System summary</CardTitle>
          </CardHeader>
          <Separator />
          <div className="divide-y divide-slate-50">
            {[
              { label: "Active tenants", value: summary.activeTenantCount },
              { label: "Suspended tenants", value: summary.suspendedTenantCount },
              { label: "Pending administrator access", value: summary.pendingBootstrapCount },
              { label: "Deletion requests", value: summary.deletionPendingTenantCount },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between px-5 py-3">
                <span className="text-sm text-slate-600">{label}</span>
                <strong className="text-sm font-semibold text-slate-900">{value}</strong>
              </div>
            ))}
          </div>

          <div className="px-5 pb-3 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-slate-700">Feature governance</h4>
              <Link to="/platform/features" className="text-xs font-medium text-accent-600 hover:underline">
                Manage
              </Link>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Globally enabled</span>
              <span className="flex items-center gap-1 text-sm font-semibold text-slate-900">
                <Flag size={14} className="text-accent-500" />
                {summary.activeFeatureFlagCount}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}

import { useEffect, useState } from "react";
import { getPlatformDashboard } from "../../features/platform-dashboard/api/platform-dashboard.api";
import type {
  PlatformDashboardActivityItem,
  PlatformDashboardSummary,
} from "../../features/platform-dashboard/model/platform-dashboard.types";
import { PlatformDashboardPanel } from "../../features/platform-dashboard/ui/platform-dashboard-panel";
import { ErrorState, LoadingState } from "../../shared/ui/page-state";

export function PlatformDashboardPage() {
  const [summary, setSummary] = useState<PlatformDashboardSummary | null>(null);
  const [activity, setActivity] = useState<PlatformDashboardActivityItem[]>([]);
  const [error, setError] = useState("");

  const load = () => {
    setError("");
    void getPlatformDashboard()
      .then((result) => {
        setSummary(result.platformDashboardSummary);
        setActivity(
          result.platformAuditLogs.slice(0, 8).map((item) => ({
            id: item.id,
            label: item.action,
            detail: [item.tenantName, item.entityType].filter(Boolean).join(" · "),
            timestamp: new Date(item.createdAt).toLocaleString(),
          })),
        );
      })
      .catch((value) =>
        setError(value instanceof Error ? value.message : "Unable to load platform dashboard"),
      );
  };

  useEffect(load, []);
  if (error && !summary) return <ErrorState message={error} retry={load} />;
  if (!summary) return <LoadingState label="Loading platform dashboard" />;
  return <PlatformDashboardPanel summary={summary} recentActivity={activity} />;
}

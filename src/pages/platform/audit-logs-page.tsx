import { useEffect, useState } from "react";
import { listPlatformAuditLogs } from "../../features/platform-audit-logs/api/platform-audit-logs.api";
import type { PlatformAuditLogItem } from "../../features/platform-audit-logs/model/platform-audit-log.types";
import { PlatformAuditLogList } from "../../features/platform-audit-logs/ui/platform-audit-log-list";
import { ErrorState, LoadingState } from "../../shared/ui/page-state";

export function PlatformAuditLogsPage() {
  const [items, setItems] = useState<PlatformAuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = () => {
    setLoading(true);
    void listPlatformAuditLogs()
      .then(setItems)
      .catch((value) =>
        setError(value instanceof Error ? value.message : "Unable to load audit logs"),
      )
      .finally(() => setLoading(false));
  };
  useEffect(load, []);
  if (loading) return <LoadingState label="Loading platform audit logs" />;
  if (error) return <ErrorState message={error} retry={load} />;
  return (
    <section className="space-y-5">
      <header>
        <h2 className="text-xl font-bold text-slate-900">Audit logs</h2>
        <p className="mt-1 text-sm text-slate-500">Append-only platform administrative activity.</p>
      </header>
      <PlatformAuditLogList items={items} />
    </section>
  );
}

import { Activity } from "lucide-react";
import type { PlatformAuditLogItem } from "../model/platform-audit-log.types";
import { EmptyState } from "../../../shared/ui/page-state";

function formatEntityType(value: string): string {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}

export function PlatformAuditLogList({ items }: { items: PlatformAuditLogItem[] }) {
  if (!items.length) {
    return (
      <EmptyState
        title="No audit events"
        description="Administrative actions will be recorded here automatically."
      />
    );
  }

  return (
    <div className="space-y-0 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white overflow-hidden">
      {items.map((item) => (
        <article key={item.id} className="flex gap-4 px-5 py-4 transition-colors hover:bg-slate-50">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-100 text-accent-600">
            <Activity size={15} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong className="text-sm font-semibold capitalize text-slate-900">
                {item.action.replaceAll("_", " ")}
              </strong>
              <time className="shrink-0 text-xs text-slate-400">
                {new Date(item.createdAt).toLocaleString()}
              </time>
            </div>
            <p className="mt-0.5 text-sm text-slate-600">
              {item.tenantName ?? formatEntityType(item.entityType)}
              {item.tenantName ? ` · ${formatEntityType(item.entityType)}` : ""}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              Actor: {item.actorId ? "Platform administrator" : "System"}
              {item.tenantName ? ` · Tenant: ${item.tenantName}` : ""}
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}

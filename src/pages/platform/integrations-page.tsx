import { useEffect, useState } from "react";
import { Cloud, Mail, CreditCard, HardDrive, MessageSquare } from "lucide-react";
import {
  listPlatformIntegrations,
  setPlatformIntegration,
} from "../../features/platform-integrations/api/platform-integrations.api";
import type {
  PlatformIntegration,
  PlatformIntegrationCode,
} from "../../features/platform-integrations/model/platform-integration.types";
import { ErrorState, LoadingState } from "../../shared/ui/page-state";
import { Button } from "../../shared/ui/button";
import { Card, CardContent } from "../../shared/ui/card";
import { Badge } from "../../shared/ui/badge";

const definitions: [PlatformIntegrationCode, string, typeof Mail][] = [
  ["EMAIL", "Amazon SES", Mail],
  ["SMS", "SMS provider", MessageSquare],
  ["PAYMENTS", "Payment provider", CreditCard],
  ["STORAGE", "Amazon S3", HardDrive],
];

export function PlatformIntegrationsPage() {
  const [items, setItems] = useState<PlatformIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState("");

  const load = () => {
    setLoading(true);
    void listPlatformIntegrations()
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : "Unable to load integrations"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  async function toggle(code: PlatformIntegrationCode, current?: PlatformIntegration) {
    setBusy(code);
    try {
      const updated = await setPlatformIntegration({
        code,
        status: current?.status === "CONFIGURED" ? "DISABLED" : "CONFIGURED",
        settings: current?.settings ?? {},
      });
      setItems((values) => [...values.filter((x) => x.code !== code), updated]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update integration");
    } finally {
      setBusy("");
    }
  }

  if (loading) return <LoadingState label="Loading integrations" />;
  if (error && !items.length) return <ErrorState message={error} retry={load} />;

  return (
    <section className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Platform integrations</h2>
          <p className="mt-1 text-sm text-slate-500">
            Provider state and non-secret settings. Credentials remain in AWS Secrets Manager.
          </p>
        </div>
        <span className="text-accent-500 shrink-0">
          <Cloud size={24} />
        </span>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {/* Grid List */}
      <div className="space-y-3">
        {definitions.map(([code, label, Icon]) => {
          const item = items.find((x) => x.code === code);
          const isConfigured = item?.status === "CONFIGURED";
          return (
            <Card key={code}>
              <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                    <Icon size={17} />
                  </span>
                  <div className="min-w-0">
                    <strong className="block text-sm text-slate-800 font-bold">{label}</strong>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {item?.secretReference
                        ? "Secrets Manager reference configured"
                        : "No credential reference exposed"}
                    </p>
                    <span className="block text-[10px] text-slate-400 mt-1">
                      Updated {item ? new Date(item.updatedAt).toLocaleString() : "never"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <Badge variant={isConfigured ? "success" : "secondary"}>
                    {item?.status ?? "DISABLED"}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy === code}
                    onClick={() => void toggle(code, item)}
                  >
                    {isConfigured ? "Disable" : "Enable"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

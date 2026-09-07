import { useEffect, useMemo, useState } from "react";
import { Boxes } from "lucide-react";
import { listTenants } from "../../features/platform-tenants/api/tenants.api";
import type { TenantRecord } from "../../features/platform-tenants/model/tenant.types";
import {
  listTenantCapabilityCatalog,
  listPlatformEntitlements,
  setPlatformEntitlement,
} from "../../features/platform-entitlements/api/platform-entitlements.api";
import type {
  PlatformEntitlement,
  TenantCapability,
} from "../../features/platform-entitlements/model/platform-entitlement.types";
import { ErrorState, LoadingState } from "../../shared/ui/page-state";
import { Card, CardContent } from "../../shared/ui/card";
import { Badge } from "../../shared/ui/badge";
import { Label } from "../../shared/ui/label";
import { cn } from "../../shared/ui/utils";

export function PlatformEntitlementsPage() {
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [capabilities, setCapabilities] = useState<TenantCapability[]>([]);
  const [items, setItems] = useState<PlatformEntitlement[]>([]);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  const load = () => {
    setLoading(true);
    setError(null);
    void Promise.all([listTenants(), listTenantCapabilityCatalog(), listPlatformEntitlements()])
      .then(([t, catalog, e]) => {
        setTenants(t.filter((x) => !x.deletedAt));
        setCapabilities(catalog);
        setItems(e);
        setSelected((current) => current || t[0]?.id || "");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Unable to load entitlements"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const visible = useMemo(() => {
    const selectedItems = items.filter((item) => item.tenantId === selected);
    const enabledCodes = new Set(
      selectedItems.filter((item) => item.status === "ENABLED").map((item) => item.featureCode),
    );
    return capabilities.map((capability) => {
      const entitlement = selectedItems.find((item) => item.featureCode === capability.code);
      const missingDependencies = capability.dependencies.filter(
        (dependency) => !enabledCodes.has(dependency),
      );
      const enabledDependents = capabilities
        .filter(
          (candidate) =>
            enabledCodes.has(candidate.code) && candidate.dependencies.includes(capability.code),
        )
        .map((candidate) => candidate.code);
      const blockedReason =
        entitlement?.status === "ENABLED"
          ? enabledDependents.length
            ? `Disable these modules first: ${enabledDependents.join(", ")}`
            : ""
          : missingDependencies.length
            ? `Enable these modules first: ${missingDependencies.join(", ")}`
            : "";
      return { capability, entitlement, blockedReason };
    });
  }, [capabilities, items, selected]);

  async function toggle(featureCode: string, current?: PlatformEntitlement) {
    setBusy(featureCode);
    try {
      const updated = await setPlatformEntitlement({
        tenantId: selected,
        featureCode,
        status: current?.status === "ENABLED" ? "DISABLED" : "ENABLED",
      });
      setItems((values) => [...values.filter((x) => x.id !== updated.id), updated]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update entitlement");
    } finally {
      setBusy("");
    }
  }

  if (loading) return <LoadingState label="Loading tenant entitlements" />;
  if (error && !tenants.length) return <ErrorState message={error} retry={load} />;

  return (
    <section className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Tenant capabilities</h2>
          <p className="mt-1 text-sm text-slate-500">
            Grant product capabilities per tenant without changing the global feature catalog.
          </p>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {/* Toolbar / Selector */}
      <div className="flex flex-wrap items-end justify-between gap-4 p-4 rounded-lg border border-slate-200 bg-slate-50/50">
        <div className="w-72 space-y-1.5">
          <Label htmlFor="tenant-select">Tenant</Label>
          <select
            id="tenant-select"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600"
          >
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full leading-none">
          {visible.filter((x) => x.entitlement?.status === "ENABLED").length} enabled
        </span>
      </div>

      {/* Feature Grid List */}
      <div className="space-y-3">
        {visible.map(({ capability, entitlement, blockedReason }) => {
          const isEnabled = entitlement?.status === "ENABLED";
          return (
            <Card key={capability.code}>
              <CardContent className="p-4 flex flex-wrap items-start justify-between gap-4">
                <div className="flex gap-3.5 min-w-0 flex-1">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                    <Boxes size={17} />
                  </span>
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <strong className="text-sm font-bold text-slate-805">
                        {capability.name}
                      </strong>
                      <Badge variant={isEnabled ? "success" : "secondary"}>
                        {entitlement?.status ?? "DISABLED"}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 leading-normal">
                      {capability.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-slate-450 font-medium">
                      <code className="bg-slate-105 px-1 rounded font-mono">{capability.code}</code>
                      <span>·</span>
                      <span>Owner: {capability.owner}</span>
                      <span>·</span>
                      <span>Design sections: {capability.designSections.join(", ")}</span>
                      {capability.dependencies.length > 0 && (
                        <>
                          <span>·</span>
                          <span className="text-amber-600">
                            Requires: {capability.dependencies.join(", ")}
                          </span>
                        </>
                      )}
                    </div>
                    {blockedReason && (
                      <p className="text-[10px] font-semibold text-rose-500 mt-1">
                        {blockedReason}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center self-center shrink-0">
                  {/* Inline Toggle Switch */}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={!selected || busy === capability.code || Boolean(blockedReason)}
                      checked={isEnabled}
                      onChange={() => void toggle(capability.code, entitlement)}
                      className="sr-only peer"
                    />
                    <div
                      className={cn(
                        "w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent-600",
                        (busy === capability.code || Boolean(blockedReason)) &&
                          "opacity-50 cursor-not-allowed",
                      )}
                    ></div>
                  </label>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listTenants } from "../../features/platform-tenants/api/tenants.api";
import type { TenantRecord } from "../../features/platform-tenants/model/tenant.types";
import { TenantList } from "../../features/platform-tenants/ui/tenant-list";
import { Button } from "../../shared/ui/button";
import { ErrorState, LoadingState } from "../../shared/ui/page-state";

export function PlatformTenantsPage() {
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = () => {
    setLoading(true);
    setError("");
    void listTenants()
      .then(setTenants)
      .catch((value) => setError(value instanceof Error ? value.message : "Unable to load tenants"))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);
  if (loading) return <LoadingState label="Loading tenants" />;
  if (error) return <ErrorState message={error} retry={load} />;
  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Tenants</h2>
          <p className="mt-1 text-sm text-slate-500">
            Create and manage institution lifecycle records.
          </p>
        </div>
        <Button asChild>
          <Link to="/platform/tenants/new">
            <Plus size={16} />
            Create tenant
          </Link>
        </Button>
      </header>
      <TenantList tenants={tenants} />
    </section>
  );
}

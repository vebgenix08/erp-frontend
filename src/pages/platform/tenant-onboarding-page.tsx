import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getTenant } from "../../features/platform-tenants/api/tenants.api";
import type { TenantRecord } from "../../features/platform-tenants/model/tenant.types";
import { TenantOnboarding } from "../../features/platform-tenants/ui/tenant-onboarding";
import { ErrorState, LoadingState } from "../../shared/ui/page-state";

export function PlatformTenantOnboardingPage() {
  const { tenantId = "" } = useParams();
  const [tenant, setTenant] = useState<TenantRecord | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { void getTenant(tenantId).then(setTenant).catch((value) => setError(value instanceof Error ? value.message : "Unable to load tenant")); }, [tenantId]);
  if (error) return <ErrorState message={error}/>;
  if (!tenant) return <LoadingState label="Loading tenant onboarding"/>;
  return <section className="space-y-5"><header><h2 className="text-xl font-bold text-slate-900">{tenant.name}</h2><p className="mt-1 text-sm text-slate-500">First administrator onboarding and invite delivery.</p></header><TenantOnboarding tenant={tenant}/></section>;
}

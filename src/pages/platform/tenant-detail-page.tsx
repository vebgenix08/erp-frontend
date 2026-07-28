import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { activateTenant, deactivateTenant, getTenant, requestTenantDeletion, suspendTenant, updateTenant } from "../../features/platform-tenants/api/tenants.api";
import type { TenantRecord } from "../../features/platform-tenants/model/tenant.types";
import { TenantForm } from "../../features/platform-tenants/ui/tenant-form";
import { Badge } from "../../shared/ui/badge";
import { Button } from "../../shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../shared/ui/card";
import { ErrorState, LoadingState } from "../../shared/ui/page-state";

export function PlatformTenantDetailPage() {
  const { tenantId = "" } = useParams();
  const [tenant, setTenant] = useState<TenantRecord | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = () => { setError(""); void getTenant(tenantId).then(setTenant).catch((value) => setError(value instanceof Error ? value.message : "Unable to load tenant")); };
  useEffect(load, [tenantId]);
  const mutate = async (operation: () => Promise<TenantRecord>) => { setBusy(true); setError(""); try { setTenant(await operation()); } catch (value) { setError(value instanceof Error ? value.message : "Tenant update failed"); } finally { setBusy(false); } };
  if (error && !tenant) return <ErrorState message={error} retry={load}/>;
  if (!tenant) return <LoadingState label="Loading tenant"/>;
  return <section className="space-y-5">{error ? <ErrorState message={error}/> : null}<header className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><h2 className="text-xl font-bold text-slate-900">{tenant.name}</h2><Badge variant={tenant.status === "ACTIVE" ? "success" : tenant.status === "SUSPENDED" ? "destructive" : "secondary"}>{tenant.status.replaceAll("_", " ")}</Badge></div><p className="mt-1 text-sm text-slate-500">{tenant.slug}</p></div><Button asChild variant="outline"><Link to={`/platform/tenants/${tenant.id}/onboarding`}>Administrator onboarding</Link></Button></header><div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]"><Card><CardHeader><CardTitle>Institution record</CardTitle></CardHeader><CardContent><TenantForm initialValue={tenant} submitLabel="Save tenant" onSubmit={async (input) => setTenant(await updateTenant(tenant.id, input))}/></CardContent></Card><Card><CardHeader><CardTitle>Lifecycle controls</CardTitle></CardHeader><CardContent className="space-y-3"><Button className="w-full" disabled={busy || tenant.status === "ACTIVE"} onClick={() => void mutate(() => activateTenant(tenant.id))}>Activate tenant</Button><Button className="w-full" variant="outline" disabled={busy || tenant.status === "SUSPENDED"} onClick={() => void mutate(() => suspendTenant(tenant.id))}>Suspend tenant</Button><Button className="w-full" variant="outline" disabled={busy || tenant.status === "INACTIVE"} onClick={() => void mutate(() => deactivateTenant(tenant.id))}>Deactivate tenant</Button><Button className="w-full" variant="destructive" disabled={busy || Boolean(tenant.deletionRequestedAt)} onClick={() => { const reason = window.prompt("Record the tenant deletion reason"); if (reason?.trim()) void mutate(() => requestTenantDeletion(tenant.id, reason.trim())); }}>Request deletion</Button>{tenant.deletionRequestedAt ? <p className="text-xs text-rose-600">Deletion requested. Purge eligibility follows the configured retention policy.</p> : null}</CardContent></Card></div></section>;
}

import { useNavigate } from "react-router-dom";
import { provisionTenant } from "../../features/platform-tenants/api/tenants.api";
import { ProvisionTenantForm } from "../../features/platform-tenants/ui/provision-tenant-form";

export function PlatformTenantNewPage() {
  const navigate = useNavigate();
  return (
    <section className="mx-auto max-w-3xl space-y-5">
      <header>
        <h2 className="text-xl font-bold text-slate-900">Create tenant</h2>
        <p className="mt-1 text-sm text-slate-500">
          Provision the institution and its first administrator as one controlled workflow.
        </p>
      </header>
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <ProvisionTenantForm
          onProvision={provisionTenant}
          onComplete={(result) => navigate(`/platform/tenants/${result.tenantId}/onboarding`)}
        />
      </div>
    </section>
  );
}

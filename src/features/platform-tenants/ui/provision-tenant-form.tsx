import { ArrowLeft, ArrowRight, Building2, Check, Mail, UserRound } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import type { ProvisionTenantInput, ProvisionTenantResult } from "../model/tenant.types";
import { Button } from "../../../shared/ui/button";
import { Input } from "../../../shared/ui/input";
import { Label } from "../../../shared/ui/label";
import { Separator } from "../../../shared/ui/separator";
import { Spinner } from "../../../shared/ui/spinner";
import { cn } from "../../../shared/ui/utils";

interface Props {
  onProvision: (input: ProvisionTenantInput) => Promise<ProvisionTenantResult>;
  onComplete: (result: ProvisionTenantResult) => void;
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 63);

const STEPS = ["Institution", "Administrator", "Review"] as const;

export function ProvisionTenantForm({ onProvision, onComplete }: Props) {
  const [step, setStep] = useState(1);
  const [organizationName, setOrganizationName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [primaryAdminFullName, setPrimaryAdminFullName] = useState("");
  const [primaryAdminEmail, setPrimaryAdminEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = useMemo(
    () =>
      step === 1
        ? organizationName.trim().length > 1 &&
          /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/.test(slug)
        : primaryAdminFullName.trim().length > 1 &&
          /^\S+@\S+\.\S+$/.test(primaryAdminEmail),
    [step, organizationName, slug, primaryAdminFullName, primaryAdminEmail],
  );

  function nameChanged(value: string) {
    setOrganizationName(value);
    if (!slugEdited) setSlug(slugify(value));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (step < 3) {
      if (valid) setStep(step + 1);
      return;
    }
    setSaving(true);
    try {
      const result = await onProvision({
        organizationName: organizationName.trim(),
        slug,
        primaryAdminFullName: primaryAdminFullName.trim(),
        primaryAdminEmail: primaryAdminEmail.trim().toLowerCase(),
      });
      onComplete(result);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Tenant provisioning failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={(e) => void submit(e)}>
      {/* Wizard progress */}
      <ol className="flex items-center gap-0" aria-label="Provisioning progress">
        {STEPS.map((label, index) => {
          const stepNum = index + 1;
          const isCompleted = step > stepNum;
          const isActive = step === stepNum;
          return (
            <li key={label} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1">
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors",
                    isCompleted
                      ? "bg-emerald-500 text-white"
                      : isActive
                        ? "bg-accent-600 text-white"
                        : "bg-slate-200 text-slate-500",
                  )}
                >
                  {isCompleted ? <Check size={13} /> : stepNum}
                </span>
                <strong
                  className={cn(
                    "text-xs font-medium",
                    isActive ? "text-slate-900" : "text-slate-400",
                  )}
                >
                  {label}
                </strong>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 transition-colors",
                    step > stepNum ? "bg-emerald-400" : "bg-slate-200",
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>

      <Separator />

      {/* Step 1: Institution */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-100 text-accent-600">
              <Building2 size={20} />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900">Institution identity</h3>
              <p className="text-sm text-slate-500">
                Create the tenant's public identity. Internal tenant codes are generated securely.
              </p>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="org-name">Organization name</Label>
            <Input
              id="org-name"
              autoFocus
              required
              value={organizationName}
              onChange={(e) => nameChanged(e.target.value)}
              placeholder="Northstar Academy"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="org-slug">Workspace slug</Label>
            <div className="flex items-center rounded-md border border-slate-200 bg-white shadow-sm focus-within:ring-2 focus-within:ring-accent-600 overflow-hidden">
              <span className="flex h-9 items-center border-r border-slate-200 bg-slate-50 px-3 text-sm text-slate-400 shrink-0">
                erp/
              </span>
              <input
                id="org-slug"
                required
                value={slug}
                onChange={(e) => { setSlugEdited(true); setSlug(slugify(e.target.value)); }}
                placeholder="northstar-academy"
                className="flex-1 px-3 text-sm outline-none h-9 bg-transparent"
              />
            </div>
            <p className="text-xs text-slate-500">
              Lowercase letters, numbers, and hyphens. This is visible to the institution.
            </p>
          </div>
        </div>
      )}

      {/* Step 2: Administrator */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-100 text-accent-600">
              <UserRound size={20} />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900">Primary administrator</h3>
              <p className="text-sm text-slate-500">
                This person receives the secure activation email and completes campus setup.
              </p>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="admin-name">Full name</Label>
            <Input
              id="admin-name"
              autoFocus
              required
              value={primaryAdminFullName}
              onChange={(e) => setPrimaryAdminFullName(e.target.value)}
              placeholder="Ananya Rao"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="admin-email">Work email</Label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <Input
                id="admin-email"
                required
                type="email"
                value={primaryAdminEmail}
                onChange={(e) => setPrimaryAdminEmail(e.target.value)}
                placeholder="admin@institution.edu"
                className="pl-9"
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <Check size={20} />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900">Review and provision</h3>
              <p className="text-sm text-slate-500">
                Confirm the tenant and administrator. Campus and academic settings remain with the Tenant Admin.
              </p>
            </div>
          </div>
          <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white overflow-hidden">
            {[
              { label: "Organization", value: organizationName },
              { label: "Workspace", value: slug },
              { label: "Primary administrator", value: primaryAdminFullName },
              { label: "Invite email", value: primaryAdminEmail },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between px-4 py-3">
                <dt className="text-sm text-slate-500">{label}</dt>
                <dd className="text-sm font-semibold text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Separator />

      <div className="flex items-center justify-between">
        {step > 1 ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setStep(step - 1)} disabled={saving}>
            <ArrowLeft size={15} /> Back
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" size="sm" disabled={saving || !valid}>
          {saving ? (
            <><Spinner className="h-3.5 w-3.5" /> Provisioning…</>
          ) : step === 3 ? (
            "Provision tenant"
          ) : (
            <> Continue <ArrowRight size={15} /></>
          )}
        </Button>
      </div>
    </form>
  );
}

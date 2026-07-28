import { Building2, ImageUp, Save } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { getFileDownloadUrl, uploadFile } from "../../storage/api/files.api";
import { getInstitutionProfile, saveInstitutionProfile } from "../api/settings.api";
import type { InstitutionProfileInput } from "../model/settings.types";
import { ErrorState, LoadingState } from "../../../shared/ui/page-state";
import { Button } from "../../../shared/ui/button";
import { Input } from "../../../shared/ui/input";
import { Label } from "../../../shared/ui/label";
import { Card, CardContent } from "../../../shared/ui/card";
import { Separator } from "../../../shared/ui/separator";
import { Spinner } from "../../../shared/ui/spinner";

const MAX_LOGO_BYTES = 5 * 1024 * 1024;

export function InstitutionProfileSettings() {
  const [form, setForm] = useState<InstitutionProfileInput>({});
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const logoInput = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const profile = await getInstitutionProfile();
      setForm(profile ?? {});
      if (profile?.logoFileId) setLogoUrl(await getFileDownloadUrl(profile.logoFileId));
      else setLogoUrl(profile?.logoUrl ?? null);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to load institution profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const field = (name: keyof InstitutionProfileInput, value: string) => {
    setSaved(false);
    setForm((current) => ({ ...current, [name]: value }));
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setForm(await saveInstitutionProfile(form));
      setSaved(true);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to save institution profile");
    } finally {
      setBusy(false);
    }
  }

  async function uploadLogo(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Choose a PNG, JPG, WEBP or other image file"); return; }
    if (file.size > MAX_LOGO_BYTES) { setError("Institution logo must be 5 MB or smaller"); return; }
    setUploading(true);
    setError(null);
    try {
      const stored = await uploadFile({ file, scopeType: "TENANT" });
      const profileInput = {
        ...(form.name ? { name: form.name } : {}),
        ...(form.shortName ? { shortName: form.shortName } : {}),
        ...(form.contactEmail ? { contactEmail: form.contactEmail } : {}),
        ...(form.contactPhone ? { contactPhone: form.contactPhone } : {}),
        ...(form.address ? { address: form.address } : {}),
      };
      const profile = await saveInstitutionProfile({ ...profileInput, logoFileId: stored.id });
      setForm(profile);
      setLogoUrl(await getFileDownloadUrl(stored.id));
      setSaved(true);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to upload institution logo");
    } finally {
      setUploading(false);
      if (logoInput.current) logoInput.current.value = "";
    }
  }

  if (loading) return <LoadingState label="Loading institution profile" />;
  if (error && !form.name) return <ErrorState message={error} retry={() => void load()} />;

  return (
    <section className="space-y-6">
      {/* Header */}
      <header>
        <h2 className="text-xl font-bold text-slate-900">Institution profile</h2>
        <p className="mt-1 text-sm text-slate-500">
          Global identity, branding and contact details used across the tenant workspace and generated documents.
        </p>
      </header>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {saved && (
        <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Institution profile saved.
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Logo panel */}
        <Card className="lg:col-span-1">
          <CardContent className="flex flex-col items-center gap-4 pt-6 text-center">
            <div className="flex h-28 w-28 items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 overflow-hidden">
              {logoUrl ? (
                <img src={logoUrl} alt={`${form.name ?? "Institution"} logo`} className="h-full w-full object-contain" />
              ) : (
                <Building2 size={38} className="text-slate-300" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Institution logo</h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Displayed in the application shell, receipts and printable documents.
              </p>
            </div>
            <input
              ref={logoInput}
              hidden
              type="file"
              accept="image/*"
              onChange={(e) => void uploadLogo(e.target.files?.[0])}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => logoInput.current?.click()}
            >
              {uploading ? <><Spinner className="h-3.5 w-3.5" /> Uploading…</> : <><ImageUp size={15} /> Upload logo</>}
            </Button>
            <p className="text-xs text-slate-400">PNG, JPG or WEBP. Maximum 5 MB.</p>
          </CardContent>
        </Card>

        {/* Profile form */}
        <Card className="lg:col-span-2">
          <CardContent className="pt-6">
            <form onSubmit={(e) => void submit(e)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="inst-name">Institution name</Label>
                  <Input
                    id="inst-name"
                    required
                    value={form.name ?? ""}
                    onChange={(e) => field("name", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="inst-short">Short name</Label>
                  <Input
                    id="inst-short"
                    value={form.shortName ?? ""}
                    onChange={(e) => field("shortName", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="inst-email">Contact email</Label>
                  <Input
                    id="inst-email"
                    type="email"
                    value={form.contactEmail ?? ""}
                    onChange={(e) => field("contactEmail", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="inst-phone">Contact phone</Label>
                  <Input
                    id="inst-phone"
                    inputMode="tel"
                    value={form.contactPhone ?? ""}
                    onChange={(e) => field("contactPhone", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="inst-address">Address</Label>
                  <textarea
                    id="inst-address"
                    rows={4}
                    value={form.address ?? ""}
                    onChange={(e) => field("address", e.target.value)}
                    className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600 resize-none"
                  />
                </div>
              </div>
              <Separator />
              <div className="flex justify-end">
                <Button type="submit" disabled={busy}>
                  {busy ? (
                    <><Spinner className="h-4 w-4" /> Saving…</>
                  ) : (
                    <><Save size={15} /> Save profile</>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

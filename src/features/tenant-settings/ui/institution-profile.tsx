import { Building2, CheckCircle2, ImageUp, Mail, Phone, Save } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { getFileDownloadUrl, uploadFile } from "../../storage/api/files.api";
import { getInstitutionProfile, saveInstitutionProfile } from "../api/settings.api";
import type { InstitutionProfileInput } from "../model/settings.types";
import { ErrorState, LoadingState } from "../../../shared/ui/page-state";
import { Badge } from "../../../shared/ui/badge";
import { Button } from "../../../shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../shared/ui/card";
import { Input } from "../../../shared/ui/input";
import { Label } from "../../../shared/ui/label";
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

  useEffect(() => {
    void load();
  }, []);

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
    if (!file.type.startsWith("image/")) {
      setError("Choose a PNG, JPG, WEBP or other image file");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setError("Institution logo must be 5 MB or smaller");
      return;
    }
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

  if (loading) return <LoadingState label="Loading institution profile..." />;
  if (error && !form.name) return <ErrorState message={error} retry={() => void load()} />;

  return (
    <section className="space-y-6 pb-12 max-w-6xl mx-auto">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Institution Profile
            </h1>
            <Badge
              variant="secondary"
              className="text-[10px] font-bold text-brand-700 bg-brand-50 border-brand-200"
            >
              Global Identity
            </Badge>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Branding, logos, contact details, and official identity used across all campuses and
            generated documents.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            disabled={busy || uploading}
            onClick={(e) => void submit(e)}
            className="h-9 px-4 text-xs font-bold gap-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-xs"
          >
            {busy ? (
              <>
                <Spinner className="h-3.5 w-3.5" /> Saving…
              </>
            ) : (
              <>
                <Save size={14} /> Save Changes
              </>
            )}
          </Button>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-bold text-rose-700"
        >
          {error}
        </div>
      )}
      {saved && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-bold text-emerald-800 animate-in fade-in"
        >
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          Institution profile details have been saved and applied across the workspace.
        </div>
      )}

      {/* Hero Live Identity Preview Banner */}
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white shadow-md">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          {/* Logo Container with adaptive landscape/square aspect */}
          <div className="relative flex h-20 w-32 shrink-0 items-center justify-center rounded-xl bg-slate-950/60 border border-slate-700/80 shadow-md overflow-hidden p-1">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={`${form.name ?? "Institution"} logo`}
                className="h-full w-full object-contain rounded-lg"
              />
            ) : (
              <Building2 size={32} className="text-slate-400" />
            )}
          </div>

          <div className="flex-1 text-center sm:text-left min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="text-lg font-extrabold text-white truncate">
                {form.name || "Institution Name"}
              </h2>
              {form.shortName && (
                <span className="rounded-md bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white uppercase">
                  {form.shortName}
                </span>
              )}
              <span className="rounded-md bg-emerald-500/20 border border-emerald-400/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                Active Tenant
              </span>
            </div>

            <p className="mt-1 text-xs text-slate-300 font-medium">
              {form.address || "Institutional Campus Address"}
            </p>

            <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-300 font-medium">
              {form.contactEmail && (
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Mail size={13} className="text-brand-400" /> {form.contactEmail}
                </span>
              )}
              {form.contactPhone && (
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Phone size={13} className="text-emerald-400" /> {form.contactPhone}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Logo Management (4 Cols) */}
        <Card className="lg:col-span-4 p-0 overflow-hidden border border-slate-200/90 shadow-xs bg-white">
          <CardHeader className="p-4 pb-2 border-b border-slate-100">
            <CardTitle className="text-xs font-bold text-slate-900">
              Institution Logo & Emblem
            </CardTitle>
            <p className="text-[11px] text-slate-500 font-medium">
              Displayed in sidebar, top navigation bar, receipts and certificates.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 p-5 text-center">
            {/* Adaptive aspect-ratio logo preview box */}
            <div className="relative flex w-full max-w-[240px] aspect-[16/10] items-center justify-center rounded-2xl border-2 border-slate-200 bg-slate-900/95 overflow-hidden shadow-xs p-2 group">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={`${form.name ?? "Institution"} logo`}
                  className="h-full w-full object-contain rounded-lg transition-transform duration-200 group-hover:scale-105"
                />
              ) : (
                <Building2 size={44} className="text-slate-400" />
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none rounded-2xl">
                <span className="text-[10px] font-extrabold text-white bg-black/80 px-3 py-1 rounded-lg">
                  Change Logo
                </span>
              </div>
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
              className="h-9 px-4 text-xs font-bold gap-1.5 rounded-xl border-slate-200 hover:bg-slate-50"
            >
              {uploading ? (
                <>
                  <Spinner className="h-3.5 w-3.5" /> Uploading…
                </>
              ) : (
                <>
                  <ImageUp size={14} /> Upload New Logo
                </>
              )}
            </Button>

            <div className="rounded-xl bg-slate-50 border border-slate-100 p-2.5 w-full text-left space-y-1">
              <p className="text-[11px] font-bold text-slate-700">Logo Guidelines</p>
              <p className="text-[10px] text-slate-500">
                • PNG, JPG, or WEBP formats up to 5 MB.
                <br />
                • Square or rectangular high-res emblems recommended.
                <br />• Fits automatically to sidebar and topbar icons.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Profile Information Form (8 Cols) */}
        <Card className="lg:col-span-8 p-0 overflow-hidden border border-slate-200/90 shadow-xs bg-white">
          <CardHeader className="p-4 pb-2 border-b border-slate-100">
            <CardTitle className="text-xs font-bold text-slate-900">
              Institutional Details & Contact
            </CardTitle>
            <p className="text-[11px] text-slate-500 font-medium">
              Official records for print headers and system communications.
            </p>
          </CardHeader>
          <CardContent className="p-5">
            <form onSubmit={(e) => void submit(e)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="inst-name" className="text-xs font-bold text-slate-700">
                    Official Institution Name <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="inst-name"
                    required
                    placeholder="Institution legal name"
                    value={form.name ?? ""}
                    onChange={(e) => field("name", e.target.value)}
                    className="h-10 rounded-xl text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="inst-short" className="text-xs font-bold text-slate-700">
                    Short / Display Name
                  </Label>
                  <Input
                    id="inst-short"
                    placeholder="Short display name"
                    value={form.shortName ?? ""}
                    onChange={(e) => field("shortName", e.target.value)}
                    className="h-10 rounded-xl text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="inst-email" className="text-xs font-bold text-slate-700">
                    Official Contact Email
                  </Label>
                  <Input
                    id="inst-email"
                    type="email"
                    placeholder="Official contact email"
                    value={form.contactEmail ?? ""}
                    onChange={(e) => field("contactEmail", e.target.value)}
                    className="h-10 rounded-xl text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="inst-phone" className="text-xs font-bold text-slate-700">
                    Contact Phone Number
                  </Label>
                  <Input
                    id="inst-phone"
                    inputMode="tel"
                    placeholder="e.g. +91 80000 55000"
                    value={form.contactPhone ?? ""}
                    onChange={(e) => field("contactPhone", e.target.value)}
                    className="h-10 rounded-xl text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="inst-address" className="text-xs font-bold text-slate-700">
                    Campus Address & Location
                  </Label>
                  <textarea
                    id="inst-address"
                    rows={3}
                    placeholder="e.g. Vidyanagara, Sirigere, Davangere District, Karnataka, India - 577541"
                    value={form.address ?? ""}
                    onChange={(e) => field("address", e.target.value)}
                    className="flex w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none shadow-2xs"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <Button
                  type="submit"
                  disabled={busy}
                  className="h-9 px-5 text-xs font-bold gap-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-xs"
                >
                  {busy ? (
                    <>
                      <Spinner className="h-3.5 w-3.5" /> Saving…
                    </>
                  ) : (
                    <>
                      <Save size={14} /> Save Profile
                    </>
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

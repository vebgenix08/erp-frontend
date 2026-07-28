import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { createPlatformFeatureFlag, listPlatformFeatureFlags, updatePlatformFeatureFlag } from "../../features/platform-feature-flags/api/platform-feature-flags.api";
import type { PlatformFeatureFlag } from "../../features/platform-feature-flags/model/platform-feature-flags.types";
import { PlatformFeatureFlagForm } from "../../features/platform-feature-flags/ui/platform-feature-flag-form";
import { PlatformFeatureFlagsTable } from "../../features/platform-feature-flags/ui/platform-feature-flags-table";
import { Button } from "../../shared/ui/button";
import { Modal } from "../../shared/ui/modal";
import { ErrorState, LoadingState } from "../../shared/ui/page-state";

export function PlatformFeaturesPage() {
  const [flags, setFlags] = useState<PlatformFeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const load = () => { setLoading(true); void listPlatformFeatureFlags().then(setFlags).catch((value) => setError(value instanceof Error ? value.message : "Unable to load feature catalog")).finally(() => setLoading(false)); };
  useEffect(load, []);
  if (loading) return <LoadingState label="Loading feature catalog"/>;
  if (error && !flags.length) return <ErrorState message={error} retry={load}/>;
  return <section className="space-y-5">{error ? <ErrorState message={error}/> : null}<header className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold text-slate-900">Feature catalog</h2><p className="mt-1 text-sm text-slate-500">Global feature definitions. Tenant access is granted separately through capabilities.</p></div><Button onClick={() => setOpen(true)}><Plus size={16}/>Add feature</Button></header><PlatformFeatureFlagsTable flags={flags} busyId={busy} onToggle={(flag) => { setBusy(flag.id); void updatePlatformFeatureFlag(flag.id, !flag.isEnabled).then((saved) => setFlags((current) => current.map((item) => item.id === saved.id ? saved : item))).catch((value) => setError(value instanceof Error ? value.message : "Unable to update feature")).finally(() => setBusy("")); }}/><Modal open={open} title="Add platform feature" description="Create a global feature definition without granting it to any tenant." onClose={() => setOpen(false)}><PlatformFeatureFlagForm busy={busy === "create"} onCancel={() => setOpen(false)} onSubmit={async (input) => { setBusy("create"); try { const saved = await createPlatformFeatureFlag(input); setFlags((current) => [...current, saved]); setOpen(false); } finally { setBusy(""); } }}/></Modal></section>;
}

import { Hash, Pencil, ShieldCheck } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Modal } from "../../../shared/ui/modal";
import { ErrorState, LoadingState } from "../../../shared/ui/page-state";
import { listNumberingPolicies, saveNumberingPolicy } from "../api/settings.api";
import type { NumberingPolicy, NumberingPolicyInput } from "../model/settings.types";
import { Button } from "../../../shared/ui/button";
import { Input } from "../../../shared/ui/input";
import { Label } from "../../../shared/ui/label";
import { Badge } from "../../../shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../../shared/ui/card";
import { Separator } from "../../../shared/ui/separator";

const label = (value: string) =>
  value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

export function NumberingManagement() {
  const [items, setItems] = useState<NumberingPolicy[] | null>(null);
  const [editing, setEditing] = useState<NumberingPolicy | null>(null);
  const [form, setForm] = useState<NumberingPolicyInput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setError(null);
    listNumberingPolicies()
      .then(setItems)
      .catch((v) => setError(v instanceof Error ? v.message : "Unable to load numbering policies"));
  };

  useEffect(load, []);

  function edit(item: NumberingPolicy) {
    setEditing(item);
    setForm({
      stream: item.stream,
      name: item.name,
      format: item.format,
      prefix: item.prefix,
      separator: item.separator,
      padding: item.padding,
      scope: item.scope,
      reset: item.reset,
      active: item.active,
    });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form) return;
    setBusy(true);
    setError(null);
    try {
      const saved = await saveNumberingPolicy(form);
      setItems((v) => (v ?? []).map((item) => (item.stream === saved.stream ? saved : item)));
      setEditing(null);
      setForm(null);
    } catch (v) {
      setError(v instanceof Error ? v.message : "Unable to save numbering policy");
    } finally {
      setBusy(false);
    }
  }

  if (!items) {
    return error ? (
      <ErrorState message={error} retry={load} />
    ) : (
      <LoadingState label="Loading numbering configuration" />
    );
  }

  return (
    <section className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Numbering</h2>
          <p className="mt-1 text-sm text-slate-500">
            Control how operational references are formatted. Counters remain system-generated and cannot be entered manually.
          </p>
        </div>
        <Card className="p-3 flex items-center gap-3">
          <strong className="text-lg font-bold text-slate-800">
            {items.filter((v) => v.active).length}
          </strong>
          <span className="text-xs text-slate-500">active streams</span>
        </Card>
      </header>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Numbering Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Card key={item.stream} className="flex flex-col justify-between">
            <CardHeader className="flex flex-row items-start justify-between pb-2 shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                  <Hash size={16} />
                </span>
                <div>
                  <CardTitle className="text-sm font-bold text-slate-800">{item.name}</CardTitle>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {label(item.scope)} scope · {label(item.reset)} reset
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                title={`Edit ${item.name}`}
                onClick={() => edit(item)}
              >
                <Pencil size={14} />
              </Button>
            </CardHeader>
            <CardContent className="py-2.5 bg-slate-50/50 border-y border-slate-100 shrink-0">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                Next sample
              </span>
              <strong className="block text-base font-mono text-slate-900 mt-1 font-semibold">
                {item.sample}
              </strong>
            </CardContent>
            <div className="px-5 py-3 flex items-center justify-between text-xs shrink-0">
              <Badge variant={item.active ? "success" : "secondary"}>
                {item.active ? "ACTIVE" : "INACTIVE"}
              </Badge>
              <span className="text-slate-500">
                {item.issuedCount ? `${item.issuedCount} issued` : "Not used yet"}
              </span>
            </div>
          </Card>
        ))}
      </div>

      {/* Modal Dialog */}
      <Modal
        open={Boolean(editing && form)}
        title={editing ? `Edit ${editing.name}` : "Edit numbering"}
        description={
          editing?.issuedCount
            ? "Formatting can be adjusted, but scope and reset are locked after use."
            : "Configure the format before this stream is used."
        }
        onClose={() => {
          setEditing(null);
          setForm(null);
        }}
      >
        {form && editing ? (
          <form onSubmit={(e) => void submit(e)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="num-name">Display name</Label>
              <Input
                id="num-name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="num-format">Number format</Label>
              <Input
                id="num-format"
                required
                value={form.format}
                onChange={(e) => setForm({ ...form, format: e.target.value.toUpperCase().replace(/[^A-Z0-9_/{}/.-]/g, "") })}
                placeholder="STU/{YEAR}/{SEQUENCE}"
              />
              <p className="text-xs text-slate-500">
                Tokens: {"{SEQUENCE}"}, {"{YEAR}"}, {"{MONTH}"}, {"{ACADEMIC_YEAR}"}, {"{CAMPUS_CODE}"}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="num-pref">Prefix</Label>
                <Input
                  id="num-pref"
                  value={form.prefix}
                  maxLength={12}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      prefix: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""),
                    })
                  }
                  placeholder="Example: ADM"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="num-sep">Separator</Label>
                <select
                  id="num-sep"
                  value={form.separator}
                  onChange={(e) => setForm({ ...form, separator: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600"
                >
                  <option value="-">Hyphen (-)</option>
                  <option value="/">Slash (/)</option>
                  <option value="_">Underscore (_)</option>
                  <option value="">None</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="num-len">Number length</Label>
                <select
                  id="num-len"
                  value={form.padding}
                  onChange={(e) => setForm({ ...form, padding: Number(e.target.value) })}
                  className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600"
                >
                  {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((v) => (
                    <option value={v} key={v}>
                      {v} digits
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="num-scope">Scope</Label>
                <select
                  id="num-scope"
                  disabled={editing.issuedCount > 0}
                  value={form.scope}
                  onChange={(e) =>
                    setForm({ ...form, scope: e.target.value as NumberingPolicyInput["scope"] })
                  }
                  className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600 disabled:opacity-55"
                >
                  {["TENANT", "CAMPUS", "ACADEMIC_YEAR", "PROGRAM", "CLASS", "SECTION"].map((v) => (
                    <option value={v} key={v}>
                      {label(v)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="num-reset">Reset</Label>
                <select
                  id="num-reset"
                  disabled={editing.issuedCount > 0}
                  value={form.reset}
                  onChange={(e) =>
                    setForm({ ...form, reset: e.target.value as NumberingPolicyInput["reset"] })
                  }
                  className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600 disabled:opacity-55"
                >
                  {["NEVER", "ACADEMIC_YEAR", "CALENDAR_YEAR", "MONTHLY"].map((v) => (
                    <option value={v} key={v}>
                      {label(v)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-accent-650 focus:ring-accent-600"
                  />
                  <span>
                    <strong className="block text-xs text-slate-800">Active</strong>
                    <small className="block text-[10px] text-slate-400">
                      Allow domain to issue new references
                    </small>
                  </span>
                </label>
              </div>
            </div>

            {/* Format Preview */}
            <div className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs leading-normal">
              <ShieldCheck size={18} className="text-emerald-500 shrink-0" />
              <div>
                <span className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  Format preview
                </span>
                <strong className="block text-sm font-mono text-slate-850 mt-0.5">
                  {form.format
                    .replaceAll("{SEQUENCE}", String(editing.nextNumber).padStart(form.padding, "0"))
                    .replaceAll("{YEAR}", "2026")
                    .replaceAll("{MONTH}", "07")
                    .replaceAll("{ACADEMIC_YEAR}", "26-27")
                    .replaceAll("{CAMPUS_CODE}", "MAIN")}
                </strong>
              </div>
            </div>

            <Separator />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setForm(null);
                }}
              >
                Cancel
              </Button>
              <Button size="sm" disabled={busy}>
                {busy ? "Saving..." : "Save policy"}
              </Button>
            </div>
          </form>
        ) : null}
      </Modal>
    </section>
  );
}

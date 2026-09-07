import { CalendarCheck, CheckCircle2, LockKeyhole, Plus, RotateCcw } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import {
  activateAcademicYear,
  closeAcademicYear,
  createAcademicYear,
  listAcademicYears,
  reopenAcademicYear,
} from "../api/settings.api";
import type { AcademicYear, AcademicYearInput } from "../model/settings.types";
import { useSelectedAcademicYear } from "../model/selected-academic-year-provider";
import { Modal } from "../../../shared/ui/modal";
import { EmptyState, ErrorState, LoadingState } from "../../../shared/ui/page-state";
import { Button } from "../../../shared/ui/button";
import { Input } from "../../../shared/ui/input";
import { Label } from "../../../shared/ui/label";
import { Badge } from "../../../shared/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../shared/ui/table";
import { Separator } from "../../../shared/ui/separator";
import { Spinner } from "../../../shared/ui/spinner";

type LifecycleAction = { type: "close" | "reopen"; year: AcademicYear } | null;

export function AcademicYearsManagement() {
  const { refreshAcademicYears } = useSelectedAcademicYear();
  const [items, setItems] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [action, setAction] = useState<LifecycleAction>(null);
  const [reason, setReason] = useState("");
  const [form, setForm] = useState<AcademicYearInput>({ name: "", startDate: "", endDate: "" });

  const load = () => {
    setLoading(true);
    setError(null);
    listAcademicYears()
      .then(setItems)
      .catch((value) =>
        setError(value instanceof Error ? value.message : "Unable to load academic years"),
      )
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  async function sync() {
    const years = await listAcademicYears();
    setItems(years);
    await refreshAcademicYears();
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createAcademicYear(form);
      await sync();
      setOpen(false);
      setForm({ name: "", startDate: "", endDate: "" });
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to create academic year");
    } finally {
      setBusy(false);
    }
  }

  async function activate(item: AcademicYear) {
    setBusy(true);
    setError(null);
    try {
      await activateAcademicYear(item.id);
      await sync();
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to activate academic year");
    } finally {
      setBusy(false);
    }
  }

  async function applyLifecycle(event: FormEvent) {
    event.preventDefault();
    if (!action) return;
    setBusy(true);
    setError(null);
    try {
      if (action.type === "close") await closeAcademicYear(action.year.id, reason);
      else await reopenAcademicYear(action.year.id, reason);
      await sync();
      setAction(null);
      setReason("");
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to change academic year lifecycle");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingState label="Loading academic years" />;
  if (error && !items.length) return <ErrorState message={error} retry={load} />;

  return (
    <section className="space-y-5">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Academic years</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Control the institution-wide operating period. Only one year can be current.
          </p>
        </div>
        <Button
          size="sm"
          variant="brand"
          onClick={() => setOpen(true)}
          className="h-8 text-xs font-bold"
        >
          <Plus size={14} /> Add academic year
        </Button>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {/* Table */}
      {items.length ? (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Academic year</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Lifecycle</TableHead>
                <TableHead>Last reason</TableHead>
                <TableHead aria-label="Actions" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-600">
                        <CalendarCheck size={16} />
                      </span>
                      <div>
                        <p className="font-semibold text-slate-900">{item.name}</p>
                        <p className="text-xs text-slate-500">
                          {item.status === "ACTIVE"
                            ? "Current operating year"
                            : "Historical or future period"}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {new Date(item.startDate).toLocaleDateString()} –{" "}
                    {new Date(item.endDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        item.status === "ACTIVE"
                          ? "success"
                          : item.status === "CLOSED"
                            ? "secondary"
                            : "warning"
                      }
                    >
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-500 text-sm">
                    {item.lifecycleReason || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {item.status === "DRAFT" && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Activate academic year"
                          aria-label={`Activate ${item.name}`}
                          disabled={busy}
                          onClick={() => void activate(item)}
                        >
                          <CheckCircle2 size={15} />
                        </Button>
                      )}
                      {item.status === "ACTIVE" && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Close academic year"
                          aria-label={`Close ${item.name}`}
                          disabled={busy}
                          onClick={() => {
                            setAction({ type: "close", year: item });
                            setReason("");
                          }}
                        >
                          <LockKeyhole size={15} />
                        </Button>
                      )}
                      {item.status === "CLOSED" && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Reopen academic year"
                          aria-label={`Reopen ${item.name}`}
                          disabled={busy}
                          onClick={() => {
                            setAction({ type: "reopen", year: item });
                            setReason("");
                          }}
                        >
                          <RotateCcw size={15} />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState
          title="No academic years configured"
          description="Create the first academic year; it will become the current operating year."
        />
      )}

      {/* Create modal */}
      <Modal
        open={open}
        title="Add academic year"
        description="The first year becomes current automatically. Later years begin as drafts."
        onClose={() => setOpen(false)}
      >
        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="year-name">Name</Label>
              <Input
                id="year-name"
                required
                value={form.name}
                onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))}
                placeholder="Academic Year 2027-28"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="year-start">Start date</Label>
              <Input
                id="year-start"
                required
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((v) => ({ ...v, startDate: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="year-end">End date</Label>
              <Input
                id="year-end"
                required
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((v) => ({ ...v, endDate: e.target.value }))}
              />
            </div>
          </div>
          <Separator />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={busy}>
              {busy ? (
                <>
                  <Spinner className="h-3.5 w-3.5" /> Creating…
                </>
              ) : (
                "Create academic year"
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Lifecycle modal */}
      <Modal
        open={Boolean(action)}
        title={action?.type === "close" ? "Close academic year" : "Reopen academic year"}
        description={
          action?.type === "close"
            ? "Closing preserves history and stops new operations in this year."
            : "Reopening returns the year to draft for reviewed reactivation."
        }
        onClose={() => setAction(null)}
      >
        <form onSubmit={(e) => void applyLifecycle(e)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="lifecycle-reason">Reason</Label>
            <textarea
              id="lifecycle-reason"
              required
              minLength={5}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Record the operational reason"
              rows={3}
              className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600 resize-none"
            />
          </div>
          <Separator />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setAction(null)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={busy}>
              {busy ? (
                <>
                  <Spinner className="h-3.5 w-3.5" /> Saving…
                </>
              ) : action?.type === "close" ? (
                "Close academic year"
              ) : (
                "Reopen as draft"
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}

import { Archive, Edit3, Megaphone, Plus, Send } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  archiveTeacherDailyStudentUpdate,
  listTeacherDailyStudentUpdates,
  publishTeacherDailyStudentUpdate,
  saveTeacherDailyStudentUpdate,
} from "../../daily-student-updates/api/daily-student-updates.api";
import type {
  DailyStudentUpdate,
  DailyStudentUpdateStatus,
} from "../../daily-student-updates/model/daily-student-updates.types";
import { Badge } from "../../../shared/ui/badge";
import { Button } from "../../../shared/ui/button";
import { Input } from "../../../shared/ui/input";
import { Label } from "../../../shared/ui/label";
import { Modal } from "../../../shared/ui/modal";
import { EmptyState, ErrorState, LoadingState } from "../../../shared/ui/page-state";
import { useTeacherWorkspace } from "../model/teacher-workspace-context";
import { WorkspacePageHeader, WorkspaceSurface } from "./teacher-workspace-primitives";

interface UpdateForm {
  id?: string;
  expectedVersion?: number;
  subjectOfferingId: string;
  updateDate: string;
  title: string;
  message: string;
}

const localDate = () => {
  const current = new Date();
  const offset = current.getTimezoneOffset() * 60_000;
  return new Date(current.getTime() - offset).toISOString().slice(0, 10);
};

const emptyForm = (subjectOfferingId = ""): UpdateForm => ({
  subjectOfferingId,
  updateDate: localDate(),
  title: "",
  message: "",
});

export function TeacherDailyUpdatesPage() {
  const { workspace, workspaceLoading, workspaceError, operatingContext } = useTeacherWorkspace();
  const assignments = useMemo(
    () =>
      workspace?.assignments.filter(
        (item) => !operatingContext.campusId || item.campusId === operatingContext.campusId,
      ) ?? [],
    [operatingContext.campusId, workspace],
  );
  const [items, setItems] = useState<DailyStudentUpdate[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"ALL" | DailyStudentUpdateStatus>("ALL");
  const [subjectOfferingId, setSubjectOfferingId] = useState("");
  const [form, setForm] = useState<UpdateForm>(() => emptyForm());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!workspace) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await listTeacherDailyStudentUpdates({
        academicYearId: workspace.academicYear.id,
        ...(subjectOfferingId ? { subjectOfferingId } : {}),
        ...(status !== "ALL" ? { status } : {}),
        page,
        pageSize: 10,
      });
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to load daily student updates");
    } finally {
      setLoading(false);
    }
  }, [page, status, subjectOfferingId, workspace]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setForm(emptyForm(subjectOfferingId || assignments[0]?.subjectOfferingId));
    setDialogOpen(true);
  }

  function openEdit(item: DailyStudentUpdate) {
    setForm({
      id: item.id,
      expectedVersion: item.version,
      subjectOfferingId: item.subjectOfferingId,
      updateDate: item.updateDate,
      title: item.title,
      message: item.message,
    });
    setDialogOpen(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!workspace) return;
    setBusy(true);
    setError(null);
    try {
      await saveTeacherDailyStudentUpdate({
        ...(form.id ? { id: form.id } : {}),
        ...(form.expectedVersion ? { expectedVersion: form.expectedVersion } : {}),
        academicYearId: workspace.academicYear.id,
        subjectOfferingId: form.subjectOfferingId,
        updateDate: form.updateDate,
        title: form.title.trim(),
        message: form.message.trim(),
      });
      setDialogOpen(false);
      setForm(emptyForm());
      await load();
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to save daily student update");
    } finally {
      setBusy(false);
    }
  }

  async function transition(item: DailyStudentUpdate, target: "PUBLISHED" | "ARCHIVED") {
    setBusy(true);
    setError(null);
    try {
      if (target === "PUBLISHED") {
        await publishTeacherDailyStudentUpdate({ id: item.id, expectedVersion: item.version });
      } else {
        await archiveTeacherDailyStudentUpdate({ id: item.id, expectedVersion: item.version });
      }
      await load();
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to update daily student update");
    } finally {
      setBusy(false);
    }
  }

  if (workspaceLoading && !workspace) return <LoadingState label="Loading daily student updates" />;
  if (workspaceError) return <ErrorState message={workspaceError} />;
  if (!workspace)
    return (
      <ErrorState message="The authenticated user is not linked to an active teaching employee." />
    );

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 p-4 sm:p-5 lg:p-6">
      <WorkspacePageHeader
        title="Daily Student Updates"
        description="Publish concise classroom updates to students and parents in your assigned academic scope."
        actions={
          <Button onClick={openCreate} disabled={!assignments.length}>
            <Plus />
            New update
          </Button>
        }
      />
      {error ? (
        <div
          role="alert"
          className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"
        >
          {error}
        </div>
      ) : null}
      <WorkspaceSurface>
        <div className="grid gap-3 border-b border-slate-200 p-4 md:grid-cols-2">
          <label>
            <span className="mb-1.5 block text-xs font-bold text-slate-600">
              Assigned class and subject
            </span>
            <select
              value={subjectOfferingId}
              onChange={(event) => {
                setSubjectOfferingId(event.target.value);
                setPage(1);
              }}
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="">All assigned classes and subjects</option>
              {assignments.map((item) => (
                <option key={item.id} value={item.subjectOfferingId}>
                  {assignmentLabel(item)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-slate-600">
              Publication status
            </span>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as typeof status);
                setPage(1);
              }}
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="ALL">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </label>
        </div>
        {loading ? (
          <LoadingState label="Loading daily student updates" />
        ) : items.length ? (
          <div className="divide-y divide-slate-100">
            {items.map((item) => (
              <article key={item.id} className="p-4 sm:p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          item.status === "PUBLISHED"
                            ? "success"
                            : item.status === "ARCHIVED"
                              ? "secondary"
                              : "blue"
                        }
                      >
                        {item.status}
                      </Badge>
                      <span className="text-xs font-semibold text-slate-500">
                        {formatDate(item.updateDate)}
                      </span>
                    </div>
                    <h2 className="mt-2 text-base font-bold text-slate-950">{item.title}</h2>
                    <p className="mt-1 text-xs font-semibold text-blue-700">
                      {[item.className, item.sectionName, item.subjectName]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {item.message}
                    </p>
                    <p className="mt-3 text-xs font-medium text-slate-500">
                      Audience: students and parents in this assigned group
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {item.status === "DRAFT" ? (
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        title="Edit draft"
                        aria-label={`Edit ${item.title}`}
                        onClick={() => openEdit(item)}
                        disabled={busy}
                      >
                        <Edit3 />
                      </Button>
                    ) : null}
                    {item.status === "DRAFT" ? (
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        title="Publish"
                        aria-label={`Publish ${item.title}`}
                        onClick={() => void transition(item, "PUBLISHED")}
                        disabled={busy}
                      >
                        <Send />
                      </Button>
                    ) : null}
                    {item.status === "PUBLISHED" ? (
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        title="Archive"
                        aria-label={`Archive ${item.title}`}
                        onClick={() => void transition(item, "ARCHIVED")}
                        disabled={busy}
                      >
                        <Archive />
                      </Button>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No daily updates in this view"
            description={
              assignments.length
                ? "Create a draft for an assigned class and publish it when ready."
                : "An active teaching assignment is required before an update can be created."
            }
          />
        )}
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs font-semibold text-slate-600">
          <span>
            {total} update{total === 1 ? "" : "s"}
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1 || loading}
              onClick={() => setPage((value) => value - 1)}
            >
              Previous
            </Button>
            <span>
              Page {page} of {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((value) => value + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </WorkspaceSurface>

      <Modal
        open={dialogOpen}
        title={form.id ? "Edit daily update" : "New daily update"}
        description="Published updates are visible to students and parents and cannot be edited."
        onClose={() => {
          if (!busy) setDialogOpen(false);
        }}
      >
        <form onSubmit={(event) => void submit(event)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="daily-update-assignment">Assigned class and subject</Label>
            <select
              id="daily-update-assignment"
              required
              value={form.subjectOfferingId}
              onChange={(event) =>
                setForm((current) => ({ ...current, subjectOfferingId: event.target.value }))
              }
              disabled={Boolean(form.id)}
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="">Select an assignment</option>
              {assignments.map((item) => (
                <option key={item.id} value={item.subjectOfferingId}>
                  {assignmentLabel(item)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="daily-update-date">Update date</Label>
            <Input
              id="daily-update-date"
              required
              type="date"
              value={form.updateDate}
              onChange={(event) =>
                setForm((current) => ({ ...current, updateDate: event.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="daily-update-title">Title</Label>
            <Input
              id="daily-update-title"
              required
              maxLength={160}
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({ ...current, title: event.target.value }))
              }
              placeholder="What students and parents need to know"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="daily-update-message">Update</Label>
            <textarea
              id="daily-update-message"
              required
              maxLength={3000}
              rows={7}
              value={form.message}
              onChange={(event) =>
                setForm((current) => ({ ...current, message: event.target.value }))
              }
              className="w-full resize-y rounded-md border border-slate-200 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="Summarize classroom work, preparation or a reminder."
            />
            <p className="text-right text-xs font-medium text-slate-400">
              {form.message.length} / 3000
            </p>
          </div>
          <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-800">
            <Megaphone className="mr-2 inline h-4 w-4" />
            Save as draft first. Publishing is a separate, auditable action.
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving..." : "Save draft"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function assignmentLabel(item: {
  className?: string;
  sectionName?: string;
  subjectBatchName?: string;
  subjectName: string;
}) {
  return [item.className, item.sectionName ?? item.subjectBatchName, item.subjectName]
    .filter(Boolean)
    .join(" · ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

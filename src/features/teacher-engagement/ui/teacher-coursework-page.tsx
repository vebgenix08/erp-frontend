import { Archive, Edit3, LockKeyhole, Plus, Send } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  listTeacherCoursework,
  saveTeacherCoursework,
  setTeacherCourseworkStatus,
} from "../api/teacher-engagement.api";
import type { Coursework, CourseworkStatus } from "../model/teacher-engagement.types";
import { listTeacherResources } from "../../teacher-content/api/teacher-content.api";
import type { TeachingResource } from "../../teacher-content/model/teacher-content.types";
import {
  assignmentLabel,
  formatDate,
  localDate,
  textareaClass,
} from "../../teacher-content/model/teacher-content.utils";
import {
  ContentFilters,
  ContentPagination,
  Field,
} from "../../teacher-content/ui/teacher-content-primitives";
import { Badge } from "../../../shared/ui/badge";
import { Button } from "../../../shared/ui/button";
import { Input } from "../../../shared/ui/input";
import { Modal } from "../../../shared/ui/modal";
import { EmptyState, ErrorState, LoadingState } from "../../../shared/ui/page-state";
import { useTeacherWorkspace } from "../../teacher-workspace/model/teacher-workspace-context";
import {
  WorkspacePageHeader,
  WorkspaceSurface,
} from "../../teacher-workspace/ui/teacher-workspace-primitives";

interface Form {
  id?: string;
  expectedVersion?: number;
  subjectOfferingId: string;
  title: string;
  instructions: string;
  assignedDate: string;
  submissionDate: string;
  resourceIds: string[];
}
const empty = (offering = ""): Form => ({
  subjectOfferingId: offering,
  title: "",
  instructions: "",
  assignedDate: localDate(),
  submissionDate: "",
  resourceIds: [],
});

export function TeacherCourseworkPage() {
  const { workspace, workspaceLoading, workspaceError, operatingContext } = useTeacherWorkspace();
  const assignments = useMemo(
    () =>
      workspace?.assignments.filter(
        (item) => !operatingContext.campusId || item.campusId === operatingContext.campusId,
      ) ?? [],
    [operatingContext.campusId, workspace],
  );
  const [items, setItems] = useState<Coursework[]>([]);
  const [resources, setResources] = useState<TeachingResource[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<"ALL" | CourseworkStatus>("ALL");
  const [offering, setOffering] = useState("");
  const [form, setForm] = useState<Form>(() => empty());
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!workspace) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await listTeacherCoursework({
        academicYearId: workspace.academicYear.id,
        ...(offering ? { subjectOfferingId: offering } : {}),
        ...(status !== "ALL" ? { status } : {}),
        page,
        pageSize: 10,
      });
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to load coursework");
    } finally {
      setLoading(false);
    }
  }, [offering, page, status, workspace]);
  useEffect(() => {
    void load();
  }, [load]);
  async function loadResources(subjectOfferingId: string) {
    if (!workspace || !subjectOfferingId) {
      setResources([]);
      return;
    }
    try {
      setResources(
        (
          await listTeacherResources({
            academicYearId: workspace.academicYear.id,
            subjectOfferingId,
            status: "ACTIVE",
            page: 1,
            pageSize: 100,
          })
        ).items,
      );
    } catch {
      setResources([]);
    }
  }
  function create() {
    const id = offering || assignments[0]?.subjectOfferingId || "";
    setForm(empty(id));
    void loadResources(id);
    setOpen(true);
  }
  function edit(item: Coursework) {
    setForm({
      id: item.id,
      expectedVersion: item.version,
      subjectOfferingId: item.subjectOfferingId,
      title: item.title,
      instructions: item.instructions,
      assignedDate: item.assignedDate,
      submissionDate: item.submissionDate ?? "",
      resourceIds: item.resourceIds,
    });
    void loadResources(item.subjectOfferingId);
    setOpen(true);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!workspace) return;
    setBusy(true);
    setError(null);
    try {
      await saveTeacherCoursework({
        ...(form.id ? { id: form.id } : {}),
        ...(form.expectedVersion ? { expectedVersion: form.expectedVersion } : {}),
        academicYearId: workspace.academicYear.id,
        subjectOfferingId: form.subjectOfferingId,
        title: form.title.trim(),
        instructions: form.instructions.trim(),
        assignedDate: form.assignedDate,
        ...(form.submissionDate ? { submissionDate: form.submissionDate } : {}),
        resourceIds: form.resourceIds,
      });
      setOpen(false);
      await load();
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to save coursework");
    } finally {
      setBusy(false);
    }
  }
  async function transition(item: Coursework, target: "PUBLISHED" | "CLOSED" | "ARCHIVED") {
    setBusy(true);
    setError(null);
    try {
      await setTeacherCourseworkStatus({
        id: item.id,
        expectedVersion: item.version,
        status: target,
      });
      await load();
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to update coursework");
    } finally {
      setBusy(false);
    }
  }
  if (workspaceLoading && !workspace) return <LoadingState label="Loading coursework" />;
  if (workspaceError) return <ErrorState message={workspaceError} />;
  if (!workspace)
    return (
      <ErrorState message="The authenticated user is not linked to an active teaching employee." />
    );
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 p-4 sm:p-5 lg:p-6">
      <WorkspacePageHeader
        title="Coursework"
        description="Prepare, publish and close student work for classes and subjects you are assigned to teach."
        actions={
          <Button onClick={create} disabled={!assignments.length}>
            <Plus />
            New coursework
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
        <ContentFilters
          assignments={assignments}
          assignmentId={offering}
          status={status}
          statuses={[
            { value: "ALL", label: "All statuses" },
            { value: "DRAFT", label: "Draft" },
            { value: "PUBLISHED", label: "Published" },
            { value: "CLOSED", label: "Closed" },
            { value: "ARCHIVED", label: "Archived" },
          ]}
          onAssignment={(value) => {
            setOffering(value);
            setPage(1);
          }}
          onStatus={(value) => {
            setStatus(value as typeof status);
            setPage(1);
          }}
        />
        {loading ? (
          <LoadingState label="Loading coursework" />
        ) : items.length ? (
          <div className="divide-y divide-slate-100">
            {items.map((item) => (
              <article key={item.id} className="p-4 sm:p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          item.status === "PUBLISHED"
                            ? "blue"
                            : item.status === "CLOSED"
                              ? "success"
                              : item.status === "ARCHIVED"
                                ? "secondary"
                                : "warning"
                        }
                      >
                        {item.status}
                      </Badge>
                      <span className="text-xs font-semibold text-slate-500">
                        Assigned {formatDate(item.assignedDate)}
                        {item.submissionDate
                          ? ` · Submit by ${formatDate(item.submissionDate)}`
                          : ""}
                      </span>
                    </div>
                    <h2 className="mt-2 text-base font-bold text-slate-950">{item.title}</h2>
                    <p className="mt-1 text-xs font-semibold text-blue-700">
                      {[item.className, item.sectionName, item.subjectName]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {item.instructions}
                    </p>
                    {item.resourceIds.length ? (
                      <p className="mt-2 text-xs font-semibold text-slate-500">
                        {item.resourceIds.length} linked resource
                        {item.resourceIds.length === 1 ? "" : "s"}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {item.status === "DRAFT" ? (
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        title="Edit draft"
                        onClick={() => edit(item)}
                      >
                        <Edit3 />
                      </Button>
                    ) : null}
                    {item.status === "DRAFT" ? (
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        title="Publish"
                        disabled={busy}
                        onClick={() => void transition(item, "PUBLISHED")}
                      >
                        <Send />
                      </Button>
                    ) : null}
                    {item.status === "PUBLISHED" ? (
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        title="Close submissions"
                        disabled={busy}
                        onClick={() => void transition(item, "CLOSED")}
                      >
                        <LockKeyhole />
                      </Button>
                    ) : null}
                    {item.status !== "ARCHIVED" ? (
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        title="Archive"
                        disabled={busy}
                        onClick={() => void transition(item, "ARCHIVED")}
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
            title="No coursework in this view"
            description={
              assignments.length
                ? "Create a draft for an assigned class and publish it when ready."
                : "An active teaching assignment is required before coursework can be created."
            }
          />
        )}
        <ContentPagination
          noun="coursework item"
          page={page}
          totalPages={totalPages}
          total={total}
          loading={loading}
          onPage={setPage}
        />
      </WorkspaceSurface>
      <Modal
        open={open}
        title={form.id ? "Edit coursework" : "New coursework"}
        description="Published coursework becomes visible to students in the assigned group."
        className="sm:max-w-3xl"
        onClose={() => {
          if (!busy) setOpen(false);
        }}
      >
        <form onSubmit={(event) => void submit(event)} className="space-y-4">
          <Field label="Assigned class and subject" htmlFor="coursework-assignment">
            <select
              id="coursework-assignment"
              required
              disabled={Boolean(form.id)}
              value={form.subjectOfferingId}
              onChange={(event) => {
                const value = event.target.value;
                setForm((current) => ({ ...current, subjectOfferingId: value, resourceIds: [] }));
                void loadResources(value);
              }}
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="">Select an assignment</option>
              {assignments.map((item) => (
                <option key={item.id} value={item.subjectOfferingId}>
                  {assignmentLabel(item)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Title" htmlFor="coursework-title">
            <Input
              id="coursework-title"
              required
              maxLength={180}
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({ ...current, title: event.target.value }))
              }
            />
          </Field>
          <Field label="Instructions" htmlFor="coursework-instructions">
            <textarea
              id="coursework-instructions"
              required
              rows={7}
              maxLength={5000}
              className={textareaClass}
              value={form.instructions}
              onChange={(event) =>
                setForm((current) => ({ ...current, instructions: event.target.value }))
              }
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Assigned date" htmlFor="coursework-assigned">
              <Input
                id="coursework-assigned"
                required
                type="date"
                value={form.assignedDate}
                onChange={(event) =>
                  setForm((current) => ({ ...current, assignedDate: event.target.value }))
                }
              />
            </Field>
            <Field label="Submission date (optional)" htmlFor="coursework-submit">
              <Input
                id="coursework-submit"
                type="date"
                value={form.submissionDate}
                onChange={(event) =>
                  setForm((current) => ({ ...current, submissionDate: event.target.value }))
                }
              />
            </Field>
          </div>
          <div className="rounded-md border border-slate-200">
            <div className="border-b px-3 py-2 text-xs font-bold">Teaching resources</div>
            <div className="max-h-40 overflow-y-auto p-2">
              {resources.length ? (
                resources.map((resource) => (
                  <label
                    key={resource.id}
                    className="flex min-h-9 items-center gap-2 rounded px-2 text-xs font-semibold hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={form.resourceIds.includes(resource.id)}
                      onChange={() =>
                        setForm((current) => ({
                          ...current,
                          resourceIds: current.resourceIds.includes(resource.id)
                            ? current.resourceIds.filter((id) => id !== resource.id)
                            : [...current.resourceIds, resource.id],
                        }))
                      }
                    />
                    {resource.title}
                  </label>
                ))
              ) : (
                <p className="p-3 text-xs text-slate-500">
                  No active resources exist for this assignment.
                </p>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={busy}>
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

import { Archive, Edit3, NotebookPen, Plus, Save } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  listTeacherDiaryEntries,
  listTeacherLessonPlans,
  saveTeacherDiaryEntry,
  setTeacherDiaryStatus,
} from "../api/teacher-content.api";
import type {
  LessonPlan,
  TeachingDiaryEntry,
  TeachingDiaryStatus,
} from "../model/teacher-content.types";
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
import {
  assignmentLabel,
  formatDate,
  localDate,
  textareaClass,
} from "../model/teacher-content.utils";
import { ContentFilters, ContentPagination, Field } from "./teacher-content-primitives";
import { useUnsavedChanges } from "../../../shared/navigation/unsaved-changes";

interface DiaryForm {
  id?: string;
  expectedVersion?: number;
  subjectOfferingId: string;
  entryDate: string;
  topic: string;
  summary: string;
  homework: string;
  followUp: string;
  lessonPlanId: string;
}
const emptyForm = (subjectOfferingId = ""): DiaryForm => ({
  subjectOfferingId,
  entryDate: localDate(),
  topic: "",
  summary: "",
  homework: "",
  followUp: "",
  lessonPlanId: "",
});

export function TeacherDiaryPage() {
  const { workspace, workspaceLoading, workspaceError, operatingContext } = useTeacherWorkspace();
  const assignments = useMemo(
    () =>
      workspace?.assignments.filter(
        (item) => !operatingContext.campusId || item.campusId === operatingContext.campusId,
      ) ?? [],
    [operatingContext.campusId, workspace],
  );
  const [items, setItems] = useState<TeachingDiaryEntry[]>([]);
  const [plans, setPlans] = useState<LessonPlan[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<"ALL" | TeachingDiaryStatus>("ALL");
  const [subjectOfferingId, setSubjectOfferingId] = useState("");
  const [form, setForm] = useState<DiaryForm>(() => emptyForm());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [initialForm, setInitialForm] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { requestDiscard } = useUnsavedChanges(
    "teacher-diary-entry",
    dialogOpen && JSON.stringify(form) !== initialForm,
  );

  const load = useCallback(async () => {
    if (!workspace) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await listTeacherDiaryEntries({
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
      setError(value instanceof Error ? value.message : "Unable to load teaching diary");
    } finally {
      setLoading(false);
    }
  }, [page, status, subjectOfferingId, workspace]);
  useEffect(() => {
    void load();
  }, [load]);

  async function loadPlans(offeringId: string) {
    if (!workspace || !offeringId) {
      setPlans([]);
      return;
    }
    try {
      setPlans(
        (
          await listTeacherLessonPlans({
            academicYearId: workspace.academicYear.id,
            subjectOfferingId: offeringId,
            page: 1,
            pageSize: 100,
          })
        ).items.filter((item) => item.status !== "ARCHIVED"),
      );
    } catch {
      setPlans([]);
    }
  }
  function openCreate() {
    const offeringId = subjectOfferingId || assignments[0]?.subjectOfferingId || "";
    const nextForm = emptyForm(offeringId);
    setForm(nextForm);
    setInitialForm(JSON.stringify(nextForm));
    void loadPlans(offeringId);
    setDialogOpen(true);
  }
  function openEdit(item: TeachingDiaryEntry) {
    const nextForm: DiaryForm = {
      id: item.id,
      expectedVersion: item.version,
      subjectOfferingId: item.subjectOfferingId,
      entryDate: item.entryDate,
      topic: item.topic,
      summary: item.summary,
      homework: item.homework ?? "",
      followUp: item.followUp ?? "",
      lessonPlanId: item.lessonPlanId ?? "",
    };
    setForm(nextForm);
    setInitialForm(JSON.stringify(nextForm));
    void loadPlans(item.subjectOfferingId);
    setDialogOpen(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!workspace) return;
    setBusy(true);
    setError(null);
    try {
      await saveTeacherDiaryEntry({
        ...(form.id ? { id: form.id } : {}),
        ...(form.expectedVersion ? { expectedVersion: form.expectedVersion } : {}),
        academicYearId: workspace.academicYear.id,
        subjectOfferingId: form.subjectOfferingId,
        entryDate: form.entryDate,
        topic: form.topic.trim(),
        summary: form.summary.trim(),
        ...(form.homework.trim() ? { homework: form.homework.trim() } : {}),
        ...(form.followUp.trim() ? { followUp: form.followUp.trim() } : {}),
        ...(form.lessonPlanId ? { lessonPlanId: form.lessonPlanId } : {}),
      });
      setDialogOpen(false);
      setForm(emptyForm());
      await load();
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to save teaching diary entry");
    } finally {
      setBusy(false);
    }
  }
  async function transition(item: TeachingDiaryEntry, target: "RECORDED" | "ARCHIVED") {
    setBusy(true);
    setError(null);
    try {
      await setTeacherDiaryStatus({ id: item.id, expectedVersion: item.version, status: target });
      await load();
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to update teaching diary entry");
    } finally {
      setBusy(false);
    }
  }

  if (workspaceLoading && !workspace) return <LoadingState label="Loading teaching diary" />;
  if (workspaceError) return <ErrorState message={workspaceError} />;
  if (!workspace)
    return (
      <ErrorState message="The authenticated user is not linked to an active teaching employee." />
    );

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 p-4 sm:p-5 lg:p-6">
      <WorkspacePageHeader
        title="Teaching Diary"
        description="Record what was actually taught. Recorded entries are preserved as the academic delivery history."
        actions={
          <Button onClick={openCreate} disabled={!assignments.length}>
            <Plus />
            New diary entry
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
          assignmentId={subjectOfferingId}
          status={status}
          statuses={[
            { value: "ALL", label: "All statuses" },
            { value: "DRAFT", label: "Draft" },
            { value: "RECORDED", label: "Recorded" },
            { value: "ARCHIVED", label: "Archived" },
          ]}
          onAssignment={(value) => {
            setSubjectOfferingId(value);
            setPage(1);
          }}
          onStatus={(value) => {
            setStatus(value as typeof status);
            setPage(1);
          }}
        />
        {loading ? (
          <LoadingState label="Loading teaching diary" />
        ) : items.length ? (
          <div className="divide-y divide-slate-100">
            {items.map((item) => (
              <article key={item.id} className="p-4 sm:p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          item.status === "RECORDED"
                            ? "success"
                            : item.status === "ARCHIVED"
                              ? "secondary"
                              : "warning"
                        }
                      >
                        {item.status}
                      </Badge>
                      <span className="text-xs font-semibold text-slate-500">
                        {formatDate(item.entryDate)}
                      </span>
                    </div>
                    <h2 className="mt-2 text-base font-bold text-slate-950">{item.topic}</h2>
                    <p className="mt-1 text-xs font-semibold text-blue-700">
                      {[item.className, item.sectionName, item.subjectName]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {item.summary}
                    </p>
                    {item.homework ? (
                      <p className="mt-3 text-xs text-slate-600">
                        <strong>Homework:</strong> {item.homework}
                      </p>
                    ) : null}
                    {item.followUp ? (
                      <p className="mt-1 text-xs text-slate-600">
                        <strong>Follow-up:</strong> {item.followUp}
                      </p>
                    ) : null}
                    {item.lessonPlanId ? (
                      <p className="mt-2 text-xs font-semibold text-slate-500">
                        Linked to a lesson plan
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {item.status === "DRAFT" ? (
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        title="Edit draft"
                        aria-label={`Edit ${item.topic}`}
                        onClick={() => openEdit(item)}
                      >
                        <Edit3 />
                      </Button>
                    ) : null}
                    {item.status === "DRAFT" ? (
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        title="Record entry"
                        aria-label={`Record ${item.topic}`}
                        disabled={busy}
                        onClick={() => void transition(item, "RECORDED")}
                      >
                        <Save />
                      </Button>
                    ) : null}
                    {item.status !== "ARCHIVED" ? (
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        title="Archive"
                        aria-label={`Archive ${item.topic}`}
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
            title="No teaching diary entries in this view"
            description={
              assignments.length
                ? "Record actual classroom delivery for an assigned subject."
                : "An active teaching assignment is required before a diary entry can be created."
            }
          />
        )}
        <ContentPagination
          noun="diary entry"
          page={page}
          totalPages={totalPages}
          total={total}
          loading={loading}
          onPage={setPage}
        />
      </WorkspaceSurface>
      <Modal
        open={dialogOpen}
        title={form.id ? "Edit diary entry" : "New diary entry"}
        description="Keep drafts while preparing. Recording an entry makes it part of the academic delivery history."
        className="sm:max-w-3xl"
        onClose={() => {
          if (!busy) requestDiscard(() => setDialogOpen(false));
        }}
      >
        <form onSubmit={(event) => void submit(event)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Assigned class and subject" htmlFor="diary-assignment">
              <select
                id="diary-assignment"
                required
                disabled={Boolean(form.id)}
                value={form.subjectOfferingId}
                onChange={(event) => {
                  const value = event.target.value;
                  setForm((current) => ({
                    ...current,
                    subjectOfferingId: value,
                    lessonPlanId: "",
                  }));
                  void loadPlans(value);
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
            <Field label="Teaching date" htmlFor="diary-date">
              <Input
                id="diary-date"
                required
                type="date"
                value={form.entryDate}
                onChange={(event) =>
                  setForm((current) => ({ ...current, entryDate: event.target.value }))
                }
              />
            </Field>
          </div>
          <Field label="Topic taught" htmlFor="diary-topic">
            <Input
              id="diary-topic"
              required
              maxLength={240}
              value={form.topic}
              onChange={(event) =>
                setForm((current) => ({ ...current, topic: event.target.value }))
              }
            />
          </Field>
          <Field label="Linked lesson plan (optional)" htmlFor="diary-plan">
            <select
              id="diary-plan"
              value={form.lessonPlanId}
              onChange={(event) =>
                setForm((current) => ({ ...current, lessonPlanId: event.target.value }))
              }
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="">No linked plan</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {formatDate(plan.planDate)} · {plan.title} · {plan.status}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Classroom delivery summary" htmlFor="diary-summary">
            <textarea
              id="diary-summary"
              required
              rows={7}
              maxLength={4000}
              className={textareaClass}
              value={form.summary}
              onChange={(event) =>
                setForm((current) => ({ ...current, summary: event.target.value }))
              }
            />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Homework given" htmlFor="diary-homework">
              <textarea
                id="diary-homework"
                rows={4}
                maxLength={2000}
                className={textareaClass}
                value={form.homework}
                onChange={(event) =>
                  setForm((current) => ({ ...current, homework: event.target.value }))
                }
              />
            </Field>
            <Field label="Follow-up required" htmlFor="diary-followup">
              <textarea
                id="diary-followup"
                rows={4}
                maxLength={2000}
                className={textareaClass}
                value={form.followUp}
                onChange={(event) =>
                  setForm((current) => ({ ...current, followUp: event.target.value }))
                }
              />
            </Field>
          </div>
          <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-950">
            <NotebookPen className="mr-2 inline h-4 w-4" />
            Attendance remains a separate record; this entry captures teaching delivery only.
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => requestDiscard(() => setDialogOpen(false))}
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

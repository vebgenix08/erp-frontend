import { Archive, CheckCircle2, Edit3, Plus, Send, SquareCheckBig } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  listTeacherLessonPlans,
  listTeacherResources,
  saveTeacherLessonPlan,
  setTeacherLessonPlanStatus,
} from "../api/teacher-content.api";
import type {
  LessonPlan,
  LessonPlanStatus,
  TeachingResource,
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

interface LessonForm {
  id?: string;
  expectedVersion?: number;
  subjectOfferingId: string;
  planDate: string;
  title: string;
  learningObjectives: string;
  topics: string;
  learningActivities: string;
  preparationNotes: string;
  homework: string;
  resourceIds: string[];
}
const emptyForm = (subjectOfferingId = ""): LessonForm => ({
  subjectOfferingId,
  planDate: localDate(),
  title: "",
  learningObjectives: "",
  topics: "",
  learningActivities: "",
  preparationNotes: "",
  homework: "",
  resourceIds: [],
});

export function TeacherLessonPlansPage() {
  const { workspace, workspaceLoading, workspaceError, operatingContext } = useTeacherWorkspace();
  const assignments = useMemo(
    () =>
      workspace?.assignments.filter(
        (item) => !operatingContext.campusId || item.campusId === operatingContext.campusId,
      ) ?? [],
    [operatingContext.campusId, workspace],
  );
  const [items, setItems] = useState<LessonPlan[]>([]);
  const [resources, setResources] = useState<TeachingResource[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<"ALL" | LessonPlanStatus>("ALL");
  const [subjectOfferingId, setSubjectOfferingId] = useState("");
  const [form, setForm] = useState<LessonForm>(() => emptyForm());
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
      const result = await listTeacherLessonPlans({
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
      setError(value instanceof Error ? value.message : "Unable to load lesson plans");
    } finally {
      setLoading(false);
    }
  }, [page, status, subjectOfferingId, workspace]);
  useEffect(() => {
    void load();
  }, [load]);

  async function loadResources(offeringId: string) {
    if (!workspace || !offeringId) {
      setResources([]);
      return;
    }
    try {
      setResources(
        (
          await listTeacherResources({
            academicYearId: workspace.academicYear.id,
            subjectOfferingId: offeringId,
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
  function openCreate() {
    const offeringId = subjectOfferingId || assignments[0]?.subjectOfferingId || "";
    setForm(emptyForm(offeringId));
    void loadResources(offeringId);
    setDialogOpen(true);
  }
  function openEdit(item: LessonPlan) {
    setForm({
      id: item.id,
      expectedVersion: item.version,
      subjectOfferingId: item.subjectOfferingId,
      planDate: item.planDate,
      title: item.title,
      learningObjectives: item.learningObjectives,
      topics: item.topics,
      learningActivities: item.learningActivities ?? "",
      preparationNotes: item.preparationNotes ?? "",
      homework: item.homework ?? "",
      resourceIds: item.resourceIds,
    });
    void loadResources(item.subjectOfferingId);
    setDialogOpen(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!workspace) return;
    setBusy(true);
    setError(null);
    try {
      await saveTeacherLessonPlan({
        ...(form.id ? { id: form.id } : {}),
        ...(form.expectedVersion ? { expectedVersion: form.expectedVersion } : {}),
        academicYearId: workspace.academicYear.id,
        subjectOfferingId: form.subjectOfferingId,
        planDate: form.planDate,
        title: form.title.trim(),
        learningObjectives: form.learningObjectives.trim(),
        topics: form.topics.trim(),
        ...(form.learningActivities.trim()
          ? { learningActivities: form.learningActivities.trim() }
          : {}),
        ...(form.preparationNotes.trim() ? { preparationNotes: form.preparationNotes.trim() } : {}),
        ...(form.homework.trim() ? { homework: form.homework.trim() } : {}),
        resourceIds: form.resourceIds,
      });
      setDialogOpen(false);
      setForm(emptyForm());
      await load();
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to save lesson plan");
    } finally {
      setBusy(false);
    }
  }

  async function transition(item: LessonPlan, target: "READY" | "COMPLETED" | "ARCHIVED") {
    setBusy(true);
    setError(null);
    try {
      await setTeacherLessonPlanStatus({
        id: item.id,
        expectedVersion: item.version,
        status: target,
      });
      await load();
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to update lesson plan");
    } finally {
      setBusy(false);
    }
  }

  if (workspaceLoading && !workspace) return <LoadingState label="Loading lesson plans" />;
  if (workspaceError) return <ErrorState message={workspaceError} />;
  if (!workspace)
    return (
      <ErrorState message="The authenticated user is not linked to an active teaching employee." />
    );

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 p-4 sm:p-5 lg:p-6">
      <WorkspacePageHeader
        title="Lesson Plans"
        description="Prepare instruction for an assigned class and move each plan through a controlled readiness and completion lifecycle."
        actions={
          <Button onClick={openCreate} disabled={!assignments.length}>
            <Plus />
            New lesson plan
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
            { value: "READY", label: "Ready" },
            { value: "COMPLETED", label: "Completed" },
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
          <LoadingState label="Loading lesson plans" />
        ) : items.length ? (
          <div className="divide-y divide-slate-100">
            {items.map((item) => (
              <article key={item.id} className="p-4 sm:p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          item.status === "COMPLETED"
                            ? "success"
                            : item.status === "READY"
                              ? "blue"
                              : item.status === "ARCHIVED"
                                ? "secondary"
                                : "warning"
                        }
                      >
                        {item.status}
                      </Badge>
                      <span className="text-xs font-semibold text-slate-500">
                        {formatDate(item.planDate)}
                      </span>
                    </div>
                    <h2 className="mt-2 text-base font-bold text-slate-950">{item.title}</h2>
                    <p className="mt-1 text-xs font-semibold text-blue-700">
                      {[item.className, item.sectionName, item.subjectName]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <div className="mt-3 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                      <div>
                        <strong className="block text-xs text-slate-800">
                          Learning objectives
                        </strong>
                        <p className="mt-1 whitespace-pre-wrap leading-6">
                          {item.learningObjectives}
                        </p>
                      </div>
                      <div>
                        <strong className="block text-xs text-slate-800">Topics</strong>
                        <p className="mt-1 whitespace-pre-wrap leading-6">{item.topics}</p>
                      </div>
                    </div>
                    {item.resourceIds.length ? (
                      <p className="mt-3 text-xs font-semibold text-slate-500">
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
                        aria-label={`Edit ${item.title}`}
                        onClick={() => openEdit(item)}
                      >
                        <Edit3 />
                      </Button>
                    ) : null}
                    {item.status === "DRAFT" ? (
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        title="Mark ready"
                        aria-label={`Mark ${item.title} ready`}
                        disabled={busy}
                        onClick={() => void transition(item, "READY")}
                      >
                        <Send />
                      </Button>
                    ) : null}
                    {item.status === "READY" ? (
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        title="Mark completed"
                        aria-label={`Complete ${item.title}`}
                        disabled={busy}
                        onClick={() => void transition(item, "COMPLETED")}
                      >
                        <SquareCheckBig />
                      </Button>
                    ) : null}
                    {item.status !== "ARCHIVED" ? (
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        title="Archive"
                        aria-label={`Archive ${item.title}`}
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
            title="No lesson plans in this view"
            description={
              assignments.length
                ? "Create a lesson plan for an assigned class and subject."
                : "An active teaching assignment is required before a lesson plan can be created."
            }
          />
        )}
        <ContentPagination
          noun="lesson plan"
          page={page}
          totalPages={totalPages}
          total={total}
          loading={loading}
          onPage={setPage}
        />
      </WorkspaceSurface>
      <Modal
        open={dialogOpen}
        title={form.id ? "Edit lesson plan" : "New lesson plan"}
        description="Plans remain editable while in draft. Ready and completed plans preserve their academic record."
        className="sm:max-w-3xl"
        onClose={() => {
          if (!busy) setDialogOpen(false);
        }}
      >
        <form onSubmit={(event) => void submit(event)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Assigned class and subject" htmlFor="lesson-assignment">
              <select
                id="lesson-assignment"
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
            <Field label="Planned date" htmlFor="lesson-date">
              <Input
                id="lesson-date"
                required
                type="date"
                value={form.planDate}
                onChange={(event) =>
                  setForm((current) => ({ ...current, planDate: event.target.value }))
                }
              />
            </Field>
          </div>
          <Field label="Lesson title" htmlFor="lesson-title">
            <Input
              id="lesson-title"
              required
              maxLength={180}
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({ ...current, title: event.target.value }))
              }
            />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Learning objectives" htmlFor="lesson-objectives">
              <textarea
                id="lesson-objectives"
                required
                rows={5}
                maxLength={3000}
                className={textareaClass}
                value={form.learningObjectives}
                onChange={(event) =>
                  setForm((current) => ({ ...current, learningObjectives: event.target.value }))
                }
              />
            </Field>
            <Field label="Topics and concepts" htmlFor="lesson-topics">
              <textarea
                id="lesson-topics"
                required
                rows={5}
                maxLength={3000}
                className={textareaClass}
                value={form.topics}
                onChange={(event) =>
                  setForm((current) => ({ ...current, topics: event.target.value }))
                }
              />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Learning activities" htmlFor="lesson-activities">
              <textarea
                id="lesson-activities"
                rows={4}
                maxLength={3000}
                className={textareaClass}
                value={form.learningActivities}
                onChange={(event) =>
                  setForm((current) => ({ ...current, learningActivities: event.target.value }))
                }
              />
            </Field>
            <Field label="Preparation notes" htmlFor="lesson-preparation">
              <textarea
                id="lesson-preparation"
                rows={4}
                maxLength={3000}
                className={textareaClass}
                value={form.preparationNotes}
                onChange={(event) =>
                  setForm((current) => ({ ...current, preparationNotes: event.target.value }))
                }
              />
            </Field>
          </div>
          <Field label="Homework or follow-up" htmlFor="lesson-homework">
            <textarea
              id="lesson-homework"
              rows={3}
              maxLength={2000}
              className={textareaClass}
              value={form.homework}
              onChange={(event) =>
                setForm((current) => ({ ...current, homework: event.target.value }))
              }
            />
          </Field>
          <div className="rounded-md border border-slate-200">
            <div className="border-b border-slate-100 px-3 py-2">
              <strong className="text-xs text-slate-800">Linked teaching resources</strong>
            </div>
            <div className="max-h-40 overflow-y-auto p-2">
              {resources.length ? (
                resources.map((resource) => (
                  <label
                    key={resource.id}
                    className="flex min-h-9 items-center gap-2 rounded px-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
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
                    <span>{resource.title}</span>
                    <span className="ml-auto text-slate-400">{resource.resourceType}</span>
                  </label>
                ))
              ) : (
                <p className="p-3 text-xs text-slate-500">
                  No active resources exist for this assignment.
                </p>
              )}
            </div>
          </div>
          <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-800">
            <CheckCircle2 className="mr-2 inline h-4 w-4" />
            Save the plan as a draft, then mark it ready after review.
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setDialogOpen(false)}
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

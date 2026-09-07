import {
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Search,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ErrorState, LoadingState } from "../../../shared/ui/page-state";
import { useTeacherWorkspace } from "../../teacher-workspace/model/teacher-workspace-context";
import {
  WorkspaceKpi,
  WorkspacePageHeader,
  WorkspaceStatus,
  WorkspaceSurface,
} from "../../teacher-workspace/ui/teacher-workspace-primitives";
import {
  getTeacherMenteeWorkspace,
  listTeacherMentees,
  saveTeacherMentorInteraction,
  setTeacherMentorInteractionStatus,
} from "../api/teacher-mentoring.api";
import type {
  MentorInteractionType,
  MentorInteractionVisibility,
  TeacherMenteeWorkspaceResult,
  TeacherMentoringPageResult,
} from "../model/teacher-mentoring.types";

const today = () => new Date().toISOString().slice(0, 10);
const displayDate = (value?: string) =>
  value
    ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(
        new Date(`${value}T00:00:00`),
      )
    : "Not scheduled";

export function TeacherMentoringPage() {
  const { workspace, workspaceLoading, workspaceError } = useTeacherWorkspace();
  const [result, setResult] = useState<TeacherMentoringPageResult | null>(null);
  const [selected, setSelected] = useState<TeacherMenteeWorkspaceResult | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    if (!workspace) return;
    setLoading(true);
    setError(null);
    try {
      const value = await listTeacherMentees({
        academicYearId: workspace.academicYear.id,
        ...(search.trim() ? { search: search.trim() } : {}),
        page,
        pageSize: 12,
      });
      setResult(value);
      const selectedId = selected?.mentee.assignmentId;
      const nextId = value.items.some((item) => item.assignmentId === selectedId)
        ? selectedId
        : value.items[0]?.assignmentId;
      if (!nextId) setSelected(null);
      else {
        setDetailLoading(true);
        setSelected(await getTeacherMenteeWorkspace(nextId));
      }
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to load mentoring workspace");
    } finally {
      setLoading(false);
      setDetailLoading(false);
    }
  }, [page, search, selected?.mentee.assignmentId, workspace]);

  useEffect(() => {
    void load();
  }, [load]);
  const selectMentee = async (assignmentId: string) => {
    setDetailLoading(true);
    setError(null);
    try {
      setSelected(await getTeacherMenteeWorkspace(assignmentId));
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to load mentee record");
    } finally {
      setDetailLoading(false);
    }
  };
  const hasCapability = useMemo(
    () => workspace?.responsibilities.some((item) => item.responsibilityType === "MENTOR") ?? false,
    [workspace],
  );

  if (workspaceLoading && !workspace) return <LoadingState label="Loading mentoring workspace" />;
  if (workspaceError) return <ErrorState message={workspaceError} />;
  if (!workspace)
    return (
      <ErrorState message="The authenticated user is not linked to an active teaching employee." />
    );
  if (!hasCapability)
    return (
      <ErrorState message="No active mentoring responsibility is assigned for this academic year." />
    );
  if (error && !result) return <ErrorState message={error} />;

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 p-4 sm:p-5 lg:p-6">
      <WorkspacePageHeader
        title="Mentoring"
        description="Assigned mentees, structured interactions, follow-ups and academic action items."
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <WorkspaceKpi
          label="Assigned mentees"
          value={result?.total ?? 0}
          detail={workspace.academicYear.name}
          icon={Users}
        />
        <WorkspaceKpi
          label="Follow-ups due"
          value={result?.pendingFollowUps ?? 0}
          detail="Open through today"
          icon={CalendarClock}
          tone="amber"
        />
        <WorkspaceKpi
          label="Open actions"
          value={result?.openActions ?? 0}
          detail="Across assigned mentees"
          icon={ClipboardList}
          tone="blue"
        />
      </div>
      {error ? (
        <div
          role="alert"
          className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"
        >
          {error}
        </div>
      ) : null}
      <div className="grid gap-4 xl:grid-cols-[390px_minmax(0,1fr)]">
        <WorkspaceSurface>
          <div className="border-b border-slate-200 p-4">
            <label className="relative block">
              <span className="sr-only">Search mentees</span>
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={16}
              />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search student, class or roll number"
                className="h-10 w-full rounded-md border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-slate-900"
              />
            </label>
          </div>
          <div className="max-h-[650px] overflow-y-auto p-2">
            {loading ? (
              <LoadingState label="Loading assigned mentees" />
            ) : result?.items.length ? (
              result.items.map((item) => (
                <button
                  key={item.assignmentId}
                  onClick={() => void selectMentee(item.assignmentId)}
                  className={`mb-1 w-full rounded-md border p-3 text-left transition ${selected?.mentee.assignmentId === item.assignmentId ? "border-slate-900 bg-blue-50" : "border-transparent hover:border-slate-200 hover:bg-slate-50"}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 font-bold text-slate-700">
                      {item.studentName
                        .split(" ")
                        .map((part) => part[0])
                        .slice(0, 2)
                        .join("")}
                    </span>
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-sm text-slate-950">
                        {item.studentName}
                      </strong>
                      <small className="block truncate text-xs text-slate-500">
                        {[
                          item.className,
                          item.sectionName,
                          item.rollNumber ? `Roll ${item.rollNumber}` : undefined,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </small>
                      <span className="mt-2 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                        <span>Follow-up: {displayDate(item.nextFollowUpDate)}</span>
                        {item.openActionCount ? (
                          <WorkspaceStatus tone="warning">
                            {item.openActionCount} open
                          </WorkspaceStatus>
                        ) : null}
                      </span>
                    </span>
                  </div>
                </button>
              ))
            ) : (
              <div className="grid min-h-48 place-items-center px-6 text-center">
                <div>
                  <Users className="mx-auto text-slate-300" />
                  <strong className="mt-3 block text-sm text-slate-800">No mentees assigned</strong>
                  <p className="mt-1 text-xs text-slate-500">
                    Mentoring appears only after an authorized academic owner assigns students.
                  </p>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 p-3 text-xs font-semibold text-slate-500">
            <span>
              Page {result?.page ?? 1} of {result?.totalPages ?? 1}
            </span>
            <span className="flex gap-2">
              <button
                disabled={!result || result.page <= 1}
                onClick={() => setPage((value) => value - 1)}
                className="rounded border border-slate-200 px-3 py-1.5 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={!result || result.page >= result.totalPages}
                onClick={() => setPage((value) => value + 1)}
                className="rounded border border-slate-200 px-3 py-1.5 disabled:opacity-40"
              >
                Next
              </button>
            </span>
          </div>
        </WorkspaceSurface>
        <WorkspaceSurface>
          {detailLoading ? (
            <LoadingState label="Loading mentee details" />
          ) : selected ? (
            <div>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 p-5">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-full bg-blue-100 font-extrabold text-blue-950">
                      <UserRound size={20} />
                    </span>
                    <span>
                      <h2 className="text-lg font-extrabold text-slate-950">
                        {selected.mentee.studentName}
                      </h2>
                      <p className="text-sm text-slate-500">
                        {[selected.mentee.className, selected.mentee.sectionName]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setDialogOpen(true)}
                  className="h-10 rounded-md bg-slate-900 px-4 text-sm font-bold text-white hover:bg-slate-800"
                >
                  Add interaction
                </button>
              </div>
              <div className="grid gap-px border-b border-slate-200 bg-slate-200 sm:grid-cols-3">
                <Detail label="Registration" value={selected.mentee.registrationNumber} />
                <Detail label="Guardian" value={selected.mentee.guardianName} />
                <Detail
                  label="Next follow-up"
                  value={displayDate(selected.mentee.nextFollowUpDate)}
                />
              </div>
              <div className="p-5">
                <h3 className="mb-3 text-sm font-extrabold text-slate-950">Interaction history</h3>
                {selected.interactions.length ? (
                  <div className="space-y-3">
                    {selected.interactions.map((item) => (
                      <article key={item.id} className="rounded-md border border-slate-200 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="flex items-center gap-2">
                            <WorkspaceStatus
                              tone={
                                item.status === "OPEN"
                                  ? "warning"
                                  : item.status === "COMPLETED"
                                    ? "success"
                                    : "neutral"
                              }
                            >
                              {item.status}
                            </WorkspaceStatus>
                            <strong className="text-xs text-slate-800">
                              {item.interactionType.replaceAll("_", " ")}
                            </strong>
                          </span>
                          <time className="text-xs font-semibold text-slate-500">
                            {displayDate(item.interactionDate)}
                          </time>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-slate-700">{item.summary}</p>
                        {item.actionItems.length ? (
                          <ul className="mt-3 space-y-1 border-l-2 border-blue-200 pl-3 text-xs text-slate-600">
                            {item.actionItems.map((action) => (
                              <li key={action}>{action}</li>
                            ))}
                          </ul>
                        ) : null}
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold text-slate-500">
                          <span>
                            {item.visibility === "MENTOR_ONLY"
                              ? "Visible only to mentor"
                              : "Visible to authorized academic team"}
                            {item.followUpDate
                              ? ` · Follow-up ${displayDate(item.followUpDate)}`
                              : ""}
                          </span>
                          {item.status === "OPEN" ? (
                            <button
                              onClick={async () => {
                                await setTeacherMentorInteractionStatus({
                                  id: item.id,
                                  expectedVersion: item.version,
                                  status: "COMPLETED",
                                });
                                await load();
                              }}
                              className="inline-flex items-center gap-1 rounded border border-blue-200 px-2.5 py-1 text-blue-950 hover:bg-blue-50"
                            >
                              <CheckCircle2 size={13} />
                              Complete
                            </button>
                          ) : null}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="grid min-h-52 place-items-center text-center">
                    <div>
                      <ClipboardList className="mx-auto text-slate-300" />
                      <strong className="mt-3 block text-sm text-slate-800">
                        No mentoring interactions
                      </strong>
                      <p className="mt-1 text-xs text-slate-500">
                        Record a meeting, call, academic review or attendance follow-up.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="grid min-h-[500px] place-items-center text-center">
              <div>
                <UserRound className="mx-auto text-slate-300" />
                <strong className="mt-3 block text-sm text-slate-800">Select a mentee</strong>
                <p className="mt-1 text-xs text-slate-500">
                  Choose an assigned student to review mentoring history.
                </p>
              </div>
            </div>
          )}
        </WorkspaceSurface>
      </div>
      {dialogOpen && selected ? (
        <InteractionDialog
          assignmentId={selected.mentee.assignmentId}
          onClose={() => setDialogOpen(false)}
          onSaved={async () => {
            setDialogOpen(false);
            await load();
          }}
        />
      ) : null}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white p-4">
      <small className="block text-[10px] font-bold uppercase text-slate-500">{label}</small>
      <strong className="mt-1 block truncate text-sm text-slate-900">{value}</strong>
    </div>
  );
}

function InteractionDialog({
  assignmentId,
  onClose,
  onSaved,
}: {
  assignmentId: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [interactionType, setInteractionType] = useState<MentorInteractionType>("MEETING");
  const [interactionDate, setInteractionDate] = useState(today());
  const [summary, setSummary] = useState("");
  const [actions, setActions] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [visibility, setVisibility] = useState<MentorInteractionVisibility>("ACADEMIC_TEAM");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/55 p-4"
      onMouseDown={onClose}
    >
      <form
        className="w-full max-w-2xl rounded-lg bg-white shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={async (event) => {
          event.preventDefault();
          setSaving(true);
          setError(null);
          try {
            await saveTeacherMentorInteraction({
              assignmentId,
              interactionType,
              interactionDate,
              summary,
              actionItems: actions
                .split("\n")
                .map((item) => item.trim())
                .filter(Boolean),
              ...(followUpDate ? { followUpDate } : {}),
              visibility,
            });
            await onSaved();
          } catch (value) {
            setError(value instanceof Error ? value.message : "Unable to save interaction");
          } finally {
            setSaving(false);
          }
        }}
      >
        <div className="flex items-center justify-between border-b border-slate-200 p-5">
          <div>
            <h2 className="text-lg font-extrabold text-slate-950">Record mentoring interaction</h2>
            <p className="text-sm text-slate-500">Use structured, factual academic notes only.</p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Interaction type">
            <select
              value={interactionType}
              onChange={(event) => setInteractionType(event.target.value as MentorInteractionType)}
              className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
            >
              <option value="MEETING">Meeting</option>
              <option value="CALL">Call</option>
              <option value="ACADEMIC">Academic review</option>
              <option value="ATTENDANCE">Attendance review</option>
              <option value="GENERAL">General</option>
            </select>
          </Field>
          <Field label="Interaction date">
            <input
              required
              type="date"
              value={interactionDate}
              onChange={(event) => setInteractionDate(event.target.value)}
              className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
            />
          </Field>
          <Field label="Summary" wide>
            <textarea
              required
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              rows={4}
              maxLength={3000}
              className="w-full rounded-md border border-slate-200 p-3 text-sm"
            />
          </Field>
          <Field label="Action items (one per line)" wide>
            <textarea
              value={actions}
              onChange={(event) => setActions(event.target.value)}
              rows={3}
              className="w-full rounded-md border border-slate-200 p-3 text-sm"
            />
          </Field>
          <Field label="Follow-up date">
            <input
              type="date"
              value={followUpDate}
              onChange={(event) => setFollowUpDate(event.target.value)}
              className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
            />
          </Field>
          <Field label="Visibility">
            <select
              value={visibility}
              onChange={(event) => setVisibility(event.target.value as MentorInteractionVisibility)}
              className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
            >
              <option value="ACADEMIC_TEAM">Authorized academic team</option>
              <option value="MENTOR_ONLY">Mentor only</option>
            </select>
          </Field>
          {error ? (
            <div
              role="alert"
              className="sm:col-span-2 rounded bg-rose-50 p-3 text-sm font-semibold text-rose-700"
            >
              {error}
            </div>
          ) : null}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 p-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-md border border-slate-200 px-4 text-sm font-bold"
          >
            Cancel
          </button>
          <button
            disabled={saving || !summary.trim()}
            className="h-10 rounded-md bg-slate-900 px-4 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save interaction"}
          </button>
        </div>
      </form>
    </div>
  );
}
function Field({
  label,
  wide,
  children,
}: {
  label: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={wide ? "sm:col-span-2" : ""}>
      <span className="mb-1.5 block text-xs font-bold text-slate-700">{label}</span>
      {children}
    </label>
  );
}

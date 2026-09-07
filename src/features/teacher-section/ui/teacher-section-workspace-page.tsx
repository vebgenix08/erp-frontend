import {
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Search,
  UserRoundCheck,
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
  getTeacherSectionWorkspace,
  resolveTeacherSectionFollowUp,
  saveTeacherSectionFollowUp,
} from "../api/teacher-section.api";
import type {
  SectionFollowUpType,
  SectionFollowUpVisibility,
  SectionStudent,
  TeacherSectionWorkspaceResult,
} from "../model/teacher-section.types";

type Tab = "OVERVIEW" | "STUDENTS" | "TIMETABLE" | "FOLLOW_UPS";
const today = () => new Date().toISOString().slice(0, 10);
const dateLabel = (value?: string) =>
  value
    ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(
        new Date(`${value}T00:00:00`),
      )
    : "Not scheduled";

export function TeacherSectionWorkspacePage() {
  const { workspace, workspaceLoading, workspaceError } = useTeacherWorkspace();
  const [data, setData] = useState<TeacherSectionWorkspaceResult | null>(null);
  const [sectionId, setSectionId] = useState("");
  const [tab, setTab] = useState<Tab>("OVERVIEW");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followUpStudent, setFollowUpStudent] = useState<SectionStudent | null>(null);
  const load = useCallback(async () => {
    if (!workspace) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getTeacherSectionWorkspace({
        academicYearId: workspace.academicYear.id,
        ...(sectionId ? { sectionId } : {}),
        date: today(),
      });
      setData(result);
      if (!sectionId) setSectionId(result.section.id);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to load assigned section");
    } finally {
      setLoading(false);
    }
  }, [sectionId, workspace]);
  useEffect(() => {
    void load();
  }, [load]);
  const students = useMemo(
    () =>
      data?.students.filter(
        (item) =>
          !search.trim() ||
          `${item.studentName} ${item.rollNumber ?? ""} ${item.registrationNumber}`
            .toLowerCase()
            .includes(search.trim().toLowerCase()),
      ) ?? [],
    [data?.students, search],
  );
  if (workspaceLoading && !workspace) return <LoadingState label="Loading section workspace" />;
  if (workspaceError) return <ErrorState message={workspaceError} />;
  if (error && !data) return <ErrorState message={error} />;
  if (!workspace)
    return (
      <ErrorState message="The authenticated user is not linked to an active teaching employee." />
    );
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 p-4 sm:p-5 lg:p-6">
      <WorkspacePageHeader
        title="Section Workspace"
        description="Whole-section students, attendance completion, timetable and academic follow-ups within the assigned responsibility."
        actions={
          data?.availableSections.length ? (
            <select
              aria-label="Assigned section"
              value={sectionId || data.section.id}
              onChange={(event) => setSectionId(event.target.value)}
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-bold"
            >
              {data.availableSections.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.className} · {item.name}
                </option>
              ))}
            </select>
          ) : undefined
        }
      />
      {error ? (
        <div
          role="alert"
          className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700"
        >
          {error}
        </div>
      ) : null}
      {loading && !data ? (
        <LoadingState label="Loading assigned section" />
      ) : data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <WorkspaceKpi
              label="Students"
              value={data.summary.totalStudents}
              detail={`${data.section.className} · ${data.section.name}`}
              icon={Users}
            />
            <WorkspaceKpi
              label="Present today"
              value={data.summary.presentToday}
              detail={`${data.summary.absentToday} absent`}
              icon={CalendarCheck}
              tone="navy"
            />
            <WorkspaceKpi
              label="Open follow-ups"
              value={data.summary.openFollowUps}
              detail="Academic and attendance"
              icon={ClipboardList}
              tone="amber"
            />
            <WorkspaceKpi
              label="Marks completion"
              value={data.summary.marksSheetsSubmitted}
              detail={`${data.summary.marksSheetsPending} pending sheets`}
              icon={CheckCircle2}
              tone="blue"
            />
          </div>
          <WorkspaceSurface>
            <div className="flex gap-1 overflow-x-auto border-b border-slate-200 p-2">
              {(["OVERVIEW", "STUDENTS", "TIMETABLE", "FOLLOW_UPS"] as Tab[]).map((item) => (
                <button
                  key={item}
                  onClick={() => setTab(item)}
                  className={`min-h-10 whitespace-nowrap rounded-md px-4 text-xs font-extrabold ${tab === item ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
                >
                  {item.replace("_", " ")}
                </button>
              ))}
            </div>
            {tab === "OVERVIEW" ? (
              <div className="grid gap-5 p-5 xl:grid-cols-2">
                <section>
                  <h2 className="text-sm font-extrabold text-slate-950">
                    Attendance completion today
                  </h2>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <Mini label="Submitted sessions" value={data.summary.attendanceSessionsToday} />
                    <Mini label="Students marked present" value={data.summary.presentToday} />
                    <Mini label="Students marked absent" value={data.summary.absentToday} />
                  </div>
                </section>
                <section>
                  <h2 className="text-sm font-extrabold text-slate-950">Academic follow-up</h2>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <Mini label="Open actions" value={data.summary.openFollowUps} />
                    <Mini label="Marks submitted" value={data.summary.marksSheetsSubmitted} />
                    <Mini label="Marks pending" value={data.summary.marksSheetsPending} />
                  </div>
                </section>
              </div>
            ) : null}
            {tab === "STUDENTS" ? (
              <div>
                <div className="border-b border-slate-200 p-4">
                  <label className="relative block max-w-md">
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      size={16}
                    />
                    <input
                      aria-label="Search section students"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search student, roll or registration"
                      className="h-10 w-full rounded-md border border-slate-200 pl-9 pr-3 text-sm"
                    />
                  </label>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="p-3">Student</th>
                        <th className="p-3">Roll number</th>
                        <th className="p-3">Guardian</th>
                        <th className="p-3">Today</th>
                        <th className="p-3">Follow-ups</th>
                        <th className="p-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {students.map((student) => (
                        <tr key={student.studentId}>
                          <td className="p-3">
                            <strong className="block text-slate-900">{student.studentName}</strong>
                            <small className="text-slate-500">{student.registrationNumber}</small>
                          </td>
                          <td className="p-3">{student.rollNumber ?? "Not assigned"}</td>
                          <td className="p-3">
                            <strong className="block text-xs">{student.guardianName}</strong>
                            <small className="text-slate-500">
                              {student.guardianPhone ?? "No phone"}
                            </small>
                          </td>
                          <td className="p-3">
                            {student.attendanceStatusToday ? (
                              <WorkspaceStatus
                                tone={
                                  student.attendanceStatusToday === "PRESENT" ? "success" : "danger"
                                }
                              >
                                {student.attendanceStatusToday}
                              </WorkspaceStatus>
                            ) : (
                              <WorkspaceStatus tone="neutral">Not marked</WorkspaceStatus>
                            )}
                          </td>
                          <td className="p-3">{student.openFollowUps}</td>
                          <td className="p-3">
                            <button
                              onClick={() => setFollowUpStudent(student)}
                              className="rounded border border-blue-200 px-3 py-1.5 text-xs font-bold text-blue-950 hover:bg-blue-50"
                            >
                              Add follow-up
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!students.length ? (
                    <p className="p-10 text-center text-sm font-semibold text-slate-500">
                      No students match the current search.
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
            {tab === "TIMETABLE" ? (
              <div className="overflow-x-auto p-4">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="p-3">Day</th>
                      <th className="p-3">Time</th>
                      <th className="p-3">Subject</th>
                      <th className="p-3">Teacher</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.timetable.map((item) => (
                      <tr key={item.id}>
                        <td className="p-3 font-bold">{item.dayOfWeek}</td>
                        <td className="p-3">
                          {item.startTime} - {item.endTime}
                        </td>
                        <td className="p-3 font-semibold">{item.subjectName}</td>
                        <td className="p-3">{item.teacherName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!data.timetable.length ? (
                  <p className="p-10 text-center text-sm font-semibold text-slate-500">
                    No published timetable exists for this section.
                  </p>
                ) : null}
              </div>
            ) : null}
            {tab === "FOLLOW_UPS" ? (
              <div className="divide-y divide-slate-100">
                {data.followUps.map((item) => {
                  const student = data.students.find((value) => value.studentId === item.studentId);
                  return (
                    <article key={item.id} className="p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span>
                          <strong className="block text-sm text-slate-900">
                            {student?.studentName ?? "Student"}
                          </strong>
                          <small className="text-xs font-semibold text-slate-500">
                            {item.followUpType} · {dateLabel(item.followUpDate)}
                          </small>
                        </span>
                        <WorkspaceStatus tone={item.status === "OPEN" ? "warning" : "success"}>
                          {item.status}
                        </WorkspaceStatus>
                      </div>
                      <p className="mt-3 text-sm text-slate-700">{item.summary}</p>
                      {item.nextAction ? (
                        <p className="mt-2 text-xs font-semibold text-slate-500">
                          Next action: {item.nextAction}
                        </p>
                      ) : null}
                      {item.status === "OPEN" ? (
                        <button
                          onClick={async () => {
                            await resolveTeacherSectionFollowUp({
                              id: item.id,
                              expectedVersion: item.version,
                            });
                            await load();
                          }}
                          className="mt-3 inline-flex items-center gap-1 rounded border border-blue-200 px-3 py-1.5 text-xs font-bold text-blue-950 hover:bg-blue-50"
                        >
                          <UserRoundCheck size={14} />
                          Resolve
                        </button>
                      ) : null}
                    </article>
                  );
                })}
                {!data.followUps.length ? (
                  <p className="p-10 text-center text-sm font-semibold text-slate-500">
                    No student follow-ups recorded for this section.
                  </p>
                ) : null}
              </div>
            ) : null}
          </WorkspaceSurface>
        </>
      ) : null}
      {followUpStudent && data ? (
        <FollowUpDialog
          student={followUpStudent}
          academicYearId={workspace.academicYear.id}
          sectionId={data.section.id}
          onClose={() => setFollowUpStudent(null)}
          onSaved={async () => {
            setFollowUpStudent(null);
            await load();
            setTab("FOLLOW_UPS");
          }}
        />
      ) : null}
    </div>
  );
}
function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-slate-200 p-4">
      <strong className="block text-2xl text-slate-950">{value}</strong>
      <small className="text-xs font-semibold text-slate-500">{label}</small>
    </div>
  );
}
function FollowUpDialog({
  student,
  academicYearId,
  sectionId,
  onClose,
  onSaved,
}: {
  student: SectionStudent;
  academicYearId: string;
  sectionId: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [type, setType] = useState<SectionFollowUpType>("ACADEMIC"),
    [summary, setSummary] = useState(""),
    [nextAction, setNextAction] = useState(""),
    [followUpDate, setFollowUpDate] = useState(""),
    [visibility, setVisibility] = useState<SectionFollowUpVisibility>("ACADEMIC_TEAM"),
    [saving, setSaving] = useState(false),
    [error, setError] = useState<string | null>(null);
  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/55 p-4"
      onMouseDown={onClose}
    >
      <form
        className="w-full max-w-xl rounded-lg bg-white shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={async (event) => {
          event.preventDefault();
          setSaving(true);
          setError(null);
          try {
            await saveTeacherSectionFollowUp({
              academicYearId,
              sectionId,
              studentId: student.studentId,
              followUpType: type,
              summary,
              ...(nextAction.trim() ? { nextAction: nextAction.trim() } : {}),
              ...(followUpDate ? { followUpDate } : {}),
              visibility,
            });
            await onSaved();
          } catch (value) {
            setError(value instanceof Error ? value.message : "Unable to save follow-up");
          } finally {
            setSaving(false);
          }
        }}
      >
        <div className="flex items-center justify-between border-b border-slate-200 p-5">
          <div>
            <h2 className="text-lg font-extrabold">Student follow-up</h2>
            <p className="text-sm text-slate-500">{student.studentName}</p>
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
          <label>
            <span className="mb-1 block text-xs font-bold">Type</span>
            <select
              value={type}
              onChange={(event) => setType(event.target.value as SectionFollowUpType)}
              className="h-10 w-full rounded border border-slate-200 px-3 text-sm"
            >
              <option value="ACADEMIC">Academic</option>
              <option value="ATTENDANCE">Attendance</option>
              <option value="GENERAL">General</option>
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs font-bold">Follow-up date</span>
            <input
              type="date"
              value={followUpDate}
              onChange={(event) => setFollowUpDate(event.target.value)}
              className="h-10 w-full rounded border border-slate-200 px-3 text-sm"
            />
          </label>
          <label className="sm:col-span-2">
            <span className="mb-1 block text-xs font-bold">Summary</span>
            <textarea
              required
              maxLength={3000}
              rows={4}
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              className="w-full rounded border border-slate-200 p-3 text-sm"
            />
          </label>
          <label className="sm:col-span-2">
            <span className="mb-1 block text-xs font-bold">Next action</span>
            <input
              maxLength={500}
              value={nextAction}
              onChange={(event) => setNextAction(event.target.value)}
              className="h-10 w-full rounded border border-slate-200 px-3 text-sm"
            />
          </label>
          <label className="sm:col-span-2">
            <span className="mb-1 block text-xs font-bold">Visibility</span>
            <select
              value={visibility}
              onChange={(event) => setVisibility(event.target.value as SectionFollowUpVisibility)}
              className="h-10 w-full rounded border border-slate-200 px-3 text-sm"
            >
              <option value="ACADEMIC_TEAM">Authorized academic team</option>
              <option value="CLASS_TEACHER_ONLY">Class Teacher only</option>
            </select>
          </label>
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
            className="h-10 rounded border border-slate-200 px-4 text-sm font-bold"
          >
            Cancel
          </button>
          <button
            disabled={saving || !summary.trim()}
            className="h-10 rounded bg-slate-900 px-4 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save follow-up"}
          </button>
        </div>
      </form>
    </div>
  );
}

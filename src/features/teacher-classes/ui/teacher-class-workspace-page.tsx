import {
  Award,
  BarChart3,
  CalendarCheck,
  CalendarDays,
  Clock,
  Download,
  FileSpreadsheet,
  FolderOpen,
  GraduationCap,
  Search,
  Sparkles,
  TrendingUp,
  Upload,
  UserCheck,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../../../shared/ui/button";
import { EmptyState, ErrorState, LoadingState } from "../../../shared/ui/page-state";
import { useTeacherWorkspace } from "../../teacher-workspace/model/teacher-workspace-context";
import { ModernSelect } from "../../../shared/ui/select";
import {
  WorkspacePageHeader,
  WorkspaceStatus,
  WorkspaceSurface,
} from "../../teacher-workspace/ui/teacher-workspace-primitives";
import { getTeacherClassWorkspace } from "../api/teacher-classes.api";
import type { TeacherClassWorkspace } from "../model/teacher-classes.types";

const days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

const readable = (value?: string) =>
  (value ?? "")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

type WorkspaceTab = "OVERVIEW" | "STUDENTS" | "ATTENDANCE" | "GRADING" | "RESOURCES" | "TIMETABLE";

export function TeacherClassWorkspacePage() {
  const { workspace, workspaceLoading, workspaceError } = useTeacherWorkspace();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const activeOfferingId =
    params.get("offering") ||
    workspace?.assignments[0]?.subjectOfferingId ||
    workspace?.assignments[0]?.id ||
    "";

  const [data, setData] = useState<TeacherClassWorkspace | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [tab, setTab] = useState<WorkspaceTab>("OVERVIEW");
  const [search, setSearch] = useState("");

  // Select the active assignment from workspace
  const currentAssignment = useMemo(() => {
    if (!workspace?.assignments.length) return null;
    return (
      workspace.assignments.find(
        (a) => a.subjectOfferingId === activeOfferingId || a.id === activeOfferingId,
      ) ?? workspace.assignments[0]
    );
  }, [activeOfferingId, workspace?.assignments]);

  useEffect(() => {
    if (!workspace || !currentAssignment) {
      setData(null);
      return;
    }
    let active = true;
    setLoading(true);
    setLoadError(null);
    getTeacherClassWorkspace({
      academicYearId: workspace.academicYear.id,
      subjectOfferingId: currentAssignment.subjectOfferingId || currentAssignment.id,
    })
      .then((result) => {
        if (active && result) setData(result);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setData(null);
        setLoadError(error instanceof Error ? error.message : "Unable to load the class roster");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [currentAssignment, reloadKey, workspace]);

  // Timetable entries for this class
  const classTimetableEntries = useMemo(() => {
    if (!workspace || !currentAssignment) return [];
    if (data?.timetableEntries?.length) return data.timetableEntries;
    return (workspace.timetableEntries ?? []).filter(
      (entry) =>
        entry.subjectOfferingId === currentAssignment.subjectOfferingId ||
        (entry.className === currentAssignment.className &&
          (entry.sectionName === currentAssignment.sectionName ||
            entry.subjectBatchName === currentAssignment.subjectBatchName)),
    );
  }, [currentAssignment, data?.timetableEntries, workspace]);

  // Students list from backend or empty
  const rawStudents = useMemo(() => {
    return data?.students ?? [];
  }, [data?.students]);

  const filteredStudents = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rawStudents.filter(
      (student) =>
        !needle ||
        [student.studentName, student.registrationNumber, student.rollNumber]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(needle)),
    );
  }, [rawStudents, search]);

  if (workspaceLoading && !workspace) return <LoadingState label="Loading class workspace" />;
  if (workspaceError) return <ErrorState message={workspaceError} />;
  if (!workspace)
    return <ErrorState message="The authenticated user is not linked to an active employee." />;

  if (!workspace.assignments.length || !currentAssignment) {
    return (
      <EmptyState
        title="No assigned class found"
        description="An active teaching assignment is required before a class workspace is available."
      />
    );
  }

  if (loading && !data) return <LoadingState label="Loading class details" />;

  if (loadError && !data) {
    return (
      <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-5 lg:p-6">
        <ErrorState message={loadError} retry={() => setReloadKey((current) => current + 1)} />
      </div>
    );
  }

  const group =
    [
      currentAssignment.className ?? currentAssignment.programName,
      currentAssignment.sectionName ?? currentAssignment.subjectBatchName,
    ]
      .filter(Boolean)
      .join(" - ") || "Assigned Group";
  const offeringId = currentAssignment.subjectOfferingId || currentAssignment.id;
  const contextualPath = (path: string) => `${path}?offering=${encodeURIComponent(offeringId)}`;

  const totalStudents = rawStudents.length;
  const activeStudents = rawStudents.filter((s) => s.status === "ACTIVE").length;

  const exportStudents = () => {
    const rows = [
      ["Roll Number", "Student Name", "Registration Number", "Status"],
      ...filteredStudents.map((student) => [
        student.rollNumber ?? "",
        student.studentName,
        student.registrationNumber,
        student.status,
      ]),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    anchor.download = `${group.replaceAll(" ", "-")}-${currentAssignment.subjectName}-students.csv`;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  };

  const offeringOptions = workspace.assignments.map((item) => ({
    label: [
      item.className ?? item.programName,
      item.sectionName ?? item.subjectBatchName,
      item.subjectName,
    ]
      .filter(Boolean)
      .join(" · "),
    value: item.subjectOfferingId || item.id,
  }));

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 p-4 sm:p-5 lg:p-6">
      {/* Header */}
      <WorkspacePageHeader
        title="Class Workspace"
        description={`${group} · ${currentAssignment.subjectName} · ${currentAssignment.campusName} · ${workspace.academicYear.name} · ${readable(currentAssignment.componentType || "Theory")}`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => navigate(contextualPath("/teacher/attendance"))}
              className="rounded-xl shadow-2xs text-xs font-bold"
            >
              <CalendarCheck className="mr-1.5 h-4 w-4 text-blue-950" /> Mark Attendance
            </Button>
            <Button
              variant="default"
              onClick={() => navigate(contextualPath("/teacher/marks-entry"))}
              className="rounded-xl shadow-2xs text-xs font-bold bg-brand-600 hover:bg-brand-700"
            >
              <FileSpreadsheet className="mr-1.5 h-4 w-4" /> Enter Marks
            </Button>
          </div>
        }
      />

      {/* Class Switcher Toolbar */}
      <WorkspaceSurface>
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 flex-1 max-w-xl">
            <span className="text-xs font-bold text-slate-700 whitespace-nowrap">
              Switch Assigned Class:
            </span>
            <ModernSelect
              aria-label="Assigned class"
              value={currentAssignment.subjectOfferingId || currentAssignment.id}
              onValueChange={(val) => setParams({ offering: val })}
              className="w-full"
              options={offeringOptions}
            />
          </div>

          <WorkspaceStatus tone={currentAssignment.status === "COMPLETE" ? "success" : "warning"}>
            {currentAssignment.status === "COMPLETE"
              ? "Timetable Complete"
              : "Timetable Incomplete"}
          </WorkspaceStatus>
        </div>
      </WorkspaceSurface>

      {/* Class Analytics Ribbon */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {/* Enrolled Students KPI */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Enrolled Students
            </span>
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-50 text-brand-600">
              <UsersRound size={16} />
            </span>
          </div>
          <strong className="mt-2 block text-2xl font-black text-slate-900">
            {totalStudents > 0 ? `${totalStudents} Students` : "Roster Ready"}
          </strong>
          <span className="mt-1 block text-xs font-medium text-slate-500">
            {totalStudents > 0 ? `${activeStudents} Active Students` : "Class Section Roster"}
          </span>
        </div>

        {/* Attendance metrics require persisted attendance aggregates. */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Attendance Rate
            </span>
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-blue-50 text-blue-950">
              <UserCheck size={16} />
            </span>
          </div>
          <strong className="mt-2 block text-2xl font-black text-slate-900">Not available</strong>
          <span className="mt-1 block text-xs font-medium text-slate-500">
            No attendance summary has been recorded
          </span>
        </div>

        {/* Assessment metrics require published marks for this assignment. */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Recent Exam Avg
            </span>
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-blue-50 text-blue-600">
              <Award size={16} />
            </span>
          </div>
          <strong className="mt-2 block text-2xl font-black text-slate-900">Not available</strong>
          <span className="mt-1 block text-xs font-medium text-slate-500">
            No published assessment summary is available
          </span>
        </div>

        {/* Weekly Scheduled Periods KPI */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Weekly Periods
            </span>
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-50 text-amber-600">
              <Clock size={16} />
            </span>
          </div>
          <strong className="mt-2 block text-2xl font-black text-slate-900">
            {currentAssignment.scheduledPeriods} / {currentAssignment.requiredPeriods}
          </strong>
          <span className="mt-1 block text-xs font-medium text-slate-500">
            {currentAssignment.unscheduledPeriods
              ? `${currentAssignment.unscheduledPeriods} periods remaining`
              : "100% allocation completed"}
          </span>
        </div>
      </div>

      {/* Main Tabbed Interface */}
      <WorkspaceSurface>
        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto border-b border-slate-200 p-2 gap-1 bg-slate-50/50">
          {(
            [
              { key: "OVERVIEW", label: "Class Analytics", icon: BarChart3 },
              {
                key: "STUDENTS",
                label: `Students ${totalStudents > 0 ? `(${totalStudents})` : ""}`,
                icon: UsersRound,
              },
              { key: "ATTENDANCE", label: "Attendance", icon: CalendarCheck },
              { key: "GRADING", label: "Grading & Results", icon: Award },
              { key: "RESOURCES", label: "Study Resources", icon: FolderOpen },
              { key: "TIMETABLE", label: "Weekly Schedule", icon: CalendarDays },
            ] as const
          ).map((item) => {
            const active = tab === item.key;
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all whitespace-nowrap ${
                  active
                    ? "bg-brand-600 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-900"
                }`}
              >
                <Icon size={15} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Class Analytics & Overview */}
        {tab === "OVERVIEW" && (
          <div className="p-5 space-y-6">
            {/* Top Cards: Subject Allocation and Delivery Health */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <GraduationCap size={18} className="text-brand-600" />
                  <span>Academic Subject Assignment</span>
                </h3>
                <dl className="mt-4 grid grid-cols-[140px_1fr] gap-y-3 text-xs">
                  <dt className="font-semibold text-slate-500">Class & Section</dt>
                  <dd className="font-bold text-slate-900">{group}</dd>
                  <dt className="font-semibold text-slate-500">Subject Name</dt>
                  <dd className="font-bold text-slate-900">{currentAssignment.subjectName}</dd>
                  <dt className="font-semibold text-slate-500">Component</dt>
                  <dd className="font-bold text-slate-900">
                    {readable(currentAssignment.componentType || "Theory")}
                  </dd>
                  <dt className="font-semibold text-slate-500">Campus Unit</dt>
                  <dd className="font-bold text-slate-900">{currentAssignment.campusName}</dd>
                  <dt className="font-semibold text-slate-500">Academic Year</dt>
                  <dd className="font-bold text-slate-900">{workspace.academicYear.name}</dd>
                </dl>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp size={18} className="text-blue-950" />
                  <span>Assessment Performance</span>
                </h3>
                <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                  <p className="text-sm font-bold text-slate-700">
                    No published assessment summary
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Performance bands will appear after marks are reviewed and published for this
                    class.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles size={17} className="text-brand-600" />
                <span className="text-xs font-bold text-slate-900">Quick Class Workflows:</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setTab("STUDENTS")}
                  className="rounded-xl text-xs font-bold bg-white"
                >
                  <UsersRound className="mr-1.5 h-3.5 w-3.5 text-brand-600" /> Student Roster
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setTab("ATTENDANCE")}
                  className="rounded-xl text-xs font-bold bg-white"
                >
                  <CalendarCheck className="mr-1.5 h-3.5 w-3.5 text-blue-950" /> Roll Call Records
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setTab("GRADING")}
                  className="rounded-xl text-xs font-bold bg-white"
                >
                  <Award className="mr-1.5 h-3.5 w-3.5 text-blue-600" /> Results Register
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setTab("RESOURCES")}
                  className="rounded-xl text-xs font-bold bg-white"
                >
                  <FolderOpen className="mr-1.5 h-3.5 w-3.5 text-amber-600" /> Study Materials
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Students Directory */}
        {tab === "STUDENTS" && (
          <div>
            <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative max-w-md flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search student by name, roll no., or registration no..."
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-3 text-xs font-semibold outline-none focus:border-brand-500 focus:bg-white transition-all"
                />
              </div>
              <Button
                variant="outline"
                onClick={exportStudents}
                disabled={!filteredStudents.length}
                className="rounded-xl text-xs font-bold shadow-2xs"
              >
                <Download className="mr-2 h-4 w-4" />
                Export Student Roster ({filteredStudents.length})
              </Button>
            </div>

            {filteredStudents.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-[800px] w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-600 uppercase">
                      <th className="px-4 py-3.5">Roll No.</th>
                      <th className="px-4 py-3.5">Student Name</th>
                      <th className="px-4 py-3.5">Registration No.</th>
                      <th className="px-4 py-3.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.map((student) => (
                      <tr
                        key={student.studentId}
                        className="hover:bg-slate-50/60 transition-colors"
                      >
                        <td className="px-4 py-3.5 font-bold text-slate-900">
                          {student.rollNumber ?? "Not assigned"}
                        </td>
                        <td className="px-4 py-3.5 font-bold text-slate-950">
                          <div className="flex items-center gap-2.5">
                            <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-50 text-brand-700 text-[10px] font-extrabold border border-brand-100">
                              {student.studentName.slice(0, 2).toUpperCase()}
                            </span>
                            <span>{student.studentName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-slate-500">
                          {student.registrationNumber || "-"}
                        </td>
                        <td className="px-4 py-3.5">
                          <WorkspaceStatus
                            tone={student.status === "ACTIVE" ? "success" : "warning"}
                          >
                            {readable(student.status)}
                          </WorkspaceStatus>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 px-4 text-center">
                <UsersRound size={36} className="mx-auto text-slate-300 mb-2" />
                <h3 className="text-sm font-bold text-slate-800">
                  No student enrollment records yet
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Students enrolled in {group} will appear here once the section roster is
                  populated.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Attendance History & Records */}
        {tab === "ATTENDANCE" && (
          <div className="p-5 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Class Attendance Summary</h3>
                <p className="text-xs text-slate-500 font-medium">
                  Recent roll call sessions recorded for {group} in {currentAssignment.subjectName}.
                </p>
              </div>
              <Button
                onClick={() => navigate(contextualPath("/teacher/attendance"))}
                className="rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 shadow-2xs"
              >
                <CalendarCheck className="mr-1.5 h-4 w-4" /> Open Roll-Call Register
              </Button>
            </div>

            <EmptyState
              title="No attendance summary available"
              description="Use the roll-call register to record attendance. Persisted class summaries will appear here when available."
            />
          </div>
        )}

        {/* Tab 4: Grading & Results */}
        {tab === "GRADING" && (
          <div className="p-5 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Exam & Assessment Results</h3>
                <p className="text-xs text-slate-500 font-medium">
                  Configured assessments and recorded marks for {currentAssignment.subjectName}.
                </p>
              </div>
              <Button
                onClick={() => navigate(contextualPath("/teacher/marks-entry"))}
                className="rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 shadow-2xs"
              >
                <Award className="mr-1.5 h-4 w-4" /> Enter / Update Exam Marks
              </Button>
            </div>

            <EmptyState
              title="No published marks summary available"
              description="Use Marks Register to enter assessment marks. Reviewed and published summaries will appear here."
            />
          </div>
        )}

        {/* Tab 5: Study Resources & Digital Materials */}
        {tab === "RESOURCES" && (
          <div className="p-5 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Study Materials & Notes</h3>
                <p className="text-xs text-slate-500 font-medium">
                  Digital notes, homework assignments, and reference files shared with {group}.
                </p>
              </div>
              <Button
                onClick={() => navigate(contextualPath("/teacher/teaching-resources"))}
                className="rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 shadow-2xs"
              >
                <Upload className="mr-1.5 h-4 w-4" /> Upload Study Material
              </Button>
            </div>

            <EmptyState
              title="No teaching resources linked"
              description="Upload and assign resources from Teaching Resources. Linked files for this class will appear here."
            />
          </div>
        )}

        {/* Tab 6: Timetable */}
        {tab === "TIMETABLE" && (
          <div className="divide-y divide-slate-100 p-2">
            {days.map((day) => {
              const entries = classTimetableEntries.filter((entry) => entry.dayOfWeek === day);
              return (
                <div
                  key={day}
                  className="grid gap-3 p-4 sm:grid-cols-[140px_1fr] items-start hover:bg-slate-50/50 rounded-xl transition-colors"
                >
                  <strong className="text-xs font-bold text-slate-900">{readable(day)}</strong>
                  <div className="space-y-2">
                    {entries.length ? (
                      entries.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs"
                        >
                          <div className="flex items-center gap-3">
                            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-700 text-xs font-extrabold">
                              <Clock size={15} />
                            </span>
                            <div>
                              <strong className="block text-xs font-bold text-slate-900">
                                {entry.startTime} - {entry.endTime}
                              </strong>
                              <span className="text-[11px] font-semibold text-brand-600">
                                {entry.subjectName} · {readable(entry.componentType || "Theory")}
                              </span>
                            </div>
                          </div>
                          <WorkspaceStatus
                            tone={entry.state === "SUBSTITUTION" ? "warning" : "success"}
                          >
                            {readable(entry.state)}
                          </WorkspaceStatus>
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic">
                        No assigned period on this day
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </WorkspaceSurface>
    </div>
  );
}

import { ArrowLeft, List, Table2 } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { DepartmentTimetableGrid } from "./department-timetable-grid";
import { DepartmentOverview } from "./department-overview";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ErrorState, LoadingState } from "../../../shared/ui/page-state";
import { formatClockTime } from "../../../shared/lib/time-format";
import type { TeacherPageDefinition } from "../../teacher-workspace/model/teacher-workspace.types";
import { useTeacherWorkspace } from "../../teacher-workspace/model/teacher-workspace-context";
import { ModernSelect } from "../../../shared/ui/select";
import {
  WorkspaceDataTable,
  WorkspaceDetails,
  WorkspacePageHeader,
  WorkspaceStatus,
  WorkspaceSurface,
  type WorkspaceTableColumn,
} from "../../teacher-workspace/ui/teacher-workspace-primitives";
import {
  getTeacherCoordinationWorkspace,
  getTeacherDepartmentWorkspace,
  getTeacherLeadershipWorkspace,
} from "../api/teacher-department.api";
import type {
  DepartmentFaculty,
  TeacherDepartmentWorkspace,
} from "../model/teacher-department.types";

interface DepartmentRow {
  id: string;
  facultyId?: string;
  facultyName?: string;
  facultyStatus?: string;
  loginStatus?: string;
  email?: string;
  phoneNumber?: string;
  department?: string;
  designation?: string;
  subjects?: string;
  classes?: string;
  required?: number;
  scheduled?: number;
  record?: string;
  scope?: string;
  owner?: string;
  allocation?: string;
  status?: string;
  action?: string;
  className?: string;
  sectionName?: string;
  subjectCoverage?: string;
  timetableStatus?: string;
  attendanceStatus?: string;
  attendanceSessions?: number;
  marksStatus?: string;
  marksPending?: number;
  timetableEntries?: number;
  conflicts?: number;
  deficit?: number;
}

type FacultyDetailTab = "PROFILE" | "WORKLOAD" | "COUNSELLING";
type FacultyScheduleView = "TABLE" | "LIST";

const teachingDays = [
  ["MONDAY", "Monday"],
  ["TUESDAY", "Tuesday"],
  ["WEDNESDAY", "Wednesday"],
  ["THURSDAY", "Thursday"],
  ["FRIDAY", "Friday"],
  ["SATURDAY", "Saturday"],
] as const;

const facultyPageIds = new Set(["dept_faculty", "coord_allocation", "leadership_faculty"]);
const academicOverviewPageIds = new Set(["academic_overview"]);
const completionPageIds = new Set([
  "coord_attendance",
  "coord_marks",
  "attendance_timetable_mon",
  "dept_reports",
  "coord_reports",
  "leadership_reports",
]);

const today = () => new Date().toISOString().slice(0, 10);

export function TeacherDepartmentPage({ page }: { page: TeacherPageDefinition }) {
  const { workspace, workspaceLoading, workspaceError } = useTeacherWorkspace();
  const [data, setData] = useState<TeacherDepartmentWorkspace | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const responsibilityId = searchParams.get("scope") ?? "";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected Section for Timetable View
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const selectedFacultyId = searchParams.get("faculty");
  const requestedTab = searchParams.get("tab");
  const facultyDetailTab: FacultyDetailTab =
    requestedTab === "WORKLOAD" || requestedTab === "COUNSELLING" ? requestedTab : "PROFILE";
  const updateFacultyLocation = (
    facultyId: string | null,
    tab: FacultyDetailTab = "PROFILE",
    replace = false,
  ) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (facultyId) {
          next.set("faculty", facultyId);
          next.set("tab", tab);
        } else {
          next.delete("faculty");
          next.delete("tab");
        }
        return next;
      },
      { replace },
    );
  };
  const isFacultyPage = facultyPageIds.has(page.id);
  const isOverviewPage = ["dept_overview", "coord_overview", "leadership_dashboard"].includes(
    page.id,
  );

  const load = useCallback(async () => {
    if (!workspace) return;
    setLoading(true);
    setError(null);
    try {
      const leadership = [
        "leadership_dashboard",
        "academic_overview",
        "leadership_faculty",
        "attendance_timetable_mon",
        "leadership_reports",
      ].includes(page.id);
      const loader = leadership
        ? getTeacherLeadershipWorkspace
        : page.id.startsWith("coord_")
          ? getTeacherCoordinationWorkspace
          : getTeacherDepartmentWorkspace;
      const result = await loader({
        academicYearId: workspace.academicYear.id,
        ...(responsibilityId
          ? leadership
            ? { campusId: responsibilityId.replace(/^leadership:/, "") }
            : { responsibilityId }
          : {}),
        date: today(),
      });
      setData(result);
      setSelectedSectionId((current) =>
        result.timetables.some((item) => item.sectionId === current)
          ? current
          : (result.timetables[0]?.sectionId ?? ""),
      );
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to load department workspace");
    } finally {
      setLoading(false);
    }
  }, [page.id, responsibilityId, workspace]);

  useEffect(() => {
    void load();
  }, [load]);

  // Active section for timetable grid
  const requestedSectionId = searchParams.get("section") ?? selectedSectionId;
  const activeSectionTimetable = useMemo(() => {
    if (!data?.timetables.length) return null;
    const candidates =
      searchParams.get("filter") === "unpublished"
        ? data.timetables.filter((item) => item.status !== "PUBLISHED")
        : data.timetables;
    return candidates.find((t) => t.sectionId === requestedSectionId) ?? candidates[0] ?? null;
  }, [data?.timetables, requestedSectionId, searchParams]);

  const allRows = useMemo<DepartmentRow[]>(() => {
    if (!data) return [];
    if (isFacultyPage) {
      return data.faculty.map((item) => ({
        id: item.employeeId,
        facultyId: item.employeeCode,
        facultyName: item.fullName,
        facultyStatus: item.status,
        loginStatus: item.loginStatus,
        email: item.email ?? "Not recorded",
        phoneNumber: item.phone ?? "Not recorded",
        department: item.department ?? "Not assigned",
        designation: item.designation ?? "Not assigned",
      }));
    }
    if (page.id === "dept_coverage" || page.id === "coord_coverage") {
      return data.coverage.map((item) => ({
        id: item.subjectOfferingId,
        record: item.subjectName,
        scope: [item.className, item.sectionName].filter(Boolean).join(" · "),
        owner: item.teacherNames.join(", ") || "Unassigned",
        allocation: `${item.scheduledPeriods} / ${item.requiredPeriods} periods`,
        status:
          item.status === "READY"
            ? "Ready"
            : item.status === "UNASSIGNED"
              ? "Unassigned"
              : "Incomplete",
        action: item.status === "READY" ? "Allocation Ready" : "Assign Faculty",
        deficit: Math.max(0, item.requiredPeriods - item.scheduledPeriods),
      }));
    }
    if (page.id === "dept_workload") {
      return data.faculty.map((item) => ({
        id: item.employeeId,
        facultyId: item.employeeCode,
        facultyName: item.fullName,
        subjects:
          [...new Set(item.allocations.map((allocation) => allocation.subjectName))].join(", ") ||
          "Not assigned",
        classes:
          [
            ...new Set(
              item.allocations.map((allocation) =>
                [allocation.className, allocation.sectionName].filter(Boolean).join(" - "),
              ),
            ),
          ].join(", ") || "Not assigned",
        required: item.requiredPeriods,
        scheduled: item.scheduledPeriods,
        status:
          item.scheduledPeriods > item.requiredPeriods
            ? "Overload"
            : item.scheduledPeriods === item.requiredPeriods
              ? "Balanced"
              : "Capacity Available",
        action:
          item.scheduledPeriods < item.requiredPeriods
            ? `${item.requiredPeriods - item.scheduledPeriods} periods free`
            : "Normal load",
      }));
    }
    if (academicOverviewPageIds.has(page.id) || completionPageIds.has(page.id)) {
      return data.completion.map((item) => {
        const sectionCoverage = data.coverage.filter(
          (coverage) =>
            coverage.className === item.className && coverage.sectionName === item.sectionName,
        );
        const readyOfferings = sectionCoverage.filter(
          (coverage) => coverage.status === "READY",
        ).length;
        const timetable = data.timetables.find(
          (candidate) => candidate.sectionId === item.sectionId,
        );
        return {
          id: item.sectionId,
          className: item.className,
          sectionName: item.sectionName,
          subjectCoverage: `${readyOfferings} / ${sectionCoverage.length} ready`,
          timetableStatus: timetable?.status.replaceAll("_", " ") ?? "NOT CREATED",
          attendanceStatus: item.attendanceStatus,
          attendanceSessions: item.submittedAttendanceSessions,
          marksStatus: `${item.marksSubmitted} submitted · ${item.marksPending} pending`,
          marksPending: item.marksPending,
          timetableEntries: timetable?.entryCount ?? 0,
          conflicts: timetable?.conflictCount ?? 0,
        };
      });
    }
    return data.issues.map((item, index) => ({
      id: `${item.code}-${index}`,
      record: item.title,
      scope: item.scope,
      owner: item.code.replaceAll("_", " "),
      allocation: item.action,
      status: item.severity === "ERROR" ? "Action needed" : "Review",
      action: item.action,
    }));
  }, [data, isFacultyPage, page.id]);

  const operationalFilter = searchParams.get("filter") ?? "";
  const rows = useMemo(() => {
    let filteredRows = allRows;
    if (operationalFilter === "attention")
      filteredRows = allRows.filter(
        (row) => !["Ready", "Complete", "Balanced"].includes(row.status ?? ""),
      );
    if (operationalFilter === "shortfall")
      filteredRows = allRows.filter((row) => (row.deficit ?? 0) > 0);
    if (operationalFilter === "pending")
      filteredRows = allRows.filter(
        (row) => row.attendanceStatus !== "SUBMITTED" || (row.marksPending ?? 0) > 0,
      );
    if (operationalFilter === "unpublished")
      filteredRows = allRows.filter(
        (row) => row.timetableStatus !== "PUBLISHED" || (row.conflicts ?? 0) > 0,
      );
    const requestedSection = searchParams.get("section");
    return requestedSection && completionPageIds.has(page.id)
      ? filteredRows.filter((row) => row.id === requestedSection)
      : filteredRows;
  }, [allRows, operationalFilter, page.id, searchParams]);

  const columns = useMemo<WorkspaceTableColumn<DepartmentRow>[]>(() => {
    if (isFacultyPage) {
      return [
        { key: "facultyId", label: "Faculty ID" },
        { key: "facultyName", label: "Faculty Name" },
        {
          key: "facultyStatus",
          label: "Status",
          render: (row) => (
            <WorkspaceStatus
              tone={
                row.facultyStatus === "ACTIVE"
                  ? "success"
                  : row.facultyStatus === "INACTIVE"
                    ? "warning"
                    : "neutral"
              }
            >
              {(row.facultyStatus ?? "UNKNOWN").replaceAll("_", " ")}
            </WorkspaceStatus>
          ),
        },
        { key: "email", label: "Email" },
        {
          key: "loginStatus",
          label: "Portal Access",
          render: (row) => (
            <WorkspaceStatus
              tone={
                row.loginStatus === "ACTIVE"
                  ? "success"
                  : row.loginStatus === "FAILED"
                    ? "danger"
                    : row.loginStatus === "INVITED"
                      ? "warning"
                      : "neutral"
              }
            >
              {row.loginStatus === "NONE"
                ? "No account"
                : (row.loginStatus ?? "UNKNOWN").replaceAll("_", " ")}
            </WorkspaceStatus>
          ),
        },
        { key: "phoneNumber", label: "Phone Number" },
        { key: "department", label: "Department" },
        { key: "designation", label: "Designation" },
      ];
    }
    if (page.id === "dept_workload") {
      return [
        { key: "facultyId", label: "Faculty ID" },
        { key: "facultyName", label: "Faculty Name" },
        { key: "subjects", label: "Subjects" },
        { key: "classes", label: "Classes & Sections" },
        { key: "required", label: "Required Periods" },
        { key: "scheduled", label: "Scheduled Periods" },
        { key: "status", label: "Allocation Status" },
      ];
    }
    if (academicOverviewPageIds.has(page.id)) {
      return [
        { key: "className", label: "Class / Program" },
        { key: "sectionName", label: "Section / Batch" },
        { key: "subjectCoverage", label: "Subject Coverage" },
        {
          key: "timetableStatus",
          label: "Timetable",
          render: (row) => (
            <WorkspaceStatus tone={row.timetableStatus === "PUBLISHED" ? "success" : "warning"}>
              {row.timetableStatus ?? "NOT CREATED"}
            </WorkspaceStatus>
          ),
        },
        {
          key: "attendanceStatus",
          label: "Attendance Today",
          render: (row) => (
            <WorkspaceStatus tone={row.attendanceStatus === "SUBMITTED" ? "success" : "warning"}>
              {row.attendanceStatus ?? "PENDING"}
            </WorkspaceStatus>
          ),
        },
        { key: "marksStatus", label: "Marks Completion" },
      ];
    }
    if (completionPageIds.has(page.id)) {
      return [
        { key: "className", label: "Class / Program" },
        { key: "sectionName", label: "Section / Batch" },
        {
          key: "attendanceStatus",
          label: "Attendance Today",
          render: (row) => (
            <WorkspaceStatus tone={row.attendanceStatus === "SUBMITTED" ? "success" : "warning"}>
              {row.attendanceStatus ?? "PENDING"}
            </WorkspaceStatus>
          ),
        },
        { key: "attendanceSessions", label: "Submitted Sessions" },
        { key: "marksStatus", label: "Marks Completion" },
        { key: "timetableStatus", label: "Timetable" },
        { key: "timetableEntries", label: "Periods" },
        { key: "conflicts", label: "Conflicts" },
      ];
    }
    return [
      { key: "record", label: "Record / Subject" },
      { key: "scope", label: "Academic Group" },
      { key: "owner", label: "Assigned Faculty" },
      { key: "allocation", label: "Period Allocation" },
      {
        key: "status",
        label: "Status",
        render: (row) => (
          <WorkspaceStatus
            tone={
              ["Complete", "Ready", "PUBLISHED", "Balanced"].includes(row.status ?? "")
                ? "success"
                : ["Unassigned", "Action needed", "Overload"].includes(row.status ?? "")
                  ? "danger"
                  : "warning"
            }
          >
            {row.status ?? "Unknown"}
          </WorkspaceStatus>
        ),
      },
      { key: "action", label: "Next Action" },
    ];
  }, [isFacultyPage, page.id]);

  const selectedFaculty = useMemo(
    () => data?.faculty.find((faculty) => faculty.employeeId === selectedFacultyId) ?? null,
    [data?.faculty, selectedFacultyId],
  );

  if (workspaceLoading && !workspace) return <LoadingState label="Loading department access" />;
  if (workspaceError) return <ErrorState message={workspaceError} />;
  if (error && !data) return <ErrorState message={error} />;
  if (!workspace)
    return (
      <ErrorState message="The authenticated user is not linked to an active teaching employee." />
    );

  const scopeOptions = (data?.availableScopes ?? []).map((item) => ({
    label: `${item.programName ?? "Academic Unit"} · ${item.campusName}`,
    value: item.responsibilityId,
  }));

  const sectionOptions = (data?.timetables ?? []).map((item) => ({
    label: `${item.className} - ${item.sectionName} (${item.entryCount} periods)`,
    value: item.sectionId,
  }));
  const visibleSectionOptions =
    operationalFilter === "unpublished"
      ? sectionOptions.filter((option) =>
          data?.timetables.some(
            (item) => item.sectionId === option.value && item.status !== "PUBLISHED",
          ),
        )
      : sectionOptions;

  return (
    <>
      {selectedFaculty ? (
        <FacultyDetailsWorkspace
          faculty={selectedFaculty}
          academicYearName={data?.academicYear.name ?? workspace.academicYear.name}
          tab={facultyDetailTab}
          onTabChange={(tab) => updateFacultyLocation(selectedFacultyId, tab, true)}
          onClose={() => updateFacultyLocation(null)}
        />
      ) : null}
      <div
        hidden={Boolean(selectedFaculty)}
        className="mx-auto w-full max-w-[1600px] space-y-5 p-4 sm:p-5 lg:p-6"
      >
        {selectedFacultyId && !selectedFaculty && !loading && data ? (
          <div
            role="status"
            className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
          >
            This faculty record is unavailable in the selected scope.
            <button
              type="button"
              className="ml-2 min-h-11 underline"
              onClick={() => updateFacultyLocation(null)}
            >
              Return to records
            </button>
          </div>
        ) : null}
        {/* Header */}
        <WorkspacePageHeader
          title={page.title}
          description={page.description}
          actions={
            scopeOptions.length > 1 ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 hidden sm:inline">Scope:</span>
                <ModernSelect
                  value={responsibilityId || data?.scope.responsibilityId || ""}
                  onValueChange={(val) =>
                    setSearchParams((current) => {
                      const next = new URLSearchParams(current);
                      next.set("scope", val);
                      next.delete("faculty");
                      next.delete("tab");
                      return next;
                    })
                  }
                  className="min-w-[220px]"
                  options={scopeOptions}
                />
              </div>
            ) : undefined
          }
        />

        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700"
          >
            {error}
          </div>
        ) : null}

        {loading && !data ? (
          <LoadingState label="Loading department records" />
        ) : data ? (
          isOverviewPage ? (
            <DepartmentOverview data={data} pageId={page.id} />
          ) : (
            <>
              <dl className="grid grid-cols-2 gap-x-5 gap-y-3 border-y border-slate-200 py-3 lg:grid-cols-4">
                {[
                  ["Faculty", String(data.summary.faculty)],
                  [
                    "Class sections",
                    `${data.summary.sections} across ${data.summary.classes} classes`,
                  ],
                  [
                    "Teaching coverage",
                    `${data.coverage.filter((item) => item.status === "READY").length} / ${data.summary.subjectOfferings} ready`,
                  ],
                  ["Published timetables", `${data.summary.publishedTimetables} sections`],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-sm text-slate-500">{label}</dt>
                    <dd className="mt-1 text-base font-semibold text-slate-900">{value}</dd>
                  </div>
                ))}
              </dl>

              {operationalFilter ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-900">
                  <span>Filtered view: {operationalFilter.replaceAll("_", " ")}</span>
                  <button
                    type="button"
                    className="min-h-10 underline"
                    onClick={() =>
                      setSearchParams((current) => {
                        const next = new URLSearchParams(current);
                        next.delete("filter");
                        next.delete("section");
                        return next;
                      })
                    }
                  >
                    Clear filter
                  </button>
                </div>
              ) : null}

              {/* ======================================================= */}
              {/* SPECIAL VIEW: DEPARTMENT TIMETABLES (PAGE.ID === dept_timetable) */}
              {/* ======================================================= */}
              {page.id === "dept_timetable" || page.id === "coord_timetable" ? (
                <div className="space-y-4">
                  {/* Section Selector Toolbar */}
                  <WorkspaceSurface>
                    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3 flex-1 max-w-lg">
                        <span className="text-xs font-bold text-slate-700 whitespace-nowrap">
                          View Class Timetable:
                        </span>
                        <ModernSelect
                          value={requestedSectionId || visibleSectionOptions[0]?.value || ""}
                          disabled={!visibleSectionOptions.length}
                          onValueChange={(val) => {
                            setSelectedSectionId(val);
                            setSearchParams(
                              (current) => {
                                const next = new URLSearchParams(current);
                                next.set("section", val);
                                return next;
                              },
                              { replace: true },
                            );
                          }}
                          className="w-full"
                          options={visibleSectionOptions}
                        />
                      </div>

                      {activeSectionTimetable && (
                        <div className="flex items-center gap-2">
                          <WorkspaceStatus
                            tone={
                              activeSectionTimetable.status === "PUBLISHED" ? "success" : "warning"
                            }
                          >
                            {activeSectionTimetable.status.replaceAll("_", " ")}
                          </WorkspaceStatus>
                          {activeSectionTimetable.conflictCount > 0 && (
                            <span className="inline-block rounded-lg bg-rose-100 px-2 py-1 text-xs font-bold text-rose-700">
                              {activeSectionTimetable.conflictCount} Conflicts
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </WorkspaceSurface>

                  <DepartmentTimetableGrid timetable={activeSectionTimetable ?? null} />
                </div>
              ) : (
                /* Standard Table View for Overview, Faculty, Coverage, Workload */
                <WorkspaceSurface>
                  <WorkspaceDataTable
                    rows={rows}
                    columns={columns}
                    downloadName={page.slug}
                    {...(isFacultyPage || page.id === "dept_workload"
                      ? {
                          onOpen: (row: DepartmentRow) => {
                            updateFacultyLocation(
                              row.id,
                              page.id === "dept_workload" ? "WORKLOAD" : "PROFILE",
                            );
                          },
                        }
                      : {})}
                  />
                </WorkspaceSurface>
              )}
            </>
          )
        ) : null}
      </div>
    </>
  );
}

function FacultyDetailsWorkspace({
  faculty,
  academicYearName,
  tab,
  onTabChange,
  onClose,
}: {
  faculty: DepartmentFaculty;
  academicYearName: string;
  tab: FacultyDetailTab;
  onTabChange: (tab: FacultyDetailTab) => void;
  onClose: () => void;
}) {
  const [scheduleView, setScheduleView] = useState<FacultyScheduleView>("TABLE");
  const workloadBalance = faculty.requiredPeriods - faculty.scheduledPeriods;
  const workloadState =
    workloadBalance < 0
      ? `${Math.abs(workloadBalance)} periods over allocation`
      : workloadBalance > 0
        ? `${workloadBalance} periods available`
        : "Allocation balanced";
  const teacherSchedule = faculty.schedule;
  const scheduleSlots = useMemo(() => {
    const unique = new Map<string, { startTime: string; endTime: string }>();
    for (const lesson of teacherSchedule) {
      unique.set(`${lesson.startTime}|${lesson.endTime}`, {
        startTime: lesson.startTime,
        endTime: lesson.endTime,
      });
    }
    return [...unique.values()].sort((left, right) =>
      left.startTime.localeCompare(right.startTime),
    );
  }, [teacherSchedule]);

  return (
    <main
      data-testid="faculty-details-workspace"
      className="mx-auto w-full max-w-[1600px] space-y-5 p-4 sm:p-5 lg:p-6"
    >
      <button
        type="button"
        onClick={onClose}
        className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 hover:border-slate-300 hover:bg-slate-50"
      >
        <ArrowLeft size={15} aria-hidden="true" /> Back to faculty list
      </button>

      <WorkspaceSurface className="overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50/70 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Faculty workspace · {academicYearName}
            </span>
            <h1 className="mt-1 text-2xl font-extrabold text-slate-950">{faculty.fullName}</h1>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              {faculty.employeeCode} ·{" "}
              {[faculty.designation, faculty.department].filter(Boolean).join(" · ") ||
                "Faculty details"}
            </p>
          </div>
          <WorkspaceStatus tone={faculty.status === "ACTIVE" ? "success" : "warning"}>
            {faculty.status.replaceAll("_", " ")}
          </WorkspaceStatus>
        </div>

        <dl className="grid border-b border-slate-200 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Teaching groups", faculty.assignmentCount],
            ["Required periods", faculty.requiredPeriods],
            ["Scheduled periods", faculty.scheduledPeriods],
            ["Assigned mentees", faculty.menteeCount],
          ].map(([label, value]) => (
            <div key={label} className="border-b border-slate-100 p-4 sm:border-r lg:border-b-0">
              <dt className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
                {label}
              </dt>
              <dd className="mt-1 text-xl font-extrabold text-slate-950">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="p-4 sm:p-5">
          <div
            role="tablist"
            aria-label="Faculty details"
            className="flex gap-1 border-b border-slate-200"
          >
            {(["PROFILE", "WORKLOAD", "COUNSELLING"] as const).map((item) => (
              <button
                type="button"
                key={item}
                role="tab"
                id={`faculty-tab-${item}`}
                aria-controls="faculty-tab-panel"
                tabIndex={tab === item ? 0 : -1}
                aria-selected={tab === item}
                onKeyDown={(event) => {
                  const tabs: FacultyDetailTab[] = ["PROFILE", "WORKLOAD", "COUNSELLING"];
                  const index = tabs.indexOf(item);
                  const nextIndex =
                    event.key === "ArrowRight"
                      ? (index + 1) % tabs.length
                      : event.key === "ArrowLeft"
                        ? (index + tabs.length - 1) % tabs.length
                        : event.key === "Home"
                          ? 0
                          : event.key === "End"
                            ? tabs.length - 1
                            : -1;
                  if (nextIndex < 0) return;
                  event.preventDefault();
                  onTabChange(tabs[nextIndex]!);
                  document.getElementById(`faculty-tab-${tabs[nextIndex]}`)?.focus();
                }}
                onClick={() => onTabChange(item)}
                className={`border-b-2 px-4 py-3 text-xs font-extrabold transition-colors ${
                  tab === item
                    ? "border-brand-700 text-brand-800"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
              >
                {item[0] + item.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <div
            id="faculty-tab-panel"
            role="tabpanel"
            aria-labelledby={`faculty-tab-${tab}`}
            tabIndex={0}
            className="pt-5"
          >
            {tab === "PROFILE" ? (
              <WorkspaceDetails
                rows={[
                  ["Faculty ID", faculty.employeeCode],
                  ["Faculty Name", faculty.fullName],
                  ["Status", faculty.status.replaceAll("_", " ")],
                  ["Email", faculty.email ?? "Not recorded"],
                  ["Phone Number", faculty.phone ?? "Not recorded"],
                  ["Department", faculty.department ?? "Not assigned"],
                  ["Designation", faculty.designation ?? "Not assigned"],
                  ["Staff Type", faculty.staffType?.replaceAll("_", " ") ?? "Not recorded"],
                  [
                    "Employment Type",
                    faculty.employmentType?.replaceAll("_", " ") ?? "Not recorded",
                  ],
                  [
                    "Joining Date",
                    faculty.joiningDate
                      ? new Date(faculty.joiningDate).toLocaleDateString("en-IN")
                      : "Not recorded",
                  ],
                ]}
              />
            ) : null}

            {tab === "WORKLOAD" ? (
              <div className="space-y-4">
                <WorkspaceDetails
                  rows={[
                    ["Teaching groups", faculty.assignmentCount],
                    ["Required weekly periods", faculty.requiredPeriods],
                    ["Scheduled weekly periods", faculty.scheduledPeriods],
                    ["Allocation state", workloadState],
                  ]}
                />
                <div className="overflow-x-auto rounded-md border border-slate-200">
                  <table className="w-full min-w-[620px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        {[
                          "Subject",
                          "Class",
                          "Section",
                          "Required Periods",
                          "Scheduled Periods",
                          "Difference",
                        ].map((label) => (
                          <th
                            key={label}
                            className="px-3 py-3 text-[10px] font-extrabold uppercase text-slate-500"
                          >
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {faculty.allocations.length ? (
                        faculty.allocations.map((allocation) => (
                          <tr
                            key={allocation.teachingAssignmentId}
                            className="border-b border-slate-100 last:border-0"
                          >
                            <td className="px-3 py-3 text-xs font-bold text-slate-900">
                              {allocation.subjectName}
                            </td>
                            <td className="px-3 py-3 text-xs font-semibold text-slate-700">
                              {allocation.className}
                            </td>
                            <td className="px-3 py-3 text-xs font-semibold text-slate-700">
                              {allocation.sectionName ?? "Not assigned"}
                            </td>
                            <td className="px-3 py-3 text-xs font-semibold text-slate-700">
                              {allocation.requiredPeriods}
                            </td>
                            <td className="px-3 py-3 text-xs font-semibold text-slate-700">
                              {allocation.scheduledPeriods}
                            </td>
                            <td className="px-3 py-3 text-xs font-semibold text-slate-700">
                              {allocation.scheduledPeriods === allocation.requiredPeriods
                                ? "Balanced"
                                : allocation.scheduledPeriods < allocation.requiredPeriods
                                  ? `${allocation.requiredPeriods - allocation.scheduledPeriods} short`
                                  : `${allocation.scheduledPeriods - allocation.requiredPeriods} over`}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 py-8 text-center text-xs font-semibold text-slate-500"
                          >
                            No active teaching allocation in this academic scope.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Teacher Timetable</h3>
                      <p className="mt-0.5 text-xs font-medium text-slate-500">
                        {teacherSchedule.length} published teaching periods
                      </p>
                    </div>
                    <div className="flex rounded-md border border-slate-200 bg-slate-50 p-0.5">
                      {(
                        [
                          ["TABLE", "Table", Table2],
                          ["LIST", "List", List],
                        ] as const
                      ).map(([value, label, Icon]) => (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={scheduleView === value}
                          onClick={() => setScheduleView(value)}
                          className={`inline-flex min-h-9 items-center gap-1.5 rounded px-3 text-xs font-bold ${
                            scheduleView === value
                              ? "bg-white text-brand-800 shadow-xs"
                              : "text-slate-500 hover:text-slate-900"
                          }`}
                        >
                          <Icon size={14} aria-hidden="true" /> {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {scheduleView === "TABLE" ? (
                    <div className="max-h-[520px] overflow-auto rounded-md border border-slate-200">
                      <table className="w-full min-w-[1050px] table-fixed border-collapse text-left text-xs">
                        <thead className="sticky top-0 z-20">
                          <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-extrabold uppercase text-slate-600">
                            <th className="sticky left-0 z-30 w-28 border-r border-slate-200 bg-slate-50 px-3 py-3 text-center">
                              Time
                            </th>
                            {teachingDays.map(([day, label]) => (
                              <th
                                key={day}
                                className="border-r border-slate-200 px-3 py-3 text-center last:border-r-0"
                              >
                                {label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {scheduleSlots.map((slot) => (
                            <tr key={`${slot.startTime}-${slot.endTime}`}>
                              <th className="sticky left-0 z-10 border-r border-slate-200 bg-slate-50 px-2 py-3 text-center font-normal">
                                <strong className="block text-xs text-slate-950">
                                  {formatClockTime(slot.startTime)}
                                </strong>
                                <span className="text-[10px] text-slate-500">
                                  to {formatClockTime(slot.endTime)}
                                </span>
                              </th>
                              {teachingDays.map(([day]) => {
                                const lessons = teacherSchedule.filter(
                                  (lesson) =>
                                    lesson.dayOfWeek === day &&
                                    lesson.startTime === slot.startTime &&
                                    lesson.endTime === slot.endTime,
                                );
                                return (
                                  <td
                                    key={day}
                                    className="border-r border-slate-200 p-1.5 align-top last:border-r-0"
                                  >
                                    {lessons.map((lesson) => (
                                      <div
                                        key={lesson.id}
                                        className="min-h-20 rounded-md border border-brand-200 bg-brand-50/70 p-2"
                                      >
                                        <strong className="block leading-snug text-slate-950">
                                          {lesson.subjectName}
                                        </strong>
                                        <span className="mt-1 block text-[11px] font-semibold text-brand-800">
                                          {lesson.className} - {lesson.sectionName}
                                        </span>
                                        <span className="mt-1 block text-[10px] text-slate-500">
                                          {lesson.periodLabel}
                                        </span>
                                      </div>
                                    ))}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {!scheduleSlots.length ? (
                        <p className="px-4 py-10 text-center text-xs font-semibold text-slate-500">
                          No published lessons are assigned to this teacher.
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <div className="max-h-[520px] overflow-auto rounded-md border border-slate-200">
                      <table className="w-full min-w-[680px] border-collapse text-left text-xs">
                        <thead className="sticky top-0 bg-slate-50 text-slate-600">
                          <tr>
                            {["Day", "Time", "Period", "Subject", "Class & Section"].map(
                              (label) => (
                                <th key={label} className="px-3 py-2 font-bold">
                                  {label}
                                </th>
                              ),
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {teacherSchedule.length ? (
                            teacherSchedule.map((lesson) => (
                              <tr key={lesson.id} className="border-t border-slate-100">
                                <td className="px-3 py-2 font-semibold">
                                  {lesson.dayOfWeek[0] + lesson.dayOfWeek.slice(1).toLowerCase()}
                                </td>
                                <td className="px-3 py-2">
                                  {formatClockTime(lesson.startTime)} -{" "}
                                  {formatClockTime(lesson.endTime)}
                                </td>
                                <td className="px-3 py-2">{lesson.periodLabel}</td>
                                <td className="px-3 py-2 font-semibold text-slate-900">
                                  {lesson.subjectName}
                                </td>
                                <td className="px-3 py-2">
                                  {lesson.className} - {lesson.sectionName}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                                No published lessons are assigned to this teacher.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {tab === "COUNSELLING" ? (
              <div className="space-y-3">
                <WorkspaceDetails
                  rows={[
                    ["Assigned mentees", faculty.menteeCount],
                    [
                      "Mentor responsibility",
                      faculty.responsibilityTypes.includes("MENTOR") ? "Active" : "Not assigned",
                    ],
                  ]}
                />
                <p className="text-xs font-medium leading-5 text-slate-500">
                  Private counselling notes remain visible only to the assigned mentor. Academic
                  leadership sees assignment coverage, not confidential interaction content.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </WorkspaceSurface>
    </main>
  );
}

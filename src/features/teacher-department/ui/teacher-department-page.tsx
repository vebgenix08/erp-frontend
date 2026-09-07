import { AlertTriangle } from "lucide-react";
import { DepartmentTimetableGrid } from "./department-timetable-grid";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ErrorState, LoadingState } from "../../../shared/ui/page-state";
import type { TeacherPageDefinition } from "../../teacher-workspace/model/teacher-workspace.types";
import { useTeacherWorkspace } from "../../teacher-workspace/model/teacher-workspace-context";
import { ModernSelect } from "../../../shared/ui/select";
import {
  WorkspaceButton,
  WorkspaceDataTable,
  WorkspaceDetails,
  WorkspaceDialog,
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
}

type FacultyDetailTab = "PROFILE" | "WORKLOAD" | "COUNSELLING";

const facultyPageIds = new Set(["dept_faculty", "coord_allocation", "leadership_faculty"]);

const today = () => new Date().toISOString().slice(0, 10);

export function TeacherDepartmentPage({ page }: { page: TeacherPageDefinition }) {
  const { workspace, workspaceLoading, workspaceError } = useTeacherWorkspace();
  const [data, setData] = useState<TeacherDepartmentWorkspace | null>(null);
  const [responsibilityId, setResponsibilityId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected Section for Timetable View
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [selectedFacultyId, setSelectedFacultyId] = useState<string | null>(null);
  const [facultyDetailTab, setFacultyDetailTab] = useState<FacultyDetailTab>("PROFILE");
  const isFacultyPage = facultyPageIds.has(page.id);

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
  const activeSectionTimetable = useMemo(() => {
    if (!data?.timetables.length) return null;
    return data.timetables.find((t) => t.sectionId === selectedSectionId) ?? data.timetables[0];
  }, [data?.timetables, selectedSectionId]);

  const rows = useMemo<DepartmentRow[]>(() => {
    if (!data) return [];
    if (isFacultyPage) {
      return data.faculty.map((item) => ({
        id: item.employeeId,
        facultyId: item.employeeCode,
        facultyName: item.fullName,
        facultyStatus: item.status,
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
    if (page.id === "dept_overview") {
      return data.faculty.map((item) => ({
        id: item.employeeId,
        record: item.fullName,
        scope: [item.employeeCode, item.designation].filter(Boolean).join(" · "),
        owner: item.email ?? "No work email",
        allocation: `${item.scheduledPeriods} / ${item.requiredPeriods} weekly periods`,
        status: item.scheduledPeriods >= item.requiredPeriods ? "Complete" : "Review",
        action: item.responsibilityTypes.length
          ? item.responsibilityTypes.map((value) => value.replaceAll("_", " ")).join(", ")
          : "Teaching Assignment",
      }));
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

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 p-4 sm:p-5 lg:p-6">
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
                onValueChange={(val) => setResponsibilityId(val)}
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
        <>
          <dl className="grid grid-cols-2 gap-x-5 gap-y-3 border-y border-slate-200 py-3 lg:grid-cols-4">
            {[
              ["Faculty", String(data.summary.faculty)],
              ["Class sections", `${data.summary.sections} across ${data.summary.classes} classes`],
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
                      value={selectedSectionId || sectionOptions[0]?.value || ""}
                      disabled={!sectionOptions.length}
                      onValueChange={(val) => setSelectedSectionId(val)}
                      className="w-full"
                      options={sectionOptions}
                    />
                  </div>

                  {activeSectionTimetable && (
                    <div className="flex items-center gap-2">
                      <WorkspaceStatus
                        tone={activeSectionTimetable.status === "PUBLISHED" ? "success" : "warning"}
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
                        setFacultyDetailTab(page.id === "dept_workload" ? "WORKLOAD" : "PROFILE");
                        setSelectedFacultyId(row.id);
                      },
                    }
                  : {})}
              />
            </WorkspaceSurface>
          )}

          <FacultyDetailsDialog
            faculty={selectedFaculty}
            tab={facultyDetailTab}
            onTabChange={setFacultyDetailTab}
            onClose={() => setSelectedFacultyId(null)}
          />

          {/* Exceptions Box for Overview */}
          {page.id === "dept_overview" && data.issues.length > 0 && (
            <WorkspaceSurface>
              <div className="border-b border-slate-100 px-4 py-3">
                <h2 className="text-sm font-extrabold text-slate-900">
                  Priority Department Exceptions
                </h2>
              </div>
              <div className="grid gap-3 p-4 lg:grid-cols-2">
                {data.issues.slice(0, 4).map((item, index) => (
                  <div
                    key={`${item.code}-${index}`}
                    className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3"
                  >
                    <AlertTriangle size={17} className="mt-0.5 shrink-0 text-amber-700" />
                    <div>
                      <strong className="text-xs font-bold text-slate-900">{item.title}</strong>
                      <p className="mt-0.5 text-[11px] font-semibold text-slate-600">
                        {item.scope}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">{item.action}</p>
                    </div>
                  </div>
                ))}
              </div>
            </WorkspaceSurface>
          )}
        </>
      ) : null}
    </div>
  );
}

function FacultyDetailsDialog({
  faculty,
  tab,
  onTabChange,
  onClose,
}: {
  faculty: DepartmentFaculty | null;
  tab: FacultyDetailTab;
  onTabChange: (tab: FacultyDetailTab) => void;
  onClose: () => void;
}) {
  const workloadBalance = faculty ? faculty.requiredPeriods - faculty.scheduledPeriods : 0;
  const workloadState = !faculty
    ? "Not available"
    : workloadBalance < 0
      ? `${Math.abs(workloadBalance)} periods over allocation`
      : workloadBalance > 0
        ? `${workloadBalance} periods available`
        : "Allocation balanced";
  const teacherSchedule = faculty?.schedule ?? [];

  return (
    <WorkspaceDialog
      open={Boolean(faculty)}
      title={faculty ? faculty.fullName : "Faculty details"}
      onClose={onClose}
    >
      {faculty ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-slate-500">{faculty.employeeCode}</span>
              <p className="mt-1 text-sm font-semibold text-slate-700">
                {[faculty.designation, faculty.department].filter(Boolean).join(" · ") ||
                  "Faculty details"}
              </p>
            </div>
            <WorkspaceStatus tone={faculty.status === "ACTIVE" ? "success" : "warning"}>
              {faculty.status.replaceAll("_", " ")}
            </WorkspaceStatus>
          </div>

          <div
            role="tablist"
            aria-label="Faculty details"
            className="flex flex-wrap gap-1 border-b border-slate-200"
          >
            {(["PROFILE", "WORKLOAD", "COUNSELLING"] as const).map((item) => (
              <WorkspaceButton
                key={item}
                variant={tab === item ? "primary" : "secondary"}
                onClick={() => onTabChange(item)}
              >
                {item[0] + item.slice(1).toLowerCase()}
              </WorkspaceButton>
            ))}
          </div>

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
                ["Employment Type", faculty.employmentType?.replaceAll("_", " ") ?? "Not recorded"],
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
              <div>
                <h3 className="mb-2 text-sm font-bold text-slate-900">Teacher Timetable</h3>
                <div className="max-h-72 overflow-auto rounded-md border border-slate-200">
                  <table className="w-full min-w-[680px] border-collapse text-left text-xs">
                    <thead className="sticky top-0 bg-slate-50 text-slate-600">
                      <tr>
                        {["Day", "Time", "Period", "Subject", "Class & Section"].map((label) => (
                          <th key={label} className="px-3 py-2 font-bold">
                            {label}
                          </th>
                        ))}
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
                              {lesson.startTime} - {lesson.endTime}
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
      ) : null}
    </WorkspaceDialog>
  );
}

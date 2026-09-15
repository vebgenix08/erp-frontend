import { Link } from "react-router-dom";
import type { TeacherDepartmentWorkspace } from "../model/teacher-department.types";
import {
  WorkspaceSurface,
  WorkspaceStatus,
} from "../../teacher-workspace/ui/teacher-workspace-primitives";

export function DepartmentOverview({
  data,
  pageId,
}: {
  data: TeacherDepartmentWorkspace;
  pageId: string;
}) {
  const coordination = pageId === "coord_overview";
  const leadership = pageId === "leadership_dashboard";
  const coveragePath = leadership
    ? "academic-overview"
    : coordination
      ? "coord-coverage"
      : "dept-coverage";
  const timetablePath = leadership
    ? "attendance-timetable-mon"
    : coordination
      ? "coord-timetable"
      : "dept-timetable";
  const completionPath = leadership
    ? "leadership-reports"
    : coordination
      ? "coord-reports"
      : "dept-reports";
  const ready = data.coverage.filter((item) => item.status === "READY").length;
  const gaps = data.coverage.filter((item) => item.status !== "READY");
  const missingPeriods = data.coverage.reduce(
    (sum, item) => sum + Math.max(0, item.requiredPeriods - item.scheduledPeriods),
    0,
  );
  const unpublished = data.timetables.filter((item) => item.status !== "PUBLISHED");
  const conflicts = data.timetables.reduce((sum, item) => sum + item.conflictCount, 0);
  const issues = [...data.issues].sort(
    (a, b) => Number(b.severity === "ERROR") - Number(a.severity === "ERROR"),
  );
  const metrics = [
    {
      label: "Subjects ready",
      value: `${ready} / ${data.coverage.length}`,
      detail: `${gaps.length} offerings need attention`,
      path: coveragePath,
    },
    {
      label: "Unscheduled weekly periods",
      value: missingPeriods,
      detail: "Sum of shortfalls; excess periods do not offset gaps",
      path: coveragePath,
    },
    {
      label: "Timetables awaiting publication",
      value: unpublished.length,
      detail: `${conflicts} reported conflicts`,
      path: timetablePath,
    },
    {
      label: "Pending academic work",
      value: `${data.summary.pendingAttendanceSections} sections · ${data.summary.pendingMarksSheets} mark sheets`,
      detail: `Attendance for ${data.date}; marks for ${data.academicYear.name}`,
      path: completionPath,
    },
  ];
  return (
    <div className="space-y-5" data-testid="department-operational-overview">
      <p className="text-sm text-slate-600">
        {[data.scope.programName, data.scope.campusName, data.academicYear.name]
          .filter(Boolean)
          .join(" · ")}{" "}
        · As of {data.date}
      </p>
      <dl className="grid gap-4 border-y border-slate-200 py-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label}>
            <dt className="text-sm text-slate-600">{metric.label}</dt>
            <dd className="mt-2 text-xl font-semibold text-slate-900">{metric.value}</dd>
            <p className="mt-1 text-xs text-slate-500">{metric.detail}</p>
            <Link
              className="mt-2 inline-block text-sm font-semibold text-blue-700 underline"
              to={`/teacher/${metric.path}`}
            >
              Review {metric.label.toLowerCase()}
            </Link>
          </div>
        ))}
      </dl>
      <WorkspaceSurface>
        <div className="border-b border-slate-200 p-4">
          <h2 className="font-semibold">Teaching coverage gaps</h2>
          <p className="mt-1 text-sm text-slate-500">
            Subject offerings that need allocation or timetable work.
          </p>
        </div>
        {gaps.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {["Subject", "Class / section", "Scheduled / required", "Status"].map((label) => (
                    <th key={label} className="p-3 font-medium">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gaps.map((item) => (
                  <tr key={item.subjectOfferingId} className="border-t border-slate-100">
                    <td className="p-3">{item.subjectName}</td>
                    <td className="p-3">
                      {[item.className, item.sectionName].filter(Boolean).join(" · ")}
                    </td>
                    <td className="p-3">
                      {item.scheduledPeriods} / {item.requiredPeriods} periods
                    </td>
                    <td className="p-3">
                      <WorkspaceStatus tone={item.status === "UNASSIGNED" ? "danger" : "warning"}>
                        {item.status === "UNASSIGNED" ? "Unassigned" : "Incomplete"}
                      </WorkspaceStatus>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-4 text-sm text-slate-600">
            {data.coverage.length
              ? "All subject offerings in this scope are ready."
              : "No subject offerings are configured in this scope."}
          </p>
        )}
      </WorkspaceSurface>
      <div className="grid gap-5 lg:grid-cols-2">
        <WorkspaceSurface>
          <div className="border-b border-slate-200 p-4">
            <h2 className="font-semibold">Timetable readiness</h2>
          </div>
          {data.timetables.length ? (
            <ul className="divide-y divide-slate-100">
              {data.timetables.map((item) => (
                <li
                  key={item.sectionId}
                  className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm"
                >
                  <span>
                    {item.className} · {item.sectionName}
                    <span className="block text-xs text-slate-500">
                      {item.conflictCount} reported conflicts
                    </span>
                  </span>
                  <WorkspaceStatus
                    tone={
                      item.status === "PUBLISHED" && !item.conflictCount ? "success" : "warning"
                    }
                  >
                    {item.status.replaceAll("_", " ")}
                  </WorkspaceStatus>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-4 text-sm text-slate-600">
              No section timetables are available in this scope.
            </p>
          )}
        </WorkspaceSurface>
        <WorkspaceSurface>
          <div className="border-b border-slate-200 p-4">
            <h2 className="font-semibold">Priority actions</h2>
            <p className="mt-1 text-sm text-slate-500">Errors first, followed by warnings.</p>
          </div>
          {issues.length ? (
            <ul className="divide-y divide-slate-100">
              {issues.map((item, index) => (
                <li key={`${item.code}-${index}`} className="space-y-1 p-4 text-sm">
                  <WorkspaceStatus tone={item.severity === "ERROR" ? "danger" : "warning"}>
                    {item.severity === "ERROR" ? "Action needed" : "Review"}
                  </WorkspaceStatus>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-slate-500">{item.scope}</p>
                  <p>{item.action}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-4 text-sm text-slate-600">
              No exceptions reported for this scope. Review coverage and completion before closing
              the day.
            </p>
          )}
        </WorkspaceSurface>
      </div>
    </div>
  );
}

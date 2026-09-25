import { AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import type { TeacherDepartmentWorkspace } from "../model/teacher-department.types";
import {
  WorkspaceSurface,
  WorkspaceStatus,
} from "../../teacher-workspace/ui/teacher-workspace-primitives";

interface ReadinessMetric {
  label: string;
  complete: number;
  total: number;
  detail: string;
  path: string;
  filter: string;
}

const percent = (complete: number, total: number) =>
  total > 0 ? Math.round((complete / total) * 100) : 0;

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
    ? "attendance-timetable"
    : coordination
      ? "coord-timetable"
      : "dept-timetable";
  const completionPath = leadership
    ? "leadership-reports"
    : coordination
      ? "coord-reports"
      : "dept-reports";
  const allocationPath = leadership
    ? "leadership-faculty"
    : coordination
      ? "coord-allocation"
      : "dept-workload";
  const target = (path: string, filter: string, sectionId?: string) => {
    const query = new URLSearchParams({ filter });
    if (data.scope.responsibilityId) query.set("scope", data.scope.responsibilityId);
    if (sectionId) query.set("section", sectionId);
    return `/teacher/${path}?${query.toString()}`;
  };

  const readyCoverage = data.coverage.filter((item) => item.status === "READY").length;
  const coverageGaps = data.coverage.filter((item) => item.status !== "READY");
  const missingPeriods = data.coverage.reduce(
    (sum, item) => sum + Math.max(0, item.requiredPeriods - item.scheduledPeriods),
    0,
  );
  const attendanceSubmitted = data.completion.filter(
    (item) => item.attendanceStatus === "SUBMITTED",
  ).length;
  const marksSubmitted = data.completion.reduce((sum, item) => sum + item.marksSubmitted, 0);
  const marksPending = data.completion.reduce((sum, item) => sum + item.marksPending, 0);
  const marksTotal = marksSubmitted + marksPending;
  const publishedTimetables = data.timetables.filter(
    (item) => item.status === "PUBLISHED" && item.conflictCount === 0,
  ).length;
  const timetableExceptions = data.timetables.filter(
    (item) => item.status !== "PUBLISHED" || item.conflictCount > 0,
  );
  const totalRequiredPeriods = data.faculty.reduce((sum, item) => sum + item.requiredPeriods, 0);
  const totalScheduledPeriods = data.faculty.reduce((sum, item) => sum + item.scheduledPeriods, 0);
  const overloadedFaculty = data.faculty.filter(
    (item) => item.scheduledPeriods > item.requiredPeriods,
  ).length;
  const availableFaculty = data.faculty.filter(
    (item) => item.scheduledPeriods < item.requiredPeriods,
  ).length;

  const metrics: ReadinessMetric[] = [
    {
      label: "Attendance today",
      complete: attendanceSubmitted,
      total: data.completion.length,
      detail: `${data.summary.pendingAttendanceSections} sections pending`,
      path: completionPath,
      filter: "pending",
    },
    {
      label: "Marks completion",
      complete: marksSubmitted,
      total: marksTotal,
      detail: `${marksPending} mark sheets pending`,
      path: completionPath,
      filter: "pending",
    },
    {
      label: "Timetable readiness",
      complete: publishedTimetables,
      total: data.timetables.length,
      detail: `${timetableExceptions.length} sections need review`,
      path: timetablePath,
      filter: "unpublished",
    },
    {
      label: "Teaching coverage",
      complete: readyCoverage,
      total: data.coverage.length,
      detail: `${coverageGaps.length} offerings need attention`,
      path: coveragePath,
      filter: "attention",
    },
  ];

  const sectionRisks = data.completion
    .map((section) => {
      const timetable = data.timetables.find((item) => item.sectionId === section.sectionId);
      const coverage = data.coverage.filter(
        (item) => item.className === section.className && item.sectionName === section.sectionName,
      );
      const gaps = coverage.filter((item) => item.status !== "READY").length;
      const score =
        Number(section.attendanceStatus !== "SUBMITTED") * 4 +
        Number(section.marksPending > 0) * 3 +
        Number(!timetable || timetable.status !== "PUBLISHED") * 2 +
        Number((timetable?.conflictCount ?? 0) > 0) * 2 +
        Number(gaps > 0);
      return { section, timetable, gaps, score };
    })
    .filter((item) => item.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.section.className.localeCompare(right.section.className, undefined, { numeric: true }),
    );
  const sectionExceptions = sectionRisks.slice(0, 8);

  const totalActions =
    data.summary.pendingAttendanceSections +
    marksPending +
    timetableExceptions.length +
    coverageGaps.length;
  const measurableMetrics = metrics.filter((metric) => metric.total > 0);
  const readinessScore = measurableMetrics.length
    ? Math.round(
        measurableMetrics.reduce((sum, metric) => sum + percent(metric.complete, metric.total), 0) /
          measurableMetrics.length,
      )
    : null;
  const workloadPercent = Math.min(percent(totalScheduledPeriods, totalRequiredPeriods), 100);
  const actions = [
    {
      label: "Attendance not submitted",
      value: data.summary.pendingAttendanceSections,
      detail: `for ${data.date}`,
      path: completionPath,
      filter: "pending",
    },
    {
      label: "Marks awaiting submission",
      value: marksPending,
      detail: `in ${data.academicYear.name}`,
      path: completionPath,
      filter: "pending",
    },
    {
      label: "Timetable exceptions",
      value: timetableExceptions.length,
      detail: "draft, missing or conflicting",
      path: timetablePath,
      filter: "unpublished",
    },
    {
      label: "Coverage gaps",
      value: coverageGaps.length,
      detail: `${missingPeriods} weekly periods short`,
      path: coveragePath,
      filter: "attention",
    },
  ];

  return (
    <div className="space-y-5" data-testid="department-operational-overview">
      <section className="border-y border-slate-200 py-5" aria-labelledby="academic-control-title">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              {totalActions ? (
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              )}
              Academic control · {data.date}
            </div>
            <h2 id="academic-control-title" className="text-2xl font-semibold text-slate-950">
              {readinessScore === null
                ? "Academic setup is incomplete"
                : sectionRisks.length
                  ? `${sectionRisks.length} ${sectionRisks.length === 1 ? "section requires" : "sections require"} follow-up`
                  : totalActions
                    ? "Academic records require follow-up"
                    : "Academic operations are on track"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {[data.scope.programName, data.scope.campusName, data.academicYear.name]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <div className="flex items-baseline gap-2 lg:text-right">
            <strong className="text-4xl font-semibold tabular-nums text-slate-950">
              {readinessScore === null ? "—" : `${readinessScore}%`}
            </strong>
            <span className="text-sm text-slate-500">overall readiness</span>
          </div>
        </div>
      </section>

      <section className="grid border-y border-slate-200 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric, index) => {
          const value = percent(metric.complete, metric.total);
          return (
            <Link
              key={metric.label}
              to={target(metric.path, metric.filter)}
              className={`group px-4 py-5 transition-colors hover:bg-slate-50 ${index ? "border-t border-slate-200 sm:border-l sm:border-t-0" : ""} ${index === 2 ? "sm:border-l-0 xl:border-l" : ""}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-slate-700">{metric.label}</span>
                <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5" />
              </div>
              <div className="mt-3 flex items-end justify-between gap-3">
                <strong className="text-2xl font-semibold tabular-nums text-slate-950">
                  {metric.total ? `${metric.complete}/${metric.total}` : "Not configured"}
                </strong>
                <span className="text-sm font-semibold tabular-nums text-slate-600">
                  {metric.total ? `${value}%` : "—"}
                </span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${value === 100 ? "bg-emerald-500" : "bg-amber-500"}`}
                  style={{ width: `${value}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-slate-500">{metric.detail}</p>
            </Link>
          );
        })}
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.75fr)]">
        <WorkspaceSurface>
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 p-4">
            <div>
              <h2 className="font-semibold text-slate-950">Sections requiring attention</h2>
              <p className="mt-1 text-sm text-slate-500">
                Ranked by attendance, marks, timetable and teaching coverage risk.
              </p>
            </div>
            <Link
              to={target(completionPath, "pending")}
              className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-blue-700"
            >
              View all sections <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {sectionExceptions.length ? (
            <div
              className="overflow-x-auto"
              role="region"
              aria-label="Section exceptions"
              tabIndex={0}
            >
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Class / section</th>
                    <th className="px-4 py-3">Attendance</th>
                    <th className="px-4 py-3">Marks</th>
                    <th className="px-4 py-3">Timetable</th>
                    <th className="px-4 py-3">Coverage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sectionExceptions.map(({ section, timetable, gaps }) => (
                    <tr key={section.sectionId} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <Link
                          to={target(completionPath, "pending", section.sectionId)}
                          className="font-semibold text-blue-800 hover:underline"
                        >
                          {section.className} · {section.sectionName}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <WorkspaceStatus
                          tone={section.attendanceStatus === "SUBMITTED" ? "success" : "warning"}
                        >
                          {section.attendanceStatus}
                        </WorkspaceStatus>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-slate-700">
                        {section.marksPending ? `${section.marksPending} pending` : "Complete"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {timetable ? timetable.status.replaceAll("_", " ") : "Not created"}
                        {timetable?.conflictCount ? ` · ${timetable.conflictCount} conflicts` : ""}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {gaps ? `${gaps} gaps` : "Ready"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex items-start gap-3 p-5 text-sm text-slate-600">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <div>
                <p className="font-semibold text-slate-900">No section exceptions</p>
                <p className="mt-1">Attendance, marks, timetables and coverage are complete.</p>
              </div>
            </div>
          )}
        </WorkspaceSurface>

        <WorkspaceSurface>
          <div className="border-b border-slate-200 p-4">
            <h2 className="font-semibold text-slate-950">Action queue</h2>
            <p className="mt-1 text-sm text-slate-500">Open the records that need intervention.</p>
          </div>
          <div className="divide-y divide-slate-100">
            {actions.map((action) => (
              <Link
                key={action.label}
                to={target(action.path, action.filter)}
                className="group flex min-h-20 items-center justify-between gap-4 px-4 py-3 hover:bg-slate-50"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">{action.label}</p>
                  <p className="mt-1 text-xs text-slate-500">{action.detail}</p>
                </div>
                <div className="flex items-center gap-2">
                  <strong
                    className={`text-xl tabular-nums ${action.value ? "text-amber-700" : "text-emerald-700"}`}
                  >
                    {action.value}
                  </strong>
                  <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
          </div>
        </WorkspaceSurface>
      </div>

      <WorkspaceSurface>
        <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_repeat(3,minmax(120px,0.35fr))] lg:items-center">
          <div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-slate-950">Capacity and allocation</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Scheduled teaching periods against required department capacity.
                </p>
              </div>
              <Link
                to={target(allocationPath, "workload")}
                className="hidden min-h-10 items-center gap-1 text-sm font-semibold text-blue-700 sm:inline-flex"
              >
                Review workload <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-blue-600"
                style={{ width: `${workloadPercent}%` }}
              />
            </div>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Periods</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-slate-950">
              {totalScheduledPeriods} / {totalRequiredPeriods}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Overloaded</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-slate-950">
              {overloadedFaculty}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Capacity available
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-slate-950">
              {availableFaculty}
            </p>
          </div>
          <Link
            to={target(allocationPath, "workload")}
            className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-blue-700 sm:hidden"
          >
            Review workload <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </WorkspaceSurface>

      {!data.coverage.length ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          No subject offerings are configured in this scope. Configure academic coverage before
          treating the department as ready.
        </p>
      ) : null}
    </div>
  );
}

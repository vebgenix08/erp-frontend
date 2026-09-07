import { AlertTriangle, CalendarDays, Scale } from "lucide-react";
import { ErrorState, LoadingState } from "../../../shared/ui/page-state";
import { useTeacherWorkspace } from "../../teacher-workspace/model/teacher-workspace-context";
import {
  WorkspaceKpi,
  WorkspacePageHeader,
  WorkspaceStatus,
  WorkspaceSurface,
} from "../../teacher-workspace/ui/teacher-workspace-primitives";

const readable = (value: string) =>
  value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export function TeacherSelfWorkloadPage() {
  const { workspace, workspaceLoading, workspaceError } = useTeacherWorkspace();
  if (workspaceLoading && !workspace) return <LoadingState label="Loading workload" />;
  if (workspaceError) return <ErrorState message={workspaceError} />;
  if (!workspace)
    return <ErrorState message="The authenticated user is not linked to an active employee." />;
  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5 p-4 sm:p-5 lg:p-6">
      <WorkspacePageHeader
        title="My Workload"
        description="Published teaching allocation, capacity and timetable exceptions for the active academic year."
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <WorkspaceKpi
          label="Required periods"
          value={workspace.summary.requiredPeriods}
          detail="Per week"
          icon={Scale}
        />
        <WorkspaceKpi
          label="Scheduled periods"
          value={workspace.summary.scheduledPeriods}
          detail={`${workspace.summary.unscheduledPeriods} unscheduled`}
          icon={CalendarDays}
          tone="blue"
        />
        <WorkspaceKpi
          label="Remaining capacity"
          value={workspace.summary.remainingCapacity}
          detail={`${workspace.summary.maximumWeeklyPeriods} maximum`}
          icon={Scale}
          tone="navy"
        />
        <WorkspaceKpi
          label="Open issues"
          value={workspace.issues.length}
          detail="Allocation and timetable"
          icon={AlertTriangle}
          tone={workspace.issues.length ? "rose" : "navy"}
        />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <WorkspaceSurface>
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-extrabold text-slate-950">Daily allocation</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {workspace.dailyBreakdown.length ? (
              workspace.dailyBreakdown.map((day) => (
                <div
                  key={day.dayOfWeek}
                  className="grid grid-cols-[1fr_110px_110px] gap-3 px-4 py-3 text-xs"
                >
                  <strong>{readable(day.dayOfWeek)}</strong>
                  <span className="text-right font-semibold text-slate-600">
                    {day.scheduledPeriods} scheduled
                  </span>
                  <span className="text-right font-semibold text-slate-600">
                    {day.actualPeriods} actual
                  </span>
                </div>
              ))
            ) : (
              <p className="px-4 py-10 text-center text-xs font-semibold text-slate-500">
                No published daily allocation exists.
              </p>
            )}
          </div>
        </WorkspaceSurface>
        <WorkspaceSurface>
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-extrabold text-slate-950">Workload issues</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {workspace.issues.length ? (
              workspace.issues.map((issue, index) => (
                <div
                  key={`${issue.code}-${index}`}
                  className="grid gap-2 px-4 py-3 sm:grid-cols-[1fr_auto]"
                >
                  <span>
                    <strong className="block text-xs text-slate-950">{issue.reason}</strong>
                    <small className="mt-1 block text-[11px] text-slate-500">
                      {issue.recommendedAction}
                    </small>
                  </span>
                  <WorkspaceStatus tone={issue.severity === "ERROR" ? "danger" : "warning"}>
                    {readable(issue.severity)}
                  </WorkspaceStatus>
                </div>
              ))
            ) : (
              <p className="px-4 py-10 text-center text-xs font-semibold text-blue-950">
                No workload or timetable issue is open.
              </p>
            )}
          </div>
        </WorkspaceSurface>
      </div>
      <WorkspaceSurface>
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-extrabold text-slate-950">Assigned subjects</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {workspace.assignments.length ? (
            workspace.assignments.map((assignment) => (
              <div
                key={assignment.id}
                className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_150px_140px] md:items-center"
              >
                <span>
                  <strong className="block text-xs text-slate-950">{assignment.subjectName}</strong>
                  <small className="text-[11px] text-slate-500">
                    {[
                      assignment.className ?? assignment.programName,
                      assignment.sectionName ?? assignment.subjectBatchName,
                      assignment.campusName,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </small>
                </span>
                <span className="text-xs font-semibold text-slate-600">
                  {assignment.scheduledPeriods} / {assignment.requiredPeriods} periods
                </span>
                <WorkspaceStatus tone={assignment.status === "COMPLETE" ? "success" : "warning"}>
                  {assignment.status === "COMPLETE" ? "Complete" : "Incomplete"}
                </WorkspaceStatus>
              </div>
            ))
          ) : (
            <p className="px-4 py-10 text-center text-xs font-semibold text-slate-500">
              No active teaching assignment exists.
            </p>
          )}
        </div>
      </WorkspaceSurface>
    </div>
  );
}

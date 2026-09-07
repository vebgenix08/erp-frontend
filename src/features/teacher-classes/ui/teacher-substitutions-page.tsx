import { Network } from "lucide-react";
import { ErrorState, LoadingState } from "../../../shared/ui/page-state";
import { useTeacherWorkspace } from "../../teacher-workspace/model/teacher-workspace-context";
import {
  WorkspacePageHeader,
  WorkspaceStatus,
  WorkspaceSurface,
} from "../../teacher-workspace/ui/teacher-workspace-primitives";

const readable = (value: string) =>
  value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export function TeacherSubstitutionsPage() {
  const { workspace, workspaceLoading, workspaceError, operatingContext } = useTeacherWorkspace();
  if (workspaceLoading && !workspace) return <LoadingState label="Loading substitutions" />;
  if (workspaceError) return <ErrorState message={workspaceError} />;
  if (!workspace)
    return <ErrorState message="The authenticated user is not linked to an active employee." />;
  const entries = workspace.timetableEntries
    .filter(
      (entry) =>
        (!operatingContext.campusId || entry.campusId === operatingContext.campusId) &&
        entry.state !== "PERMANENT",
    )
    .sort(
      (left, right) =>
        left.dayOfWeek.localeCompare(right.dayOfWeek) ||
        left.startTime.localeCompare(right.startTime),
    );
  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-5 p-4 sm:p-5 lg:p-6">
      <WorkspacePageHeader
        title="Substitution Center"
        description="Temporary assigned coverage and cancelled teaching periods in the selected week."
      />
      <WorkspaceSurface>
        {entries.length ? (
          <div className="divide-y divide-slate-100">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="grid gap-3 px-4 py-4 md:grid-cols-[130px_150px_minmax(0,1fr)_150px] md:items-center"
              >
                <span className="text-xs font-bold">{readable(entry.dayOfWeek)}</span>
                <span className="text-xs font-semibold text-slate-600">
                  {entry.startTime} - {entry.endTime}
                </span>
                <span>
                  <strong className="block text-xs text-slate-950">{entry.subjectName}</strong>
                  <small className="text-[11px] text-slate-500">
                    {[
                      entry.className ?? entry.programName,
                      entry.sectionName ?? entry.subjectBatchName,
                    ]
                      .filter(Boolean)
                      .join(" - ")}
                  </small>
                </span>
                <WorkspaceStatus tone={entry.state === "SUBSTITUTION" ? "warning" : "danger"}>
                  {readable(entry.state)}
                </WorkspaceStatus>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
            <Network className="h-7 w-7 text-slate-300" />
            <strong className="mt-3 text-sm text-slate-900">No substitutions this week</strong>
            <p className="mt-1 max-w-md text-xs font-medium text-slate-500">
              No temporary coverage or cancellation is assigned in the published weekly timetable.
            </p>
          </div>
        )}
      </WorkspaceSurface>
    </div>
  );
}

import { AlertTriangle, CheckCircle2, Layers3, Scale, ShieldCheck } from "lucide-react";
import { useMemo } from "react";
import { ErrorState, LoadingState } from "../../../shared/ui/page-state";
import { useTeacherWorkspace } from "../model/teacher-workspace-context";
import type { TeacherPageDefinition } from "../model/teacher-workspace.types";
import {
  WorkspaceDataTable,
  WorkspaceKpi,
  WorkspacePageHeader,
  WorkspaceStatus,
  WorkspaceSurface,
  type WorkspaceTableColumn,
} from "./teacher-workspace-primitives";

interface OperationalRow {
  id: string;
  record: string;
  scope: string;
  owner: string;
  allocation: string;
  status: string;
}

const assignmentPages = new Set([
  "classes",
  "workload",
  "dept_faculty",
  "dept_coverage",
  "dept_workload",
  "dept_subjects",
  "coord_coverage",
  "coord_allocation",
  "academic_overview",
]);
const responsibilityPages = new Set([
  "mentoring_overview",
  "mentoring_students",
  "sec_incharge",
  "dept_team",
]);
const issuePages = new Set([
  "dept_issues",
  "coord_approvals",
  "coord_timetable",
  "attendance_timetable_mon",
]);

export function TeacherOperationalPage({ page }: { page: TeacherPageDefinition }) {
  const { operatingContext, workspace, workspaceLoading, workspaceError } = useTeacherWorkspace();
  const rows = useMemo<OperationalRow[]>(() => {
    if (!workspace) return [];
    if (assignmentPages.has(page.id)) {
      return workspace.assignments
        .filter((item) => !operatingContext.campusId || item.campusId === operatingContext.campusId)
        .map((item) => ({
          id: item.id,
          record: `${item.subjectName} · ${item.componentType}`,
          scope:
            [item.className, item.sectionName ?? item.subjectBatchName]
              .filter(Boolean)
              .join(" - ") || "Assigned group",
          owner: workspace.teacher.fullName,
          allocation: `${item.scheduledPeriods} / ${item.requiredPeriods} periods`,
          status: item.status === "COMPLETE" ? "Complete" : "Action needed",
        }));
    }
    if (responsibilityPages.has(page.id)) {
      return workspace.responsibilities
        .filter((item) => !operatingContext.campusId || item.campusId === operatingContext.campusId)
        .map((item) => ({
          id: item.id,
          record: item.responsibilityType.replaceAll("_", " "),
          scope: [item.campusName, item.className, item.sectionName].filter(Boolean).join(" · "),
          owner: workspace.teacher.fullName,
          allocation: `From ${new Intl.DateTimeFormat("en-IN").format(new Date(item.effectiveFrom))}`,
          status: "Active",
        }));
    }
    if (issuePages.has(page.id)) {
      return workspace.issues.map((item, index) => ({
        id: `${item.code}-${index}`,
        record: item.reason,
        scope:
          [item.classSection, item.subjectName].filter(Boolean).join(" · ") ||
          operatingContext.campusName,
        owner: workspace.teacher.fullName,
        allocation: item.recommendedAction,
        status: item.severity === "ERROR" ? "Action needed" : "Review",
      }));
    }
    return [];
  }, [operatingContext.campusId, operatingContext.campusName, page.id, workspace]);
  const columns = useMemo<WorkspaceTableColumn<OperationalRow>[]>(
    () => [
      { key: "record", label: "Record" },
      { key: "scope", label: "Academic scope" },
      { key: "owner", label: "Employee" },
      { key: "allocation", label: "Allocation" },
      {
        key: "status",
        label: "Status",
        render: (row) => (
          <WorkspaceStatus
            tone={
              row.status === "Complete" || row.status === "Active"
                ? "success"
                : row.status === "Action needed"
                  ? "danger"
                  : "warning"
            }
          >
            {row.status}
          </WorkspaceStatus>
        ),
      },
    ],
    [],
  );

  if (workspaceLoading && !workspace)
    return <LoadingState label={`Loading ${page.label.toLowerCase()}`} />;
  if (workspaceError) return <ErrorState message={workspaceError} />;
  if (!workspace)
    return (
      <ErrorState message="The authenticated user is not linked to an active teaching employee." />
    );

  const complete = workspace.assignments.filter((item) => item.status === "COMPLETE").length;
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 p-4 sm:p-5 lg:p-6">
      <WorkspacePageHeader title={page.title} description={page.description} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <WorkspaceKpi
          label="Active assignments"
          value={workspace.assignments.length}
          detail={workspace.academicYear.name}
          icon={Layers3}
        />
        <WorkspaceKpi
          label="Scheduled"
          value={complete}
          detail={`${workspace.assignments.length - complete} incomplete`}
          icon={CheckCircle2}
          tone="blue"
        />
        <WorkspaceKpi
          label="Responsibilities"
          value={workspace.responsibilities.length}
          detail="Current academic scope"
          icon={ShieldCheck}
          tone="amber"
        />
        <WorkspaceKpi
          label="Open issues"
          value={workspace.issues.length}
          detail="Workload and timetable"
          icon={Scale}
          tone={workspace.issues.length ? "rose" : "navy"}
        />
      </div>
      <WorkspaceSurface>
        {rows.length ? (
          <WorkspaceDataTable rows={rows} columns={columns} downloadName={page.slug} />
        ) : (
          <div className="flex min-h-56 flex-col items-center justify-center px-6 text-center">
            <AlertTriangle size={24} className="text-slate-300" />
            <strong className="mt-3 text-sm text-slate-800">No records available</strong>
            <p className="mt-1 max-w-lg text-xs font-medium text-slate-500">
              No persisted records exist for this page in the selected academic context.
            </p>
          </div>
        )}
      </WorkspaceSurface>
    </div>
  );
}

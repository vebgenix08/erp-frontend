import {
  AlertTriangle,
  BookOpen,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  GraduationCap,
  Layers3,
  Megaphone,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ErrorState, LoadingState } from "../../../shared/ui/page-state";
import { useTeacherWorkspace } from "../model/teacher-workspace-context";
import {
  WorkspaceButton,
  WorkspaceKpi,
  WorkspacePageHeader,
  WorkspaceSectionHeading,
  WorkspaceStatus,
  WorkspaceSurface,
} from "./teacher-workspace-primitives";

const dayNames = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
const readableDay = (value: string) => value.charAt(0) + value.slice(1).toLowerCase();

function groupLabel(item: { className?: string; sectionName?: string; subjectBatchName?: string }) {
  return (
    [item.className, item.sectionName ?? item.subjectBatchName].filter(Boolean).join(" - ") ||
    "Assigned group"
  );
}

function scopeLabel(item: {
  campusName: string;
  programName?: string;
  className?: string;
  sectionName?: string;
}) {
  return [item.campusName, item.programName, item.className, item.sectionName]
    .filter(Boolean)
    .join(" · ");
}

function responsibilityLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const classWorkspacePath = (subjectOfferingId: string) =>
  `/teacher/class-workspace?offering=${encodeURIComponent(subjectOfferingId)}`;

export function TeacherDashboardPage() {
  const {
    accessLabel,
    visibleNavigation,
    operatingContext,
    workspace,
    workspaceLoading,
    workspaceError,
  } = useTeacherWorkspace();
  const navigate = useNavigate();
  const visiblePages = visibleNavigation.flatMap((group) => group.pages);
  const pagePath = (id: string) => {
    const page = visiblePages.find((item) => item.id === id);
    return page ? `/teacher/${page.slug}` : undefined;
  };
  const campusId = operatingContext.campusId;
  const todayIndex = new Date().getDay();
  const today = dayNames[todayIndex] ?? "MONDAY";
  const assignments = useMemo(
    () => workspace?.assignments.filter((item) => !campusId || item.campusId === campusId) ?? [],
    [campusId, workspace],
  );
  const timetableEntries = useMemo(
    () =>
      (workspace?.timetableEntries ?? []).filter(
        (item) => item.state !== "CANCELLED" && (!campusId || item.campusId === campusId),
      ),
    [campusId, workspace],
  );
  const uniqueGroups = useMemo(
    () =>
      new Set(
        assignments.map(
          (item) =>
            item.sectionId ?? item.subjectBatchId ?? `${item.classId}:${item.subjectOfferingId}`,
        ),
      ).size,
    [assignments],
  );
  const uniqueSubjects = useMemo(
    () => new Set(assignments.map((item) => item.subjectName)).size,
    [assignments],
  );
  const schedule = useMemo(() => {
    for (let offset = 0; offset < 7; offset += 1) {
      const day = dayNames[(todayIndex + offset) % 7]!;
      const entries = timetableEntries
        .filter((item) => item.dayOfWeek === day)
        .sort((left, right) => left.startTime.localeCompare(right.startTime));
      if (entries.length) return { day, offset, entries };
    }
    return { day: today, offset: 0, entries: [] };
  }, [timetableEntries, today, todayIndex]);

  if (workspaceLoading && !workspace) return <LoadingState label="Loading academic workspace" />;
  if (workspaceError) return <ErrorState message={workspaceError} />;
  if (!workspace)
    return (
      <ErrorState message="The authenticated user is not linked to an active teaching employee." />
    );

  const required = assignments.reduce((sum, item) => sum + item.requiredPeriods, 0);
  const scheduled = assignments.reduce((sum, item) => sum + item.scheduledPeriods, 0);
  const incompleteAssignments = assignments.filter((item) => item.status === "INCOMPLETE");
  const visibleIssues = workspace.issues.filter(
    (item) => !item.campusId || !campusId || item.campusId === campusId,
  );
  const responsibilities = workspace.responsibilities.filter(
    (item) => !campusId || item.campusId === campusId,
  );
  const quickActions = [
    {
      id: "attendance",
      label: "Mark attendance",
      description: "Open assigned teaching sessions.",
      icon: CalendarCheck,
    },
    {
      id: "marks_entry",
      label: "Enter marks",
      description: "Record marks for an open assessment.",
      icon: ClipboardCheck,
    },
    {
      id: "daily_updates",
      label: "Student update",
      description: "Publish an update to students and parents.",
      icon: Megaphone,
    },
    {
      id: "classes",
      label: "My classes",
      description: "Open assigned class and student records.",
      icon: UsersRound,
    },
  ]
    .map((item) => ({ ...item, path: pagePath(item.id) }))
    .filter((item) => item.path);

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 p-4 sm:p-5 lg:p-6">
      <WorkspacePageHeader
        title={`Good morning, ${workspace.teacher.fullName}`}
        description={`${operatingContext.campusName} · ${workspace.academicYear.name} · ${accessLabel}`}
        actions={
          pagePath("schedule") ? (
            <WorkspaceButton
              variant="primary"
              icon={CalendarClock}
              onClick={() => navigate(pagePath("schedule")!)}
            >
              Open timetable
            </WorkspaceButton>
          ) : undefined
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <WorkspaceKpi
          label="Teaching groups"
          value={uniqueGroups}
          detail="Assigned classes and sections"
          icon={GraduationCap}
        />
        <WorkspaceKpi
          label="Subjects handled"
          value={uniqueSubjects}
          detail={`${assignments.length} active assignment${assignments.length === 1 ? "" : "s"}`}
          icon={BookOpen}
        />
        <WorkspaceKpi
          label="Weekly periods"
          value={`${scheduled} / ${required}`}
          detail="Scheduled / required"
          icon={CalendarClock}
          tone={scheduled < required ? "amber" : "navy"}
        />
        <WorkspaceKpi
          label="Responsibilities"
          value={responsibilities.length}
          detail={responsibilities.length ? "Current academic year" : "Teaching assignment only"}
          icon={ShieldCheck}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.75fr)]">
        <WorkspaceSurface>
          <WorkspaceSectionHeading
            title={
              schedule.offset === 0
                ? "Today's schedule"
                : `Next teaching day · ${readableDay(schedule.day)}`
            }
            description={
              schedule.offset === 0
                ? `${schedule.entries.length} assigned period${schedule.entries.length === 1 ? "" : "s"} today.`
                : "There are no assigned periods today. Your next published schedule is shown below."
            }
            action={
              pagePath("schedule") ? (
                <WorkspaceButton onClick={() => navigate(pagePath("schedule")!)}>
                  Full timetable
                </WorkspaceButton>
              ) : undefined
            }
          />
          {schedule.entries.length ? (
            <div className="divide-y divide-slate-100">
              {schedule.entries.map((item) => (
                <button
                  key={item.id}
                  onClick={() => navigate(classWorkspacePath(item.subjectOfferingId))}
                  className="grid w-full gap-3 px-4 py-4 text-left transition-colors hover:bg-blue-50/50 sm:grid-cols-[118px_minmax(0,1fr)_auto] sm:items-center"
                >
                  <span>
                    <strong className="block text-xs text-slate-900">
                      {item.startTime} - {item.endTime}
                    </strong>
                    <small className="text-[11px] font-semibold text-slate-500">
                      {readableDay(item.dayOfWeek)}
                    </small>
                  </span>
                  <span className="min-w-0">
                    <strong className="block truncate text-sm text-slate-950">
                      {item.subjectName}
                    </strong>
                    <small className="text-xs font-medium text-slate-500">{groupLabel(item)}</small>
                  </span>
                  <WorkspaceStatus tone={item.state === "SUBSTITUTION" ? "warning" : "info"}>
                    {item.state === "SUBSTITUTION" ? "Substitution" : item.componentType}
                  </WorkspaceStatus>
                </button>
              ))}
            </div>
          ) : (
            <p className="px-4 py-10 text-center text-sm font-semibold text-slate-500">
              No published teaching timetable is assigned in this campus.
            </p>
          )}
        </WorkspaceSurface>

        <WorkspaceSurface>
          <WorkspaceSectionHeading
            title="Quick access"
            description="Open the academic work available in your current scope."
          />
          <div className="divide-y divide-slate-100">
            {quickActions.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.path!)}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-blue-50/50"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-blue-50 text-blue-950">
                    <Icon size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block text-xs text-slate-900">{item.label}</strong>
                    <small className="mt-0.5 block text-[11px] font-medium text-slate-500">
                      {item.description}
                    </small>
                  </span>
                  <ChevronRight size={15} className="text-slate-400" />
                </button>
              );
            })}
          </div>
        </WorkspaceSurface>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.85fr)]">
        <WorkspaceSurface>
          <WorkspaceSectionHeading
            title="My teaching assignments"
            description="Subjects, class sections and weekly timetable coverage."
            action={
              pagePath("classes") ? (
                <WorkspaceButton onClick={() => navigate(pagePath("classes")!)}>
                  View all classes
                </WorkspaceButton>
              ) : undefined
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left">
                  {["Class / Section", "Subject", "Role", "Periods", "Status"].map((label) => (
                    <th
                      key={label}
                      className="px-4 py-3 text-[10px] font-extrabold uppercase text-slate-500"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {assignments.length ? (
                  assignments.slice(0, 8).map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => navigate(classWorkspacePath(item.subjectOfferingId))}
                      className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-blue-50/50"
                    >
                      <td className="px-4 py-3 text-xs font-bold text-slate-900">
                        {groupLabel(item)}
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-700">
                        {item.subjectName}
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-600">
                        {responsibilityLabel(item.assignmentRole)}
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-slate-800">
                        {item.scheduledPeriods} / {item.requiredPeriods}
                      </td>
                      <td className="px-4 py-3">
                        <WorkspaceStatus tone={item.status === "COMPLETE" ? "success" : "warning"}>
                          {item.status === "COMPLETE" ? "Ready" : "Incomplete"}
                        </WorkspaceStatus>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-sm font-semibold text-slate-500"
                    >
                      No active teaching assignments in this campus.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </WorkspaceSurface>

        <div className="space-y-5">
          {incompleteAssignments.length || visibleIssues.length ? (
            <WorkspaceSurface>
              <WorkspaceSectionHeading
                title="Action required"
                description="Allocation issues that need correction."
              />
              <div className="divide-y divide-slate-100">
                {visibleIssues.slice(0, 4).map((item, index) => (
                  <button
                    key={`${item.code}-${index}`}
                    onClick={() => item.actionPath && navigate(item.actionPath)}
                    disabled={!item.actionPath}
                    className="flex w-full items-start gap-3 px-4 py-3.5 text-left enabled:hover:bg-slate-50"
                  >
                    <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-700" />
                    <span className="min-w-0 flex-1">
                      <strong className="block text-xs text-slate-900">{item.reason}</strong>
                      <small className="mt-1 block text-[11px] font-medium text-slate-500">
                        {item.recommendedAction}
                      </small>
                    </span>
                  </button>
                ))}
                {!visibleIssues.length &&
                  incompleteAssignments.slice(0, 4).map((item) => (
                    <div key={item.id} className="flex items-start gap-3 px-4 py-3.5">
                      <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-700" />
                      <span>
                        <strong className="block text-xs text-slate-900">
                          {groupLabel(item)} · {item.subjectName}
                        </strong>
                        <small className="mt-1 block text-[11px] font-medium text-slate-500">
                          {item.unscheduledPeriods} required period
                          {item.unscheduledPeriods === 1 ? " is" : "s are"} not scheduled.
                        </small>
                      </span>
                    </div>
                  ))}
              </div>
            </WorkspaceSurface>
          ) : null}

          <WorkspaceSurface>
            <WorkspaceSectionHeading
              title="Academic responsibilities"
              description="Leadership and student-support scope for this year."
            />
            {responsibilities.length ? (
              <div className="divide-y divide-slate-100">
                {responsibilities.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 px-4 py-3.5">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-blue-50 text-blue-950">
                      <Layers3 size={15} />
                    </span>
                    <span className="min-w-0">
                      <strong className="block text-xs text-slate-900">
                        {responsibilityLabel(item.responsibilityType)}
                      </strong>
                      <small className="mt-1 block text-[11px] font-medium leading-4 text-slate-500">
                        {scopeLabel(item)}
                      </small>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-start gap-3 px-4 py-5">
                <CheckCircle2 size={17} className="mt-0.5 text-blue-950" />
                <p className="text-xs font-semibold leading-5 text-slate-600">
                  No additional academic responsibility is assigned. Your access is limited to the
                  teaching assignments listed here.
                </p>
              </div>
            )}
          </WorkspaceSurface>
        </div>
      </div>
    </div>
  );
}

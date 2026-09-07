import { BriefcaseBusiness, GraduationCap, ShieldCheck, UserRound } from "lucide-react";
import { ErrorState, LoadingState } from "../../../shared/ui/page-state";
import { useTeacherWorkspace } from "../model/teacher-workspace-context";
import {
  WorkspaceDetails,
  WorkspacePageHeader,
  WorkspaceSectionHeading,
  WorkspaceStatus,
  WorkspaceSurface,
} from "./teacher-workspace-primitives";

function readable(value: string | undefined, fallback = "Not recorded") {
  return value?.trim()
    ? value
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
    : fallback;
}

function date(value: string | undefined) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export function TeacherProfilePage() {
  const { operatingContext, accessLabel, workspace, workspaceLoading, workspaceError } =
    useTeacherWorkspace();
  if (workspaceLoading && !workspace) return <LoadingState label="Loading employee profile" />;
  if (workspaceError) return <ErrorState message={workspaceError} />;
  if (!workspace)
    return (
      <ErrorState message="The authenticated user is not linked to an active teaching employee." />
    );
  const teacher = workspace.teacher;
  const initials = teacher.fullName
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("");

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-5 p-4 sm:p-5 lg:p-6">
      <WorkspacePageHeader
        title="My Profile"
        description="Employment identity, teaching assignments and academic responsibilities."
      />
      <WorkspaceSurface className="overflow-hidden">
        <div className="h-24 bg-[#0f172a]" />
        <div className="flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end">
          <span className="-mt-10 grid h-24 w-24 shrink-0 place-items-center rounded-lg border-4 border-white bg-blue-50 text-2xl font-extrabold text-blue-950 shadow-sm">
            {initials}
          </span>
          <div className="min-w-0 flex-1 sm:pb-1">
            <h2 className="text-xl font-extrabold text-slate-950">{teacher.fullName}</h2>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {teacher.email ?? operatingContext.userEmail} ·{" "}
              {readable(teacher.designation, accessLabel)}
            </p>
          </div>
          <WorkspaceStatus tone={teacher.status === "ACTIVE" ? "success" : "warning"}>
            {readable(teacher.status, "Active")}
          </WorkspaceStatus>
        </div>
      </WorkspaceSurface>

      <div className="grid gap-5 xl:grid-cols-2">
        <WorkspaceSurface>
          <WorkspaceSectionHeading
            title="Personal details"
            action={<UserRound size={17} className="text-blue-950" />}
          />
          <div className="p-4">
            <WorkspaceDetails
              rows={[
                ["Full name", teacher.fullName],
                ["Employee number", teacher.employeeCode],
                ["Email", teacher.email ?? operatingContext.userEmail],
                ["Phone", teacher.phone ?? "Not recorded"],
              ]}
            />
          </div>
        </WorkspaceSurface>
        <WorkspaceSurface>
          <WorkspaceSectionHeading
            title="Employment"
            action={<BriefcaseBusiness size={17} className="text-blue-950" />}
          />
          <div className="p-4">
            <WorkspaceDetails
              rows={[
                ["Designation", readable(teacher.designation)],
                ["Department", teacher.department ?? "Not recorded"],
                ["Staff type", readable(teacher.staffType)],
                ["Employment type", readable(teacher.employmentType)],
                ["Joining date", date(teacher.joiningDate)],
                [
                  "Primary campus",
                  workspace.campusBreakdown.find(
                    (campus) => campus.campusId === teacher.primaryCampusId,
                  )?.campusName ?? operatingContext.campusName,
                ],
              ]}
            />
          </div>
        </WorkspaceSurface>
      </div>

      <WorkspaceSurface>
        <WorkspaceSectionHeading
          title="Teaching assignments"
          description={`${workspace.academicYear.name} · ${workspace.assignments.length} active assignment${workspace.assignments.length === 1 ? "" : "s"}`}
          action={<GraduationCap size={17} className="text-blue-950" />}
        />
        {workspace.assignments.length ? (
          <div className="divide-y divide-slate-100">
            {workspace.assignments.map((assignment) => (
              <div
                key={assignment.id}
                className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_120px] md:items-center"
              >
                <span>
                  <strong className="block text-xs text-slate-950">{assignment.subjectName}</strong>
                  <small className="text-[10px] text-slate-500">{assignment.campusName}</small>
                </span>
                <span className="text-xs font-semibold text-slate-600">
                  {[assignment.className, assignment.sectionName ?? assignment.subjectBatchName]
                    .filter(Boolean)
                    .join(" - ") || "Assigned group"}
                </span>
                <WorkspaceStatus tone={assignment.status === "COMPLETE" ? "success" : "warning"}>
                  {assignment.status === "COMPLETE" ? "Scheduled" : "Incomplete"}
                </WorkspaceStatus>
              </div>
            ))}
          </div>
        ) : (
          <p className="px-4 py-10 text-center text-sm font-semibold text-slate-500">
            No active teaching assignments exist for this academic year.
          </p>
        )}
      </WorkspaceSurface>

      <WorkspaceSurface>
        <WorkspaceSectionHeading
          title="Academic responsibilities"
          description="Current non-teaching academic responsibilities and scope."
          action={<ShieldCheck size={17} className="text-blue-950" />}
        />
        {workspace.responsibilities.length ? (
          <div className="divide-y divide-slate-100">
            {workspace.responsibilities.map((responsibility) => (
              <div
                key={responsibility.id}
                className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_180px] md:items-center"
              >
                <strong className="text-xs text-slate-950">
                  {readable(responsibility.responsibilityType)}
                </strong>
                <span className="text-xs font-semibold text-slate-600">
                  {[responsibility.campusName, responsibility.className, responsibility.sectionName]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
                <span className="text-[10px] font-semibold text-slate-500">
                  From {date(responsibility.effectiveFrom)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="px-4 py-10 text-center text-sm font-semibold text-slate-500">
            No additional academic responsibilities are assigned.
          </p>
        )}
      </WorkspaceSurface>
    </div>
  );
}

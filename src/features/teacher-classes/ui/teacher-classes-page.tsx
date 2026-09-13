import { ChevronRight, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { EmptyState, ErrorState, LoadingState } from "../../../shared/ui/page-state";
import { ModernSelect } from "../../../shared/ui/select";
import { useTeacherWorkspace } from "../../teacher-workspace/model/teacher-workspace-context";
import {
  WorkspacePageHeader,
  WorkspaceStatus,
  WorkspaceSurface,
} from "../../teacher-workspace/ui/teacher-workspace-primitives";

const groupLabel = (item: {
  className?: string;
  programName?: string;
  sectionName?: string;
  subjectBatchName?: string;
}) =>
  [item.className ?? item.programName, item.sectionName ?? item.subjectBatchName]
    .filter(Boolean)
    .join(" - ") || "Assigned Group";

export function TeacherClassesPage() {
  const { operatingContext, workspace, workspaceLoading, workspaceError } = useTeacherWorkspace();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"ALL" | "COMPLETE" | "INCOMPLETE">("ALL");

  const assignments = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (workspace?.assignments ?? []).filter((item) => {
      const matchesCampus =
        !operatingContext.campusId || item.campusId === operatingContext.campusId;
      const matchesSearch =
        !needle ||
        [
          item.className,
          item.programName,
          item.sectionName,
          item.subjectBatchName,
          item.subjectName,
          item.campusName,
        ]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(needle));
      const matchesStatus = status === "ALL" || item.status === status;
      return matchesCampus && matchesSearch && matchesStatus;
    });
  }, [operatingContext.campusId, search, status, workspace?.assignments]);

  if (workspaceLoading && !workspace) return <LoadingState label="Loading assigned classes" />;
  if (workspaceError) return <ErrorState message={workspaceError} />;
  if (!workspace) {
    return <ErrorState message="The authenticated user is not linked to an active employee." />;
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 p-4 sm:p-5 lg:p-6">
      <WorkspacePageHeader
        title="My Classes"
        description="Assigned classes, sections, subjects, and teaching groups for the current academic year."
      />

      <WorkspaceSurface>
        <div className="grid items-center gap-3 border-b border-slate-200/80 p-4 sm:grid-cols-[minmax(260px,1fr)_200px]">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search class, section, subject, or campus"
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-3 text-sm font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand-500 focus:bg-white"
            />
          </div>

          <ModernSelect
            aria-label="Allocation status"
            value={status}
            onValueChange={(value) => setStatus(value as typeof status)}
            options={[
              { label: "All allocation states", value: "ALL" },
              { label: "Fully scheduled", value: "COMPLETE" },
              { label: "Scheduling incomplete", value: "INCOMPLETE" },
            ]}
          />
        </div>

        {assignments.length ? (
          <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {assignments.map((item) => {
              const offeringId = item.subjectOfferingId || item.id;
              const isComplete = item.status === "COMPLETE";
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    navigate(`/teacher/class-workspace?offering=${encodeURIComponent(offeringId)}`)
                  }
                  className="group flex min-h-48 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-2xs transition-all hover:border-brand-400 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="inline-block rounded-lg border border-brand-100/60 bg-brand-50 px-2.5 py-1 text-xs font-extrabold text-brand-700">
                          {groupLabel(item)}
                        </span>
                        <h3 className="mt-2.5 text-base font-bold text-slate-900 transition-colors group-hover:text-brand-600">
                          {item.subjectName}
                        </h3>
                      </div>
                      <WorkspaceStatus tone={isComplete ? "success" : "warning"}>
                        {isComplete ? "Scheduled" : "Incomplete"}
                      </WorkspaceStatus>
                    </div>
                    <p className="mt-1.5 text-sm font-medium text-slate-500">
                      {item.componentType || "Theory"} · {item.campusName}
                    </p>
                    <p className="mt-3 text-xs font-semibold text-slate-500">
                      {item.scheduledPeriods} of {item.requiredPeriods} weekly periods scheduled
                    </p>
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-3 text-sm font-bold text-brand-600 group-hover:text-brand-700">
                    <span>Open Class Workspace</span>
                    <ChevronRight
                      size={16}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="No assigned classes found"
            description="No active teaching assignment matches the selected campus and filters."
          />
        )}
      </WorkspaceSurface>
    </div>
  );
}

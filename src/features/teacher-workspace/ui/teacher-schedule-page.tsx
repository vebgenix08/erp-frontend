import { Download, List, Maximize2, Minimize2, Table2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorState, LoadingState } from "../../../shared/ui/page-state";
import { cn } from "../../../shared/ui/utils";
import { useTeacherWorkspace } from "../model/teacher-workspace-context";
import { WorkspaceButton, WorkspaceStatus, WorkspaceSurface } from "./teacher-workspace-primitives";

const days = [
  ["MONDAY", "Monday"],
  ["TUESDAY", "Tuesday"],
  ["WEDNESDAY", "Wednesday"],
  ["THURSDAY", "Thursday"],
  ["FRIDAY", "Friday"],
  ["SATURDAY", "Saturday"],
] as const;

const dayOrder = new Map<string, number>(days.map(([key], index) => [key, index]));

function groupLabel(item: { className?: string; sectionName?: string; subjectBatchName?: string }) {
  return (
    [item.className, item.sectionName ?? item.subjectBatchName].filter(Boolean).join(" - ") ||
    "Assigned group"
  );
}

export function TeacherSchedulePage() {
  const { operatingContext, workspace, workspaceLoading, workspaceError } = useTeacherWorkspace();
  const [view, setView] = useState<"table" | "list">("table");
  const [focusMode, setFocusMode] = useState(false);

  useEffect(() => {
    if (!focusMode) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFocusMode(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [focusMode]);

  const entries = useMemo(
    () =>
      (workspace?.timetableEntries ?? [])
        .filter((item) => !operatingContext.campusId || item.campusId === operatingContext.campusId)
        .sort(
          (left, right) =>
            (dayOrder.get(left.dayOfWeek) ?? 99) - (dayOrder.get(right.dayOfWeek) ?? 99) ||
            left.startTime.localeCompare(right.startTime) ||
            groupLabel(left).localeCompare(groupLabel(right)),
        ),
    [operatingContext.campusId, workspace],
  );

  const slots = useMemo(() => {
    const unique = new Map<string, { startTime: string; endTime: string }>();
    for (const entry of entries) {
      unique.set(`${entry.startTime}|${entry.endTime}`, {
        startTime: entry.startTime,
        endTime: entry.endTime,
      });
    }
    return [...unique.values()].sort((left, right) =>
      left.startTime.localeCompare(right.startTime),
    );
  }, [entries]);

  const assignedGroups = useMemo(() => new Set(entries.map(groupLabel)).size, [entries]);

  if (workspaceLoading && !workspace) return <LoadingState label="Loading published timetable" />;
  if (workspaceError) return <ErrorState message={workspaceError} />;
  if (!workspace) {
    return (
      <ErrorState message="The authenticated user is not linked to an active teaching employee." />
    );
  }

  const downloadSchedule = () => {
    const rows = [
      ["Day", "Start", "End", "Subject", "Class / section", "Campus", "State"],
      ...entries.map((item) => [
        item.dayOfWeek,
        item.startTime,
        item.endTime,
        item.subjectName,
        groupLabel(item),
        item.campusName,
        item.state,
      ]),
    ];
    const csv = rows
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `my-teaching-timetable-${workspace.academicYear.name.replaceAll(" ", "-")}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      data-testid="teacher-timetable-shell"
      className={cn(
        "w-full",
        focusMode
          ? "fixed inset-0 z-[80] flex flex-col gap-4 overflow-hidden bg-slate-100 p-3 sm:p-5"
          : "mx-auto space-y-4 p-3 sm:p-4 lg:p-5",
      )}
    >
      <div
        className={cn(
          "flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-2xs sm:flex-row sm:items-center sm:justify-between",
          focusMode && "z-40 shrink-0",
        )}
      >
        <div>
          <h1 className="text-lg font-bold leading-tight text-slate-950">My Teaching Timetable</h1>
          <p className="mt-1 text-sm font-medium text-slate-600">
            All {entries.length} assigned periods across {assignedGroups} class or section
            {assignedGroups === 1 ? "" : "s"} at {operatingContext.campusName}.
          </p>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">
            {workspace.teacher.fullName} · {workspace.academicYear.name}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex h-9 rounded-lg border border-slate-200 bg-slate-50 p-0.5 shadow-2xs">
            <button
              type="button"
              aria-pressed={view === "table"}
              onClick={() => setView("table")}
              className={`flex items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-bold transition-colors ${view === "table" ? "bg-white text-brand-800 shadow-xs" : "text-slate-500 hover:text-slate-900"}`}
            >
              <Table2 size={14} /> Table
            </button>
            <button
              type="button"
              aria-pressed={view === "list"}
              onClick={() => setView("list")}
              className={`flex items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-bold transition-colors ${view === "list" ? "bg-white text-brand-800 shadow-xs" : "text-slate-500 hover:text-slate-900"}`}
            >
              <List size={14} /> List
            </button>
          </div>
          <WorkspaceButton
            icon={focusMode ? Minimize2 : Maximize2}
            onClick={() => setFocusMode((current) => !current)}
          >
            {focusMode ? "Exit full screen" : "Full screen"}
          </WorkspaceButton>
          <WorkspaceButton icon={Download} onClick={downloadSchedule} disabled={!entries.length}>
            Export
          </WorkspaceButton>
        </div>
      </div>

      <WorkspaceSurface className={cn("overflow-hidden", focusMode && "min-h-0 flex-1")}>
        {!entries.length ? (
          <EmptyState
            title="No published teaching periods"
            description="Published periods assigned to this teacher for the selected campus will appear here."
          />
        ) : view === "table" ? (
          <div className={cn("w-full overflow-auto", focusMode && "h-full")}>
            <table className="w-full min-w-[1050px] table-fixed border-collapse text-left">
              <thead className="sticky top-0 z-20">
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-extrabold uppercase text-slate-600">
                  <th className="sticky left-0 z-30 w-28 border-r border-slate-200 bg-slate-50 px-3 py-2.5 text-center">
                    Time
                  </th>
                  {days.map(([key, label]) => (
                    <th
                      key={key}
                      className="border-r border-slate-200 px-3 py-2.5 text-center last:border-r-0"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {slots.map((slot) => (
                  <tr key={`${slot.startTime}-${slot.endTime}`}>
                    <th className="sticky left-0 z-10 border-r border-slate-200 bg-slate-50 px-2 py-3 text-center align-top font-normal">
                      <strong className="block text-xs font-bold text-slate-950">
                        {slot.startTime}
                      </strong>
                      <span className="mt-0.5 block text-[11px] font-medium text-slate-500">
                        to {slot.endTime}
                      </span>
                    </th>
                    {days.map(([day]) => {
                      const matches = entries.filter(
                        (item) =>
                          item.dayOfWeek === day &&
                          item.startTime === slot.startTime &&
                          item.endTime === slot.endTime,
                      );
                      return (
                        <td
                          key={day}
                          className="border-r border-slate-200 p-1.5 align-top last:border-r-0"
                        >
                          {matches.length ? (
                            <div className="space-y-1.5">
                              {matches.map((item) => (
                                <div
                                  key={item.id}
                                  className={`min-h-[68px] rounded-md border p-2 shadow-2xs ${item.state === "CANCELLED" ? "border-rose-200 bg-rose-50 text-rose-950" : item.state === "SUBSTITUTION" ? "border-amber-200 bg-amber-50 text-amber-950" : "border-brand-200 bg-brand-50/70 text-slate-950"}`}
                                >
                                  <strong className="block text-xs font-bold leading-snug">
                                    {item.subjectName}
                                  </strong>
                                  <span className="mt-1 block text-[11px] font-semibold text-brand-800">
                                    {groupLabel(item)}
                                  </span>
                                  {matches.length > 1 ? (
                                    <span className="mt-1 block text-[10px] font-bold text-rose-700">
                                      Schedule conflict
                                    </span>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="min-h-[68px]" aria-label="No assigned period" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={cn("divide-y divide-slate-100 p-2", focusMode && "h-full overflow-auto")}>
            {entries.map((item) => (
              <div
                key={item.id}
                className="grid gap-3 rounded-md px-4 py-3 hover:bg-slate-50 sm:grid-cols-[130px_160px_minmax(0,1fr)_auto] sm:items-center"
              >
                <span className="text-xs font-bold text-slate-700">
                  {days.find(([key]) => key === item.dayOfWeek)?.[1] ?? item.dayOfWeek}
                </span>
                <strong className="text-xs font-bold text-slate-950">
                  {item.startTime} - {item.endTime}
                </strong>
                <div>
                  <strong className="block text-sm font-bold text-slate-950">
                    {item.subjectName}
                  </strong>
                  <small className="text-xs font-semibold text-brand-800">
                    {groupLabel(item)} · {item.componentType || "Theory"}
                  </small>
                </div>
                <WorkspaceStatus
                  tone={
                    item.state === "CANCELLED"
                      ? "danger"
                      : item.state === "SUBSTITUTION"
                        ? "warning"
                        : "neutral"
                  }
                >
                  {item.state === "PERMANENT" ? "Published" : item.state}
                </WorkspaceStatus>
              </div>
            ))}
          </div>
        )}
      </WorkspaceSurface>
    </div>
  );
}

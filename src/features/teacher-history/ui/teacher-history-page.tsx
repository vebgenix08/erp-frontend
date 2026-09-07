import { Download, History } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "../../../shared/ui/button";
import { ErrorState, LoadingState } from "../../../shared/ui/page-state";
import { useTeacherWorkspace } from "../../teacher-workspace/model/teacher-workspace-context";
import {
  WorkspacePageHeader,
  WorkspaceStatus,
  WorkspaceSurface,
} from "../../teacher-workspace/ui/teacher-workspace-primitives";
import { listTeacherAttendanceHistory, listTeacherMarksHistory } from "../api/teacher-history.api";
import type {
  TeacherAttendanceHistoryItem,
  TeacherMarksHistoryItem,
} from "../model/teacher-history.types";

type Mode = "ATTENDANCE" | "MARKS";
type Row = TeacherAttendanceHistoryItem | TeacherMarksHistoryItem;

const date = (value: string) =>
  new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(value),
  );
const group = (row: Row) =>
  [row.className, row.sectionName].filter(Boolean).join(" - ") || "Assigned group";

function download(mode: Mode, rows: Row[]) {
  const attendance = mode === "ATTENDANCE";
  const table = attendance
    ? [
        ["Date", "Class / section", "Subject", "Time", "Students", "Present", "Absent", "Status"],
        ...(rows as TeacherAttendanceHistoryItem[]).map((row) => [
          row.date,
          group(row),
          row.subjectName,
          `${row.startTime} - ${row.endTime}`,
          String(row.studentCount),
          String(row.presentCount),
          String(row.absentCount),
          row.status,
        ]),
      ]
    : [
        [
          "Assessment",
          "Class / section",
          "Subject",
          "Maximum marks",
          "Students",
          "Recorded",
          "Absent",
          "Pending",
          "Status",
        ],
        ...(rows as TeacherMarksHistoryItem[]).map((row) => [
          row.assessmentName,
          group(row),
          row.subjectName,
          String(row.maximumMarks),
          String(row.studentCount),
          String(row.recordedCount),
          String(row.absentCount),
          String(row.pendingCount),
          row.status,
        ]),
      ];
  const csv = table
    .map((values) => values.map((value) => `"${value.replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const anchor = document.createElement("a");
  anchor.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  anchor.download = `${mode.toLowerCase()}-history.csv`;
  anchor.click();
  URL.revokeObjectURL(anchor.href);
}

export function TeacherHistoryPage({ mode }: { mode: Mode }) {
  const { workspace, workspaceLoading, workspaceError } = useTeacherWorkspace();
  const [items, setItems] = useState<Row[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [offering, setOffering] = useState("");
  const [status, setStatus] = useState<"ALL" | "DRAFT" | "SUBMITTED">("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const list = mode === "ATTENDANCE" ? listTeacherAttendanceHistory : listTeacherMarksHistory;
  const load = useCallback(async () => {
    if (!workspace) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await list({
        academicYearId: workspace.academicYear.id,
        ...(offering ? { subjectOfferingId: offering } : {}),
        ...(status !== "ALL" ? { status } : {}),
        page,
        pageSize: 10,
      });
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to load history");
    } finally {
      setLoading(false);
    }
  }, [list, offering, page, status, workspace]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => setPage(1), [offering, status]);
  const assignmentOptions = useMemo(() => workspace?.assignments ?? [], [workspace]);

  if (workspaceLoading && !workspace) return <LoadingState label="Loading history" />;
  if (workspaceError) return <ErrorState message={workspaceError} />;
  if (!workspace)
    return <ErrorState message="The authenticated user is not linked to an active employee." />;
  const title = mode === "ATTENDANCE" ? "Attendance History" : "Marks Submission History";
  const attendance = mode === "ATTENDANCE";
  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5 p-4 sm:p-5 lg:p-6">
      <WorkspacePageHeader
        title={title}
        description={
          attendance
            ? "Saved and submitted attendance sessions in your assigned teaching scope."
            : "Draft and submitted marks registers for assessments in your assigned subjects."
        }
        actions={
          <Button variant="outline" disabled={!items.length} onClick={() => download(mode, items)}>
            <Download className="mr-2 h-4 w-4" />
            Export page
          </Button>
        }
      />
      <WorkspaceSurface>
        <div className="grid gap-3 border-b border-slate-200 p-4 md:grid-cols-2">
          <label className="text-xs font-bold text-slate-600">
            Assigned class and subject
            <select
              value={offering}
              onChange={(event) => setOffering(event.target.value)}
              className="mt-1.5 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-900"
            >
              <option value="">All assigned classes and subjects</option>
              {assignmentOptions.map((assignment) => (
                <option key={assignment.id} value={assignment.subjectOfferingId}>
                  {[
                    assignment.className ?? assignment.programName,
                    assignment.sectionName ?? assignment.subjectBatchName,
                    assignment.subjectName,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-bold text-slate-600">
            Status
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as typeof status)}
              className="mt-1.5 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-900"
            >
              <option value="ALL">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Submitted</option>
            </select>
          </label>
        </div>
        {error ? (
          <ErrorState message={error} retry={() => void load()} />
        ) : loading ? (
          <LoadingState label={`Loading ${title.toLowerCase()}`} />
        ) : items.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                  <th className="px-4 py-3">{attendance ? "Date and time" : "Assessment"}</th>
                  <th className="px-4 py-3">Class / section</th>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Students</th>
                  <th className="px-4 py-3">{attendance ? "Present" : "Recorded"}</th>
                  <th className="px-4 py-3">Absent</th>
                  {!attendance && <th className="px-4 py-3">Pending</th>}
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) =>
                  attendance
                    ? (() => {
                        const row = item as TeacherAttendanceHistoryItem;
                        return (
                          <tr key={row.id} className="border-b border-slate-100">
                            <td className="px-4 py-3">
                              <strong className="block">{date(row.date)}</strong>
                              <small className="text-slate-500">
                                {row.startTime} - {row.endTime}
                              </small>
                            </td>
                            <td className="px-4 py-3 font-semibold">{group(row)}</td>
                            <td className="px-4 py-3 font-semibold">{row.subjectName}</td>
                            <td className="px-4 py-3">{row.studentCount}</td>
                            <td className="px-4 py-3 font-bold text-blue-950">
                              {row.presentCount}
                            </td>
                            <td className="px-4 py-3 font-bold text-rose-700">{row.absentCount}</td>
                            <td className="px-4 py-3">
                              <WorkspaceStatus
                                tone={row.status === "SUBMITTED" ? "success" : "warning"}
                              >
                                {row.status === "SUBMITTED" ? "Submitted" : "Draft"}
                              </WorkspaceStatus>
                            </td>
                          </tr>
                        );
                      })()
                    : (() => {
                        const row = item as TeacherMarksHistoryItem;
                        return (
                          <tr key={row.id} className="border-b border-slate-100">
                            <td className="px-4 py-3">
                              <strong className="block">{row.assessmentName}</strong>
                              <small className="text-slate-500">Maximum {row.maximumMarks}</small>
                            </td>
                            <td className="px-4 py-3 font-semibold">{group(row)}</td>
                            <td className="px-4 py-3 font-semibold">{row.subjectName}</td>
                            <td className="px-4 py-3">{row.studentCount}</td>
                            <td className="px-4 py-3 font-bold text-blue-950">
                              {row.recordedCount}
                            </td>
                            <td className="px-4 py-3 font-bold text-rose-700">{row.absentCount}</td>
                            <td className="px-4 py-3 font-bold text-amber-700">
                              {row.pendingCount}
                            </td>
                            <td className="px-4 py-3">
                              <WorkspaceStatus
                                tone={row.status === "SUBMITTED" ? "success" : "warning"}
                              >
                                {row.status === "SUBMITTED" ? "Submitted" : "Draft"}
                              </WorkspaceStatus>
                            </td>
                          </tr>
                        );
                      })(),
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
            <History className="h-7 w-7 text-slate-300" />
            <strong className="mt-3 text-sm text-slate-900">No {title.toLowerCase()} found</strong>
            <p className="mt-1 max-w-md text-xs font-medium text-slate-500">
              No persisted record matches the assigned subject and status filters.
            </p>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs font-semibold text-slate-500">
          <span>{total} records</span>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((value) => value - 1)}
            >
              Previous
            </Button>
            <span>
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((value) => value + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </WorkspaceSurface>
    </div>
  );
}

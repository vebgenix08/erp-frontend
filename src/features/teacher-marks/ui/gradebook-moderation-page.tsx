import { CheckCircle2, LockKeyhole, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorState, LoadingState } from "../../../shared/ui/page-state";
import { ModernSelect } from "../../../shared/ui/select";
import {
  WorkspaceAlert,
  WorkspaceButton,
  WorkspacePageHeader,
  WorkspaceStatus,
  WorkspaceSurface,
} from "../../teacher-workspace/ui/teacher-workspace-primitives";
import { useTeacherWorkspace } from "../../teacher-workspace/model/teacher-workspace-context";
import { getMarksModerationQueue, moderateMarksSheet } from "../api/teacher-marks.api";
import type { MarksModerationItem, MarksSheetStatus } from "../model/teacher-marks.types";

const statusTone = (status: MarksSheetStatus) => {
  if (status === "LOCKED" || status === "APPROVED") return "success" as const;
  if (status === "CHANGES_REQUESTED") return "danger" as const;
  return status === "SUBMITTED" ? ("warning" as const) : ("neutral" as const);
};

export function GradebookModerationPage() {
  const { operatingContext } = useTeacherWorkspace();
  const [items, setItems] = useState<MarksModerationItem[]>([]);
  const [status, setStatus] = useState<"ALL" | MarksSheetStatus>("SUBMITTED");
  const [selectedId, setSelectedId] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getMarksModerationQueue({
        ...(operatingContext.academicYearId
          ? { academicYearId: operatingContext.academicYearId }
          : {}),
        ...(operatingContext.campusId ? { campusId: operatingContext.campusId } : {}),
        ...(status !== "ALL" ? { status } : {}),
      });
      setItems(result.items);
      setSelectedId((current) =>
        result.items.some((item) => item.sheet.id === current)
          ? current
          : (result.items[0]?.sheet.id ?? ""),
      );
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to load gradebook moderation");
    } finally {
      setLoading(false);
    }
  }, [operatingContext.academicYearId, operatingContext.campusId, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = useMemo(
    () => items.find((item) => item.sheet.id === selectedId) ?? items[0],
    [items, selectedId],
  );

  async function transition(action: "APPROVE" | "RETURN" | "LOCK") {
    if (!selected) return;
    if (action === "RETURN" && !note.trim()) {
      setError("Explain what the teacher must correct before returning the gradebook.");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await moderateMarksSheet({
        sheetId: selected.sheet.id,
        expectedVersion: selected.sheet.version,
        action,
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      setNotice(
        action === "APPROVE"
          ? "Gradebook approved. It is ready for final locking."
          : action === "LOCK"
            ? "Results locked. Teacher edits are disabled."
            : "Gradebook returned with correction instructions.",
      );
      setNote("");
      await load();
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to update gradebook status");
    } finally {
      setBusy(false);
    }
  }

  if (loading && !items.length) return <LoadingState label="Loading gradebooks for moderation" />;
  if (error && !items.length) return <ErrorState message={error} retry={() => void load()} />;

  return (
    <div className="mx-auto w-full max-w-[1700px] space-y-5 p-4 sm:p-5 lg:p-6">
      <WorkspacePageHeader
        title="Gradebook Moderation"
        description="Review teacher submissions, calculated grades, rubric evidence and comments before results are locked."
        actions={
          <div className="w-52">
            <ModernSelect
              aria-label="Gradebook status"
              value={status}
              onValueChange={(value) => setStatus(value as typeof status)}
              options={[
                { value: "ALL", label: "All gradebooks" },
                { value: "SUBMITTED", label: "Awaiting moderation" },
                { value: "CHANGES_REQUESTED", label: "Returned" },
                { value: "APPROVED", label: "Approved" },
                { value: "LOCKED", label: "Locked" },
              ]}
            />
          </div>
        }
      />

      {notice ? <WorkspaceAlert tone="success">{notice}</WorkspaceAlert> : null}
      {error ? <WorkspaceAlert tone="danger">{error}</WorkspaceAlert> : null}

      {!items.length ? (
        <WorkspaceSurface>
          <EmptyState
            title="No gradebooks in this view"
            description="Change the status filter or wait for teachers to submit marks."
          />
        </WorkspaceSurface>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
          <WorkspaceSurface className="h-fit">
            <div className="border-b border-slate-200 p-4">
              <h2 className="font-semibold text-slate-950">Moderation queue</h2>
              <p className="mt-1 text-xs text-slate-500">{items.length} gradebooks</p>
            </div>
            <div className="divide-y divide-slate-100">
              {items.map((item) => (
                <button
                  key={item.sheet.id}
                  type="button"
                  onClick={() => setSelectedId(item.sheet.id)}
                  className={`w-full p-4 text-left transition-colors ${selected?.sheet.id === item.sheet.id ? "bg-blue-50" : "hover:bg-slate-50"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <strong className="text-sm text-slate-950">{item.sheet.subjectName}</strong>
                      <p className="mt-1 text-xs text-slate-500">
                        {[item.sheet.className, item.sheet.sectionName].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <WorkspaceStatus tone={statusTone(item.sheet.status)}>
                      {item.sheet.status.replaceAll("_", " ")}
                    </WorkspaceStatus>
                  </div>
                  <p className="mt-3 text-xs font-medium text-slate-700">
                    {item.sheet.teacherName ?? item.sheet.employeeId ?? "Teacher"} ·{" "}
                    {item.assessment.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.recorded} recorded · {item.failed} below pass rule
                  </p>
                </button>
              ))}
            </div>
          </WorkspaceSurface>

          {selected ? (
            <WorkspaceSurface>
              <div className="flex flex-col gap-4 border-b border-slate-200 p-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">
                    {selected.sheet.subjectName} · {selected.assessment.name}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {selected.sheet.teacherName ?? selected.sheet.employeeId ?? "Teacher"} ·{" "}
                    {selected.sheet.className} · {selected.sheet.sectionName}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    Maximum {selected.assessment.maximumMarks} · Pass{" "}
                    {selected.assessment.passMarks}
                    {selected.assessment.scoringMode === "RUBRIC"
                      ? ` · ${selected.assessment.rubricCriteria.length} rubric criteria`
                      : " · Direct marks"}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <Metric label="Average" value={`${selected.averagePercentage ?? 0}%`} />
                  <Metric label="Passed" value={String(selected.passed)} />
                  <Metric label="Below pass" value={String(selected.failed)} />
                </div>
              </div>

              {selected.sheet.moderationNote ? (
                <WorkspaceAlert tone="info">{selected.sheet.moderationNote}</WorkspaceAlert>
              ) : null}

              <div
                className="overflow-x-auto"
                role="region"
                aria-label="Gradebook student results"
                tabIndex={0}
              >
                <table className="min-w-[820px] w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Marks</th>
                      <th className="px-4 py-3">Percentage</th>
                      <th className="px-4 py-3">Weighted</th>
                      <th className="px-4 py-3">Grade</th>
                      <th className="px-4 py-3">Result</th>
                      <th className="px-4 py-3">Comment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selected.sheet.students.map((student) => (
                      <tr key={student.studentId}>
                        <td className="px-4 py-3">
                          <strong className="block text-slate-950">{student.studentName}</strong>
                          <span className="text-xs text-slate-500">
                            {student.rollNumber ? `Roll ${student.rollNumber}` : "No roll number"}
                          </span>
                        </td>
                        <td className="px-4 py-3">{student.status.replaceAll("_", " ")}</td>
                        <td className="px-4 py-3 tabular-nums">{student.marks ?? "—"}</td>
                        <td className="px-4 py-3 tabular-nums">
                          {student.percentage == null ? "—" : `${student.percentage}%`}
                        </td>
                        <td className="px-4 py-3 tabular-nums">
                          {student.weightedScore == null
                            ? "—"
                            : `${student.weightedScore}/${selected.assessment.weightage}`}
                        </td>
                        <td className="px-4 py-3">{student.gradeCode ?? "—"}</td>
                        <td className="px-4 py-3">
                          {student.passed == null ? (
                            "—"
                          ) : (
                            <WorkspaceStatus tone={student.passed ? "success" : "danger"}>
                              {student.passed ? "Pass" : "Not passed"}
                            </WorkspaceStatus>
                          )}
                        </td>
                        <td className="max-w-xs px-4 py-3 text-xs text-slate-600">
                          {student.comment ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selected.sheet.status === "SUBMITTED" || selected.sheet.status === "APPROVED" ? (
                <div className="space-y-3 border-t border-slate-200 p-4">
                  {selected.sheet.status === "SUBMITTED" ? (
                    <textarea
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      placeholder="Moderation note or correction instructions"
                      className="min-h-24 w-full rounded-md border border-slate-200 p-3 text-sm outline-none focus:border-slate-900"
                    />
                  ) : null}
                  <div className="flex flex-wrap justify-end gap-2">
                    {selected.sheet.status === "SUBMITTED" ? (
                      <>
                        <WorkspaceButton
                          icon={RotateCcw}
                          variant="danger"
                          disabled={busy}
                          onClick={() => void transition("RETURN")}
                        >
                          Return for correction
                        </WorkspaceButton>
                        <WorkspaceButton
                          icon={CheckCircle2}
                          variant="primary"
                          disabled={busy}
                          onClick={() => void transition("APPROVE")}
                        >
                          Approve gradebook
                        </WorkspaceButton>
                      </>
                    ) : (
                      <WorkspaceButton
                        icon={LockKeyhole}
                        variant="primary"
                        disabled={busy}
                        onClick={() => void transition("LOCK")}
                      >
                        Lock final results
                      </WorkspaceButton>
                    )}
                  </div>
                </div>
              ) : null}
            </WorkspaceSurface>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xl font-semibold tabular-nums text-slate-950">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

import { Download, Save, Send, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  getTeacherMarksWorkspace,
  saveTeacherMarks,
} from "../../teacher-marks/api/teacher-marks.api";
import type {
  StudentMarkStatus,
  TeacherMarksWorkspace,
} from "../../teacher-marks/model/teacher-marks.types";
import { EmptyState, ErrorState, LoadingState } from "../../../shared/ui/page-state";
import { useTeacherWorkspace } from "../model/teacher-workspace-context";
import { ModernSelect } from "../../../shared/ui/select";
import { exportRowsToExcel } from "../../../shared/lib/tabular-export";
import {
  WorkspaceAlert,
  WorkspaceButton,
  WorkspacePageHeader,
  WorkspaceStatus,
  WorkspaceSurface,
} from "./teacher-workspace-primitives";

interface DraftMark {
  status: StudentMarkStatus;
  marks: string;
  comment: string;
  rubricScores: Record<string, string>;
}

const groupName = (workspace: TeacherMarksWorkspace) =>
  [
    workspace.selectedOffering?.className,
    workspace.selectedOffering?.sectionName ?? workspace.selectedOffering?.subjectBatchName,
  ]
    .filter(Boolean)
    .join(" - ") || "Assigned group";

function previewResult(
  entry: DraftMark,
  assessment: NonNullable<TeacherMarksWorkspace["selectedAssessment"]>,
) {
  if (entry.status !== "RECORDED") return null;
  const marks =
    assessment.scoringMode === "RUBRIC"
      ? assessment.rubricCriteria.reduce(
          (sum, criterion) => sum + Number(entry.rubricScores[criterion.id] || 0),
          0,
        )
      : Number(entry.marks);
  if (!Number.isFinite(marks)) return null;
  const percentage = Math.round(((marks * 100) / assessment.maximumMarks) * 100) / 100;
  const weightedScore = Math.round(((percentage * assessment.weightage) / 100) * 100) / 100;
  const grade = assessment.gradeScale.find(
    (band) => percentage >= band.minimumPercentage && percentage <= band.maximumPercentage,
  );
  return { marks, percentage, weightedScore, grade, passed: marks >= assessment.passMarks };
}

export function TeacherMarksPage() {
  const { operatingContext } = useTeacherWorkspace();
  const [params, setParams] = useSearchParams();
  const requestedOfferingId = params.get("offering") ?? "";
  const [workspace, setWorkspace] = useState<TeacherMarksWorkspace | null>(null);
  const [offeringId, setOfferingId] = useState(requestedOfferingId);
  const [assessmentId, setAssessmentId] = useState("");
  const [draft, setDraft] = useState<Record<string, DraftMark>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(
    async (selection?: { offeringId?: string; assessmentId?: string }) => {
      setLoading(true);
      setError(null);
      try {
        const result = await getTeacherMarksWorkspace({
          ...(operatingContext.academicYearId
            ? { academicYearId: operatingContext.academicYearId }
            : {}),
          ...(operatingContext.campusId ? { campusId: operatingContext.campusId } : {}),
          ...(selection?.offeringId ? { subjectOfferingId: selection.offeringId } : {}),
          ...(selection?.assessmentId ? { assessmentId: selection.assessmentId } : {}),
        });
        setWorkspace(result);
        setOfferingId(result.selectedOffering?.id ?? "");
        setAssessmentId(result.selectedAssessment?.id ?? "");
        setDraft(
          Object.fromEntries(
            result.students.map((student) => [
              student.studentId,
              {
                status: student.status,
                marks: student.marks == null ? "" : String(student.marks),
                comment: student.comment ?? "",
                rubricScores: Object.fromEntries(
                  (student.rubricScores ?? []).map((score) => [
                    score.criterionId,
                    String(score.score),
                  ]),
                ),
              },
            ]),
          ),
        );
      } catch (value) {
        setWorkspace(null);
        setError(value instanceof Error ? value.message : "Unable to load marks register");
      } finally {
        setLoading(false);
      }
    },
    [operatingContext.academicYearId, operatingContext.campusId],
  );

  useEffect(() => {
    void load(requestedOfferingId ? { offeringId: requestedOfferingId } : undefined);
  }, [load, requestedOfferingId]);

  const recorded = useMemo(
    () => Object.values(draft).filter((entry) => entry.status !== "NOT_RECORDED").length,
    [draft],
  );

  function updateStatus(studentId: string, status: StudentMarkStatus) {
    setDraft((current) => ({
      ...current,
      [studentId]: {
        status,
        marks: status === "RECORDED" ? (current[studentId]?.marks ?? "") : "",
        comment: current[studentId]?.comment ?? "",
        rubricScores: current[studentId]?.rubricScores ?? {},
      },
    }));
  }

  async function persist(submit: boolean) {
    const assessment = workspace?.selectedAssessment;
    const offering = workspace?.selectedOffering;
    if (!workspace || !assessment || !offering || !workspace.canEdit) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await saveTeacherMarks({
        academicYearId: workspace.academicYear.id,
        subjectOfferingId: offering.id,
        assessmentId: assessment.id,
        ...(workspace.sheet ? { expectedVersion: workspace.sheet.version } : {}),
        submit,
        students: workspace.students.map((student) => {
          const entry = draft[student.studentId] ?? {
            status: "NOT_RECORDED" as const,
            marks: "",
            comment: "",
            rubricScores: {},
          };
          return {
            studentId: student.studentId,
            status: entry.status,
            ...(entry.status === "RECORDED" && entry.marks !== ""
              ? { marks: Number(entry.marks) }
              : {}),
            ...(workspace.selectedAssessment?.commentsEnabled && entry.comment.trim()
              ? { comment: entry.comment.trim() }
              : {}),
            ...(workspace.selectedAssessment?.scoringMode === "RUBRIC" &&
            entry.status === "RECORDED"
              ? {
                  rubricScores: workspace.selectedAssessment.rubricCriteria.map((criterion) => ({
                    criterionId: criterion.id,
                    score: Number(entry.rubricScores[criterion.id] ?? ""),
                  })),
                }
              : {}),
          };
        }),
      });
      setNotice(
        submit
          ? assessment.moderationRequired
            ? "Marks submitted for HOD moderation."
            : "Marks submitted for final locking."
          : "Marks draft saved.",
      );
      await load({ offeringId: offering.id, assessmentId: assessment.id });
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to save marks");
    } finally {
      setBusy(false);
    }
  }

  async function downloadTemplate() {
    const assessment = workspace?.selectedAssessment;
    if (!workspace || !assessment) return;
    const columns: Array<{
      header: string;
      value: (student: TeacherMarksWorkspace["students"][number]) => string | number;
      width?: number;
    }> = [
      { header: "Registration Number", value: (student) => student.registrationNumber, width: 22 },
      { header: "Roll Number", value: (student) => student.rollNumber ?? "", width: 14 },
      { header: "Student Name", value: (student) => student.studentName, width: 28 },
      { header: "Status", value: (student) => student.status, width: 18 },
    ];
    if (assessment.scoringMode === "RUBRIC") {
      assessment.rubricCriteria.forEach((criterion) =>
        columns.push({
          header: `Rubric: ${criterion.name} / ${criterion.maximumMarks}`,
          value: (student) =>
            student.rubricScores?.find((score) => score.criterionId === criterion.id)?.score ?? "",
          width: 24,
        }),
      );
    } else {
      columns.push({
        header: `Marks / ${assessment.maximumMarks}`,
        value: (student) => student.marks ?? "",
        width: 16,
      });
    }
    if (assessment.commentsEnabled) {
      columns.push({
        header: "Teacher Comment",
        value: (student) => student.comment ?? "",
        width: 36,
      });
    }
    await exportRowsToExcel(
      `${assessment.name}-${groupName(workspace)}-gradebook`.replace(/[^a-z0-9-]+/gi, "-"),
      "Gradebook",
      columns,
      workspace.students,
    );
  }

  async function importWorkbook(file: File) {
    const assessment = workspace?.selectedAssessment;
    if (!workspace || !assessment || !workspace.canEdit) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const { default: ExcelJS } = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());
      const worksheet = workbook.worksheets[0];
      if (!worksheet) throw new Error("The workbook does not contain a worksheet");
      const headers = new Map<string, number>();
      worksheet.getRow(1).eachCell((cell, column) => {
        headers.set(cell.text.trim().toLowerCase(), column);
      });
      const registrationColumn = headers.get("registration number");
      const rollColumn = headers.get("roll number");
      const statusColumn = headers.get("status");
      const commentColumn = headers.get("teacher comment");
      const marksColumn = [...headers.entries()].find(([header]) =>
        header.startsWith("marks /"),
      )?.[1];
      if (!registrationColumn && !rollColumn)
        throw new Error("Registration Number or Roll Number column is required");
      const byRegistration = new Map(
        workspace.students.map((student) => [student.registrationNumber.toLowerCase(), student]),
      );
      const byRoll = new Map(
        workspace.students
          .filter((student) => student.rollNumber)
          .map((student) => [student.rollNumber!.toLowerCase(), student]),
      );
      const updates: Record<string, DraftMark> = {};
      const unmatched: string[] = [];
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const registration = registrationColumn
          ? row.getCell(registrationColumn).text.trim().toLowerCase()
          : "";
        const roll = rollColumn ? row.getCell(rollColumn).text.trim().toLowerCase() : "";
        if (!registration && !roll) return;
        const student = byRegistration.get(registration) ?? byRoll.get(roll);
        if (!student) {
          unmatched.push(registration || roll);
          return;
        }
        const rawStatus = statusColumn
          ? row.getCell(statusColumn).text.trim().toUpperCase().replaceAll(" ", "_")
          : "RECORDED";
        const status: StudentMarkStatus = ["RECORDED", "ABSENT", "NOT_RECORDED"].includes(rawStatus)
          ? (rawStatus as StudentMarkStatus)
          : "RECORDED";
        const rubricScores = Object.fromEntries(
          assessment.rubricCriteria.map((criterion) => {
            const column = [...headers.entries()].find(([header]) =>
              header.startsWith(`rubric: ${criterion.name.toLowerCase()} /`),
            )?.[1];
            return [criterion.id, column ? row.getCell(column).text.trim() : ""];
          }),
        );
        updates[student.studentId] = {
          status,
          marks: marksColumn ? row.getCell(marksColumn).text.trim() : "",
          comment: commentColumn ? row.getCell(commentColumn).text.trim() : "",
          rubricScores,
        };
      });
      if (!Object.keys(updates).length) throw new Error("No matching student rows were found");
      setDraft((current) => ({ ...current, ...updates }));
      setNotice(
        `${Object.keys(updates).length} student rows imported${unmatched.length ? `; ${unmatched.length} unmatched rows skipped` : ""}. Review before saving.`,
      );
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to import gradebook workbook");
    } finally {
      setBusy(false);
      if (importInputRef.current) importInputRef.current.value = "";
    }
  }

  if (loading && !workspace) return <LoadingState label="Loading assigned marks register" />;
  if (error && !workspace) return <ErrorState message={error} retry={() => void load()} />;

  const assessment = workspace?.selectedAssessment;
  const students = workspace?.students ?? [];
  const locked = workspace?.sheet?.status === "LOCKED";

  return (
    <div className="mx-auto w-full max-w-[1700px] space-y-5 p-4 sm:p-5 lg:p-6">
      <WorkspacePageHeader
        title="Marks Register"
        description="Enter direct marks or rubric scores, import an Excel workbook, review calculated grades and submit results for moderation."
        actions={
          <>
            <WorkspaceButton
              icon={Download}
              disabled={!workspace?.selectedAssessment || !students.length}
              onClick={() => void downloadTemplate()}
            >
              Excel template
            </WorkspaceButton>
            <WorkspaceButton
              icon={Upload}
              disabled={busy || !workspace?.canEdit || !students.length}
              onClick={() => importInputRef.current?.click()}
            >
              Import Excel
            </WorkspaceButton>
            <WorkspaceButton
              icon={Save}
              disabled={busy || !workspace?.canEdit || !students.length}
              onClick={() => void persist(false)}
            >
              Save draft
            </WorkspaceButton>
            <WorkspaceButton
              variant="primary"
              icon={Send}
              disabled={busy || !workspace?.canEdit || !students.length}
              onClick={() => void persist(true)}
            >
              {workspace?.selectedAssessment?.moderationRequired
                ? "Submit for moderation"
                : "Submit marks"}
            </WorkspaceButton>
          </>
        }
      />

      <input
        ref={importInputRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        aria-label="Import gradebook Excel workbook"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void importWorkbook(file);
        }}
      />

      {notice ? <WorkspaceAlert tone="success">{notice}</WorkspaceAlert> : null}
      {error ? <WorkspaceAlert tone="danger">{error}</WorkspaceAlert> : null}
      {workspace?.sheet?.status === "CHANGES_REQUESTED" ? (
        <WorkspaceAlert tone="info">
          Changes requested by the moderator
          {workspace.sheet.moderationNote ? `: ${workspace.sheet.moderationNote}` : "."}
        </WorkspaceAlert>
      ) : null}

      <WorkspaceSurface>
        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4 items-center">
          <div className="xl:col-span-2">
            <span className="mb-1.5 block text-[10px] font-extrabold uppercase text-slate-500">
              Assigned Class and Subject
            </span>
            <ModernSelect
              aria-label="Assigned class and subject"
              value={offeringId}
              disabled={!workspace?.offerings.length}
              onValueChange={(value) => {
                setOfferingId(value);
                setAssessmentId("");
                setParams({ offering: value }, { replace: true });
              }}
              placeholder={
                workspace?.offerings.length ? "Select a subject offering" : "No assigned subjects"
              }
              options={(workspace?.offerings ?? []).map((offering) => ({
                label: [
                  offering.className,
                  offering.sectionName ?? offering.subjectBatchName,
                  offering.subjectName,
                ]
                  .filter(Boolean)
                  .join(" · "),
                value: offering.id,
              }))}
            />
          </div>
          <div>
            <span className="mb-1.5 block text-[10px] font-extrabold uppercase text-slate-500">
              Assessment
            </span>
            <ModernSelect
              aria-label="Assessment"
              value={assessmentId}
              disabled={!workspace?.assessments.length}
              onValueChange={(value) => {
                setAssessmentId(value);
                void load({ offeringId, assessmentId: value });
              }}
              placeholder={
                workspace?.assessments.length ? "Select an assessment" : "No open assessments"
              }
              options={(workspace?.assessments ?? []).map((item) => ({
                label: `${item.name} · ${item.maximumMarks} marks`,
                value: item.id,
              }))}
            />
          </div>
          <div>
            <span className="mb-1.5 block text-[10px] font-extrabold uppercase text-slate-500">
              Submission State
            </span>
            <div className="flex h-10 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 shadow-2xs">
              <WorkspaceStatus tone={locked ? "success" : workspace?.sheet ? "warning" : "neutral"}>
                {workspace?.sheet?.status ?? "Not started"}
              </WorkspaceStatus>
            </div>
          </div>
        </div>
      </WorkspaceSurface>

      {!workspace?.selectedOffering ? (
        <WorkspaceSurface>
          <EmptyState
            title="No teaching assignment"
            description="No active subject offering is assigned to this teacher in the selected academic year."
          />
        </WorkspaceSurface>
      ) : !assessment ? (
        <WorkspaceSurface>
          <EmptyState
            title="No configured assessment"
            description="A Tenant Admin or authorized academic owner must open an assessment before marks can be recorded."
          />
        </WorkspaceSurface>
      ) : !students.length ? (
        <WorkspaceSurface>
          <EmptyState
            title="No active students"
            description="The selected offering has no active roster."
          />
        </WorkspaceSurface>
      ) : (
        <WorkspaceSurface>
          <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-slate-950">
                {assessment.name} · {groupName(workspace)}
              </h2>
              <p className="mt-1 text-xs font-medium text-slate-500">
                Maximum {assessment.maximumMarks} marks · {recorded} of {students.length} students
                recorded
              </p>
            </div>
            <WorkspaceStatus tone={assessment.status === "OPEN" ? "warning" : "neutral"}>
              {assessment.status}
            </WorkspaceStatus>
          </div>
          <WorkspaceAlert>
            Attendance covers {assessment.attendanceWindowStart} through{" "}
            {assessment.attendanceWindowEnd}. It is calculated only from submitted
            subject-attendance sessions.
          </WorkspaceAlert>
          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-extrabold uppercase text-slate-500">
                  <th className="px-4 py-3">Roll / Registration</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Classes attended / held</th>
                  <th className="px-4 py-3">Attendance</th>
                  <th className="px-4 py-3">Result state</th>
                  {assessment.scoringMode === "RUBRIC" ? (
                    assessment.rubricCriteria.map((criterion) => (
                      <th key={criterion.id} className="px-4 py-3">
                        {criterion.name} / {criterion.maximumMarks}
                      </th>
                    ))
                  ) : (
                    <th className="px-4 py-3">Marks / {assessment.maximumMarks}</th>
                  )}
                  <th className="px-4 py-3">Calculated result</th>
                  {assessment.commentsEnabled ? (
                    <th className="px-4 py-3">Teacher comment</th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((student) => {
                  const entry = draft[student.studentId] ?? {
                    status: "NOT_RECORDED" as const,
                    marks: "",
                    comment: "",
                    rubricScores: {},
                  };
                  const result = previewResult(entry, assessment);
                  return (
                    <tr key={student.studentId}>
                      <td className="px-4 py-3 text-xs font-bold text-slate-600">
                        <span className="block">
                          {student.rollNumber ? `Roll ${student.rollNumber}` : "Roll pending"}
                        </span>
                        <span className="mt-0.5 block font-medium text-slate-400">
                          {student.registrationNumber}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <strong className="text-xs text-slate-950">{student.studentName}</strong>
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-slate-700">
                        {student.attendanceAttended} / {student.attendanceHeld}
                      </td>
                      <td className="px-4 py-3">
                        <WorkspaceStatus
                          tone={
                            student.attendancePercentage == null
                              ? "neutral"
                              : student.attendancePercentage >= 85
                                ? "success"
                                : "warning"
                          }
                        >
                          {student.attendancePercentage == null
                            ? "No submitted classes"
                            : `${student.attendancePercentage}%`}
                        </WorkspaceStatus>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          aria-label={`${student.studentName} result state`}
                          disabled={!workspace.canEdit}
                          value={entry.status}
                          onChange={(event) =>
                            updateStatus(student.studentId, event.target.value as StudentMarkStatus)
                          }
                          className="h-10 rounded-md border border-slate-200 bg-white px-3 text-xs font-bold disabled:bg-slate-100"
                        >
                          <option value="NOT_RECORDED">Not recorded</option>
                          <option value="RECORDED">Recorded</option>
                          <option value="ABSENT">Absent</option>
                        </select>
                      </td>
                      {assessment.scoringMode === "RUBRIC" ? (
                        assessment.rubricCriteria.map((criterion) => (
                          <td key={criterion.id} className="px-4 py-3">
                            <input
                              aria-label={`${student.studentName} ${criterion.name} score`}
                              disabled={!workspace.canEdit || entry.status !== "RECORDED"}
                              inputMode="decimal"
                              value={entry.rubricScores[criterion.id] ?? ""}
                              onChange={(event) =>
                                setDraft((current) => ({
                                  ...current,
                                  [student.studentId]: {
                                    ...(current[student.studentId] ?? entry),
                                    status: "RECORDED",
                                    rubricScores: {
                                      ...(current[student.studentId]?.rubricScores ?? {}),
                                      [criterion.id]: event.target.value.replace(/[^0-9.]/g, ""),
                                    },
                                  },
                                }))
                              }
                              className="h-10 w-24 rounded-md border border-slate-200 px-3 text-sm font-extrabold outline-none focus:border-slate-900 disabled:bg-slate-100"
                            />
                          </td>
                        ))
                      ) : (
                        <td className="px-4 py-3">
                          <input
                            aria-label={`${student.studentName} marks`}
                            disabled={!workspace.canEdit || entry.status !== "RECORDED"}
                            type="text"
                            inputMode="decimal"
                            value={entry.marks}
                            onChange={(event) =>
                              setDraft((current) => ({
                                ...current,
                                [student.studentId]: {
                                  ...(current[student.studentId] ?? entry),
                                  status: "RECORDED",
                                  marks: event.target.value.replace(/[^0-9.]/g, ""),
                                },
                              }))
                            }
                            className="h-10 w-28 rounded-md border border-slate-200 px-3 text-sm font-extrabold outline-none focus:border-slate-900 disabled:bg-slate-100"
                          />
                        </td>
                      )}
                      <td className="px-4 py-3 text-xs">
                        {result ? (
                          <div className="space-y-1">
                            <strong className="block text-slate-900">
                              {result.marks}/{assessment.maximumMarks} · {result.percentage}% ·{" "}
                              {result.weightedScore}/{assessment.weightage} weighted
                            </strong>
                            <WorkspaceStatus tone={result.passed ? "success" : "danger"}>
                              {result.grade?.code
                                ? `${result.grade.code} · ${result.passed ? "Pass" : "Not passed"}`
                                : result.passed
                                  ? "Pass"
                                  : "Not passed"}
                            </WorkspaceStatus>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      {assessment.commentsEnabled ? (
                        <td className="px-4 py-3">
                          <input
                            aria-label={`${student.studentName} teacher comment`}
                            disabled={!workspace.canEdit}
                            value={entry.comment}
                            onChange={(event) =>
                              setDraft((current) => ({
                                ...current,
                                [student.studentId]: {
                                  ...(current[student.studentId] ?? entry),
                                  comment: event.target.value,
                                },
                              }))
                            }
                            className="h-10 w-56 rounded-md border border-slate-200 px-3 text-xs outline-none focus:border-slate-900 disabled:bg-slate-100"
                            placeholder="Optional feedback"
                          />
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </WorkspaceSurface>
      )}
    </div>
  );
}

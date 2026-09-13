import { Save, Send } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
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
}

const groupName = (workspace: TeacherMarksWorkspace) =>
  [
    workspace.selectedOffering?.className,
    workspace.selectedOffering?.sectionName ?? workspace.selectedOffering?.subjectBatchName,
  ]
    .filter(Boolean)
    .join(" - ") || "Assigned group";

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
          const entry = draft[student.studentId] ?? { status: "NOT_RECORDED" as const, marks: "" };
          return {
            studentId: student.studentId,
            status: entry.status,
            ...(entry.status === "RECORDED" && entry.marks !== ""
              ? { marks: Number(entry.marks) }
              : {}),
          };
        }),
      });
      setNotice(submit ? "Marks submitted and locked." : "Marks draft saved.");
      await load({ offeringId: offering.id, assessmentId: assessment.id });
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to save marks");
    } finally {
      setBusy(false);
    }
  }

  if (loading && !workspace) return <LoadingState label="Loading assigned marks register" />;
  if (error && !workspace) return <ErrorState message={error} retry={() => void load()} />;

  const assessment = workspace?.selectedAssessment;
  const students = workspace?.students ?? [];
  const locked = workspace?.sheet?.status === "SUBMITTED";

  return (
    <div className="mx-auto w-full max-w-[1700px] space-y-5 p-4 sm:p-5 lg:p-6">
      <WorkspacePageHeader
        title="Marks Register"
        description="Record one configured assessment for an assigned subject. Maximum marks and attendance windows are controlled by the backend."
        actions={
          <>
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
              Submit marks
            </WorkspaceButton>
          </>
        }
      />

      {notice ? <WorkspaceAlert tone="success">{notice}</WorkspaceAlert> : null}
      {error ? <WorkspaceAlert tone="danger">{error}</WorkspaceAlert> : null}

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
            <table className="min-w-[900px] w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-extrabold uppercase text-slate-500">
                  <th className="px-4 py-3">Roll / Registration</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Classes attended / held</th>
                  <th className="px-4 py-3">Attendance</th>
                  <th className="px-4 py-3">Result state</th>
                  <th className="px-4 py-3">Marks / {assessment.maximumMarks}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((student) => {
                  const entry = draft[student.studentId] ?? {
                    status: "NOT_RECORDED" as const,
                    marks: "",
                  };
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
                                status: "RECORDED",
                                marks: event.target.value,
                              },
                            }))
                          }
                          className="h-10 w-28 rounded-md border border-slate-200 px-3 text-sm font-extrabold outline-none focus:border-slate-900 disabled:bg-slate-100"
                        />
                      </td>
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

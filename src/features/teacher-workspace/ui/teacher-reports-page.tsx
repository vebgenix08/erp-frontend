import { BarChart3, ClipboardCheck, FileChartColumn, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getTeacherMarksWorkspace } from "../../teacher-marks/api/teacher-marks.api";
import type { TeacherMarksWorkspace } from "../../teacher-marks/model/teacher-marks.types";
import { EmptyState, ErrorState, LoadingState } from "../../../shared/ui/page-state";
import { useTeacherWorkspace } from "../model/teacher-workspace-context";
import {
  WorkspaceDataTable,
  WorkspaceKpi,
  WorkspacePageHeader,
  WorkspaceStatus,
  WorkspaceSurface,
  type WorkspaceTableColumn,
} from "./teacher-workspace-primitives";

type ReportType = "ATTENDANCE" | "MARKS" | "ANALYSIS";
interface ReportRow {
  id: string;
  rollNumber: string;
  student: string;
  attended: string;
  attendance: string;
  result: string;
  marks: string;
  score: string;
}

const reports: Array<{ id: ReportType; label: string; description: string }> = [
  {
    id: "ATTENDANCE",
    label: "Assessment-Window Attendance",
    description: "Submitted subject attendance within the configured assessment interval.",
  },
  {
    id: "MARKS",
    label: "Assessment Marks Register",
    description: "Recorded marks and absences for one configured assessment.",
  },
  {
    id: "ANALYSIS",
    label: "Assessment Analysis",
    description: "Recorded, absent and pending counts with backend-calculated score statistics.",
  },
];

export function TeacherReportsPage() {
  const { operatingContext, accessLabel } = useTeacherWorkspace();
  const [workspace, setWorkspace] = useState<TeacherMarksWorkspace | null>(null);
  const [reportType, setReportType] = useState<ReportType>("ATTENDANCE");
  const [offeringId, setOfferingId] = useState("");
  const [assessmentId, setAssessmentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (selection?: { offeringId?: string; assessmentId?: string }) => {
      setLoading(true);
      setError(null);
      try {
        const result = await getTeacherMarksWorkspace({
          ...(operatingContext.academicYearId
            ? { academicYearId: operatingContext.academicYearId }
            : {}),
          ...(selection?.offeringId ? { subjectOfferingId: selection.offeringId } : {}),
          ...(selection?.assessmentId ? { assessmentId: selection.assessmentId } : {}),
        });
        setWorkspace(result);
        setOfferingId(result.selectedOffering?.id ?? "");
        setAssessmentId(result.selectedAssessment?.id ?? "");
      } catch (value) {
        setWorkspace(null);
        setError(value instanceof Error ? value.message : "Unable to load academic report");
      } finally {
        setLoading(false);
      }
    },
    [operatingContext.academicYearId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo<ReportRow[]>(
    () =>
      (workspace?.students ?? []).map((student) => {
        const maximum = workspace?.selectedAssessment?.maximumMarks;
        const score =
          student.status === "RECORDED" && student.marks != null && maximum
            ? `${Math.round((student.marks * 10000) / maximum) / 100}%`
            : "Not available";
        return {
          id: student.studentId,
          rollNumber: student.rollNumber ?? "Not assigned",
          student: student.studentName,
          attended: `${student.attendanceAttended} / ${student.attendanceHeld}`,
          attendance:
            student.attendancePercentage == null
              ? "No submitted classes"
              : `${student.attendancePercentage}%`,
          result: student.status.replaceAll("_", " "),
          marks:
            student.status === "RECORDED" && student.marks != null
              ? `${student.marks} / ${maximum}`
              : student.status.replaceAll("_", " "),
          score,
        };
      }),
    [workspace],
  );

  const columns = useMemo<WorkspaceTableColumn<ReportRow>[]>(() => {
    const identity: WorkspaceTableColumn<ReportRow>[] = [
      { key: "rollNumber", label: "Roll no." },
      { key: "student", label: "Student" },
    ];
    if (reportType === "ATTENDANCE")
      return [
        ...identity,
        { key: "attended", label: "Attended / held" },
        {
          key: "attendance",
          label: "Attendance",
          render: (row) => (
            <WorkspaceStatus
              tone={
                row.attendance === "No submitted classes"
                  ? "neutral"
                  : Number(row.attendance.replace("%", "")) >= 85
                    ? "success"
                    : "warning"
              }
            >
              {row.attendance}
            </WorkspaceStatus>
          ),
        },
      ];
    return [
      ...identity,
      { key: "result", label: "Result state" },
      { key: "marks", label: "Marks" },
      { key: "score", label: "Score" },
      ...(reportType === "ANALYSIS" ? [{ key: "attendance" as const, label: "Attendance" }] : []),
    ];
  }, [reportType]);

  if (loading && !workspace) return <LoadingState label="Loading academic reports" />;
  if (error && !workspace) return <ErrorState message={error} retry={() => void load()} />;

  const selectedReport = reports.find((report) => report.id === reportType)!;
  const assessment = workspace?.selectedAssessment;
  const summary = workspace?.summary ?? { students: 0, recorded: 0, absent: 0, pending: 0 };

  return (
    <div className="mx-auto w-full max-w-[1700px] space-y-5 p-4 sm:p-5 lg:p-6">
      <WorkspacePageHeader
        title="Academic Reports"
        description={`Persisted academic records limited to ${accessLabel.toLowerCase()} scope.`}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <WorkspaceKpi
          label="Students"
          value={summary.students}
          detail="Active offering roster"
          icon={Users}
        />
        <WorkspaceKpi
          label="Recorded"
          value={summary.recorded}
          detail="Marks recorded"
          icon={ClipboardCheck}
          tone="blue"
        />
        <WorkspaceKpi
          label="Absent"
          value={summary.absent}
          detail="Assessment absence"
          icon={FileChartColumn}
          tone="amber"
        />
        <WorkspaceKpi
          label="Average marks"
          value={summary.averageMarks ?? "Not available"}
          detail={assessment ? `Out of ${assessment.maximumMarks}` : "No assessment selected"}
          icon={BarChart3}
          tone="rose"
        />
      </div>

      <WorkspaceSurface>
        <div className="grid gap-3 p-4 md:grid-cols-3">
          <label>
            <span className="mb-1.5 block text-[10px] font-extrabold uppercase text-slate-500">
              Report
            </span>
            <select
              value={reportType}
              onChange={(event) => setReportType(event.target.value as ReportType)}
              className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-xs font-bold"
            >
              {reports.map((report) => (
                <option key={report.id} value={report.id}>
                  {report.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-[10px] font-extrabold uppercase text-slate-500">
              Assigned class and subject
            </span>
            <select
              value={offeringId}
              disabled={!workspace?.offerings.length}
              onChange={(event) => {
                const value = event.target.value;
                setOfferingId(value);
                setAssessmentId("");
                void load({ offeringId: value });
              }}
              className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-xs font-bold"
            >
              {!workspace?.offerings.length ? <option value="">No assigned subjects</option> : null}
              {workspace?.offerings.map((offering) => (
                <option key={offering.id} value={offering.id}>
                  {[
                    offering.className,
                    offering.sectionName ?? offering.subjectBatchName,
                    offering.subjectName,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-[10px] font-extrabold uppercase text-slate-500">
              Assessment
            </span>
            <select
              value={assessmentId}
              disabled={!workspace?.assessments.length}
              onChange={(event) => {
                const value = event.target.value;
                setAssessmentId(value);
                void load({ offeringId, assessmentId: value });
              }}
              className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-xs font-bold"
            >
              {!workspace?.assessments.length ? (
                <option value="">No assessment configured</option>
              ) : null}
              {workspace?.assessments.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.maximumMarks} marks
                </option>
              ))}
            </select>
          </label>
        </div>
      </WorkspaceSurface>

      <WorkspaceSurface>
        <div className="border-b border-slate-100 px-4 py-4">
          <h2 className="text-sm font-extrabold text-slate-950">{selectedReport.label}</h2>
          <p className="mt-1 text-xs font-medium text-slate-500">{selectedReport.description}</p>
        </div>
        {!workspace?.selectedOffering ? (
          <EmptyState
            title="No teaching assignment"
            description="No active subject offering is assigned in the selected academic year."
          />
        ) : !assessment ? (
          <EmptyState
            title="No configured assessment"
            description="Open or close an assessment before academic reports can be generated."
          />
        ) : !rows.length ? (
          <EmptyState
            title="No active students"
            description="The selected offering has no active student roster."
          />
        ) : (
          <WorkspaceDataTable
            rows={rows}
            columns={columns}
            downloadName={`${selectedReport.id.toLowerCase()}-${assessment.name.toLowerCase().replaceAll(" ", "-")}`}
          />
        )}
      </WorkspaceSurface>
    </div>
  );
}

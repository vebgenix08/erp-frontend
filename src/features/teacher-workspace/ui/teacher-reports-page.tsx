import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileChartColumn,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getTeacherMarksWorkspace } from "../../teacher-marks/api/teacher-marks.api";
import type {
  TeacherMarksStudent,
  TeacherMarksWorkspace,
} from "../../teacher-marks/model/teacher-marks.types";
import {
  listTeacherAttendanceHistory,
  listTeacherMarksHistory,
} from "../../teacher-history/api/teacher-history.api";
import type {
  HistoryPage,
  TeacherAttendanceHistoryItem,
  TeacherHistoryFilter,
  TeacherMarksHistoryItem,
} from "../../teacher-history/model/teacher-history.types";
import { EmptyState, ErrorState, LoadingState } from "../../../shared/ui/page-state";
import { formatClockTime } from "../../../shared/lib/time-format";
import { useTeacherWorkspace } from "../model/teacher-workspace-context";
import {
  WorkspaceDataTable,
  WorkspaceKpi,
  WorkspacePageHeader,
  WorkspaceStatus,
  WorkspaceSurface,
  type WorkspaceTableColumn,
} from "./teacher-workspace-primitives";

type ReportType =
  | "DAILY_ATTENDANCE"
  | "MONTHLY_ATTENDANCE"
  | "TEST_REGISTER"
  | "TEST_ANALYSIS"
  | "SUBMISSION_STATUS";

interface DailyRow {
  id: string;
  date: string;
  classSection: string;
  subject: string;
  time: string;
  students: number;
  present: number;
  absent: number;
  attendanceRate: string;
  status: string;
}

interface MonthlyRow {
  id: string;
  month: string;
  classSection: string;
  subject: string;
  sessions: number;
  attendanceOpportunities: number;
  present: number;
  absent: number;
  attendanceRate: string;
}

interface TestRow {
  id: string;
  rollNumber: string;
  registrationNumber: string;
  student: string;
  status: string;
  marks: string;
  score: string;
  grade: string;
  result: string;
  attendance: string;
  comment: string;
}

interface SubmissionRow {
  id: string;
  assessment: string;
  classSection: string;
  subject: string;
  maximumMarks: number;
  students: number;
  recorded: number;
  absent: number;
  pending: number;
  status: string;
  lastUpdated: string;
}

const reports: Array<{ id: ReportType; label: string; description: string }> = [
  {
    id: "DAILY_ATTENDANCE",
    label: "Daily Attendance Register",
    description: "Session-by-session attendance with class, subject, time and submission status.",
  },
  {
    id: "MONTHLY_ATTENDANCE",
    label: "Monthly Attendance Summary",
    description: "Monthly attendance totals grouped by assigned class and subject.",
  },
  {
    id: "TEST_REGISTER",
    label: "Test Marks Register",
    description: "Student marks, score, grade, result and comments for one assessment.",
  },
  {
    id: "TEST_ANALYSIS",
    label: "Test Performance Analysis",
    description: "Student performance with marks, grade, result and attendance context.",
  },
  {
    id: "SUBMISSION_STATUS",
    label: "Assessment Submission Status",
    description: "Draft and submitted registers with recorded, absent and pending counts.",
  },
];

const classSection = (row: { className?: string; sectionName?: string }) =>
  [row.className, row.sectionName].filter(Boolean).join(" · ") || "Assigned group";

const displayDate = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));

const displayDateTime = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value));

const percentage = (part: number, total: number) =>
  total ? `${Math.round((part * 1000) / total) / 10}%` : "Not available";

async function loadAll<Item>(
  loader: (input: TeacherHistoryFilter) => Promise<HistoryPage<Item>>,
  input: Omit<TeacherHistoryFilter, "page" | "pageSize">,
) {
  const first = await loader({ ...input, page: 1, pageSize: 100 });
  if (first.totalPages <= 1) return first.items;
  const remaining = await Promise.all(
    Array.from({ length: first.totalPages - 1 }, (_, index) =>
      loader({ ...input, page: index + 2, pageSize: 100 }),
    ),
  );
  return [first, ...remaining].flatMap((page) => page.items);
}

function toTestRow(student: TeacherMarksStudent, maximumMarks?: number): TestRow {
  const hasMarks = student.status === "RECORDED" && student.marks != null;
  return {
    id: student.studentId,
    rollNumber: student.rollNumber ?? "Not assigned",
    registrationNumber: student.registrationNumber || "Not assigned",
    student: student.studentName,
    status: student.status.replaceAll("_", " "),
    marks: hasMarks
      ? `${student.marks} / ${maximumMarks ?? "—"}`
      : student.status.replaceAll("_", " "),
    score: hasMarks && maximumMarks ? percentage(student.marks!, maximumMarks) : "Not available",
    grade: student.gradeCode ?? student.gradeLabel ?? "Not graded",
    result: student.passed == null ? "Not declared" : student.passed ? "Pass" : "Needs support",
    attendance:
      student.attendancePercentage == null
        ? "No submitted classes"
        : `${student.attendancePercentage}%`,
    comment: student.comment?.trim() || "No comment",
  };
}

export function TeacherReportsPage() {
  const { operatingContext, accessLabel } = useTeacherWorkspace();
  const [workspace, setWorkspace] = useState<TeacherMarksWorkspace | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<TeacherAttendanceHistoryItem[]>([]);
  const [marksHistory, setMarksHistory] = useState<TeacherMarksHistoryItem[]>([]);
  const [reportType, setReportType] = useState<ReportType>("DAILY_ATTENDANCE");
  const [offeringId, setOfferingId] = useState("");
  const [assessmentId, setAssessmentId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (selection?: { offeringId?: string; assessmentId?: string }, includeHistory = false) => {
      setLoading(true);
      setError(null);
      try {
        const context = {
          ...(operatingContext.academicYearId
            ? { academicYearId: operatingContext.academicYearId }
            : {}),
          ...(selection?.offeringId ? { subjectOfferingId: selection.offeringId } : {}),
          ...(selection?.assessmentId ? { assessmentId: selection.assessmentId } : {}),
        };
        const historyInput = operatingContext.academicYearId
          ? { academicYearId: operatingContext.academicYearId }
          : {};
        const [marksWorkspace, attendance, submissions] = await Promise.all([
          getTeacherMarksWorkspace(context),
          includeHistory
            ? loadAll(listTeacherAttendanceHistory, historyInput)
            : Promise.resolve(attendanceHistory),
          includeHistory
            ? loadAll(listTeacherMarksHistory, historyInput)
            : Promise.resolve(marksHistory),
        ]);
        setWorkspace(marksWorkspace);
        setOfferingId(selection?.offeringId ?? offeringId);
        setAssessmentId(marksWorkspace.selectedAssessment?.id ?? "");
        setAttendanceHistory(attendance);
        setMarksHistory(submissions);
      } catch (value) {
        setError(value instanceof Error ? value.message : "Unable to load academic reports");
      } finally {
        setLoading(false);
      }
    },
    [attendanceHistory, marksHistory, offeringId, operatingContext.academicYearId],
  );

  useEffect(() => {
    void load(undefined, true);
    // History is loaded once for the selected academic year; filters are applied locally.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operatingContext.academicYearId]);

  const filteredAttendance = useMemo(
    () =>
      attendanceHistory.filter(
        (row) =>
          (!offeringId || row.subjectOfferingId === offeringId) &&
          (!dateFrom || row.date >= dateFrom) &&
          (!dateTo || row.date <= dateTo),
      ),
    [attendanceHistory, dateFrom, dateTo, offeringId],
  );

  const dailyRows = useMemo<DailyRow[]>(
    () =>
      filteredAttendance.map((row) => ({
        id: row.id,
        date: displayDate(row.date),
        classSection: classSection(row),
        subject: row.subjectName,
        time: `${formatClockTime(row.startTime)} – ${formatClockTime(row.endTime)}`,
        students: row.studentCount,
        present: row.presentCount,
        absent: row.absentCount,
        attendanceRate: percentage(row.presentCount, row.studentCount),
        status: row.status === "SUBMITTED" ? "Submitted" : "Draft",
      })),
    [filteredAttendance],
  );

  const monthlyRows = useMemo<MonthlyRow[]>(() => {
    const groups = new Map<string, MonthlyRow>();
    for (const row of filteredAttendance) {
      const month = new Intl.DateTimeFormat("en-IN", {
        month: "long",
        year: "numeric",
      }).format(new Date(row.date));
      const key = `${row.date.slice(0, 7)}:${row.subjectOfferingId}`;
      const current = groups.get(key) ?? {
        id: key,
        month,
        classSection: classSection(row),
        subject: row.subjectName,
        sessions: 0,
        attendanceOpportunities: 0,
        present: 0,
        absent: 0,
        attendanceRate: "Not available",
      };
      current.sessions += 1;
      current.attendanceOpportunities += row.studentCount;
      current.present += row.presentCount;
      current.absent += row.absentCount;
      current.attendanceRate = percentage(current.present, current.attendanceOpportunities);
      groups.set(key, current);
    }
    return [...groups.values()];
  }, [filteredAttendance]);

  const testRows = useMemo(
    () =>
      (workspace?.students ?? []).map((student) =>
        toTestRow(student, workspace?.selectedAssessment?.maximumMarks),
      ),
    [workspace],
  );

  const submissionRows = useMemo<SubmissionRow[]>(
    () =>
      marksHistory
        .filter((row) => !offeringId || row.subjectOfferingId === offeringId)
        .map((row) => ({
          id: row.id,
          assessment: row.assessmentName,
          classSection: classSection(row),
          subject: row.subjectName,
          maximumMarks: row.maximumMarks,
          students: row.studentCount,
          recorded: row.recordedCount,
          absent: row.absentCount,
          pending: row.pendingCount,
          status: row.status === "SUBMITTED" ? "Submitted" : "Draft",
          lastUpdated: displayDateTime(row.updatedAt),
        })),
    [marksHistory, offeringId],
  );

  const attendanceColumns: WorkspaceTableColumn<DailyRow>[] = [
    { key: "date", label: "Date" },
    { key: "classSection", label: "Class / section" },
    { key: "subject", label: "Subject" },
    { key: "time", label: "Time" },
    { key: "students", label: "Students" },
    { key: "present", label: "Present" },
    { key: "absent", label: "Absent" },
    { key: "attendanceRate", label: "Attendance" },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <WorkspaceStatus tone={row.status === "Submitted" ? "success" : "warning"}>
          {row.status}
        </WorkspaceStatus>
      ),
    },
  ];
  const monthlyColumns: WorkspaceTableColumn<MonthlyRow>[] = [
    { key: "month", label: "Month" },
    { key: "classSection", label: "Class / section" },
    { key: "subject", label: "Subject" },
    { key: "sessions", label: "Sessions" },
    { key: "attendanceOpportunities", label: "Student sessions" },
    { key: "present", label: "Present" },
    { key: "absent", label: "Absent" },
    { key: "attendanceRate", label: "Attendance" },
  ];
  const testColumns: WorkspaceTableColumn<TestRow>[] = [
    { key: "rollNumber", label: "Roll no." },
    { key: "registrationNumber", label: "Registration no." },
    { key: "student", label: "Student" },
    { key: "status", label: "Entry status" },
    { key: "marks", label: "Marks" },
    { key: "score", label: "Score" },
    { key: "grade", label: "Grade" },
    { key: "result", label: "Result" },
    ...(reportType === "TEST_ANALYSIS"
      ? ([
          { key: "attendance", label: "Attendance" },
          { key: "comment", label: "Teacher comment" },
        ] as WorkspaceTableColumn<TestRow>[])
      : []),
  ];
  const submissionColumns: WorkspaceTableColumn<SubmissionRow>[] = [
    { key: "assessment", label: "Assessment" },
    { key: "classSection", label: "Class / section" },
    { key: "subject", label: "Subject" },
    { key: "maximumMarks", label: "Maximum marks" },
    { key: "students", label: "Students" },
    { key: "recorded", label: "Recorded" },
    { key: "absent", label: "Absent" },
    { key: "pending", label: "Pending" },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <WorkspaceStatus tone={row.status === "Submitted" ? "success" : "warning"}>
          {row.status}
        </WorkspaceStatus>
      ),
    },
    { key: "lastUpdated", label: "Last updated" },
  ];

  if (loading && !workspace) return <LoadingState label="Loading academic reports" />;
  if (error && !workspace)
    return <ErrorState message={error} retry={() => void load(undefined, true)} />;

  const selectedReport = reports.find((report) => report.id === reportType)!;
  const isAttendance = reportType === "DAILY_ATTENDANCE" || reportType === "MONTHLY_ATTENDANCE";
  const isTest = reportType === "TEST_REGISTER" || reportType === "TEST_ANALYSIS";
  const summary = workspace?.summary ?? {
    students: 0,
    recorded: 0,
    absent: 0,
    pending: 0,
  };
  const attendanceStudents = filteredAttendance.reduce((total, row) => total + row.studentCount, 0);
  const attendancePresent = filteredAttendance.reduce((total, row) => total + row.presentCount, 0);
  const rowCount = isAttendance
    ? reportType === "DAILY_ATTENDANCE"
      ? dailyRows.length
      : monthlyRows.length
    : isTest
      ? testRows.length
      : submissionRows.length;

  return (
    <div className="mx-auto w-full max-w-[1700px] space-y-5 p-4 sm:p-5 lg:p-6">
      <WorkspacePageHeader
        title="Academic Reports"
        description={`${operatingContext.academicYearName} · ${operatingContext.campusName} · ${accessLabel}`}
      />

      <WorkspaceSurface>
        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
          <label>
            <span className="mb-1.5 block text-[10px] font-extrabold uppercase text-slate-500">
              Report format
            </span>
            <select
              aria-label="Report format"
              value={reportType}
              onChange={(event) => {
                const next = event.target.value as ReportType;
                setReportType(next);
                if (
                  (next === "TEST_REGISTER" || next === "TEST_ANALYSIS") &&
                  !offeringId &&
                  workspace?.selectedOffering
                ) {
                  setOfferingId(workspace.selectedOffering.id);
                }
              }}
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
              aria-label="Assigned class and subject"
              value={offeringId}
              onChange={(event) => {
                const value = event.target.value;
                setOfferingId(value);
                if (isTest) void load({ offeringId: value });
              }}
              className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-xs font-bold"
            >
              <option value="">All assigned classes and subjects</option>
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
          {isAttendance ? (
            <>
              <label>
                <span className="mb-1.5 block text-[10px] font-extrabold uppercase text-slate-500">
                  From date
                </span>
                <input
                  aria-label="From date"
                  type="date"
                  value={dateFrom}
                  max={dateTo || undefined}
                  onChange={(event) => setDateFrom(event.target.value)}
                  className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-xs font-bold"
                />
              </label>
              <label>
                <span className="mb-1.5 block text-[10px] font-extrabold uppercase text-slate-500">
                  To date
                </span>
                <input
                  aria-label="To date"
                  type="date"
                  value={dateTo}
                  min={dateFrom || undefined}
                  onChange={(event) => setDateTo(event.target.value)}
                  className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-xs font-bold"
                />
              </label>
            </>
          ) : isTest ? (
            <label className="xl:col-span-2">
              <span className="mb-1.5 block text-[10px] font-extrabold uppercase text-slate-500">
                Assessment
              </span>
              <select
                aria-label="Assessment"
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
          ) : null}
        </div>
      </WorkspaceSurface>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {isAttendance ? (
          <>
            <WorkspaceKpi
              label="Sessions"
              value={filteredAttendance.length}
              detail="Matching date range"
              icon={CalendarDays}
            />
            <WorkspaceKpi
              label="Student sessions"
              value={attendanceStudents}
              detail="Total attendance opportunities"
              icon={Users}
              tone="blue"
            />
            <WorkspaceKpi
              label="Present"
              value={attendancePresent}
              detail="Recorded as present"
              icon={CheckCircle2}
              tone="green"
            />
            <WorkspaceKpi
              label="Attendance"
              value={percentage(attendancePresent, attendanceStudents)}
              detail="Across matching sessions"
              icon={BarChart3}
              tone="amber"
            />
          </>
        ) : isTest ? (
          <>
            <WorkspaceKpi
              label="Students"
              value={summary.students}
              detail="Assessment roster"
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
              label="Absent / pending"
              value={`${summary.absent} / ${summary.pending}`}
              detail="Requires review"
              icon={FileChartColumn}
              tone="amber"
            />
            <WorkspaceKpi
              label="Average marks"
              value={summary.averageMarks ?? "Not available"}
              detail={
                workspace?.selectedAssessment
                  ? `Out of ${workspace.selectedAssessment.maximumMarks}`
                  : "No assessment selected"
              }
              icon={BarChart3}
              tone="rose"
            />
          </>
        ) : (
          <>
            <WorkspaceKpi
              label="Registers"
              value={submissionRows.length}
              detail="Assessment submissions"
              icon={FileChartColumn}
            />
            <WorkspaceKpi
              label="Submitted"
              value={submissionRows.filter((row) => row.status === "Submitted").length}
              detail="Completed registers"
              icon={CheckCircle2}
              tone="green"
            />
            <WorkspaceKpi
              label="Draft"
              value={submissionRows.filter((row) => row.status === "Draft").length}
              detail="Still editable"
              icon={ClipboardCheck}
              tone="amber"
            />
            <WorkspaceKpi
              label="Pending entries"
              value={submissionRows.reduce((total, row) => total + row.pending, 0)}
              detail="Student marks pending"
              icon={Users}
              tone="rose"
            />
          </>
        )}
      </div>

      <WorkspaceSurface>
        <div className="border-b border-slate-100 px-4 py-4">
          <h2 className="text-sm font-extrabold text-slate-950">{selectedReport.label}</h2>
          <p className="mt-1 text-xs font-medium text-slate-500">
            {selectedReport.description} Generated for {operatingContext.academicYearName}.{" "}
            {rowCount} record{rowCount === 1 ? "" : "s"}.
          </p>
        </div>
        {error ? (
          <ErrorState message={error} retry={() => void load(undefined, true)} />
        ) : loading ? (
          <LoadingState label="Refreshing report" />
        ) : isTest && !workspace?.selectedOffering ? (
          <EmptyState
            title="No teaching assignment"
            description="No active subject offering is assigned in the selected academic year."
          />
        ) : isTest && !workspace?.selectedAssessment ? (
          <EmptyState
            title="No configured assessment"
            description="Configure an assessment before generating a test report."
          />
        ) : reportType === "DAILY_ATTENDANCE" ? (
          <WorkspaceDataTable
            rows={dailyRows}
            columns={attendanceColumns}
            downloadName="daily-attendance-register"
            filters={[
              { key: "classSection", label: "Class / section" },
              { key: "subject", label: "Subject" },
              { key: "status", label: "Status" },
            ]}
          />
        ) : reportType === "MONTHLY_ATTENDANCE" ? (
          <WorkspaceDataTable
            rows={monthlyRows}
            columns={monthlyColumns}
            downloadName="monthly-attendance-summary"
            filters={[
              { key: "month", label: "Month" },
              { key: "classSection", label: "Class / section" },
              { key: "subject", label: "Subject" },
            ]}
          />
        ) : reportType === "SUBMISSION_STATUS" ? (
          <WorkspaceDataTable
            rows={submissionRows}
            columns={submissionColumns}
            downloadName="assessment-submission-status"
            filters={[
              { key: "assessment", label: "Assessment" },
              { key: "classSection", label: "Class / section" },
              { key: "subject", label: "Subject" },
              { key: "status", label: "Status" },
            ]}
          />
        ) : (
          <WorkspaceDataTable
            rows={testRows}
            columns={testColumns}
            downloadName={
              reportType === "TEST_ANALYSIS" ? "test-performance-analysis" : "test-marks-register"
            }
            filters={[
              { key: "status", label: "Entry status" },
              { key: "grade", label: "Grade" },
              { key: "result", label: "Result" },
            ]}
          />
        )}
      </WorkspaceSurface>
    </div>
  );
}

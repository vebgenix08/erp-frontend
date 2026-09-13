import { CheckCircle2, Clock3, Save, Send, UserCheck, UserX, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  getTeacherAttendanceWorkspace,
  saveTeacherAttendance,
} from "../../teacher-attendance/api/teacher-attendance.api";
import type {
  StudentAttendanceValue,
  TeacherAttendanceWorkspace,
} from "../../teacher-attendance/model/teacher-attendance.types";
import { EmptyState, ErrorState, LoadingState } from "../../../shared/ui/page-state";
import { useTeacherWorkspace } from "../model/teacher-workspace-context";
import { ModernSelect } from "../../../shared/ui/select";
import { Button } from "../../../shared/ui/button";
import {
  WorkspaceAlert,
  WorkspaceButton,
  WorkspaceKpi,
  WorkspacePageHeader,
  WorkspaceStatus,
  WorkspaceSurface,
} from "./teacher-workspace-primitives";

function localDateValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const groupLabel = (value?: { className?: string; sectionName?: string }) =>
  [value?.className, value?.sectionName].filter(Boolean).join(" - ") || "Assigned Group";

export function TeacherAttendancePage() {
  const { operatingContext, workspace: teacherWorkspace } = useTeacherWorkspace();
  const [params, setParams] = useSearchParams();
  const requestedOfferingId = params.get("offering") ?? "";
  const [date, setDate] = useState(localDateValue);
  const [selectedClassOfferingId, setSelectedClassOfferingId] = useState(requestedOfferingId);
  const [lessonId, setLessonId] = useState("");
  const [workspace, setWorkspace] = useState<TeacherAttendanceWorkspace | null>(null);
  const [attendance, setAttendance] = useState<Record<string, StudentAttendanceValue>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const assignments = useMemo(
    () =>
      (teacherWorkspace?.assignments ?? []).filter(
        (item) => !operatingContext.campusId || item.campusId === operatingContext.campusId,
      ),
    [operatingContext.campusId, teacherWorkspace?.assignments],
  );

  // Options for all assigned classes
  const classOptions = useMemo(() => {
    return assignments.map((item) => ({
      label: `${[item.className, item.sectionName ?? item.subjectBatchName].filter(Boolean).join(" - ")} · ${item.subjectName}`,
      value: item.subjectOfferingId || item.id,
    }));
  }, [assignments]);

  const load = useCallback(
    async (selection?: { lessonId?: string; offeringId?: string }) => {
      setLoading(true);
      setError(null);
      try {
        let result = await getTeacherAttendanceWorkspace({
          date,
          ...(operatingContext.academicYearId
            ? { academicYearId: operatingContext.academicYearId }
            : {}),
          ...(operatingContext.campusId ? { campusId: operatingContext.campusId } : {}),
          ...(selection?.lessonId ? { lessonId: selection.lessonId } : {}),
        });
        if (selection?.offeringId && !selection.lessonId) {
          const matchingSession = result.sessions.find(
            (session) => session.subjectOfferingId === selection.offeringId,
          );
          if (matchingSession && result.selectedSession?.id !== matchingSession.id) {
            result = await getTeacherAttendanceWorkspace({
              date,
              ...(operatingContext.academicYearId
                ? { academicYearId: operatingContext.academicYearId }
                : {}),
              ...(operatingContext.campusId ? { campusId: operatingContext.campusId } : {}),
              lessonId: matchingSession.id,
            });
          } else if (!matchingSession) {
            result = {
              date: result.date,
              teacherId: result.teacherId,
              teacherName: result.teacherName,
              academicYear: result.academicYear,
              sessions: result.sessions,
              students: [],
              canEdit: false,
            };
          }
        }
        setWorkspace(result);
        setLessonId(result.selectedSession?.id ?? "");
        if (result.selectedSession?.subjectOfferingId) {
          setSelectedClassOfferingId(result.selectedSession.subjectOfferingId);
        } else if (selection?.offeringId) {
          setSelectedClassOfferingId(selection.offeringId);
        }
        setAttendance(
          Object.fromEntries(result.students.map((student) => [student.studentId, student.status])),
        );
      } catch (value) {
        setWorkspace(null);
        setError(value instanceof Error ? value.message : "Unable to load attendance");
      } finally {
        setLoading(false);
      }
    },
    [date, operatingContext.academicYearId, operatingContext.campusId],
  );

  useEffect(() => {
    void load(requestedOfferingId ? { offeringId: requestedOfferingId } : undefined);
  }, [load, requestedOfferingId]);

  const absent = useMemo(
    () => Object.values(attendance).filter((status) => status === "ABSENT").length,
    [attendance],
  );

  async function persist(submit: boolean) {
    if (!workspace?.selectedSession || !workspace.canEdit) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await saveTeacherAttendance({
        date,
        academicYearId: workspace.academicYear.id,
        ...(operatingContext.campusId ? { campusId: operatingContext.campusId } : {}),
        lessonId: workspace.selectedSession.id,
        ...(workspace.attendance ? { expectedVersion: workspace.attendance.version } : {}),
        submit,
        students: workspace.students.map((student) => ({
          studentId: student.studentId,
          status: attendance[student.studentId] ?? "PRESENT",
        })),
      });
      setNotice(submit ? "Attendance submitted and locked." : "Attendance draft saved.");
      await load({
        lessonId: workspace.selectedSession.id,
        offeringId: workspace.selectedSession.subjectOfferingId,
      });
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to save attendance");
    } finally {
      setBusy(false);
    }
  }

  const markAll = (status: StudentAttendanceValue) => {
    if (!workspace?.students.length) return;
    const next: Record<string, StudentAttendanceValue> = {};
    for (const student of workspace.students) {
      next[student.studentId] = status;
    }
    setAttendance(next);
  };

  const onClassSelect = (offeringId: string) => {
    setSelectedClassOfferingId(offeringId);
    setParams({ offering: offeringId }, { replace: true });
    setLessonId("");
  };

  if (loading && !workspace) return <LoadingState label="Loading assigned attendance sessions" />;
  if (error && !workspace)
    return (
      <ErrorState
        message={error}
        retry={() =>
          void load({
            ...(lessonId ? { lessonId } : {}),
            ...(selectedClassOfferingId ? { offeringId: selectedClassOfferingId } : {}),
          })
        }
      />
    );

  const selected = workspace?.selectedSession;
  const students = workspace?.students ?? [];
  const locked = workspace?.attendance?.status === "SUBMITTED";

  const sessionOptions = (workspace?.sessions ?? []).map((session) => ({
    label: `${session.startTime} - ${session.endTime} · ${session.subjectName} (${groupLabel(session)})`,
    value: session.id,
  }));

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5 p-4 sm:p-5 lg:p-6">
      <WorkspacePageHeader
        title="Student Roll Call & Attendance"
        description="Record student attendance against assigned teaching classes and sessions. Select class and date to mark Present or Absent."
        actions={
          <div className="flex items-center gap-2">
            <WorkspaceButton
              icon={Save}
              disabled={busy || !selected || !students.length || locked}
              onClick={() => void persist(false)}
            >
              Save Draft
            </WorkspaceButton>
            <WorkspaceButton
              variant="primary"
              icon={Send}
              disabled={busy || !selected || !students.length || locked}
              onClick={() => void persist(true)}
            >
              Submit & Lock
            </WorkspaceButton>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <WorkspaceKpi
          label="Enrolled Students"
          value={students.length}
          detail={groupLabel(selected)}
          icon={UserCheck}
        />
        <WorkspaceKpi
          label="Present"
          value={students.length - absent}
          detail="Current recorded count"
          icon={CheckCircle2}
          tone="green"
        />
        <WorkspaceKpi
          label="Absent"
          value={absent}
          detail="Current recorded count"
          icon={UserX}
          tone="rose"
        />
        <WorkspaceKpi
          label="Period Timing"
          value={selected ? selected.startTime : "Not selected"}
          detail={selected ? `${selected.startTime} - ${selected.endTime}` : "No assigned period"}
          icon={Clock3}
          tone="amber"
        />
      </div>

      <WorkspaceAlert>
        Submitted attendance is immutable. A later change must use the audited correction workflow.
      </WorkspaceAlert>
      {notice ? <WorkspaceAlert tone="success">{notice}</WorkspaceAlert> : null}
      {error ? <WorkspaceAlert tone="danger">{error}</WorkspaceAlert> : null}

      <WorkspaceSurface>
        {/* Class and Session Selection Controls */}
        <div className="grid gap-3.5 border-b border-slate-100 p-4 sm:grid-cols-2 xl:grid-cols-4 items-center">
          {/* Class Selector */}
          <div>
            <span className="mb-1.5 block text-[10px] font-extrabold uppercase text-slate-500">
              Select Class & Subject
            </span>
            <ModernSelect
              value={selectedClassOfferingId || classOptions[0]?.value || ""}
              disabled={!classOptions.length}
              onValueChange={onClassSelect}
              placeholder="Choose assigned class..."
              options={classOptions}
            />
          </div>

          {/* Date Picker */}
          <label>
            <span className="mb-1.5 block text-[10px] font-extrabold uppercase text-slate-500">
              Attendance Date
            </span>
            <input
              type="date"
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                setLessonId("");
              }}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold shadow-2xs outline-none focus:border-brand-500"
            />
          </label>

          {/* Session / Period Selector */}
          <div>
            <span className="mb-1.5 block text-[10px] font-extrabold uppercase text-slate-500">
              Timetable Period Session
            </span>
            <ModernSelect
              value={lessonId}
              disabled={!sessionOptions.length}
              onValueChange={(val) => {
                setLessonId(val);
                void load({ lessonId: val, offeringId: selectedClassOfferingId });
              }}
              placeholder={
                sessionOptions.length ? "Select a teaching session" : "No sessions on this date"
              }
              options={sessionOptions}
            />
          </div>

          {/* Record State */}
          <div>
            <span className="mb-1.5 block text-[10px] font-extrabold uppercase text-slate-500">
              Record State
            </span>
            <div className="flex h-10 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 shadow-2xs">
              <WorkspaceStatus
                tone={locked ? "success" : workspace?.attendance ? "warning" : "neutral"}
              >
                {workspace?.attendance?.status ?? "Not started"}
              </WorkspaceStatus>
            </div>
          </div>
        </div>

        {!selected ? (
          <EmptyState
            title="No session scheduled for selected date"
            description="Please choose an assigned class or change the attendance date to mark roll call."
          />
        ) : !students.length ? (
          <EmptyState
            title="No active students in roster"
            description="The selected section or teaching group has no active student enrollments."
          />
        ) : (
          <div>
            {/* Quick Bulk Actions Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 px-4 py-3 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Users size={15} className="text-slate-500" />
                <span className="text-xs font-bold text-slate-700">Quick Roll-Call Actions:</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={locked}
                  onClick={() => markAll("PRESENT")}
                  className="rounded-xl border-emerald-200 bg-white text-xs font-bold text-emerald-700 hover:bg-emerald-50"
                >
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-emerald-600" /> Mark All Present
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={locked}
                  onClick={() => markAll("ABSENT")}
                  className="rounded-xl text-xs font-bold bg-white text-rose-700 hover:bg-rose-50 border-rose-200"
                >
                  <UserX className="mr-1.5 h-3.5 w-3.5 text-rose-600" /> Mark All Absent
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[680px] w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 text-[11px] font-bold uppercase text-slate-600 border-b border-slate-200">
                    <th className="px-4 py-3.5 w-24">Roll No.</th>
                    <th className="px-4 py-3.5">Student</th>
                    <th className="px-4 py-3.5 text-right pr-6">Attendance Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((student) => {
                    const isPresent = attendance[student.studentId] === "PRESENT";
                    return (
                      <tr
                        key={student.studentId}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="px-4 py-3.5 font-bold text-slate-900">
                          {student.rollNumber ?? "Not assigned"}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-50 text-brand-700 text-[10px] font-extrabold border border-brand-100">
                              {student.studentName.slice(0, 2).toUpperCase()}
                            </span>
                            <div>
                              <strong className="block text-xs font-bold text-slate-950">
                                {student.studentName}
                              </strong>
                              <span className="text-[10px] font-medium text-slate-400">
                                Roll: {student.rollNumber ?? "Not assigned"}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right pr-6">
                          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100/80 p-1 shadow-2xs">
                            <button
                              type="button"
                              disabled={locked}
                              onClick={() =>
                                setAttendance((current) => ({
                                  ...current,
                                  [student.studentId]: "PRESENT",
                                }))
                              }
                              className={`min-h-8 min-w-20 rounded-lg px-3 text-xs font-bold transition-all ${
                                isPresent
                                  ? "bg-emerald-600 text-white shadow-xs"
                                  : "text-slate-600 hover:text-slate-900"
                              }`}
                            >
                              Present
                            </button>
                            <button
                              type="button"
                              disabled={locked}
                              onClick={() =>
                                setAttendance((current) => ({
                                  ...current,
                                  [student.studentId]: "ABSENT",
                                }))
                              }
                              className={`min-h-8 min-w-20 rounded-lg px-3 text-xs font-bold transition-all ${
                                !isPresent
                                  ? "bg-rose-600 text-white shadow-xs"
                                  : "text-slate-600 hover:text-slate-900"
                              }`}
                            >
                              Absent
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </WorkspaceSurface>
    </div>
  );
}

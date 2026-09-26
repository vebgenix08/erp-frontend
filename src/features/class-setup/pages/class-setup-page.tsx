import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Clock3,
  GripVertical,
  List,
  LayoutDashboard,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Table2,
  Trash2,
  UserCheck,
  UserCheck2,
  Users,
} from "lucide-react";
import { Button } from "../../../shared/ui/button";
import { ErrorState } from "../../../shared/ui/page-state";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../shared/ui/dialog";
import { AddClassSubjectDialog } from "../components/add-class-subject-dialog";
import { SectionOwnershipPanel } from "../components/section-ownership-panel";
import { SubjectTeacherMatrix } from "../components/subject-teacher-matrix";
import { TimingConfiguration } from "../components/timing-configuration";
import { useClassSetup } from "../hooks/use-class-setup";
import { comparePeriodSlots } from "../../academic-planning/model/timetable-view";

const selectClass =
  "h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

interface SubjectRow {
  subjectPlanId: string;
  name: string;
  code: string;
  type: "Main" | "Optional";
  weeklyPeriods: number;
  offeringId: string | undefined;
  teacherId: string | undefined;
  teacherName: string;
  teacherEmail: string;
}

interface ScheduleCell {
  entryId: string;
  offeringId: string;
  subject: string;
  teacher: string;
  style: string;
}

interface PeriodRow {
  slotId: string;
  time: string;
  label: string;
  slotType: string;
  schedule: Partial<Record<DayKey, ScheduleCell>>;
}

const weekDays = [
  { key: "Mon", value: "MONDAY", label: "Mon", fullLabel: "Monday" },
  { key: "Tue", value: "TUESDAY", label: "Tue", fullLabel: "Tuesday" },
  { key: "Wed", value: "WEDNESDAY", label: "Wed", fullLabel: "Wednesday" },
  { key: "Thu", value: "THURSDAY", label: "Thu", fullLabel: "Thursday" },
  { key: "Fri", value: "FRIDAY", label: "Fri", fullLabel: "Friday" },
  { key: "Sat", value: "SATURDAY", label: "Sat", fullLabel: "Saturday" },
] as const;

type DayKey = (typeof weekDays)[number]["key"];

const getSubjectStyle = () => "bg-blue-50 text-slate-900 border-l-4 border-l-blue-700";

export function ClassSetupPage() {
  const setup = useClassSetup();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => {
    const requestedTab = searchParams.get("tab");
    if (requestedTab === "students") return "Students";
    if (requestedTab === "overview") return "Overview";
    if (requestedTab === "daily-classes") return "Daily Classes";
    if (requestedTab === "timetable") return "Timetable";
    if (requestedTab === "incharge") return "Incharge";
    return "Overview";
  });
  const [timetableView, setTimetableView] = useState<"TABLE" | "LIST">("TABLE");
  const [studentSearch, setStudentSearch] = useState("");
  const [confirmRollRegeneration, setConfirmRollRegeneration] = useState(false);

  // Cell editing state
  const [editingCell, setEditingCell] = useState<{
    entryId: string | undefined;
    periodSlotId: string;
    dayOfWeek: string;
    timeLabel: string;
    dayLabel: string;
    offeringId: string;
    teacher: string;
  } | null>(null);

  if (!setup.selectedCampus || !setup.selectedAcademicYear) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold text-amber-800">
        Select a campus and academic year to open Class Setup.
      </div>
    );
  }

  if (setup.loading) {
    return (
      <div
        role="status"
        className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs font-semibold text-slate-500"
      >
        Loading Class Setup data...
      </div>
    );
  }

  if (setup.error && !setup.workspace) {
    return <ErrorState message={setup.error} retry={() => void setup.refresh()} />;
  }

  if (!setup.workspace || !setup.selectedClass) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-slate-900">Class Setup</h1>
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-xs text-slate-500 font-medium">
          No active class is available in the selected campus.
        </div>
      </div>
    );
  }

  const { workspace } = setup;
  const selectedSection = workspace.sections.find((item) => item.id === setup.sectionId);
  const sectionStudents = setup.students.filter(
    (item) => item.enrollment.sectionId === setup.sectionId,
  );
  const maleStudents = sectionStudents.filter((item) => item.gender === "MALE").length;
  const femaleStudents = sectionStudents.filter((item) => item.gender === "FEMALE").length;
  const totalStudentCount = sectionStudents.length;

  const classTeacher = setup.responsibilities.find(
    (item) =>
      item.sectionId === setup.sectionId &&
      item.responsibilityType === "CLASS_TEACHER" &&
      item.status === "ACTIVE",
  );
  const sectionIncharge = setup.responsibilities.find(
    (item) =>
      item.sectionId === setup.sectionId &&
      item.responsibilityType === "SECTION_INCHARGE" &&
      item.status === "ACTIVE",
  );

  const classTeacherEmployee = setup.employees.find((item) => item.id === classTeacher?.employeeId);
  const classTeacherName = classTeacherEmployee?.fullName ?? "Not assigned";

  const sectionInchargeEmployee = setup.employees.find(
    (item) => item.id === sectionIncharge?.employeeId,
  );
  const sectionInchargeName = sectionInchargeEmployee?.fullName ?? "Not assigned";

  const totalSubjectCount = workspace.subjects.length;
  const optionalSubjectCount = workspace.subjects.filter((item) =>
    ["OPTIONAL", "ELECTIVE"].includes(item.subjectCategory),
  ).length;
  const mainSubjectCount = totalSubjectCount - optionalSubjectCount;
  const currentPeriodSet =
    workspace.periodSets.find((item) => item.id === workspace.currentVersion?.periodSetId) ??
    workspace.periodSets[0];
  const activeDays = weekDays.filter((day) => currentPeriodSet?.applicableDays.includes(day.value));
  const sortedSlots = [...workspace.slots]
    .filter((slot) => !currentPeriodSet || slot.periodSetId === currentPeriodSet.id)
    .sort(comparePeriodSlots);
  const sectionOfferings = workspace.offerings.filter(
    (item) => item.sectionId === setup.sectionId && item.status === "ACTIVE",
  );
  const offeringMap = new Map(sectionOfferings.map((item) => [item.id, item]));
  const assignmentMap = new Map(
    workspace.assignments
      .filter((item) => item.assignmentRole === "PRIMARY" && item.status === "ACTIVE")
      .map((item) => [item.subjectOfferingId, item]),
  );
  const catalogueMap = new Map(setup.catalogue.map((item) => [item.id, item]));
  const curriculumMap = new Map(setup.curriculumSubjects.map((item) => [item.id, item]));
  const subjectRows: SubjectRow[] = workspace.subjects.map((subject) => {
    const offering = sectionOfferings.find((item) => item.subjectPlanId === subject.subjectPlanId);
    const assignment = offering ? assignmentMap.get(offering.id) : undefined;
    const employee = setup.employees.find((item) => item.id === assignment?.employeeId);
    const curriculum = curriculumMap.get(subject.curriculumSubjectId);
    const catalogue = curriculum ? catalogueMap.get(curriculum.subjectCatalogueId) : undefined;
    return {
      subjectPlanId: subject.subjectPlanId,
      name: subject.subjectName,
      code: catalogue?.code ?? "-",
      type: ["OPTIONAL", "ELECTIVE"].includes(subject.subjectCategory) ? "Optional" : "Main",
      weeklyPeriods: subject.periodsPerWeek,
      offeringId: offering?.id,
      teacherId: employee?.id,
      teacherName: employee?.fullName ?? "Not assigned",
      teacherEmail: employee?.email ?? "No email available",
    };
  });
  const scheduleData: PeriodRow[] = sortedSlots.map((slot) => {
    const schedule: Partial<Record<DayKey, ScheduleCell>> = {};
    for (const day of activeDays) {
      const entry = workspace.entries.find(
        (item) =>
          item.sectionId === setup.sectionId &&
          item.dayOfWeek === day.value &&
          item.periodSlotIds.includes(slot.id),
      );
      if (!entry) continue;
      const offering = offeringMap.get(entry.subjectOfferingId);
      const assignment =
        entry.teachingAssignmentIds
          .map((id) => workspace.assignments.find((item) => item.id === id))
          .find(Boolean) ?? assignmentMap.get(entry.subjectOfferingId);
      const employee = setup.employees.find((item) => item.id === assignment?.employeeId);
      const subject = offering?.subjectName ?? "Subject";
      schedule[day.key] = {
        entryId: entry.id,
        offeringId: entry.subjectOfferingId,
        subject,
        teacher: employee?.fullName ?? "Teacher not assigned",
        style: getSubjectStyle(),
      };
    }
    return {
      slotId: slot.id,
      time: `${slot.startTime} - ${slot.endTime}`,
      label: slot.label,
      slotType: slot.slotType,
      schedule,
    };
  });
  const teachingPeriodCount = sortedSlots.filter((item) => item.slotType === "TEACHING").length;
  const assignedSubjectCount = subjectRows.filter((item) => item.teacherId).length;
  const studentsWithRollNumber = sectionStudents.filter(
    (item) => item.enrollment.rollNumber,
  ).length;

  const filteredStudentsList = sectionStudents.filter(
    (item) =>
      item.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      (item.enrollment.rollNumber ?? "").includes(studentSearch) ||
      item.guardian.name.toLowerCase().includes(studentSearch.toLowerCase()),
  );

  const handleOpenEditCell = (dayKey: DayKey, periodRow: PeriodRow) => {
    const existing = periodRow.schedule?.[dayKey];
    const day = weekDays.find((item) => item.key === dayKey);
    const defaultOffering = sectionOfferings[0];
    setEditingCell({
      entryId: existing?.entryId,
      periodSlotId: periodRow.slotId,
      dayOfWeek: day?.value ?? "MONDAY",
      timeLabel: `${periodRow.label} (${periodRow.time})`,
      dayLabel: day?.fullLabel ?? dayKey,
      offeringId: existing?.offeringId ?? defaultOffering?.id ?? "",
      teacher:
        existing?.teacher ??
        (defaultOffering
          ? (setup.employeeNames.get(assignmentMap.get(defaultOffering.id)?.employeeId ?? "") ??
            "Teacher not assigned")
          : "Teacher not assigned"),
    });
  };

  const handleSaveCell = async () => {
    if (!editingCell?.offeringId) return;
    await setup.saveLesson({
      ...(editingCell.entryId ? { id: editingCell.entryId } : {}),
      dayOfWeek: editingCell.dayOfWeek,
      periodSlotId: editingCell.periodSlotId,
      subjectOfferingId: editingCell.offeringId,
    });
    setEditingCell(null);
  };

  const handleRemoveCell = async () => {
    if (!editingCell?.entryId) return;
    await setup.removeLesson(editingCell.entryId);
    setEditingCell(null);
  };

  const TABS = [
    { name: "Overview", icon: LayoutDashboard },
    { name: "Subjects & Teachers", icon: BookOpen },
    { name: "Students", icon: Users },
    { name: "Daily Classes", icon: Clock3 },
    { name: "Timetable", icon: CalendarDays },
    { name: "Incharge", icon: UserCheck },
  ];

  const renderTimetableGridTable = () => (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full min-w-[580px] text-xs text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
            <th className="p-2.5 border-r border-slate-200 w-28 text-center whitespace-nowrap">
              Time / Day
            </th>
            {activeDays.map((day) => (
              <th
                key={day.value}
                className="p-2.5 border-r border-slate-200 text-center whitespace-nowrap"
              >
                {day.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {scheduleData.map((row) => {
            if (row.slotType !== "TEACHING") {
              return (
                <tr key={row.slotId} className="bg-slate-100/80 border-b border-slate-200">
                  <td className="p-2.5 font-bold text-slate-600 border-r border-slate-200 text-center bg-slate-100">
                    <div className="text-xs font-bold leading-tight whitespace-nowrap">
                      {row.time}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium leading-tight mt-0.5">
                      {row.label}
                    </div>
                  </td>
                  <td
                    colSpan={activeDays.length}
                    className="p-2.5 text-center font-black text-slate-500 uppercase tracking-widest text-xs bg-slate-100/90"
                  >
                    {row.label}
                  </td>
                </tr>
              );
            }

            return (
              <tr key={row.slotId} className="hover:bg-slate-50/50">
                <td className="p-2.5 align-middle font-semibold text-slate-700 border-r border-b border-slate-200 bg-slate-50/30 text-center">
                  <div className="text-xs font-bold leading-tight whitespace-nowrap">
                    {row.time}
                  </div>
                  <div className="text-[10px] text-slate-400 font-normal leading-tight mt-0.5">
                    {row.label}
                  </div>
                </td>

                {activeDays.map((day) => {
                  const cell = row.schedule[day.key];
                  if (!cell) {
                    return (
                      <td
                        key={day.value}
                        className="p-0 border-r border-b border-slate-200 align-stretch h-[72px]"
                      >
                        <button
                          type="button"
                          disabled={workspace.currentVersion?.status !== "DRAFT"}
                          onClick={() => handleOpenEditCell(day.key, row)}
                          className="h-full w-full p-2 text-center text-slate-300 hover:text-blue-600 hover:bg-blue-50/40 transition-all flex items-center justify-center group"
                          aria-label={`Add lesson for ${day.label}, ${row.label}`}
                        >
                          <Plus className="h-4 w-4 text-slate-300 group-hover:text-blue-600" />
                        </button>
                      </td>
                    );
                  }

                  return (
                    <td
                      key={day.value}
                      className="p-0 border-r border-b border-slate-200 align-stretch h-[72px]"
                    >
                      <button
                        type="button"
                        disabled={workspace.currentVersion?.status !== "DRAFT"}
                        onClick={() => handleOpenEditCell(day.key, row)}
                        className={`h-full w-full p-2.5 flex flex-col justify-between ${cell.style} transition-all border-0 rounded-none text-left relative group cursor-pointer hover:brightness-95`}
                        aria-label={`Edit ${cell.subject} lesson`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-xs leading-tight">
                            {cell.subject}
                          </span>
                          <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="text-[11px] font-semibold opacity-85 leading-tight">
                          {cell.teacher}
                        </div>
                      </button>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      {!scheduleData.length && (
        <div className="p-8 text-center text-xs font-semibold text-slate-500">
          Configure working days and periods before generating the timetable.
        </div>
      )}
    </div>
  );

  const renderTimetableList = () => {
    const lessons = activeDays.flatMap((day) =>
      scheduleData.flatMap((row) => {
        if (row.slotType !== "TEACHING") return [];
        const cell = row.schedule[day.key];
        return cell ? [{ day, row, cell }] : [];
      }),
    );

    return (
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[680px] text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-600">
            <tr>
              <th className="px-4 py-3">Day</th>
              <th className="px-4 py-3">Period</th>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Subject</th>
              <th className="px-4 py-3">Teacher</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lessons.map(({ day, row, cell }) => (
              <tr key={`${day.value}-${row.slotId}`} className="hover:bg-slate-50/70">
                <td className="px-4 py-3 font-bold text-slate-900">{day.fullLabel}</td>
                <td className="px-4 py-3 font-semibold text-slate-700">{row.label}</td>
                <td className="px-4 py-3 font-medium text-slate-500">{row.time}</td>
                <td className="px-4 py-3 font-bold text-slate-900">{cell.subject}</td>
                <td className="px-4 py-3 font-medium text-slate-600">{cell.teacher}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    disabled={workspace.currentVersion?.status !== "DRAFT"}
                    onClick={() => handleOpenEditCell(day.key, row)}
                    className="inline-flex items-center gap-1.5 font-semibold text-blue-600 hover:text-blue-700 disabled:cursor-not-allowed disabled:text-slate-400"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!lessons.length && (
          <div className="p-8 text-center text-xs font-semibold text-slate-500">
            No lessons have been added for {selectedSection?.name ?? "the selected section"}.
          </div>
        )}
      </div>
    );
  };

  const renderTimetableViewToggle = () => (
    <div
      className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5"
      role="group"
      aria-label="Timetable view"
    >
      <button
        type="button"
        aria-pressed={timetableView === "TABLE"}
        onClick={() => setTimetableView("TABLE")}
        className={`inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-colors ${
          timetableView === "TABLE"
            ? "bg-white text-blue-700 shadow-sm"
            : "text-slate-500 hover:text-slate-800"
        }`}
      >
        <Table2 className="h-3.5 w-3.5" /> Table View
      </button>
      <button
        type="button"
        aria-pressed={timetableView === "LIST"}
        onClick={() => setTimetableView("LIST")}
        className={`inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-colors ${
          timetableView === "LIST"
            ? "bg-white text-blue-700 shadow-sm"
            : "text-slate-500 hover:text-slate-800"
        }`}
      >
        <List className="h-3.5 w-3.5" /> List View
      </button>
    </div>
  );

  return (
    <div className="space-y-5 pb-12 font-sans text-slate-900 leading-normal">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 leading-tight">Class Setup</h1>
          <p className="mt-0.5 text-xs text-slate-500 leading-tight">
            Configure the selected class and section for the active campus and academic year.
          </p>
        </div>
      </div>

      {/* Top Filter Bar Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
        <div className="flex flex-wrap items-center gap-4 min-w-0 flex-1">
          <div className="w-52 min-w-44">
            <label className="text-[11px] font-bold text-slate-400 block mb-1.5 uppercase tracking-wider leading-none">
              Class / Program
            </label>
            <select
              className={selectClass}
              value={setup.classId}
              onChange={(e) => void setup.selectClass(e.target.value).catch(() => undefined)}
            >
              {setup.classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="w-52 min-w-44">
            <label className="text-[11px] font-bold text-slate-400 block mb-1.5 uppercase tracking-wider leading-none">
              Section
            </label>
            <select
              className={selectClass}
              value={setup.sectionId}
              onChange={(e) => setup.selectSection(e.target.value)}
            >
              {workspace.sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
              Class Status
            </span>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200 whitespace-nowrap">
              {setup.selectedClass.status}
            </span>
          </div>
          <Button
            size="sm"
            onClick={() => void setup.refresh().catch(() => undefined)}
            className="h-9 px-4 text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-xs whitespace-nowrap"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${setup.busy ? "animate-spin" : ""}`} />{" "}
            Refresh data
          </Button>
        </div>
      </div>

      {setup.error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-700 shadow-xs"
        >
          {setup.error}
        </div>
      )}
      {setup.notice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800 shadow-xs">
          {setup.notice}
        </div>
      )}

      {/* Section summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between h-[104px]">
          <div className="h-5 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider leading-none">
              Total Students
            </span>
            <div className="h-7 w-7 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
              <Users className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 leading-none">{totalStudentCount}</div>
          <div className="text-[11px] text-slate-500 font-medium leading-none">
            {maleStudents} Boys • {femaleStudents} Girls
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between h-[104px]">
          <div className="h-5 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider leading-none">
              Section Ownership
            </span>
            <div className="h-7 w-7 rounded-full bg-blue-50 flex items-center justify-center text-blue-700 shrink-0">
              <UserCheck2 className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="min-w-0 space-y-1 text-[11px] leading-tight">
            <div className="truncate text-slate-700">
              <span className="font-semibold text-slate-500">Teacher:</span>{" "}
              <span className="font-bold text-slate-900">{classTeacherName}</span>
            </div>
            <div className="truncate text-slate-700">
              <span className="font-semibold text-slate-500">Incharge:</span>{" "}
              <span className="font-bold text-slate-900">{sectionInchargeName}</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between h-[104px]">
          <div className="h-5 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider leading-none">
              Total Subjects
            </span>
            <div className="h-7 w-7 rounded-full bg-blue-50 flex items-center justify-center text-blue-700 shrink-0">
              <BookOpen className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 leading-none">{totalSubjectCount}</div>
          <div className="text-[11px] text-slate-500 font-medium leading-none">
            {mainSubjectCount} Main • {optionalSubjectCount} Optional
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between h-[104px]">
          <div className="h-5 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider leading-none">
              Weekly Periods
            </span>
            <div className="h-7 w-7 rounded-full bg-blue-50 flex items-center justify-center text-blue-700 shrink-0">
              <Clock3 className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 leading-none">
            {teachingPeriodCount * activeDays.length}
          </div>
          <div className="text-[11px] text-slate-500 font-medium leading-none">
            {teachingPeriodCount} periods × {activeDays.length} days
          </div>
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xs">
        {TABS.map((t) => {
          const isActive = activeTab === t.name;
          const Icon = t.icon;
          return (
            <button
              key={t.name}
              type="button"
              onClick={() => setActiveTab(t.name)}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold shrink-0 transition-all ${
                isActive
                  ? "bg-blue-50 text-blue-700 border border-blue-100 shadow-2xs font-bold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{t.name}</span>
            </button>
          );
        })}
      </nav>

      {activeTab === "Overview" && (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left Column: Subjects & Teachers + Students + Activity Log (5 cols out of 12) */}
          <div className="space-y-6 lg:col-span-5">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <h2 className="text-xs font-bold text-slate-900 leading-tight">
                  Subjects & Teachers ({selectedSection?.name ?? "Section"})
                </h2>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab("Subjects & Teachers")}
                    className="h-7 px-2.5 text-[11px] font-semibold border-blue-200 text-blue-700 bg-blue-50/50 hover:bg-blue-100 whitespace-nowrap"
                  >
                    Bulk Assign Teacher
                  </Button>
                  <AddClassSubjectDialog
                    curriculumSubjects={setup.availableCurriculumSubjects}
                    catalogue={setup.catalogue}
                    components={setup.components}
                    busy={setup.busy}
                    onAdd={setup.addClassSubject}
                  />
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="w-6 px-1.5 py-2.5 text-center"></th>
                      <th className="px-3 py-2.5 whitespace-nowrap">Subject</th>
                      <th className="px-2 py-2.5 whitespace-nowrap">Type</th>
                      <th className="px-2 py-2.5 text-center whitespace-nowrap">Weekly Periods</th>
                      <th className="px-3 py-2.5 whitespace-nowrap">Teacher</th>
                      <th className="px-2.5 py-2.5 text-right whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {subjectRows.map((row) => (
                      <tr key={row.subjectPlanId} className="hover:bg-slate-50/60 transition-all">
                        <td className="px-1.5 py-2.5 text-slate-300 text-center cursor-grab align-middle">
                          <GripVertical className="h-3.5 w-3.5 inline" />
                        </td>
                        <td className="px-3 py-2.5 font-bold text-slate-900 whitespace-nowrap align-middle">
                          {row.name}
                        </td>
                        <td className="px-2 py-2.5 font-medium text-slate-600 whitespace-nowrap align-middle">
                          {row.type}
                        </td>
                        <td className="px-2 py-2.5 font-bold text-slate-900 text-center whitespace-nowrap align-middle">
                          {row.weeklyPeriods}
                        </td>
                        <td className="px-3 py-2.5 align-middle">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                            <div className="min-w-0">
                              <div className="font-bold text-slate-800 text-[11px] leading-tight truncate">
                                {row.teacherName}
                              </div>
                              <div className="text-[10px] text-slate-400 font-medium leading-tight truncate mt-0.5">
                                {row.teacherEmail}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-2.5 py-2.5 text-right align-middle whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5 text-slate-400">
                            <button
                              type="button"
                              onClick={() => setActiveTab("Subjects & Teachers")}
                              className="p-1 hover:text-blue-600 rounded transition-colors"
                              aria-label={`Edit ${row.name}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveTab("Subjects & Teachers")}
                              className="p-1 hover:text-rose-600 rounded transition-colors"
                              aria-label={`Delete ${row.name}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="text-xs font-semibold text-slate-500 pt-1">
                Total Periods:{" "}
                <span className="font-bold text-slate-900">
                  {subjectRows.reduce((sum, item) => sum + item.weeklyPeriods, 0)}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h2 className="text-xs font-bold text-slate-900 leading-tight">
                  Students in {selectedSection?.name ?? "Section"} ({totalStudentCount})
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveTab("Students")}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 whitespace-nowrap"
                >
                  View All Students <ArrowRight className="h-3 w-3" />
                </button>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 flex flex-col justify-between items-center text-center h-[88px]">
                  <div className="h-7 flex items-center justify-center text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-tight">
                    Enrolled
                  </div>
                  <div className="text-2xl font-black text-emerald-600 leading-none pb-0.5">
                    {totalStudentCount}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 flex flex-col justify-between items-center text-center h-[88px]">
                  <div className="h-7 flex items-center justify-center text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-tight">
                    Boys
                  </div>
                  <div className="text-2xl font-black text-blue-600 leading-none pb-0.5">
                    {maleStudents}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 flex flex-col justify-between items-center text-center h-[88px]">
                  <div className="h-7 flex items-center justify-center text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-tight">
                    Girls
                  </div>
                  <div className="text-2xl font-black text-violet-600 leading-none pb-0.5">
                    {femaleStudents}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 flex flex-col justify-between items-center text-center h-[88px]">
                  <div className="h-7 flex items-center justify-center text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-tight">
                    Roll Numbers
                  </div>
                  <div className="text-2xl font-black text-slate-800 leading-none pb-0.5">
                    {studentsWithRollNumber}/{totalStudentCount}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h2 className="text-xs font-bold text-slate-900 leading-tight">Section Status</h2>
                <span className="text-[11px] font-semibold text-slate-500">Current section</span>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3 text-xs">
                  <div className="h-7 w-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                    <UserCheck className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-900 text-[11px] leading-tight">
                      {assignedSubjectCount}/{subjectRows.length} subjects have a primary teacher
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium mt-0.5 leading-tight">
                      Required before timetable generation
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-xs">
                  <div className="h-7 w-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-900 text-[11px] leading-tight">
                      {workspace.currentVersion
                        ? `${workspace.currentVersion.name} is ${workspace.currentVersion.status.toLowerCase()}`
                        : "No timetable version generated"}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium mt-0.5 leading-tight">
                      {
                        workspace.entries.filter((item) => item.sectionId === setup.sectionId)
                          .length
                      }{" "}
                      lessons stored for {selectedSection?.name ?? "the selected section"}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-xs">
                  <div className="h-7 w-7 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldCheck className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-900 text-[11px] leading-tight">
                      Class teacher: {classTeacherName}; section incharge: {sectionInchargeName}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium mt-0.5 leading-tight">
                      Ownership is maintained independently for each section
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Timetable Grid Card (7 cols out of 12) */}
          <div className="space-y-6 lg:col-span-7">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-900 leading-tight">
                  Timetable ({selectedSection?.name ?? "Section"})
                </h2>
                <div className="flex items-center gap-2">
                  {renderTimetableViewToggle()}
                  <Button
                    size="sm"
                    disabled={setup.busy || !currentPeriodSet || !subjectRows.length}
                    onClick={() => void setup.generateDraft().catch(() => undefined)}
                    className="h-8 px-3 text-xs font-semibold border-blue-200 text-blue-700 bg-blue-50/60 hover:bg-blue-100 whitespace-nowrap"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 mr-1 ${setup.busy ? "animate-spin" : ""}`} />{" "}
                    Generate
                  </Button>
                  {workspace.currentVersion?.status === "DRAFT" && (
                    <Button
                      size="sm"
                      disabled={setup.busy}
                      onClick={() => void setup.publish().catch(() => undefined)}
                      className="h-8 px-3 text-xs"
                    >
                      <Save className="h-3.5 w-3.5" /> Publish
                    </Button>
                  )}
                  {workspace.currentVersion?.status === "PUBLISHED" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={setup.busy}
                      onClick={() => void setup.revise().catch(() => undefined)}
                      className="h-8 px-3 text-xs"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Create revision
                    </Button>
                  )}
                  <button
                    type="button"
                    aria-label="Timetable Settings"
                    onClick={() => setActiveTab("Daily Classes")}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md border border-slate-200"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {timetableView === "TABLE" ? renderTimetableGridTable() : renderTimetableList()}
              {setup.generationIssues.length > 0 && (
                <ul className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-800">
                  {setup.generationIssues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              )}

              {/* Footer Legend Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="font-semibold text-slate-600 whitespace-nowrap">
                      Main Subjects
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0" />
                    <span className="font-semibold text-slate-600 whitespace-nowrap">
                      Optional Subjects
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-400 shrink-0" />
                    <span className="font-semibold text-slate-600 whitespace-nowrap">
                      Break / Lunch
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab("Timetable")}
                  className="font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 whitespace-nowrap"
                >
                  View Full Timetable <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "Timetable" && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">
                Timetable ({selectedSection?.name ?? "Section"})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Edit the subject assigned to each period for {setup.selectedClass.name} -{" "}
                {selectedSection?.name ?? "Section"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {renderTimetableViewToggle()}
              <Button
                size="sm"
                disabled={setup.busy || !currentPeriodSet || !subjectRows.length}
                onClick={() => void setup.generateDraft().catch(() => undefined)}
                className="h-8 px-3 text-xs font-semibold border-blue-200 text-blue-700 bg-blue-50/60 hover:bg-blue-100 whitespace-nowrap"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1 ${setup.busy ? "animate-spin" : ""}`} />{" "}
                Generate
              </Button>
              {workspace.currentVersion?.status === "DRAFT" && (
                <Button
                  size="sm"
                  disabled={setup.busy}
                  onClick={() => void setup.publish().catch(() => undefined)}
                  className="h-8 px-3 text-xs"
                >
                  <Save className="h-3.5 w-3.5" /> Publish
                </Button>
              )}
              {workspace.currentVersion?.status === "PUBLISHED" && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={setup.busy}
                  onClick={() => void setup.revise().catch(() => undefined)}
                  className="h-8 px-3 text-xs"
                >
                  <Pencil className="h-3.5 w-3.5" /> Create revision
                </Button>
              )}
              <button
                type="button"
                aria-label="Timetable Settings"
                onClick={() => setActiveTab("Daily Classes")}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md border border-slate-200"
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </div>

          {timetableView === "TABLE" ? renderTimetableGridTable() : renderTimetableList()}
          {setup.generationIssues.length > 0 && (
            <ul className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-800">
              {setup.generationIssues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="font-semibold text-slate-600 whitespace-nowrap">
                  Main Subjects
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0" />
                <span className="font-semibold text-slate-600 whitespace-nowrap">
                  Optional Subjects
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-400 shrink-0" />
                <span className="font-semibold text-slate-600 whitespace-nowrap">
                  Break / Lunch
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "Subjects & Teachers" && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex justify-end">
            <AddClassSubjectDialog
              curriculumSubjects={setup.availableCurriculumSubjects}
              catalogue={setup.catalogue}
              components={setup.components}
              busy={setup.busy}
              onAdd={setup.addClassSubject}
            />
          </div>
          <SubjectTeacherMatrix
            workspace={workspace}
            plans={setup.plans}
            components={setup.components}
            sectionId={setup.sectionId}
            employees={setup.teachingEmployees}
            employeeNames={setup.employeeNames}
            busy={setup.busy}
            needsQualification={setup.teacherNeedsQualification}
            onAssign={setup.assignSectionSubjectTeacher}
            onUpdateSubject={setup.updateClassSubject}
            onRemoveSubject={setup.removeClassSubject}
          />
        </div>
      )}

      {activeTab === "Students" && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">
                Enrolled Students - {setup.selectedClass.name} ({selectedSection?.name ?? "Section"}
                )
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Roster of active students enrolled in {selectedSection?.name ?? "Section"} (
                {totalStudentCount} total)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={setup.busy || !totalStudentCount}
                onClick={() => void setup.generateRegistrationNumbers().catch(() => undefined)}
              >
                <Save className="h-3.5 w-3.5" /> Registration numbers
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={setup.busy || !totalStudentCount}
                onClick={() => void setup.generateRollNumbers(false).catch(() => undefined)}
              >
                <RefreshCw className="h-3.5 w-3.5" /> Generate roll numbers
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={setup.busy || !totalStudentCount}
                onClick={() => setConfirmRollRegeneration(true)}
              >
                <RefreshCw className="h-3.5 w-3.5" /> Regenerate
              </Button>
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search student name or roll..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="h-8 pl-8 pr-3 w-56 rounded-lg border border-slate-200 text-xs outline-none focus:border-blue-500"
                />
              </div>
              <Link
                to="/admin/students"
                className="h-8 px-3 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" /> Add Student
              </Link>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-3 py-3 whitespace-nowrap">Roll No.</th>
                  <th className="px-4 py-3 whitespace-nowrap">Student Name</th>
                  <th className="px-3 py-3 whitespace-nowrap">Gender</th>
                  <th className="px-3 py-3 whitespace-nowrap">Registration No.</th>
                  <th className="px-3 py-3 text-center whitespace-nowrap">Status</th>
                  <th className="px-4 py-3 whitespace-nowrap">Guardian Contact</th>
                  <th className="px-3 py-3 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudentsList.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-50/60 transition-all">
                    <td className="px-3 py-3 font-mono font-bold text-slate-700 whitespace-nowrap">
                      {st.enrollment.rollNumber ?? "Not assigned"}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-full bg-blue-100 text-blue-700 font-extrabold flex items-center justify-center text-xs shrink-0">
                          {st.name[0]}
                        </div>
                        <span>{st.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 font-medium text-slate-600 whitespace-nowrap">
                      {st.gender}
                    </td>
                    <td className="px-3 py-3 font-mono font-semibold text-slate-700 whitespace-nowrap">
                      {st.registrationNumber || "Not assigned"}
                    </td>
                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold border ${
                          st.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        }`}
                      >
                        {st.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800 text-xs">{st.guardian.name}</div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        {st.guardian.phone ?? st.phone}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      <Link
                        to={`/admin/students/${st.id}`}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                      >
                        View Profile →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "Daily Classes" && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <TimingConfiguration
            academicUnitId={setup.selectedUnit?.id}
            academicYearStart={setup.selectedAcademicYear.startDate}
            academicYearEnd={setup.selectedAcademicYear.endDate}
            periodSets={workspace.periodSets}
            slots={workspace.slots}
            busy={setup.busy}
            onSave={setup.saveTiming}
          />
        </div>
      )}

      {activeTab === "Incharge" && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <SectionOwnershipPanel
            sections={selectedSection ? [selectedSection] : []}
            employees={setup.teachingEmployees}
            responsibilities={setup.responsibilities}
            studentCounts={
              new Map(selectedSection ? [[selectedSection.id, totalStudentCount]] : [])
            }
            busy={setup.busy}
            onAssign={setup.assignSectionResponsibility}
          />
        </div>
      )}

      <Dialog open={confirmRollRegeneration} onOpenChange={setConfirmRollRegeneration}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Regenerate section roll numbers</DialogTitle>
            <DialogDescription>
              This replaces every roll number in {selectedSection?.name ?? "the selected section"}.
              Existing references remain in audit history.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmRollRegeneration(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={setup.busy}
              onClick={() =>
                void setup
                  .generateRollNumbers(true)
                  .then(() => setConfirmRollRegeneration(false))
                  .catch(() => undefined)
              }
            >
              Regenerate roll numbers
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editingCell)}
        onOpenChange={(open) => {
          if (!open) setEditingCell(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Pencil className="h-4 w-4 text-blue-600" />
              Edit Timetable Lesson
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {editingCell?.dayLabel} • {editingCell?.timeLabel}
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 block">Subject</label>
              <select
                className={selectClass}
                value={editingCell?.offeringId ?? ""}
                onChange={(e) => {
                  const offeringId = e.target.value;
                  const assignment = assignmentMap.get(offeringId);
                  setEditingCell((prev) =>
                    prev
                      ? {
                          ...prev,
                          offeringId,
                          teacher:
                            setup.employeeNames.get(assignment?.employeeId ?? "") ??
                            "Teacher not assigned",
                        }
                      : null,
                  );
                }}
              >
                <option value="">Select subject</option>
                {sectionOfferings.map((offering) => (
                  <option key={offering.id} value={offering.id}>
                    {offering.subjectName}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 block">Assigned Teacher</label>
              <div className={`${selectClass} flex items-center bg-slate-50 text-slate-600`}>
                {editingCell?.teacher ?? "Teacher not assigned"}
              </div>
              <p className="text-[10px] text-slate-500">
                Teacher ownership is changed in Subjects &amp; Teachers, not per timetable cell.
              </p>
            </div>
          </DialogBody>

          <DialogFooter className="flex items-center justify-between sm:justify-between pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              disabled={!editingCell?.entryId || setup.busy}
              onClick={() => void handleRemoveCell().catch(() => undefined)}
              className="h-8 text-xs font-semibold text-rose-600 border-rose-200 hover:bg-rose-50"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear Slot
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingCell(null)}
                className="h-8 text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={setup.busy || !editingCell?.offeringId}
                onClick={() => void handleSaveCell().catch(() => undefined)}
                className="h-8 text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700"
              >
                Save Lesson
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

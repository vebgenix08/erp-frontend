import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  findTeacherNavigationGroup,
  findTeacherPage,
  getVisibleTeacherNavigation,
} from "../model/teacher-workspace.config";
import { TeacherWorkspaceContextProvider } from "../model/teacher-workspace-context";
import { TeacherWorkspacePage } from "./teacher-workspace-page";
import { getTeacherAttendanceWorkspace } from "../../teacher-attendance/api/teacher-attendance.api";
import { getTeacherMarksWorkspace } from "../../teacher-marks/api/teacher-marks.api";
import type { TeacherWorkloadWorkspace } from "../../teacher-workload/model/teacher-workload.types";
import {
  listTeacherDiaryEntries,
  listTeacherLessonPlans,
  listTeacherResources,
} from "../../teacher-content/api/teacher-content.api";
import {
  listTeacherAcademicDoubts,
  listTeacherCoursework,
  listTeacherCourseworkSubmissions,
} from "../../teacher-engagement/api/teacher-engagement.api";
import { getTeacherClassWorkspace } from "../../teacher-classes/api/teacher-classes.api";
import {
  listTeacherAttendanceHistory,
  listTeacherMarksHistory,
} from "../../teacher-history/api/teacher-history.api";
import {
  getTeacherCoordinationWorkspace,
  getTeacherDepartmentWorkspace,
  getTeacherLeadershipWorkspace,
} from "../../teacher-department/api/teacher-department.api";

vi.mock("../../teacher-attendance/api/teacher-attendance.api", () => ({
  getTeacherAttendanceWorkspace: vi.fn(),
  saveTeacherAttendance: vi.fn(),
}));

vi.mock("../../teacher-marks/api/teacher-marks.api", () => ({
  getTeacherMarksWorkspace: vi.fn(),
  saveTeacherMarks: vi.fn(),
}));

vi.mock("../../teacher-content/api/teacher-content.api", () => ({
  listTeacherDiaryEntries: vi.fn(),
  listTeacherLessonPlans: vi.fn(),
  listTeacherResources: vi.fn(),
  saveTeacherDiaryEntry: vi.fn(),
  saveTeacherLessonPlan: vi.fn(),
  saveTeacherResource: vi.fn(),
  setTeacherDiaryStatus: vi.fn(),
  setTeacherLessonPlanStatus: vi.fn(),
  archiveTeacherResource: vi.fn(),
}));

vi.mock("../../teacher-engagement/api/teacher-engagement.api", () => ({
  listTeacherAcademicDoubts: vi.fn(),
  listTeacherCoursework: vi.fn(),
  listTeacherCourseworkSubmissions: vi.fn(),
  saveTeacherCoursework: vi.fn(),
  setTeacherCourseworkStatus: vi.fn(),
  reviewTeacherCourseworkSubmission: vi.fn(),
  replyTeacherAcademicDoubt: vi.fn(),
  closeTeacherAcademicDoubt: vi.fn(),
}));

vi.mock("../../teacher-classes/api/teacher-classes.api", () => ({
  getTeacherClassWorkspace: vi.fn(),
}));

vi.mock("../../teacher-history/api/teacher-history.api", () => ({
  listTeacherAttendanceHistory: vi.fn(),
  listTeacherMarksHistory: vi.fn(),
}));

vi.mock("../../teacher-department/api/teacher-department.api", () => ({
  getTeacherCoordinationWorkspace: vi.fn(),
  getTeacherDepartmentWorkspace: vi.fn(),
  getTeacherLeadershipWorkspace: vi.fn(),
}));

const operatingContext = {
  campusId: "campus-1",
  campusName: "Vidyapeetha Campus",
  academicYearId: "year-1",
  academicYearName: "2026 - 2027",
  institutionMode: "SCHOOL" as const,
  academicUnitId: "unit-1",
  academicUnitName: "High School",
  academicPeriod: "Term I",
  classLabel: "Grade 8 - Section A",
  subjectLabel: "Mathematics",
  userName: "Anitha Rao",
  userEmail: "anitha.rao@vebgenix.com",
};

const emptyTeacherWorkspace: TeacherWorkloadWorkspace = {
  teacher: {
    id: "employee-1",
    employeeCode: "EMP-1",
    fullName: "Anitha Rao",
    staffType: "TEACHER",
    primaryCampusId: "campus-1",
    campusIds: ["campus-1"],
  },
  academicYear: { id: "year-1", name: "2026 - 2027" },
  viewMode: "PUBLISHED",
  weekStartDate: "2026-08-10T00:00:00.000Z",
  selectedVersions: [],
  policy: {
    scopeType: "DEFAULT",
    inheritedFrom: "DEFAULT",
    isOverride: false,
    maximumWeeklyPeriods: 30,
    maximumDailyPeriods: 8,
    maximumConsecutivePeriods: 3,
  },
  summary: {
    requiredPeriods: 0,
    scheduledPeriods: 0,
    unscheduledPeriods: 0,
    permanentPeriods: 0,
    actualWeeklyPeriods: 0,
    teachingSessions: 0,
    substitutionPeriods: 0,
    cancelledPeriods: 0,
    maximumWeeklyPeriods: 30,
    remainingCapacity: 30,
    overloadPeriods: 0,
    maximumConsecutivePeriods: 0,
    weightedUnits: 0,
  },
  campusBreakdown: [],
  componentBreakdown: [],
  dailyBreakdown: [],
  assignments: [],
  timetableEntries: [],
  availabilityExceptions: [],
  responsibilities: [],
  issues: [],
};

const assignedTeacherWorkspace: TeacherWorkloadWorkspace = {
  ...emptyTeacherWorkspace,
  summary: {
    ...emptyTeacherWorkspace.summary,
    requiredPeriods: 5,
    scheduledPeriods: 1,
    unscheduledPeriods: 4,
    permanentPeriods: 1,
    actualWeeklyPeriods: 1,
    teachingSessions: 1,
    remainingCapacity: 29,
  },
  assignments: [
    {
      id: "assignment-1",
      campusId: "campus-1",
      campusName: "Vidyapeetha Campus",
      classId: "class-8",
      className: "Grade 8",
      sectionId: "section-1",
      sectionName: "Section A",
      subjectOfferingId: "offering-1",
      subjectComponentId: "component-1",
      subjectName: "Mathematics",
      componentType: "THEORY",
      assignmentRole: "PRIMARY",
      requiredPeriods: 5,
      scheduledPeriods: 1,
      unscheduledPeriods: 4,
      status: "INCOMPLETE",
    },
  ],
  timetableEntries: [
    {
      id: "lesson-1",
      sourceTimetableEntryId: "entry-1",
      subjectOfferingId: "offering-1",
      sectionId: "section-1",
      dayOfWeek: "MONDAY",
      startTime: "09:00",
      endTime: "09:45",
      periodCount: 1,
      teachingSessionCount: 1,
      campusId: "campus-1",
      campusName: "Vidyapeetha Campus",
      className: "Grade 8",
      sectionName: "Section A",
      subjectName: "Mathematics",
      componentType: "THEORY",
      state: "PERMANENT",
      timetableVersionId: "version-1",
      timetableVersionStatus: "PUBLISHED",
    },
  ],
};

function renderPage(
  path: string,
  workspace: TeacherWorkloadWorkspace | null = null,
  roleCodes: string[] = ["TEACHER"],
  state: { hasEmployee?: boolean; workspaceError?: string | null; workspaceLoading?: boolean } = {},
) {
  const pageSlug = path.split("/").filter(Boolean).at(-1);
  const page = findTeacherPage(pageSlug);
  const capabilities = {
    hasEmployee: state.hasEmployee ?? true,
    hasTeachingAssignments: Boolean(workspace?.assignments.length),
    responsibilityTypes: new Set(
      workspace?.responsibilities.map((item) => item.responsibilityType) ?? [],
    ),
    roleCodes: new Set(roleCodes),
  };
  const visibleNavigation = getVisibleTeacherNavigation(capabilities);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <TeacherWorkspaceContextProvider
        value={{
          activeNavigationGroup: findTeacherNavigationGroup(page),
          visibleNavigation,
          capabilities,
          accessLabel: "Academic Staff",
          operatingContext,
          workspace,
          workspaceLoading: state.workspaceLoading ?? false,
          workspaceError: state.workspaceError ?? null,
        }}
      >
        <Routes>
          <Route path="/teacher/:pageSlug" element={<TeacherWorkspacePage />} />
        </Routes>
      </TeacherWorkspaceContextProvider>
    </MemoryRouter>,
  );
}

describe("teacher workspace pages", () => {
  afterEach(cleanup);

  beforeEach(() => {
    const emptyPage = { items: [], page: 1, pageSize: 10, total: 0, totalPages: 1 };
    vi.mocked(listTeacherLessonPlans).mockResolvedValue(emptyPage);
    vi.mocked(listTeacherDiaryEntries).mockResolvedValue(emptyPage);
    vi.mocked(listTeacherResources).mockResolvedValue(emptyPage);
    vi.mocked(listTeacherCoursework).mockResolvedValue(emptyPage);
    vi.mocked(listTeacherCourseworkSubmissions).mockResolvedValue(emptyPage);
    vi.mocked(listTeacherAcademicDoubts).mockResolvedValue(emptyPage);
    vi.mocked(listTeacherAttendanceHistory).mockResolvedValue(emptyPage);
    vi.mocked(listTeacherMarksHistory).mockResolvedValue(emptyPage);
    vi.mocked(getTeacherDepartmentWorkspace).mockResolvedValue({
      scope: {
        responsibilityId: "hod-1",
        campusId: "campus-1",
        campusName: "Vidyapeetha Campus",
        programId: "program-1",
        programName: "High School",
      },
      availableScopes: [
        {
          responsibilityId: "hod-1",
          campusId: "campus-1",
          campusName: "Vidyapeetha Campus",
          programId: "program-1",
          programName: "High School",
        },
      ],
      academicYear: { id: "year-1", name: "2026 - 2027" },
      date: "2026-08-15",
      summary: {
        faculty: 1,
        classes: 1,
        sections: 1,
        subjectOfferings: 1,
        unassignedOfferings: 0,
        incompleteAllocations: 0,
        publishedTimetables: 1,
        pendingAttendanceSections: 0,
        pendingMarksSheets: 0,
      },
      faculty: [
        {
          employeeId: "employee-1",
          employeeCode: "EMP-1",
          fullName: "Anitha Rao",
          email: "anitha.rao@vebgenix.com",
          phone: "+91 9876543210",
          department: "Science",
          designation: "Teacher",
          status: "ACTIVE",
          assignmentCount: 1,
          requiredPeriods: 5,
          scheduledPeriods: 5,
          responsibilityTypes: [],
          menteeCount: 2,
          allocations: [
            {
              teachingAssignmentId: "assignment-1",
              subjectOfferingId: "offering-1",
              subjectName: "Mathematics",
              className: "Grade 8",
              sectionName: "Section A",
              requiredPeriods: 5,
              scheduledPeriods: 5,
            },
          ],
          schedule: [
            {
              id: "entry-1:period-1",
              dayOfWeek: "MONDAY",
              startTime: "09:00",
              endTime: "09:45",
              periodLabel: "Period 1",
              subjectName: "Mathematics",
              className: "Grade 8",
              sectionName: "Section A",
            },
          ],
        },
      ],
      coverage: [
        {
          subjectOfferingId: "offering-1",
          subjectName: "Mathematics",
          className: "Grade 8",
          sectionName: "Section A",
          requiredPeriods: 5,
          scheduledPeriods: 5,
          teacherNames: ["Anitha Rao"],
          status: "READY",
        },
      ],
      timetables: [
        {
          sectionId: "section-1",
          className: "Grade 8",
          sectionName: "Section A",
          versionId: "version-1",
          workingDays: ["MONDAY"],
          slots: [
            {
              id: "slot-1",
              sequence: 1,
              label: "Period 1",
              startTime: "09:00",
              endTime: "09:45",
              slotType: "TEACHING",
            },
          ],
          entries: [
            {
              id: "entry-1",
              dayOfWeek: "MONDAY",
              periodSlotIds: ["slot-1"],
              subjectName: "Mathematics",
              teacherNames: ["Anitha Rao"],
              teacherEmployeeIds: ["employee-1"],
            },
          ],
          versionName: "Grade 8 A",
          status: "PUBLISHED",
          entryCount: 5,
          conflictCount: 0,
        },
      ],
      completion: [
        {
          sectionId: "section-1",
          className: "Grade 8",
          sectionName: "Section A",
          attendanceStatus: "SUBMITTED",
          submittedAttendanceSessions: 1,
          marksSubmitted: 1,
          marksPending: 0,
        },
      ],
      issues: [],
    });
    vi.mocked(getTeacherCoordinationWorkspace).mockImplementation((input) =>
      getTeacherDepartmentWorkspace(input),
    );
    vi.mocked(getTeacherLeadershipWorkspace).mockImplementation((input) =>
      getTeacherDepartmentWorkspace(input),
    );
    vi.mocked(getTeacherClassWorkspace).mockResolvedValue({
      teacher: assignedTeacherWorkspace.teacher,
      academicYear: assignedTeacherWorkspace.academicYear,
      assignment: assignedTeacherWorkspace.assignments[0]!,
      students: [
        {
          studentId: "student-1",
          studentName: "Aarav Sharma",
          registrationNumber: "REG/2026/000001",
          rollNumber: "1",
          status: "ACTIVE",
        },
      ],
      timetableEntries: assignedTeacherWorkspace.timetableEntries,
    });
    vi.mocked(getTeacherAttendanceWorkspace).mockResolvedValue({
      date: "2026-08-15",
      teacherId: "employee-1",
      teacherName: "Anitha Rao",
      academicYear: { id: "year-1", name: "2026 - 2027" },
      sessions: [
        {
          id: "lesson-1",
          timetableEntryId: "entry-1",
          timetableVersionId: "version-1",
          campusId: "campus-1",
          campusName: "Vidyapeetha Campus",
          academicYearId: "year-1",
          subjectOfferingId: "offering-1",
          sectionId: "section-1",
          subjectName: "Mathematics",
          className: "Grade 8",
          sectionName: "Section A",
          startTime: "09:00",
          endTime: "09:45",
          state: "PERMANENT",
        },
      ],
      selectedSession: {
        id: "lesson-1",
        timetableEntryId: "entry-1",
        timetableVersionId: "version-1",
        campusId: "campus-1",
        campusName: "Vidyapeetha Campus",
        academicYearId: "year-1",
        subjectOfferingId: "offering-1",
        sectionId: "section-1",
        subjectName: "Mathematics",
        className: "Grade 8",
        sectionName: "Section A",
        startTime: "09:00",
        endTime: "09:45",
        state: "PERMANENT",
      },
      students: [
        {
          studentId: "student-1",
          enrollmentId: "enrollment-1",
          studentName: "Aarav Sharma",
          rollNumber: "01",
          status: "PRESENT",
        },
        {
          studentId: "student-2",
          enrollmentId: "enrollment-2",
          studentName: "Ananya Verma",
          rollNumber: "02",
          status: "PRESENT",
        },
      ],
      canEdit: true,
    });
    vi.mocked(getTeacherMarksWorkspace).mockResolvedValue({
      teacher: { id: "employee-1", name: "Anitha Rao" },
      academicYear: { id: "year-1", name: "2026 - 2027" },
      offerings: [
        {
          id: "offering-1",
          campusId: "campus-1",
          campusName: "Vidyapeetha Campus",
          subjectName: "Mathematics",
          classId: "class-8",
          className: "Grade 8",
          sectionId: "section-1",
          sectionName: "Section A",
        },
      ],
      assessments: [
        {
          id: "assessment-1",
          campusId: "campus-1",
          academicYearId: "year-1",
          classId: "class-8",
          name: "Final Examination",
          assessmentDate: "2027-03-08",
          attendanceWindowStart: "2027-02-07",
          attendanceWindowEnd: "2027-03-07",
          maximumMarks: 120,
          sequence: 6,
          status: "OPEN",
          version: 1,
        },
      ],
      selectedOffering: {
        id: "offering-1",
        campusId: "campus-1",
        campusName: "Vidyapeetha Campus",
        subjectName: "Mathematics",
        classId: "class-8",
        className: "Grade 8",
        sectionId: "section-1",
        sectionName: "Section A",
      },
      selectedAssessment: {
        id: "assessment-1",
        campusId: "campus-1",
        academicYearId: "year-1",
        classId: "class-8",
        name: "Final Examination",
        assessmentDate: "2027-03-08",
        attendanceWindowStart: "2027-02-07",
        attendanceWindowEnd: "2027-03-07",
        maximumMarks: 120,
        sequence: 6,
        status: "OPEN",
        version: 1,
      },
      students: [
        {
          studentId: "student-1",
          enrollmentId: "enrollment-1",
          studentName: "Aarav Sharma",
          rollNumber: "01",
          status: "NOT_RECORDED",
          attendanceAttended: 17,
          attendanceHeld: 18,
          attendancePercentage: 94,
        },
        {
          studentId: "student-2",
          enrollmentId: "enrollment-2",
          studentName: "Ananya Verma",
          rollNumber: "02",
          status: "NOT_RECORDED",
          marks: null,
          attendanceAttended: 0,
          attendanceHeld: 0,
          attendancePercentage: null,
        },
      ],
      summary: { students: 2, recorded: 0, absent: 0, pending: 2 },
      canEdit: true,
    });
  });

  it("renders the authoritative employee error instead of redirecting the dashboard to itself", () => {
    renderPage("/teacher/dashboard", null, ["TEACHER"], {
      hasEmployee: false,
      workspaceError: "active teacher was not found",
    });

    expect(screen.getByText("active teacher was not found")).toBeInTheDocument();
  });

  it("renders real teaching context instead of repeating workload-only dashboard cards", () => {
    renderPage("/teacher/dashboard", assignedTeacherWorkspace);

    expect(screen.getByText("Teaching groups")).toBeInTheDocument();
    expect(screen.getByText("Subjects handled")).toBeInTheDocument();
    expect(screen.getByText("Weekly periods")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "My teaching assignments" })).toBeInTheDocument();
    expect(screen.getAllByText("Grade 8 - Section A").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Mathematics").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /mark attendance/i })).toBeInTheDocument();
    expect(screen.queryByText("Academic year workload")).not.toBeInTheDocument();
  });

  it("renders assessment entry with the configured attendance interval", async () => {
    renderPage("/teacher/marks-entry", assignedTeacherWorkspace);
    expect(await screen.findByRole("heading", { name: "Marks Register" })).toBeInTheDocument();
    expect(await screen.findByText(/2027-02-07 through 2027-03-07/i)).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Assessment" })).toBeInTheDocument();
    expect(screen.getByText(/Final Examination · 120 marks/i)).toBeInTheDocument();
    expect(screen.getByText("17 / 18")).toBeInTheDocument();
    expect(screen.getByText("No submitted classes")).toBeInTheDocument();
    expect(screen.queryByText("null%")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("null")).not.toBeInTheDocument();
  });

  it("renders Present and Absent as the only attendance states", async () => {
    renderPage("/teacher/attendance", assignedTeacherWorkspace);
    const presentButtons = await screen.findAllByRole("button", { name: "Present" });
    const absentButtons = screen.getAllByRole("button", { name: "Absent" });
    expect(presentButtons).toHaveLength(2);
    expect(absentButtons).toHaveLength(2);
    expect(presentButtons[0]).toHaveClass("bg-emerald-600");
    expect(absentButtons[0]).not.toHaveClass("bg-rose-600");

    fireEvent.click(absentButtons[0]!);
    expect(absentButtons[0]).toHaveClass("bg-rose-600");
    expect(presentButtons[0]).not.toHaveClass("bg-emerald-600");
    expect(screen.queryByRole("button", { name: /late/i })).not.toBeInTheDocument();
  });

  it("renders the academic report catalog", async () => {
    renderPage("/teacher/academic-reports", assignedTeacherWorkspace);
    expect(await screen.findByRole("heading", { name: "Academic Reports" })).toBeInTheDocument();
    expect(
      await screen.findByRole("option", { name: "Assessment-Window Attendance" }),
    ).toBeInTheDocument();
  });

  it.each([
    ["/teacher/lesson-plans", "Lesson Plans"],
    ["/teacher/teaching-diary", "Teaching Diary"],
    ["/teacher/teaching-resources", "Teaching Resources"],
  ])("renders the real teacher content page at %s", async (path, heading) => {
    renderPage(path, assignedTeacherWorkspace);
    expect(await screen.findByRole("heading", { name: heading })).toBeInTheDocument();
    expect(screen.queryByText("Active assignments")).not.toBeInTheDocument();
  });

  it.each([
    ["/teacher/coursework", "Coursework"],
    ["/teacher/submission-review", "Submission Review"],
    ["/teacher/academic-doubts", "Academic Doubts"],
  ])("renders the real teacher engagement page at %s", async (path, heading) => {
    renderPage(path, assignedTeacherWorkspace);
    expect(await screen.findByRole("heading", { name: heading })).toBeInTheDocument();
    expect(screen.queryByText("Active assignments")).not.toBeInTheDocument();
  });

  it.each([
    ["/teacher/classes", "My Classes"],
    ["/teacher/substitutions", "Substitution Center"],
    ["/teacher/workload", "My Workload"],
  ])("renders the real teacher allocation page at %s", async (path, heading) => {
    renderPage(path, assignedTeacherWorkspace);
    expect(await screen.findByRole("heading", { name: heading })).toBeInTheDocument();
  });

  it("loads the assignment-scoped class workspace", async () => {
    renderPage("/teacher/class-workspace", assignedTeacherWorkspace);
    expect(await screen.findByRole("heading", { name: "Class Workspace" })).toBeInTheDocument();
    expect((await screen.findAllByText(/Grade 8 - Section A/i)).length).toBeGreaterThan(0);

    fireEvent.click(await screen.findByRole("button", { name: "Students (1)" }));
    expect(screen.getByRole("columnheader", { name: "Roll No." })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Registration No." })).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Admission No." })).not.toBeInTheDocument();
    expect(getTeacherClassWorkspace).toHaveBeenCalledWith({
      academicYearId: "year-1",
      subjectOfferingId: "offering-1",
    });
  });

  it("opens the canonical class workspace from the assigned classes list", async () => {
    renderPage("/teacher/classes", assignedTeacherWorkspace);

    fireEvent.click(await screen.findByRole("button", { name: /Open Class Workspace/i }));

    expect(await screen.findByRole("heading", { name: "Class Workspace" })).toBeInTheDocument();
    expect(getTeacherClassWorkspace).toHaveBeenCalledWith({
      academicYearId: "year-1",
      subjectOfferingId: "offering-1",
    });
  });

  it.each([
    ["/teacher/attendance-history", "Attendance History"],
    ["/teacher/marks-history", "Marks Submission History"],
  ])("renders the server-backed teacher history page at %s", async (path, heading) => {
    renderPage(path, assignedTeacherWorkspace);
    expect(await screen.findByRole("heading", { name: heading })).toBeInTheDocument();
  });

  it("dispatches the HOD overview to the scoped department aggregate", async () => {
    const hodWorkspace: TeacherWorkloadWorkspace = {
      ...emptyTeacherWorkspace,
      responsibilities: [
        {
          id: "hod-1",
          responsibilityType: "HOD",
          campusId: "campus-1",
          campusName: "Vidyapeetha Campus",
          programId: "program-1",
          programName: "High School",
          effectiveFrom: "2026-06-01T00:00:00.000Z",
        },
      ],
    };
    renderPage("/teacher/dept-overview", hodWorkspace);
    expect(await screen.findByRole("heading", { name: "Department Overview" })).toBeInTheDocument();
    expect(await screen.findByText("Anitha Rao")).toBeInTheDocument();
    expect(getTeacherDepartmentWorkspace).toHaveBeenCalledWith({
      academicYearId: "year-1",
      date: expect.any(String),
    });
  });

  it("shows the required faculty directory columns and opens scoped faculty details", async () => {
    const hodWorkspace: TeacherWorkloadWorkspace = {
      ...emptyTeacherWorkspace,
      responsibilities: [
        {
          id: "hod-1",
          responsibilityType: "HOD",
          campusId: "campus-1",
          campusName: "Vidyapeetha Campus",
          programId: "program-1",
          programName: "High School",
          effectiveFrom: "2026-06-01T00:00:00.000Z",
        },
      ],
    };
    renderPage("/teacher/dept-faculty", hodWorkspace);

    expect(
      await screen.findByRole("heading", { name: "Faculty & Allocation" }),
    ).toBeInTheDocument();
    for (const heading of [
      "Faculty ID",
      "Faculty Name",
      "Status",
      "Email",
      "Phone Number",
      "Department",
      "Designation",
    ]) {
      expect(screen.getByRole("columnheader", { name: heading })).toBeInTheDocument();
    }
    expect(
      screen.queryByRole("columnheader", { name: "Teaching Workload" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "Designated Responsibilities" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "View details" }));
    expect(screen.getByRole("dialog", { name: "Anitha Rao" })).toBeInTheDocument();
    expect(screen.getAllByText("+91 9876543210")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Workload" }));
    expect(screen.getByText("Allocation balanced")).toBeInTheDocument();
    expect(screen.getAllByRole("cell", { name: "Mathematics" })).toHaveLength(2);
    expect(screen.getByText("Teacher Timetable")).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Grade 8 - Section A" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "09:00 - 09:45" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Counselling" }));
    expect(screen.getByText("Assigned mentees")).toBeInTheDocument();
    expect(screen.getAllByText("2").length).toBeGreaterThan(0);
  });

  it("shows variable required and scheduled periods with subjects and classes on workload", async () => {
    renderPage("/teacher/dept-workload", {
      ...emptyTeacherWorkspace,
      responsibilities: [
        {
          id: "hod-1",
          responsibilityType: "HOD",
          campusId: "campus-1",
          campusName: "Vidyapeetha Campus",
          programId: "program-1",
          programName: "High School",
          effectiveFrom: "2026-06-01T00:00:00.000Z",
        },
      ],
    });
    expect(await screen.findByRole("heading", { name: "Department Workload" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Subjects" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Classes & Sections" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Required Periods" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Scheduled Periods" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "View details" }));
    expect(screen.getByText("Teacher Timetable")).toBeInTheDocument();
  });

  it("dispatches academic coordination through its separate scoped operation", async () => {
    const coordinatorWorkspace: TeacherWorkloadWorkspace = {
      ...emptyTeacherWorkspace,
      responsibilities: [
        {
          id: "coordinator-1",
          responsibilityType: "PROGRAM_COORDINATOR",
          campusId: "campus-1",
          campusName: "Vidyapeetha Campus",
          programId: "program-1",
          programName: "High School",
          effectiveFrom: "2026-06-01T00:00:00.000Z",
        },
      ],
    };
    renderPage("/teacher/coord-overview", coordinatorWorkspace);
    expect(
      await screen.findByRole("heading", { name: "Academic Operations Overview" }),
    ).toBeInTheDocument();
    expect(getTeacherCoordinationWorkspace).toHaveBeenCalledWith({
      academicYearId: "year-1",
      date: expect.any(String),
    });
  });

  it("dispatches academic leadership through a campus-scoped operation", async () => {
    renderPage("/teacher/leadership-dashboard", emptyTeacherWorkspace, ["PRINCIPAL"]);
    expect(
      await screen.findByRole("heading", { name: "Academic Leadership Dashboard" }),
    ).toBeInTheDocument();
    expect(getTeacherLeadershipWorkspace).toHaveBeenCalledWith({
      academicYearId: "year-1",
      date: expect.any(String),
    });
  });

  it("gives academic leadership a campus-scoped faculty directory", async () => {
    renderPage("/teacher/leadership-faculty", emptyTeacherWorkspace, ["PRINCIPAL"]);
    expect(
      await screen.findByRole("heading", { name: "Faculty & Allocation" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Faculty ID" })).toBeInTheDocument();
    expect(getTeacherLeadershipWorkspace).toHaveBeenCalledWith({
      academicYearId: "year-1",
      date: expect.any(String),
    });
  });
});

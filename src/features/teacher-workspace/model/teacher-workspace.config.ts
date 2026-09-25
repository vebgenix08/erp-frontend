import {
  BookOpen,
  CalendarCheck,
  CalendarDays,
  CircleHelp,
  ClipboardCheck,
  FileChartColumn,
  FileClock,
  FolderOpen,
  GraduationCap,
  History,
  Inbox,
  LayoutDashboard,
  ListChecks,
  Megaphone,
  Network,
  NotebookPen,
  Scale,
  School,
  SquareUserRound,
  Users,
  UsersRound,
  UserRoundCheck,
} from "lucide-react";
import type {
  TeacherNavigationGroup,
  TeacherPageDefinition,
  TeacherPageKind,
  TeacherWorkspaceCapabilities,
  TeacherWorkspaceSection,
} from "./teacher-workspace.types";

const page = (
  id: string,
  label: string,
  title: string,
  description: string,
  icon: TeacherPageDefinition["icon"],
  kind: TeacherPageKind = "directory",
  section: TeacherWorkspaceSection = "teaching",
  access: Pick<
    TeacherPageDefinition,
    "requiresTeachingAssignment" | "requiredResponsibilityTypes" | "requiredRoleCodes"
  > = {},
): TeacherPageDefinition => ({
  id,
  slug: id.replaceAll("_", "-"),
  label,
  title,
  description,
  icon,
  kind,
  section,
  ...access,
});

const teachingAccess = { requiresTeachingAssignment: true } as const;
const responsibilityAccess = (...requiredResponsibilityTypes: string[]) => ({
  requiredResponsibilityTypes,
});
const roleAccess = (...requiredRoleCodes: string[]) => ({ requiredRoleCodes });

const teachingNavigation: TeacherNavigationGroup[] = [
  {
    id: "overview",
    label: "Overview",
    pages: [
      page(
        "dashboard",
        "Dashboard",
        "Teaching Dashboard",
        "Today’s classes, pending academic work and assigned responsibilities.",
        LayoutDashboard,
        "dashboard",
      ),
    ],
  },
  {
    id: "my-teaching",
    label: "My Teaching",
    pages: [
      page(
        "schedule",
        "Schedule",
        "Academic Year Timetable",
        "Published timetable revisions and assigned teaching periods.",
        CalendarDays,
        "schedule",
        "teaching",
        teachingAccess,
      ),
      page(
        "classes",
        "My Classes",
        "My Classes",
        "Teaching groups within the active assignment scope.",
        School,
        "directory",
        "teaching",
        teachingAccess,
      ),
      {
        ...page(
          "class_workspace",
          "Class Workspace",
          "Class Workspace",
          "Students, timetable and academic actions for one assigned teaching group.",
          GraduationCap,
          "workflow",
          "teaching",
          teachingAccess,
        ),
        showInNavigation: false,
      },
      page(
        "substitutions",
        "Substitutions",
        "Substitution Center",
        "Temporary class coverage, validity and attendance access.",
        Network,
        "workflow",
        "teaching",
        teachingAccess,
      ),
      page(
        "attendance",
        "Attendance",
        "Student Attendance",
        "Mark students Present or Absent for an assigned teaching session.",
        CalendarCheck,
        "workflow",
        "teaching",
        teachingAccess,
      ),
      page(
        "marks_entry",
        "Marks Register",
        "Marks Register",
        "Enter one configured assessment and review assessment-window attendance.",
        ClipboardCheck,
        "marks",
        "teaching",
        teachingAccess,
      ),
      page(
        "daily_updates",
        "Daily Student Updates",
        "Daily Student Updates",
        "Publish concise academic updates to students and parents.",
        Megaphone,
        "workflow",
        "teaching",
        teachingAccess,
      ),
      page(
        "lesson_plans",
        "Lesson Plans",
        "Lesson Plans",
        "Plan assignment-scoped classroom delivery and preserve its revision history.",
        BookOpen,
        "workflow",
        "teaching",
        teachingAccess,
      ),
      page(
        "teaching_diary",
        "Teaching Diary",
        "Teaching Diary",
        "Record actual classroom delivery without changing attendance.",
        NotebookPen,
        "workflow",
        "teaching",
        teachingAccess,
      ),
      page(
        "teaching_resources",
        "Teaching Resources",
        "Teaching Resources",
        "Manage reusable files linked to subjects, topics and lesson plans.",
        FolderOpen,
        "workflow",
        "teaching",
        teachingAccess,
      ),
      page(
        "coursework",
        "Coursework",
        "Coursework",
        "Assignments, due work and student-visible instructions.",
        BookOpen,
        "workflow",
        "teaching",
        teachingAccess,
      ),
      page(
        "submission_review",
        "Submission Review",
        "Submission Review",
        "Review files and responses submitted for assigned coursework.",
        Inbox,
        "workflow",
        "teaching",
        teachingAccess,
      ),
      page(
        "academic_doubts",
        "Academic Doubts",
        "Academic Doubts",
        "Resolve student questions with messages and supporting files.",
        CircleHelp,
        "workflow",
        "teaching",
        teachingAccess,
      ),
      page(
        "attendance_history",
        "Attendance History",
        "Attendance History",
        "Submitted attendance sessions and correction requests.",
        History,
        "timeline",
        "teaching",
        teachingAccess,
      ),
      page(
        "marks_history",
        "Marks Submission History",
        "Marks Submission History",
        "Submission, return, correction and approval history.",
        FileClock,
        "timeline",
        "teaching",
        teachingAccess,
      ),
      page(
        "academic_reports",
        "Academic Reports",
        "Academic Reports",
        "Attendance, assessment, exam analysis and academic activity reports.",
        FileChartColumn,
        "reports",
        "teaching",
        teachingAccess,
      ),
      page(
        "workload",
        "Workload",
        "My Workload",
        "Assigned periods, responsibilities and available capacity.",
        Scale,
        "directory",
        "teaching",
        teachingAccess,
      ),
    ],
  },
  {
    id: "additional-responsibilities",
    label: "Additional Responsibilities",
    pages: [
      page(
        "section_workspace",
        "My Section",
        "Section Workspace",
        "Whole-section students, attendance completion, timetable and academic follow-ups.",
        UsersRound,
        "workflow",
        "section",
        responsibilityAccess("CLASS_TEACHER", "SECTION_INCHARGE"),
      ),
      page(
        "mentoring",
        "Mentoring",
        "Mentoring",
        "Assigned mentees, structured interactions, follow-ups and academic action items.",
        Users,
        "workflow",
        "section",
        responsibilityAccess("MENTOR"),
      ),
    ],
  },
];

const departmentNavigation: TeacherNavigationGroup[] = [
  {
    id: "department",
    label: "Department Oversight",
    pages: [
      page(
        "dept_overview",
        "Department Health",
        "Department Overview",
        "Teaching coverage gaps, timetable readiness and academic work requiring attention.",
        LayoutDashboard,
        "dashboard",
        "department",
        responsibilityAccess("HOD"),
      ),
      page(
        "dept_faculty",
        "Faculty & Allocation",
        "Faculty & Allocation",
        "Teaching allocation, workload coverage and timetable availability.",
        UsersRound,
        "directory",
        "department",
        responsibilityAccess("HOD"),
      ),
      {
        ...page(
          "dept_coverage",
          "Teaching Coverage",
          "Teaching Coverage",
          "Subject coverage and teacher assignments across all class sections.",
          BookOpen,
          "directory",
          "department",
          responsibilityAccess("HOD"),
        ),
        showInNavigation: false,
      },
      page(
        "dept_timetable",
        "Department Timetables",
        "Department Timetables",
        "Published academic-year timetable pattern for all class sections and teachers.",
        CalendarDays,
        "schedule",
        "department",
        responsibilityAccess("HOD"),
      ),
      page(
        "dept_workload",
        "Workload & Capacity",
        "Department Workload",
        "Capacity, teaching periods and allocation balance.",
        Scale,
        "directory",
        "department",
        responsibilityAccess("HOD"),
      ),
      page(
        "dept_reports",
        "Reports",
        "Department Reports",
        "Academic coverage, attendance, assessment and workload reports.",
        FileChartColumn,
        "reports",
        "department",
        responsibilityAccess("HOD"),
      ),
      page(
        "dept_gradebook",
        "Gradebook Moderation",
        "Gradebook Moderation",
        "Review submitted marks, rubric evidence and comments before final result locking.",
        ClipboardCheck,
        "workflow",
        "department",
        responsibilityAccess("HOD"),
      ),
    ],
  },
];

const coordinatorNavigation: TeacherNavigationGroup[] = [
  {
    id: "academic-operations",
    label: "Academic Operations",
    pages: [
      page(
        "coord_overview",
        "Operations Health",
        "Academic Operations Overview",
        "Cross-unit readiness and pending academic operations.",
        LayoutDashboard,
        "dashboard",
        "coordinator",
        responsibilityAccess("PROGRAM_COORDINATOR"),
      ),
      page(
        "coord_coverage",
        "Academic Coverage",
        "Academic Coverage",
        "Curriculum and teaching coverage across assigned units.",
        BookOpen,
        "directory",
        "coordinator",
        responsibilityAccess("PROGRAM_COORDINATOR"),
      ),
      page(
        "coord_allocation",
        "Teaching Allocation",
        "Teaching Allocation",
        "Teacher allocation readiness and unresolved gaps.",
        UserRoundCheck,
        "directory",
        "coordinator",
        responsibilityAccess("PROGRAM_COORDINATOR"),
      ),
      page(
        "coord_timetable",
        "Timetable Readiness",
        "Timetable Readiness",
        "Publication, conflict and coverage status.",
        CalendarDays,
        "schedule",
        "coordinator",
        responsibilityAccess("PROGRAM_COORDINATOR"),
      ),
      page(
        "coord_attendance",
        "Attendance Monitoring",
        "Attendance Monitoring",
        "Daily attendance completion across academic units.",
        CalendarCheck,
        "directory",
        "coordinator",
        responsibilityAccess("PROGRAM_COORDINATOR"),
      ),
      page(
        "coord_marks",
        "Marks Completion",
        "Marks Completion",
        "Assessment recording and submission readiness.",
        ClipboardCheck,
        "directory",
        "coordinator",
        responsibilityAccess("PROGRAM_COORDINATOR"),
      ),
      page(
        "coord_actions",
        "Pending Actions",
        "Pending Actions",
        "Academic operations requiring coordination.",
        ListChecks,
        "workflow",
        "coordinator",
        responsibilityAccess("PROGRAM_COORDINATOR"),
      ),
      page(
        "coord_reports",
        "Reports",
        "Academic Operations Reports",
        "Coverage, allocation, timetable, attendance and marks reports.",
        FileChartColumn,
        "reports",
        "coordinator",
        responsibilityAccess("PROGRAM_COORDINATOR"),
      ),
    ],
  },
];

const leadershipNavigation: TeacherNavigationGroup[] = [
  {
    id: "leadership",
    label: "Academic Leadership",
    pages: [
      page(
        "leadership_dashboard",
        "Campus Health",
        "Academic Leadership Dashboard",
        "Campus academic health and exceptions requiring leadership attention.",
        LayoutDashboard,
        "dashboard",
        "leadership",
        roleAccess("PRINCIPAL", "VICE_PRINCIPAL", "DEAN"),
      ),
      page(
        "academic_overview",
        "Academic Overview",
        "Academic Overview",
        "Programs, classes, sections and completion state.",
        School,
        "directory",
        "leadership",
        roleAccess("PRINCIPAL", "VICE_PRINCIPAL", "DEAN"),
      ),
      page(
        "leadership_faculty",
        "Faculty & Allocation",
        "Faculty & Allocation",
        "Campus teaching allocation, workload coverage and timetable availability.",
        UsersRound,
        "directory",
        "leadership",
        roleAccess("PRINCIPAL", "VICE_PRINCIPAL", "DEAN"),
      ),
      page(
        "attendance_timetable_mon",
        "Attendance & Timetable",
        "Attendance & Timetable",
        "Attendance completion and timetable readiness.",
        CalendarCheck,
        "directory",
        "leadership",
        roleAccess("PRINCIPAL", "VICE_PRINCIPAL", "DEAN"),
      ),
      page(
        "leadership_reports",
        "Reports",
        "Leadership Reports",
        "Read-only campus academic and operational reports.",
        FileChartColumn,
        "reports",
        "leadership",
        roleAccess("PRINCIPAL", "VICE_PRINCIPAL", "DEAN"),
      ),
    ],
  },
];

export const teacherWorkspaceNavigation: TeacherNavigationGroup[] = [
  ...teachingNavigation,
  ...departmentNavigation,
  ...coordinatorNavigation,
  ...leadershipNavigation,
  {
    id: "account",
    label: "Account",
    pages: [
      page(
        "profile",
        "My Profile",
        "My Profile",
        "Personal, employment, qualification and responsibility details.",
        SquareUserRound,
        "profile",
      ),
    ],
  },
];

export const teacherWorkspacePages = teacherWorkspaceNavigation.flatMap((group) => group.pages);

export function canAccessTeacherPage(
  page: TeacherPageDefinition,
  capabilities: TeacherWorkspaceCapabilities,
) {
  if (!capabilities.hasEmployee) return false;
  if (page.requiresTeachingAssignment && !capabilities.hasTeachingAssignments) return false;
  if (
    page.requiredResponsibilityTypes?.length &&
    !page.requiredResponsibilityTypes.some((type) => capabilities.responsibilityTypes.has(type))
  )
    return false;
  if (
    page.requiredRoleCodes?.length &&
    !page.requiredRoleCodes.some((role) => capabilities.roleCodes.has(role))
  )
    return false;
  return true;
}

export function getVisibleTeacherNavigation(capabilities: TeacherWorkspaceCapabilities) {
  const usesScopedDashboard =
    capabilities.responsibilityTypes.has("HOD") ||
    capabilities.responsibilityTypes.has("PROGRAM_COORDINATOR") ||
    capabilities.roleCodes.has("PRINCIPAL") ||
    capabilities.roleCodes.has("VICE_PRINCIPAL") ||
    capabilities.roleCodes.has("DEAN");

  return teacherWorkspaceNavigation
    .map((group) => ({
      ...group,
      pages: group.pages.filter(
        (item) =>
          item.showInNavigation !== false &&
          !(item.id === "dashboard" && usesScopedDashboard) &&
          canAccessTeacherPage(item, capabilities),
      ),
    }))
    .filter((group) => group.pages.length);
}

export function findTeacherPage(slug: string | undefined) {
  return (
    teacherWorkspacePages.find((item) => item.slug === slug || item.id === slug) ??
    teacherWorkspacePages[0]!
  );
}

export function findTeacherNavigationGroup(page: TeacherPageDefinition) {
  return (
    teacherWorkspaceNavigation.find((group) => group.pages.some((item) => item.id === page.id)) ??
    teacherWorkspaceNavigation[0]!
  );
}

export const defaultTeacherPath = () => "/teacher/dashboard";

export const teacherPagePath = (page: TeacherPageDefinition) => `/teacher/${page.slug}`;

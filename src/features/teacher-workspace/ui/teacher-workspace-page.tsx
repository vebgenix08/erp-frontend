import { Navigate, useParams } from "react-router-dom";
import { ErrorState, LoadingState } from "../../../shared/ui/page-state";
import {
  canAccessTeacherPage,
  findTeacherPage,
  teacherPagePath,
} from "../model/teacher-workspace.config";
import { TeacherAttendancePage } from "./teacher-attendance-page";
import { TeacherDashboardPage } from "./teacher-dashboard-page";
import { TeacherDailyUpdatesPage } from "./teacher-daily-updates-page";
import { TeacherMarksPage } from "./teacher-marks-page";
import { TeacherOperationalPage } from "./teacher-operational-page";
import { TeacherProfilePage } from "./teacher-profile-page";
import { TeacherReportsPage } from "./teacher-reports-page";
import { TeacherSchedulePage } from "./teacher-schedule-page";
import { TeacherDiaryPage } from "../../teacher-content/ui/teacher-diary-page";
import { TeacherLessonPlansPage } from "../../teacher-content/ui/teacher-lesson-plans-page";
import { TeacherResourcesPage } from "../../teacher-content/ui/teacher-resources-page";
import { TeacherCourseworkPage } from "../../teacher-engagement/ui/teacher-coursework-page";
import { TeacherDoubtsPage } from "../../teacher-engagement/ui/teacher-doubts-page";
import { TeacherSubmissionsPage } from "../../teacher-engagement/ui/teacher-submissions-page";
import { TeacherClassesPage } from "../../teacher-classes/ui/teacher-classes-page";
import { TeacherClassWorkspacePage } from "../../teacher-classes/ui/teacher-class-workspace-page";
import { TeacherSubstitutionsPage } from "../../teacher-classes/ui/teacher-substitutions-page";
import { TeacherSelfWorkloadPage } from "../../teacher-classes/ui/teacher-self-workload-page";
import { TeacherHistoryPage } from "../../teacher-history/ui/teacher-history-page";
import { TeacherMentoringPage } from "../../teacher-mentoring/ui/teacher-mentoring-page";
import { TeacherSectionWorkspacePage } from "../../teacher-section/ui/teacher-section-workspace-page";
import { TeacherDepartmentPage } from "../../teacher-department/ui/teacher-department-page";
import { GradebookModerationPage } from "../../teacher-marks/ui/gradebook-moderation-page";
import { useTeacherWorkspace } from "../model/teacher-workspace-context";

export function TeacherWorkspacePage() {
  const { capabilities, workspace, workspaceLoading, workspaceError, retryWorkspace } =
    useTeacherWorkspace();
  const { pageSlug } = useParams<{ pageSlug: string }>();
  const resolvedPageSlug = pageSlug;
  const page = findTeacherPage(resolvedPageSlug);

  if (!resolvedPageSlug || (page.slug !== resolvedPageSlug && page.id !== resolvedPageSlug)) {
    return <Navigate to={teacherPagePath(page)} replace />;
  }
  if (workspaceLoading && !workspace) {
    return <LoadingState label="Loading academic workspace" />;
  }
  const workspaceUnavailable = !workspaceLoading && (!workspace || Boolean(workspaceError));
  if (workspaceUnavailable && !["dashboard", "profile"].includes(page.id)) {
    return (
      <ErrorState
        message={workspaceError ?? "The academic workspace is unavailable."}
        {...(retryWorkspace ? { retry: retryWorkspace } : {})}
      />
    );
  }
  if (!workspaceLoading && !workspaceUnavailable && !canAccessTeacherPage(page, capabilities)) {
    return <Navigate to="/teacher/dashboard" replace />;
  }
  if (page.id === "dashboard" && !workspaceUnavailable) {
    if (
      capabilities.roleCodes.has("PRINCIPAL") ||
      capabilities.roleCodes.has("VICE_PRINCIPAL") ||
      capabilities.roleCodes.has("DEAN")
    ) {
      return <Navigate to="/teacher/leadership-dashboard" replace />;
    }
    if (capabilities.responsibilityTypes.has("HOD")) {
      return <Navigate to="/teacher/dept-overview" replace />;
    }
    if (capabilities.responsibilityTypes.has("PROGRAM_COORDINATOR")) {
      return <Navigate to="/teacher/coord-overview" replace />;
    }
  }
  if (page.id === "dept_gradebook") return <GradebookModerationPage />;
  if (page.id.startsWith("dept_")) return <TeacherDepartmentPage page={page} />;
  if (page.id.startsWith("coord_")) return <TeacherDepartmentPage page={page} />;
  if (
    [
      "leadership_dashboard",
      "academic_overview",
      "leadership_faculty",
      "attendance_timetable_mon",
      "leadership_reports",
    ].includes(page.id)
  )
    return <TeacherDepartmentPage page={page} />;
  if (page.kind === "dashboard") return <TeacherDashboardPage />;
  if (page.kind === "schedule") return <TeacherSchedulePage />;
  if (page.kind === "marks") return <TeacherMarksPage />;
  if (page.kind === "reports") return <TeacherReportsPage />;
  if (page.kind === "profile") return <TeacherProfilePage />;
  if (page.id === "attendance") return <TeacherAttendancePage />;
  if (page.id === "daily_updates") return <TeacherDailyUpdatesPage />;
  if (page.id === "lesson_plans") return <TeacherLessonPlansPage />;
  if (page.id === "teaching_diary") return <TeacherDiaryPage />;
  if (page.id === "teaching_resources") return <TeacherResourcesPage />;
  if (page.id === "coursework") return <TeacherCourseworkPage />;
  if (page.id === "submission_review") return <TeacherSubmissionsPage />;
  if (page.id === "academic_doubts") return <TeacherDoubtsPage />;
  if (page.id === "classes") return <TeacherClassesPage />;
  if (page.id === "class_workspace") return <TeacherClassWorkspacePage />;
  if (page.id === "substitutions") return <TeacherSubstitutionsPage />;
  if (page.id === "workload") return <TeacherSelfWorkloadPage />;
  if (page.id === "attendance_history") return <TeacherHistoryPage mode="ATTENDANCE" />;
  if (page.id === "marks_history") return <TeacherHistoryPage mode="MARKS" />;
  if (page.id === "mentoring") return <TeacherMentoringPage />;
  if (page.id === "section_workspace") return <TeacherSectionWorkspacePage />;
  return <TeacherOperationalPage page={page} />;
}

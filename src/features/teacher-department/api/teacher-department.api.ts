import { graphqlClient } from "../../../shared/api/graphql-client";
import type { TeacherDepartmentWorkspace } from "../model/teacher-department.types";

type WorkspaceInput = {
  academicYearId?: string;
  responsibilityId?: string;
  campusId?: string;
  date?: string;
};

const fields = `
  scope{responsibilityId campusId campusName academicUnitId programId programName}
  availableScopes{responsibilityId campusId campusName academicUnitId programId programName}
  academicYear{id name} date
  summary{faculty classes sections subjectOfferings unassignedOfferings incompleteAllocations publishedTimetables pendingAttendanceSections pendingMarksSheets}
  faculty{employeeId employeeCode fullName email phone department designation staffType employmentType joiningDate status loginStatus assignmentCount requiredPeriods scheduledPeriods responsibilityTypes menteeCount allocations{teachingAssignmentId subjectOfferingId subjectName className sectionName requiredPeriods scheduledPeriods} schedule{id dayOfWeek startTime endTime periodLabel subjectName className sectionName}}
  coverage{subjectOfferingId subjectName className sectionName requiredPeriods scheduledPeriods teacherNames status}
  timetables{sectionId className sectionName versionId versionName status entryCount conflictCount workingDays slots{id sequence label startTime endTime slotType applicableDays} entries{id dayOfWeek periodSlotIds subjectName teacherNames teacherEmployeeIds}}
  completion{sectionId className sectionName attendanceStatus submittedAttendanceSessions marksSubmitted marksPending}
  issues{code severity title scope action}
`;

async function getWorkspace(
  field:
    | "teacherDepartmentWorkspace"
    | "teacherCoordinationWorkspace"
    | "teacherLeadershipWorkspace",
  operation: string,
  input: WorkspaceInput,
) {
  const result = await graphqlClient<
    Record<typeof field, TeacherDepartmentWorkspace>,
    { input: WorkspaceInput }
  >(
    `query ${operation}($input:TeacherDepartmentWorkspaceInput!){${field}(input:$input){${fields}}}`,
    { input },
    undefined,
    {
      cacheKey: `${field}:${JSON.stringify(input)}`,
      cacheTimeMs: 60_000,
      timeoutMs: 30_000,
    },
  );
  return result[field];
}

export function getTeacherDepartmentWorkspace(input: WorkspaceInput) {
  return getWorkspace("teacherDepartmentWorkspace", "TeacherDepartmentWorkspace", input);
}

export function getTeacherCoordinationWorkspace(input: WorkspaceInput) {
  return getWorkspace("teacherCoordinationWorkspace", "TeacherCoordinationWorkspace", input);
}

export function getTeacherLeadershipWorkspace(input: WorkspaceInput) {
  return getWorkspace("teacherLeadershipWorkspace", "TeacherLeadershipWorkspace", input);
}

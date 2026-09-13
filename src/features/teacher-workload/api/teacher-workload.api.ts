import { graphqlClient } from "../../../shared/api/graphql-client";
import type {
  SaveAvailabilityInput,
  SaveWorkloadOverrideInput,
  TeacherWorkloadWorkspace,
  WorkloadViewMode,
} from "../model/teacher-workload.types";

const workspaceFields = `
  teacher{id employeeCode fullName email phone department designation staffType employmentType joiningDate status profilePhotoFileId primaryCampusId campusIds}
  academicYear{id name startDate endDate} viewMode weekStartDate
  selectedVersions{id name status campusId}
  policy{id scopeType inheritedFrom isOverride maximumWeeklyPeriods maximumDailyPeriods maximumConsecutivePeriods effectiveFrom effectiveUntil reason}
  summary{requiredPeriods scheduledPeriods unscheduledPeriods permanentPeriods actualWeeklyPeriods teachingSessions substitutionPeriods cancelledPeriods maximumWeeklyPeriods remainingCapacity overloadPeriods maximumConsecutivePeriods weightedUnits}
  campusBreakdown{campusId campusName requiredPeriods scheduledPeriods actualPeriods}
  componentBreakdown{componentType requiredPeriods scheduledPeriods weightedUnits}
  dailyBreakdown{dayOfWeek scheduledPeriods actualPeriods maximumConsecutivePeriods}
  assignments{id campusId campusName programId programName classId className sectionId sectionName subjectBatchId subjectBatchName subjectOfferingId subjectComponentId subjectName componentType assignmentRole requiredPeriods scheduledPeriods unscheduledPeriods status classSetupPath}
  timetableEntries{id sourceTimetableEntryId subjectOfferingId sectionId subjectBatchId teachingGroupId dayOfWeek startTime endTime periodCount teachingSessionCount campusId campusName programName className sectionName subjectBatchName subjectName componentType state timetableVersionId timetableVersionStatus classSetupPath}
  availabilityExceptions{id campusId dayOfWeek startTime endTime type effectiveFrom effectiveUntil reason}
  responsibilities{id responsibilityType campusId campusName academicUnitId programId programName classId className sectionId sectionName effectiveFrom effectiveUntil}
  issues{code severity campusId dayOfWeek startTime endTime classSection subjectName conflictingAssignment reason recommendedAction actionPath}
`;

export async function getTeacherWorkloadWorkspace(input: {
  teacherId?: string;
  academicYearId?: string;
  viewMode: WorkloadViewMode;
  weekStartDate: string;
}) {
  const result = await graphqlClient<
    { teacherWorkloadWorkspace: TeacherWorkloadWorkspace },
    { input: typeof input }
  >(
    `query TeacherWorkloadWorkspace($input:TeacherWorkloadWorkspaceInput!){teacherWorkloadWorkspace(input:$input){${workspaceFields}}}`,
    { input },
    undefined,
    {
      cacheKey: `teacher-workload:${JSON.stringify(input)}`,
      cacheTimeMs: 60_000,
      timeoutMs: 30_000,
    },
  );
  return result.teacherWorkloadWorkspace;
}

export async function saveTeacherAvailability(input: SaveAvailabilityInput) {
  const result = await graphqlClient<
    { setTeacherAvailability: { id: string } },
    { input: SaveAvailabilityInput }
  >(
    `mutation SaveTeacherAvailability($input:SetTeacherAvailabilityInput!){setTeacherAvailability(input:$input){id}}`,
    { input },
  );
  return result.setTeacherAvailability;
}

export async function saveTeacherWorkloadOverride(input: SaveWorkloadOverrideInput) {
  const result = await graphqlClient<
    { saveTeacherWorkloadPolicy: { id: string } },
    { input: SaveWorkloadOverrideInput }
  >(
    `mutation SaveTeacherWorkloadOverride($input:SaveTeacherWorkloadPolicyInput!){saveTeacherWorkloadPolicy(input:$input){id}}`,
    { input },
  );
  return result.saveTeacherWorkloadPolicy;
}

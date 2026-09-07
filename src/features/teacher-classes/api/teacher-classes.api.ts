import { graphqlClient } from "../../../shared/api/graphql-client";
import type { TeacherClassWorkspace } from "../model/teacher-classes.types";

const teacherFields =
  "id employeeCode fullName email phone department designation staffType employmentType joiningDate status profilePhotoFileId primaryCampusId campusIds";
const assignmentFields =
  "id campusId campusName programId programName classId className sectionId sectionName subjectBatchId subjectBatchName subjectOfferingId subjectComponentId subjectName componentType assignmentRole requiredPeriods scheduledPeriods unscheduledPeriods status classSetupPath";
const timetableFields =
  "id sourceTimetableEntryId subjectOfferingId sectionId subjectBatchId teachingGroupId dayOfWeek startTime endTime periodCount teachingSessionCount campusId campusName programName className sectionName subjectBatchName subjectName componentType state timetableVersionId timetableVersionStatus classSetupPath";

export async function getTeacherClassWorkspace(input: {
  academicYearId?: string;
  subjectOfferingId: string;
}) {
  const result = await graphqlClient<
    { teacherClassWorkspace: TeacherClassWorkspace },
    { input: typeof input }
  >(
    `query TeacherClassWorkspace($input:TeacherClassWorkspaceInput!){teacherClassWorkspace(input:$input){teacher{${teacherFields}} academicYear{id name startDate endDate} assignment{${assignmentFields}} students{studentId studentName registrationNumber rollNumber status} timetableEntries{${timetableFields}}}}`,
    { input },
  );
  return result.teacherClassWorkspace;
}

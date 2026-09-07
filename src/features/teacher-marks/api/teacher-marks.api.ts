import { graphqlClient } from "../../../shared/api/graphql-client";
import type {
  MarksSheet,
  StudentMarkStatus,
  TeacherMarksWorkspace,
} from "../model/teacher-marks.types";

const offeringFields =
  "id campusId campusName subjectName classId className sectionId sectionName subjectBatchId subjectBatchName";
const assessmentFields =
  "id campusId academicYearId classId name assessmentDate attendanceWindowStart attendanceWindowEnd maximumMarks sequence status version";
const studentFields =
  "studentId enrollmentId studentName rollNumber status marks attendanceAttended attendanceHeld attendancePercentage";

export async function getTeacherMarksWorkspace(input: {
  academicYearId?: string;
  subjectOfferingId?: string;
  assessmentId?: string;
}) {
  const result = await graphqlClient<
    { teacherMarksWorkspace: TeacherMarksWorkspace },
    { input: typeof input }
  >(
    `query TeacherMarksWorkspace($input:TeacherMarksWorkspaceInput!){teacherMarksWorkspace(input:$input){teacher{id name} academicYear{id name} offerings{${offeringFields}} assessments{${assessmentFields}} selectedOffering{${offeringFields}} selectedAssessment{${assessmentFields}} sheet{id status version updatedAt submittedAt} students{${studentFields}} summary{students recorded absent pending averageMarks highestMarks lowestMarks} canEdit}}`,
    { input },
  );
  return result.teacherMarksWorkspace;
}

export async function saveTeacherMarks(input: {
  academicYearId: string;
  subjectOfferingId: string;
  assessmentId: string;
  expectedVersion?: number;
  submit: boolean;
  students: Array<{ studentId: string; status: StudentMarkStatus; marks?: number }>;
}) {
  const result = await graphqlClient<{ saveTeacherMarks: MarksSheet }, { input: typeof input }>(
    "mutation SaveTeacherMarks($input:SaveTeacherMarksInput!){saveTeacherMarks(input:$input){id status version updatedAt submittedAt}}",
    { input },
  );
  return result.saveTeacherMarks;
}

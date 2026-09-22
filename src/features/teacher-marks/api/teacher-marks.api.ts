import { graphqlClient } from "../../../shared/api/graphql-client";
import type {
  MarksModerationQueue,
  MarksSheet,
  StudentMarkStatus,
  TeacherMarksWorkspace,
} from "../model/teacher-marks.types";

const offeringFields =
  "id campusId campusName subjectName classId className sectionId sectionName subjectBatchId subjectBatchName";
const assessmentFields =
  "id campusId academicYearId classId name assessmentDate attendanceWindowStart attendanceWindowEnd maximumMarks passMarks weightage decimalPlaces scoringMode commentsEnabled moderationRequired gradeScale{code label minimumPercentage maximumPercentage gradePoint} rubricCriteria{id name description maximumMarks} sequence status version";
const studentFields =
  "studentId enrollmentId studentName registrationNumber rollNumber status marks percentage weightedScore gradeCode gradeLabel gradePoint passed comment rubricScores{criterionId score} attendanceAttended attendanceHeld attendancePercentage";
const sheetFields =
  "id employeeId teacherName academicYearId campusId assessmentId subjectOfferingId subjectName classId className sectionName status version updatedAt submittedAt moderatedAt moderationNote lockedAt students{studentId enrollmentId studentName rollNumber status marks percentage weightedScore gradeCode gradeLabel gradePoint passed comment rubricScores{criterionId score}}";

export async function getTeacherMarksWorkspace(input: {
  academicYearId?: string;
  campusId?: string;
  subjectOfferingId?: string;
  assessmentId?: string;
}) {
  const result = await graphqlClient<
    { teacherMarksWorkspace: TeacherMarksWorkspace },
    { input: typeof input }
  >(
    `query TeacherMarksWorkspace($input:TeacherMarksWorkspaceInput!){teacherMarksWorkspace(input:$input){teacher{id name} academicYear{id name} offerings{${offeringFields}} assessments{${assessmentFields}} selectedOffering{${offeringFields}} selectedAssessment{${assessmentFields}} sheet{${sheetFields}} students{${studentFields}} summary{students recorded absent pending averageMarks highestMarks lowestMarks} canEdit}}`,
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
  students: Array<{
    studentId: string;
    status: StudentMarkStatus;
    marks?: number;
    comment?: string;
    rubricScores?: Array<{ criterionId: string; score: number }>;
  }>;
}) {
  const result = await graphqlClient<{ saveTeacherMarks: MarksSheet }, { input: typeof input }>(
    "mutation SaveTeacherMarks($input:SaveTeacherMarksInput!){saveTeacherMarks(input:$input){id status version updatedAt submittedAt}}",
    { input },
  );
  return result.saveTeacherMarks;
}

export async function getMarksModerationQueue(input: {
  academicYearId?: string;
  campusId?: string;
  status?: MarksSheet["status"];
}) {
  const result = await graphqlClient<
    { marksModerationQueue: MarksModerationQueue },
    { input: typeof input }
  >(
    `query MarksModerationQueue($input:MarksModerationQueueInput!){marksModerationQueue(input:$input){academicYear{id name} items{recorded absent passed failed averagePercentage assessment{${assessmentFields}} sheet{${sheetFields}}}}}`,
    { input },
  );
  return result.marksModerationQueue;
}

export async function moderateMarksSheet(input: {
  sheetId: string;
  action: "APPROVE" | "RETURN" | "LOCK";
  note?: string;
  expectedVersion: number;
}) {
  const result = await graphqlClient<{ moderateMarksSheet: MarksSheet }, { input: typeof input }>(
    `mutation ModerateMarksSheet($input:ModerateMarksSheetInput!){moderateMarksSheet(input:$input){${sheetFields}}}`,
    { input },
  );
  return result.moderateMarksSheet;
}

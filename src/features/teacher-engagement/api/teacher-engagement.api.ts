import { graphqlClient } from "../../../shared/api/graphql-client";
import type {
  AcademicDoubt,
  Coursework,
  CourseworkSubmission,
  EngagementFilter,
  EngagementPage,
  SaveCourseworkInput,
} from "../model/teacher-engagement.types";
const scope =
  "id academicYearId campusId subjectOfferingId sectionId subjectBatchId subjectName className sectionName version createdBy createdAt updatedBy updatedAt";
const courseworkFields = `${scope} employeeId title instructions assignedDate submissionDate resourceIds status publishedAt closedAt archivedAt`;
const submissionFields = `${scope} courseworkId teacherEmployeeId studentId studentName rollNumber responseText fileIds status submittedAt feedback reviewedBy reviewedAt`;
const doubtFields = `${scope} teacherEmployeeId studentId studentName title question fileIds status replies{id authorType authorId message fileIds createdAt} answeredAt closedAt`;
async function list<T>(operation: string, fields: string, input: EngagementFilter) {
  const result = await graphqlClient<
    Record<string, EngagementPage<T>>,
    { input: EngagementFilter }
  >(
    `query TeacherEngagement($input:TeacherEngagementPageInput!){${operation}(input:$input){items{${fields}} page pageSize total totalPages}}`,
    { input },
  );
  return result[operation]!;
}
export const listTeacherCoursework = (input: EngagementFilter) =>
  list<Coursework>("teacherCoursework", courseworkFields, input);
export const listTeacherCourseworkSubmissions = (input: EngagementFilter) =>
  list<CourseworkSubmission>("teacherCourseworkSubmissions", submissionFields, input);
export const listTeacherAcademicDoubts = (input: EngagementFilter) =>
  list<AcademicDoubt>("teacherAcademicDoubts", doubtFields, input);
async function mutate<T, I>(operation: string, inputType: string, fields: string, input: I) {
  const result = await graphqlClient<Record<string, T>, { input: I }>(
    `mutation TeacherEngagementMutation($input:${inputType}!){${operation}(input:$input){${fields}}}`,
    { input },
  );
  return result[operation]!;
}
export const saveTeacherCoursework = (input: SaveCourseworkInput) =>
  mutate<Coursework, SaveCourseworkInput>(
    "saveTeacherCoursework",
    "SaveCourseworkInput",
    courseworkFields,
    input,
  );
export const setTeacherCourseworkStatus = (input: {
  id: string;
  expectedVersion: number;
  status: "PUBLISHED" | "CLOSED" | "ARCHIVED";
}) =>
  mutate<Coursework, typeof input>(
    "setTeacherCourseworkStatus",
    "TeacherEngagementTransitionInput",
    courseworkFields,
    input,
  );
export const reviewTeacherCourseworkSubmission = (input: {
  id: string;
  expectedVersion: number;
  status: "REVIEWED" | "RETURNED";
  feedback?: string;
}) =>
  mutate<CourseworkSubmission, typeof input>(
    "reviewTeacherCourseworkSubmission",
    "ReviewCourseworkSubmissionInput",
    submissionFields,
    input,
  );
export const replyTeacherAcademicDoubt = (input: {
  id: string;
  expectedVersion: number;
  message: string;
  fileIds: string[];
}) =>
  mutate<AcademicDoubt, typeof input>(
    "replyTeacherAcademicDoubt",
    "ReplyAcademicDoubtInput",
    doubtFields,
    input,
  );
export const closeTeacherAcademicDoubt = (input: { id: string; expectedVersion: number }) =>
  mutate<AcademicDoubt, typeof input>(
    "closeTeacherAcademicDoubt",
    "TeacherEngagementTransitionInput",
    doubtFields,
    input,
  );

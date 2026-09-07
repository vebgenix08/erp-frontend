import { graphqlClient } from "../../../shared/api/graphql-client";
import type {
  LessonPlan,
  SaveLessonPlanInput,
  SaveTeachingDiaryInput,
  SaveTeachingResourceInput,
  TeacherContentFilter,
  TeacherContentPage,
  TeachingDiaryEntry,
  TeachingResource,
} from "../model/teacher-content.types";

const scoped =
  "id employeeId academicYearId campusId subjectOfferingId sectionId subjectBatchId subjectName className sectionName version createdBy createdAt updatedBy updatedAt";
const lessonFields = `${scoped} planDate title learningObjectives topics learningActivities preparationNotes homework resourceIds status readyAt completedAt archivedAt`;
const diaryFields = `${scoped} entryDate topic summary homework followUp lessonPlanId status recordedAt archivedAt`;
const resourceFields = `${scoped} title description resourceType fileId externalUrl fileName contentType status archivedAt`;

async function list<T>(
  operation: "teacherLessonPlans" | "teacherDiaryEntries" | "teacherResources",
  fields: string,
  input: TeacherContentFilter,
) {
  const result = await graphqlClient<
    Record<typeof operation, TeacherContentPage<T>>,
    { input: TeacherContentFilter }
  >(
    `query TeacherContent($input:TeacherContentPageInput!){${operation}(input:$input){items{${fields}} page pageSize total totalPages}}`,
    { input },
  );
  return result[operation];
}

export const listTeacherLessonPlans = (input: TeacherContentFilter) =>
  list<LessonPlan>("teacherLessonPlans", lessonFields, input);
export const listTeacherDiaryEntries = (input: TeacherContentFilter) =>
  list<TeachingDiaryEntry>("teacherDiaryEntries", diaryFields, input);
export const listTeacherResources = (input: TeacherContentFilter) =>
  list<TeachingResource>("teacherResources", resourceFields, input);

async function save<Input, Output>(
  operation: string,
  inputType: string,
  fields: string,
  input: Input,
) {
  const result = await graphqlClient<Record<string, Output>, { input: Input }>(
    `mutation TeacherContentSave($input:${inputType}!){${operation}(input:$input){${fields}}}`,
    { input },
  );
  return result[operation]!;
}

export const saveTeacherLessonPlan = (input: SaveLessonPlanInput) =>
  save<SaveLessonPlanInput, LessonPlan>(
    "saveTeacherLessonPlan",
    "SaveLessonPlanInput",
    lessonFields,
    input,
  );
export const saveTeacherDiaryEntry = (input: SaveTeachingDiaryInput) =>
  save<SaveTeachingDiaryInput, TeachingDiaryEntry>(
    "saveTeacherDiaryEntry",
    "SaveTeachingDiaryInput",
    diaryFields,
    input,
  );
export const saveTeacherResource = (input: SaveTeachingResourceInput) =>
  save<SaveTeachingResourceInput, TeachingResource>(
    "saveTeacherResource",
    "SaveTeachingResourceInput",
    resourceFields,
    input,
  );

async function transition<T>(
  operation: string,
  fields: string,
  input: { id: string; expectedVersion: number; status?: string },
) {
  const result = await graphqlClient<Record<string, T>, { input: typeof input }>(
    `mutation TeacherContentTransition($input:TeacherContentTransitionInput!){${operation}(input:$input){${fields}}}`,
    { input },
  );
  return result[operation]!;
}

export const setTeacherLessonPlanStatus = (input: {
  id: string;
  expectedVersion: number;
  status: "READY" | "COMPLETED" | "ARCHIVED";
}) => transition<LessonPlan>("setTeacherLessonPlanStatus", lessonFields, input);
export const setTeacherDiaryStatus = (input: {
  id: string;
  expectedVersion: number;
  status: "RECORDED" | "ARCHIVED";
}) => transition<TeachingDiaryEntry>("setTeacherDiaryStatus", diaryFields, input);
export const archiveTeacherResource = (input: { id: string; expectedVersion: number }) =>
  transition<TeachingResource>("archiveTeacherResource", resourceFields, input);

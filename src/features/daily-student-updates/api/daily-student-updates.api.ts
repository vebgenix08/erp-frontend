import { graphqlClient } from "../../../shared/api/graphql-client";
import type {
  DailyStudentUpdate,
  DailyStudentUpdatePage,
  DailyStudentUpdateStatus,
  SaveDailyStudentUpdateInput,
} from "../model/daily-student-updates.types";

const fields =
  "id employeeId academicYearId campusId subjectOfferingId sectionId subjectBatchId subjectName className sectionName updateDate title message audience status version createdBy createdAt updatedBy updatedAt publishedBy publishedAt archivedBy archivedAt";

export async function listTeacherDailyStudentUpdates(input: {
  academicYearId?: string;
  subjectOfferingId?: string;
  status?: DailyStudentUpdateStatus;
  page: number;
  pageSize: number;
}) {
  const result = await graphqlClient<
    { teacherDailyStudentUpdates: DailyStudentUpdatePage },
    { input: typeof input }
  >(
    `query TeacherDailyStudentUpdates($input:DailyStudentUpdatePageInput!){teacherDailyStudentUpdates(input:$input){items{${fields}} page pageSize total totalPages}}`,
    { input },
  );
  return result.teacherDailyStudentUpdates;
}

export async function saveTeacherDailyStudentUpdate(input: SaveDailyStudentUpdateInput) {
  const result = await graphqlClient<
    { saveTeacherDailyStudentUpdate: DailyStudentUpdate },
    { input: SaveDailyStudentUpdateInput }
  >(
    `mutation SaveTeacherDailyStudentUpdate($input:SaveDailyStudentUpdateInput!){saveTeacherDailyStudentUpdate(input:$input){${fields}}}`,
    { input },
  );
  return result.saveTeacherDailyStudentUpdate;
}

async function transition(
  operation: "publishTeacherDailyStudentUpdate" | "archiveTeacherDailyStudentUpdate",
  input: { id: string; expectedVersion: number },
) {
  const result = await graphqlClient<
    Record<typeof operation, DailyStudentUpdate>,
    { input: typeof input }
  >(
    `mutation DailyStudentUpdateTransition($input:DailyStudentUpdateTransitionInput!){${operation}(input:$input){${fields}}}`,
    { input },
  );
  return result[operation];
}

export const publishTeacherDailyStudentUpdate = (input: { id: string; expectedVersion: number }) =>
  transition("publishTeacherDailyStudentUpdate", input);

export const archiveTeacherDailyStudentUpdate = (input: { id: string; expectedVersion: number }) =>
  transition("archiveTeacherDailyStudentUpdate", input);

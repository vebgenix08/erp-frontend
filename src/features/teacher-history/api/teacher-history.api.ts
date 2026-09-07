import { graphqlClient } from "../../../shared/api/graphql-client";
import type {
  HistoryPage,
  TeacherAttendanceHistoryItem,
  TeacherHistoryFilter,
  TeacherMarksHistoryItem,
} from "../model/teacher-history.types";

export async function listTeacherAttendanceHistory(input: TeacherHistoryFilter) {
  const result = await graphqlClient<
    { teacherAttendanceHistory: HistoryPage<TeacherAttendanceHistoryItem> },
    { input: TeacherHistoryFilter }
  >(
    `query TeacherAttendanceHistory($input:TeacherHistoryPageInput!){teacherAttendanceHistory(input:$input){items{id date subjectOfferingId subjectName className sectionName startTime endTime status studentCount presentCount absentCount submittedAt} page pageSize total totalPages}}`,
    { input },
  );
  return result.teacherAttendanceHistory;
}

export async function listTeacherMarksHistory(input: TeacherHistoryFilter) {
  const result = await graphqlClient<
    { teacherMarksHistory: HistoryPage<TeacherMarksHistoryItem> },
    { input: TeacherHistoryFilter }
  >(
    `query TeacherMarksHistory($input:TeacherHistoryPageInput!){teacherMarksHistory(input:$input){items{id assessmentId assessmentName maximumMarks subjectOfferingId subjectName className sectionName status studentCount recordedCount absentCount pendingCount submittedAt updatedAt} page pageSize total totalPages}}`,
    { input },
  );
  return result.teacherMarksHistory;
}

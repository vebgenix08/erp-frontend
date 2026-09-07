import { graphqlClient } from "../../../shared/api/graphql-client";
import type {
  AttendanceSession,
  StudentAttendanceValue,
  TeacherAttendanceWorkspace,
} from "../model/teacher-attendance.types";

const studentFields = "studentId enrollmentId studentName rollNumber status";
const sessionFields =
  "id timetableEntryId timetableVersionId campusId campusName academicYearId subjectOfferingId sectionId subjectBatchId teachingGroupId subjectName className sectionName startTime endTime state";
const attendanceFields = `id status version updatedAt submittedAt students{${studentFields}}`;

export async function getTeacherAttendanceWorkspace(input: {
  date: string;
  academicYearId?: string;
  lessonId?: string;
}) {
  const result = await graphqlClient<
    { teacherAttendanceWorkspace: TeacherAttendanceWorkspace },
    { input: typeof input }
  >(
    `query TeacherAttendanceWorkspace($input:TeacherAttendanceWorkspaceInput!){teacherAttendanceWorkspace(input:$input){date teacherId teacherName academicYear{id name} sessions{${sessionFields}} selectedSession{${sessionFields}} attendance{${attendanceFields}} students{${studentFields}} canEdit}}`,
    { input },
  );
  return result.teacherAttendanceWorkspace;
}

export async function saveTeacherAttendance(input: {
  date: string;
  academicYearId?: string;
  lessonId: string;
  expectedVersion?: number;
  submit: boolean;
  students: Array<{ studentId: string; status: StudentAttendanceValue }>;
}) {
  const result = await graphqlClient<
    { saveTeacherAttendance: AttendanceSession },
    { input: typeof input }
  >(
    `mutation SaveTeacherAttendance($input:SaveTeacherAttendanceInput!){saveTeacherAttendance(input:$input){${attendanceFields}}}`,
    { input },
  );
  return result.saveTeacherAttendance;
}

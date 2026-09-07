export type StudentAttendanceValue = "PRESENT" | "ABSENT";
export type AttendanceSessionStatus = "DRAFT" | "SUBMITTED";

export interface TeacherAttendanceStudent {
  studentId: string;
  enrollmentId: string;
  studentName: string;
  rollNumber?: string;
  status: StudentAttendanceValue;
}

export interface TeacherAttendanceSession {
  id: string;
  timetableEntryId: string;
  timetableVersionId: string;
  campusId: string;
  campusName: string;
  academicYearId: string;
  subjectOfferingId: string;
  sectionId?: string;
  subjectBatchId?: string;
  teachingGroupId?: string;
  subjectName: string;
  className?: string;
  sectionName?: string;
  startTime: string;
  endTime: string;
  state: "PERMANENT" | "SUBSTITUTION";
}

export interface AttendanceSession {
  id: string;
  status: AttendanceSessionStatus;
  version: number;
  updatedAt: string;
  submittedAt?: string;
  students: TeacherAttendanceStudent[];
}

export interface TeacherAttendanceWorkspace {
  date: string;
  teacherId: string;
  teacherName: string;
  academicYear: { id: string; name: string };
  sessions: TeacherAttendanceSession[];
  selectedSession?: TeacherAttendanceSession;
  attendance?: AttendanceSession;
  students: TeacherAttendanceStudent[];
  canEdit: boolean;
}

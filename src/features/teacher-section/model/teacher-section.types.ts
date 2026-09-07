export type SectionFollowUpType = "ACADEMIC" | "ATTENDANCE" | "GENERAL";
export type SectionFollowUpVisibility = "CLASS_TEACHER_ONLY" | "ACADEMIC_TEAM";
export interface SectionFollowUp {
  id: string;
  studentId: string;
  followUpType: SectionFollowUpType;
  summary: string;
  nextAction?: string;
  followUpDate?: string;
  visibility: SectionFollowUpVisibility;
  status: "OPEN" | "RESOLVED";
  version: number;
  updatedAt: string;
}
export interface SectionStudent {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  registrationNumber: string;
  rollNumber?: string;
  guardianName: string;
  guardianPhone?: string;
  attendanceStatusToday?: "PRESENT" | "ABSENT";
  openFollowUps: number;
}
export interface SectionTimetableEntry {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  subjectName: string;
  teacherName: string;
}
export interface TeacherSectionWorkspaceResult {
  section: { id: string; name: string; classId: string; className: string; campusId: string };
  availableSections: Array<{ id: string; name: string; className: string; campusId: string }>;
  summary: {
    totalStudents: number;
    presentToday: number;
    absentToday: number;
    attendanceSessionsToday: number;
    openFollowUps: number;
    marksSheetsSubmitted: number;
    marksSheetsPending: number;
  };
  students: SectionStudent[];
  timetable: SectionTimetableEntry[];
  followUps: SectionFollowUp[];
}

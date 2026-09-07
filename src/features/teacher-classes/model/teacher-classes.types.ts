import type { TeacherWorkloadWorkspace } from "../../teacher-workload/model/teacher-workload.types";

export interface TeacherClassStudent {
  studentId: string;
  studentName: string;
  registrationNumber: string;
  rollNumber?: string;
  status: string;
}

export interface TeacherClassWorkspace {
  teacher: TeacherWorkloadWorkspace["teacher"];
  academicYear: TeacherWorkloadWorkspace["academicYear"];
  assignment: TeacherWorkloadWorkspace["assignments"][number];
  students: TeacherClassStudent[];
  timetableEntries: TeacherWorkloadWorkspace["timetableEntries"];
}

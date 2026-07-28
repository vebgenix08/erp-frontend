export type AcademicStatus = "ACTIVE" | "INACTIVE";
export type SubjectType = "THEORY" | "PRACTICAL" | "MIXED";
export interface Program { id: string; campusId: string; code: string; name: string; description?: string; status: AcademicStatus; }
export interface AcademicClass extends Program { programId: string; }
export interface Section extends Program { programId: string; classId: string; }
export interface Subject extends Omit<Program, "description"> { programId: string; classId?: string; subjectType: SubjectType; credits?: number; }
export type ProgramInput = { campusId: string; name: string; description?: string };
export type ClassInput = ProgramInput & { programId: string };
export type SectionInput = ProgramInput & { programId: string; classId: string };
export type SubjectInput = { campusId: string; programId: string; classId?: string; name: string; subjectType: SubjectType; credits?: number };
export type TeachingAssignmentRole = "SUBJECT_TEACHER" | "SECTION_INCHARGE";
export interface TeachingAssignment {
  id: string; campusId: string; academicYearId: string; employeeId: string; employeeName: string;
  role: TeachingAssignmentRole; programId: string; classId: string; sectionId: string;
  subjectId?: string; status: AcademicStatus; createdAt: string; updatedAt: string;
}
export type TeachingAssignmentInput = Omit<TeachingAssignment, "id" | "status" | "createdAt" | "updatedAt">;

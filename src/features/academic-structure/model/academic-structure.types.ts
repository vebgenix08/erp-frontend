export type AcademicStatus = "ACTIVE" | "INACTIVE";
export type SubjectType = "THEORY" | "PRACTICAL" | "MIXED";
export interface Program { id: string; campusId: string; academicUnitId?: string; code: string; name: string; description?: string; status: AcademicStatus; }
export interface AcademicClass extends Program { programId: string; }
export interface Section extends Program { programId: string; classId: string; }
export interface Subject extends Omit<Program, "description"> { programId: string; classId?: string; subjectType: SubjectType; credits?: number; }
export type ProgramInput = { campusId: string; academicUnitId: string; name: string; description?: string };
export type ClassInput = { campusId: string; programId: string; name: string; description?: string };
export type SectionInput = ClassInput & { classId: string };
export type SubjectInput = { campusId: string; programId: string; classId?: string; name: string; subjectType: SubjectType; credits?: number };

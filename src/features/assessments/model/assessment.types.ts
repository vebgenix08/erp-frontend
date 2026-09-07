export type AssessmentDefinitionStatus = "DRAFT" | "OPEN" | "CLOSED";

export interface AssessmentDefinition {
  id: string;
  campusId: string;
  academicYearId: string;
  classId?: string;
  name: string;
  assessmentDate: string;
  attendanceWindowStart: string;
  attendanceWindowEnd: string;
  maximumMarks: number;
  sequence: number;
  status: AssessmentDefinitionStatus;
  version: number;
  createdBy?: string;
  createdAt?: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface SaveAssessmentDefinitionInput {
  id?: string;
  campusId: string;
  academicYearId: string;
  classId?: string;
  name: string;
  assessmentDate: string;
  attendanceWindowStart: string;
  attendanceWindowEnd: string;
  maximumMarks: number;
  sequence: number;
  expectedVersion?: number;
}

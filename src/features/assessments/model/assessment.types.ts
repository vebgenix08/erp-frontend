export type AssessmentDefinitionStatus = "DRAFT" | "OPEN" | "CLOSED";
export type AssessmentScoringMode = "MARKS" | "RUBRIC";

export interface AssessmentGradeBand {
  code: string;
  label: string;
  minimumPercentage: number;
  maximumPercentage: number;
  gradePoint?: number | null;
}

export interface AssessmentRubricCriterion {
  id: string;
  name: string;
  description?: string | null;
  maximumMarks: number;
}

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
  passMarks: number;
  weightage: number;
  decimalPlaces: number;
  scoringMode: AssessmentScoringMode;
  commentsEnabled: boolean;
  moderationRequired: boolean;
  gradeScale: AssessmentGradeBand[];
  rubricCriteria: AssessmentRubricCriterion[];
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
  passMarks?: number;
  weightage?: number;
  decimalPlaces?: number;
  scoringMode?: AssessmentScoringMode;
  commentsEnabled?: boolean;
  moderationRequired?: boolean;
  gradeScale?: AssessmentGradeBand[];
  rubricCriteria?: AssessmentRubricCriterion[];
  sequence: number;
  expectedVersion?: number;
}

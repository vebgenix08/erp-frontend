import type { AssessmentDefinition } from "../../assessments/model/assessment.types";

export type MarksSheetStatus = "DRAFT" | "SUBMITTED";
export type StudentMarkStatus = "NOT_RECORDED" | "RECORDED" | "ABSENT";

export interface TeacherMarksOffering {
  id: string;
  campusId: string;
  campusName: string;
  subjectName: string;
  classId?: string;
  className?: string;
  sectionId?: string;
  sectionName?: string;
  subjectBatchId?: string;
  subjectBatchName?: string;
}

export interface TeacherMarksStudent {
  studentId: string;
  enrollmentId: string;
  studentName: string;
  rollNumber?: string;
  status: StudentMarkStatus;
  marks?: number | null;
  attendanceAttended: number;
  attendanceHeld: number;
  attendancePercentage?: number | null;
}

export interface MarksSheet {
  id: string;
  status: MarksSheetStatus;
  version: number;
  updatedAt: string;
  submittedAt?: string;
}

export interface TeacherMarksWorkspace {
  teacher: { id: string; name: string };
  academicYear: { id: string; name: string };
  offerings: TeacherMarksOffering[];
  assessments: AssessmentDefinition[];
  selectedOffering?: TeacherMarksOffering;
  selectedAssessment?: AssessmentDefinition;
  sheet?: MarksSheet;
  students: TeacherMarksStudent[];
  summary: {
    students: number;
    recorded: number;
    absent: number;
    pending: number;
    averageMarks?: number;
    highestMarks?: number;
    lowestMarks?: number;
  };
  canEdit: boolean;
}

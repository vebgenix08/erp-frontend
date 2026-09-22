import type { AssessmentDefinition } from "../../assessments/model/assessment.types";

export type MarksSheetStatus = "DRAFT" | "SUBMITTED" | "CHANGES_REQUESTED" | "APPROVED" | "LOCKED";
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
  registrationNumber: string;
  rollNumber?: string;
  status: StudentMarkStatus;
  marks?: number | null;
  percentage?: number | null;
  weightedScore?: number | null;
  gradeCode?: string | null;
  gradeLabel?: string | null;
  gradePoint?: number | null;
  passed?: boolean | null;
  comment?: string | null;
  rubricScores?: Array<{ criterionId: string; score: number }> | null;
  attendanceAttended: number;
  attendanceHeld: number;
  attendancePercentage?: number | null;
}

export interface MarksSheetStudent {
  studentId: string;
  enrollmentId: string;
  studentName: string;
  rollNumber?: string | null;
  status: StudentMarkStatus;
  marks?: number | null;
  percentage?: number | null;
  weightedScore?: number | null;
  gradeCode?: string | null;
  gradeLabel?: string | null;
  gradePoint?: number | null;
  passed?: boolean | null;
  comment?: string | null;
  rubricScores?: Array<{ criterionId: string; score: number }> | null;
}

export interface MarksSheet {
  id: string;
  employeeId?: string;
  teacherName?: string;
  academicYearId?: string;
  campusId?: string;
  assessmentId?: string;
  subjectOfferingId?: string;
  subjectName?: string;
  classId?: string | null;
  className?: string | null;
  sectionName?: string | null;
  status: MarksSheetStatus;
  students?: MarksSheetStudent[];
  version: number;
  updatedAt: string;
  submittedAt?: string;
  moderatedAt?: string;
  moderationNote?: string;
  lockedAt?: string;
}

export interface MarksModerationItem {
  sheet: MarksSheet & { students: MarksSheetStudent[] };
  assessment: AssessmentDefinition;
  recorded: number;
  absent: number;
  passed: number;
  failed: number;
  averagePercentage?: number | null;
}

export interface MarksModerationQueue {
  academicYear: { id: string; name: string };
  items: MarksModerationItem[];
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

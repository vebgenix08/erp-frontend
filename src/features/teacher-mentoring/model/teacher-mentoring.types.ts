export type MentorInteractionType = "MEETING" | "CALL" | "ACADEMIC" | "ATTENDANCE" | "GENERAL";
export type MentorInteractionStatus = "OPEN" | "COMPLETED" | "CANCELLED";
export type MentorInteractionVisibility = "MENTOR_ONLY" | "ACADEMIC_TEAM";

export interface TeacherMenteeSummary {
  assignmentId: string;
  studentId: string;
  studentName: string;
  registrationNumber: string;
  rollNumber?: string;
  campusId: string;
  className: string;
  sectionName?: string;
  guardianName: string;
  guardianPhone?: string;
  lastInteractionAt?: string;
  nextFollowUpDate?: string;
  openActionCount: number;
}

export interface MentorInteraction {
  id: string;
  assignmentId: string;
  interactionType: MentorInteractionType;
  interactionDate: string;
  summary: string;
  actionItems: string[];
  followUpDate?: string;
  visibility: MentorInteractionVisibility;
  status: MentorInteractionStatus;
  version: number;
  updatedAt: string;
}

export interface TeacherMentoringPageResult {
  items: TeacherMenteeSummary[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  pendingFollowUps: number;
  openActions: number;
}

export interface TeacherMenteeWorkspaceResult {
  mentee: TeacherMenteeSummary;
  interactions: MentorInteraction[];
}

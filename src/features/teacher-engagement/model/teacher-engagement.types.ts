export type CourseworkStatus = "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED";
export type CourseworkSubmissionStatus = "SUBMITTED" | "REVIEWED" | "RETURNED";
export type AcademicDoubtStatus = "OPEN" | "ANSWERED" | "CLOSED";
interface Scope {
  id: string;
  academicYearId: string;
  campusId: string;
  subjectOfferingId: string;
  sectionId?: string;
  subjectBatchId?: string;
  subjectName: string;
  className?: string;
  sectionName?: string;
  version: number;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
}
export interface Coursework extends Scope {
  employeeId: string;
  title: string;
  instructions: string;
  assignedDate: string;
  submissionDate?: string;
  resourceIds: string[];
  status: CourseworkStatus;
  publishedAt?: string;
  closedAt?: string;
  archivedAt?: string;
}
export interface CourseworkSubmission extends Scope {
  courseworkId: string;
  teacherEmployeeId: string;
  studentId: string;
  studentName: string;
  rollNumber?: string;
  responseText?: string;
  fileIds: string[];
  status: CourseworkSubmissionStatus;
  submittedAt: string;
  feedback?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}
export interface AcademicDoubtReply {
  id: string;
  authorType: "STUDENT" | "TEACHER";
  authorId: string;
  message: string;
  fileIds: string[];
  createdAt: string;
}
export interface AcademicDoubt extends Scope {
  teacherEmployeeId: string;
  studentId: string;
  studentName: string;
  title: string;
  question: string;
  fileIds: string[];
  status: AcademicDoubtStatus;
  replies: AcademicDoubtReply[];
  answeredAt?: string;
  closedAt?: string;
}
export interface EngagementPage<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
export interface EngagementFilter {
  academicYearId?: string;
  subjectOfferingId?: string;
  courseworkId?: string;
  status?: string;
  page: number;
  pageSize: number;
}
export interface SaveCourseworkInput {
  id?: string;
  expectedVersion?: number;
  academicYearId: string;
  subjectOfferingId: string;
  title: string;
  instructions: string;
  assignedDate: string;
  submissionDate?: string;
  resourceIds: string[];
}

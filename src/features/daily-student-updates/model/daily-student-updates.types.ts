export type DailyStudentUpdateStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface DailyStudentUpdate {
  id: string;
  employeeId: string;
  academicYearId: string;
  campusId: string;
  subjectOfferingId: string;
  sectionId?: string;
  subjectBatchId?: string;
  subjectName: string;
  className?: string;
  sectionName?: string;
  updateDate: string;
  title: string;
  message: string;
  audience: "STUDENTS_AND_PARENTS";
  status: DailyStudentUpdateStatus;
  version: number;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
  publishedBy?: string;
  publishedAt?: string;
  archivedBy?: string;
  archivedAt?: string;
}

export interface DailyStudentUpdatePage {
  items: DailyStudentUpdate[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface SaveDailyStudentUpdateInput {
  id?: string;
  expectedVersion?: number;
  academicYearId: string;
  subjectOfferingId: string;
  updateDate: string;
  title: string;
  message: string;
}

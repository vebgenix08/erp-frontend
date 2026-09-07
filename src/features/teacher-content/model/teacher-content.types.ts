export type LessonPlanStatus = "DRAFT" | "READY" | "COMPLETED" | "ARCHIVED";
export type TeachingDiaryStatus = "DRAFT" | "RECORDED" | "ARCHIVED";
export type TeachingResourceStatus = "ACTIVE" | "ARCHIVED";

interface TeacherScopedRecord {
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
  version: number;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
}

export interface LessonPlan extends TeacherScopedRecord {
  planDate: string;
  title: string;
  learningObjectives: string;
  topics: string;
  learningActivities?: string;
  preparationNotes?: string;
  homework?: string;
  resourceIds: string[];
  status: LessonPlanStatus;
  readyAt?: string;
  completedAt?: string;
  archivedAt?: string;
}

export interface TeachingDiaryEntry extends TeacherScopedRecord {
  entryDate: string;
  topic: string;
  summary: string;
  homework?: string;
  followUp?: string;
  lessonPlanId?: string;
  status: TeachingDiaryStatus;
  recordedAt?: string;
  archivedAt?: string;
}

export interface TeachingResource extends TeacherScopedRecord {
  title: string;
  description?: string;
  resourceType: "FILE" | "LINK";
  fileId?: string;
  externalUrl?: string;
  fileName?: string;
  contentType?: string;
  status: TeachingResourceStatus;
  archivedAt?: string;
}

export interface TeacherContentPage<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
export interface TeacherContentFilter {
  academicYearId?: string;
  subjectOfferingId?: string;
  status?: string;
  page: number;
  pageSize: number;
}

export interface SaveLessonPlanInput {
  id?: string;
  expectedVersion?: number;
  academicYearId: string;
  subjectOfferingId: string;
  planDate: string;
  title: string;
  learningObjectives: string;
  topics: string;
  learningActivities?: string;
  preparationNotes?: string;
  homework?: string;
  resourceIds: string[];
}
export interface SaveTeachingDiaryInput {
  id?: string;
  expectedVersion?: number;
  academicYearId: string;
  subjectOfferingId: string;
  entryDate: string;
  topic: string;
  summary: string;
  homework?: string;
  followUp?: string;
  lessonPlanId?: string;
}
export interface SaveTeachingResourceInput {
  id?: string;
  expectedVersion?: number;
  academicYearId: string;
  subjectOfferingId: string;
  title: string;
  description?: string;
  resourceType: "FILE" | "LINK";
  fileId?: string;
  externalUrl?: string;
  fileName?: string;
  contentType?: string;
}

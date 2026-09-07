export interface HistoryPage<Item> {
  items: Item[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface TeacherAttendanceHistoryItem {
  id: string;
  date: string;
  subjectOfferingId: string;
  subjectName: string;
  className?: string;
  sectionName?: string;
  startTime: string;
  endTime: string;
  status: "DRAFT" | "SUBMITTED";
  studentCount: number;
  presentCount: number;
  absentCount: number;
  submittedAt?: string;
}

export interface TeacherMarksHistoryItem {
  id: string;
  assessmentId: string;
  assessmentName: string;
  maximumMarks: number;
  subjectOfferingId: string;
  subjectName: string;
  className?: string;
  sectionName?: string;
  status: "DRAFT" | "SUBMITTED";
  studentCount: number;
  recordedCount: number;
  absentCount: number;
  pendingCount: number;
  submittedAt?: string;
  updatedAt: string;
}

export interface TeacherHistoryFilter {
  academicYearId?: string;
  subjectOfferingId?: string;
  status?: string;
  page: number;
  pageSize: number;
}

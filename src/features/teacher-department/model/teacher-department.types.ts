export interface DepartmentFaculty {
  employeeId: string;
  employeeCode: string;
  fullName: string;
  email?: string;
  phone?: string;
  department?: string;
  designation?: string;
  staffType?: string;
  employmentType?: string;
  joiningDate?: string;
  status: string;
  assignmentCount: number;
  requiredPeriods: number;
  scheduledPeriods: number;
  responsibilityTypes: string[];
  menteeCount: number;
  allocations: Array<{
    teachingAssignmentId: string;
    subjectOfferingId: string;
    subjectName: string;
    className: string;
    sectionName?: string;
    requiredPeriods: number;
    scheduledPeriods: number;
  }>;
  schedule: Array<{
    id: string;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    periodLabel: string;
    subjectName: string;
    className: string;
    sectionName: string;
  }>;
}

export interface TeacherDepartmentWorkspace {
  scope: {
    responsibilityId: string;
    campusId: string;
    campusName: string;
    academicUnitId?: string;
    programId?: string;
    programName?: string;
  };
  availableScopes: Array<{
    responsibilityId: string;
    campusId: string;
    campusName: string;
    academicUnitId?: string;
    programId?: string;
    programName?: string;
  }>;
  academicYear: { id: string; name: string };
  date: string;
  summary: {
    faculty: number;
    classes: number;
    sections: number;
    subjectOfferings: number;
    unassignedOfferings: number;
    incompleteAllocations: number;
    publishedTimetables: number;
    pendingAttendanceSections: number;
    pendingMarksSheets: number;
  };
  faculty: DepartmentFaculty[];
  coverage: Array<{
    subjectOfferingId: string;
    subjectName: string;
    className: string;
    sectionName?: string;
    requiredPeriods: number;
    scheduledPeriods: number;
    teacherNames: string[];
    status: "READY" | "UNASSIGNED" | "INCOMPLETE";
  }>;
  timetables: Array<{
    workingDays: string[];
    slots: Array<{
      id: string;
      sequence: number;
      label: string;
      startTime: string;
      endTime: string;
      slotType: string;
      applicableDays?: string[];
    }>;
    entries: Array<{
      id: string;
      dayOfWeek: string;
      periodSlotIds: string[];
      subjectName: string;
      teacherNames: string[];
      teacherEmployeeIds: string[];
    }>;
    sectionId: string;
    className: string;
    sectionName: string;
    versionId?: string;
    versionName?: string;
    status: "PUBLISHED" | "DRAFT" | "NOT_CREATED";
    entryCount: number;
    conflictCount: number;
  }>;
  completion: Array<{
    sectionId: string;
    className: string;
    sectionName: string;
    attendanceStatus: "SUBMITTED" | "PENDING";
    submittedAttendanceSessions: number;
    marksSubmitted: number;
    marksPending: number;
  }>;
  issues: Array<{
    code: string;
    severity: "ERROR" | "WARNING";
    title: string;
    scope: string;
    action: string;
  }>;
}

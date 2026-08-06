export type WorkloadViewMode = "PUBLISHED" | "LATEST_DRAFT";
export interface TeacherWorkloadWorkspace {
  teacher: { id:string; employeeCode:string; fullName:string; department?:string; designation?:string; staffType:string; primaryCampusId:string; campusIds:string[] };
  academicYear: { id:string; name:string; startDate?:string; endDate?:string };
  viewMode: WorkloadViewMode;
  weekStartDate: string;
  selectedVersions: Array<{id:string;name:string;status:"DRAFT"|"PUBLISHED";campusId:string}>;
  policy: { id?:string;scopeType:"DEFAULT"|"STAFF_TYPE"|"DESIGNATION"|"EMPLOYEE";inheritedFrom:string;isOverride:boolean;maximumWeeklyPeriods:number;maximumDailyPeriods:number;maximumConsecutivePeriods:number;effectiveFrom?:string;effectiveUntil?:string;reason?:string };
  summary: { requiredPeriods:number;scheduledPeriods:number;unscheduledPeriods:number;permanentPeriods:number;actualWeeklyPeriods:number;teachingSessions:number;substitutionPeriods:number;cancelledPeriods:number;maximumWeeklyPeriods:number;remainingCapacity:number;overloadPeriods:number;maximumConsecutivePeriods:number;weightedUnits:number };
  campusBreakdown:Array<{campusId:string;campusName:string;requiredPeriods:number;scheduledPeriods:number;actualPeriods:number}>;
  componentBreakdown:Array<{componentType:string;requiredPeriods:number;scheduledPeriods:number;weightedUnits:number}>;
  dailyBreakdown:Array<{dayOfWeek:string;scheduledPeriods:number;actualPeriods:number;maximumConsecutivePeriods:number}>;
  assignments:Array<{id:string;campusId:string;campusName:string;programId?:string;programName?:string;classId?:string;className?:string;sectionId?:string;sectionName?:string;subjectBatchId?:string;subjectBatchName?:string;subjectOfferingId:string;subjectComponentId:string;subjectName:string;componentType:string;assignmentRole:string;requiredPeriods:number;scheduledPeriods:number;unscheduledPeriods:number;status:"COMPLETE"|"INCOMPLETE";classSetupPath?:string}>;
  timetableEntries:Array<{id:string;dayOfWeek:string;startTime:string;endTime:string;periodCount:number;teachingSessionCount:number;campusId:string;campusName:string;programName?:string;className?:string;sectionName?:string;subjectBatchName?:string;subjectName:string;componentType:string;state:"PERMANENT"|"SUBSTITUTION"|"CANCELLED";timetableVersionId:string;timetableVersionStatus:"DRAFT"|"PUBLISHED";classSetupPath?:string}>;
  availabilityExceptions:Array<{id:string;campusId?:string;dayOfWeek:string;startTime:string;endTime:string;type:"BLOCKED"|"PREFERRED";effectiveFrom:string;effectiveUntil?:string;reason?:string}>;
  responsibilities:Array<{id:string;responsibilityType:string;campusId:string;campusName:string;classId?:string;className?:string;sectionId?:string;sectionName?:string;effectiveFrom:string;effectiveUntil?:string}>;
  issues:Array<{code:string;severity:"ERROR"|"WARNING";dayOfWeek?:string;startTime?:string;endTime?:string;classSection?:string;subjectName?:string;conflictingAssignment?:string;reason:string;recommendedAction:string;actionPath?:string}>;
}

export interface SaveAvailabilityInput { id?:string;employeeId:string;campusId?:string;academicYearId:string;dayOfWeek:string;startTime:string;endTime:string;availabilityType:"BLOCKED"|"PREFERRED";effectiveFrom:string;effectiveUntil?:string;reason?:string }
export interface SaveWorkloadOverrideInput { scopeType:"EMPLOYEE";employeeId:string;maximumContactPeriodsPerWeek:number;maximumPeriodsPerDay:number;maximumConsecutivePeriods:number;effectiveFrom:string;effectiveUntil?:string;reason:string;componentMultipliers:Array<{componentType:string;multiplier:number}> }

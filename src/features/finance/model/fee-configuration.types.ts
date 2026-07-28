export type FinanceStatus = "ACTIVE" | "INACTIVE";
export type FeeHeadCategory =
  | "TUITION"
  | "ADMISSION"
  | "EXAM"
  | "LIBRARY"
  | "LAB"
  | "TRANSPORT"
  | "HOSTEL"
  | "OTHER";
export type FeeSchedulePattern = "ANNUAL" | "ONE_TIME" | "PERIODIC" | "MANUAL";
export type FeeCollectionPolicy = "FULL_ONLY" | "PARTIAL_ALLOWED";
export interface FeeHead {
  id: string;
  code: string;
  name: string;
  category: FeeHeadCategory;
  description?: string;
  refundable: boolean;
  status: FinanceStatus;
}
export interface FeeSchedule {
  id: string;
  campusId: string;
  academicYearId: string;
  code: string;
  name: string;
  pattern: FeeSchedulePattern;
  collectionPolicy: FeeCollectionPolicy;
  status: FinanceStatus;
}
export interface FeeStructureComponent {
  feeHeadId: string;
  amountMinor: number;
  allocationPriority: number;
}
export interface FeeStructure {
  id: string;
  campusId: string;
  academicYearId: string;
  code: string;
  name: string;
  currency: "INR";
  components: FeeStructureComponent[];
  totalAmountMinor: number;
  status: FinanceStatus;
}
export interface FeeMapping {
  id: string;
  campusId: string;
  academicYearId: string;
  structureId: string;
  scheduleId: string;
  target: { programId?: string; classId: string; sectionId?: string };
  status: FinanceStatus;
}
export interface FeeConfiguration {
  feeHeads: FeeHead[];
  schedules: FeeSchedule[];
  structures: FeeStructure[];
  mappings: FeeMapping[];
}

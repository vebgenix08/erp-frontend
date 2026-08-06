export type FeeOrderStatus = "OPEN" | "PARTIALLY_PAID" | "PAID" | "CLOSED" | "CANCELLED";
export interface FeeOrderCharge {
  id: string;
  feeHeadId: string;
  feeHeadCode: string;
  label: string;
  refundable: boolean;
  sequence: number;
  amountMinor: number;
  paidMinor: number;
  balanceMinor: number;
  creditMinor?: number;
}
export interface FeeOrder {
  id: string;
  orderNumber: string;
  sourceType: "ANNUAL" | "GENERAL" | "TRANSFER_ADJUSTMENT";
  sourceId: string;
  note?: string;
  studentId: string;
  studentName: string;
  registrationNumber: string;
  enrollmentId: string;
  campusId: string;
  academicYearId: string;
  programId: string;
  classId: string;
  sectionId?: string;
  structureCode: string;
  structureName: string;
  scheduleCode: string;
  scheduleName: string;
  collectionPolicy: "FULL_ONLY" | "PARTIAL_ALLOWED";
  currency: "INR";
  charges: FeeOrderCharge[];
  totalMinor: number;
  paidMinor: number;
  balanceMinor: number;
  transferId?: string;
  transferCreditMinor?: number;
  residualTransferCreditMinor?: number;
  closedBalanceMinor?: number;
  closureReason?: "CAMPUS_TRANSFER";
  closedAt?: string;
  status: FeeOrderStatus;
  createdAt: string;
  updatedAt: string;
}
export interface GeneralCharge {
  id: string;
  campusId: string;
  academicYearId: string;
  name: string;
  note?: string;
  feeHeadId: string;
  feeHeadCode: string;
  amountMinor: number;
  collectionPolicy: "FULL_ONLY" | "PARTIAL_ALLOWED";
  target: { type: "STUDENT" | "CLASS" | "SECTION"; ids: string[] };
  status: "ASSIGNING" | "ASSIGNED" | "FAILED";
  assignedCount: number;
  failureReason?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
export type PaymentMethod =
  | "CASH"
  | "CARD"
  | "UPI"
  | "BANK_TRANSFER"
  | "CHEQUE"
  | "ONLINE";
export type FinancePaymentStatus =
  | "SUCCESS"
  | "PARTIALLY_REFUNDED"
  | "VOIDED"
  | "REFUNDED";
export interface PaymentChargeAllocation {
  chargeId: string;
  feeHeadId: string;
  label: string;
  amountMinor: number;
}
export interface FinancePayment {
  id: string;
  campusId: string;
  academicYearId: string;
  studentId: string;
  studentName: string;
  receiptNumber: string;
  amountMinor: number;
  reversedMinor: number;
  currency: "INR";
  method: PaymentMethod;
  reference?: string;
  note?: string;
  status: FinancePaymentStatus;
  allocations: Array<{
    feeOrderId: string;
    label: string;
    amountMinor: number;
    chargeAllocations: PaymentChargeAllocation[];
  }>;
  paidAt: string;
  createdAt: string;
}
export interface FinanceReceipt {
  receiptNumber: string;
  paymentId: string;
  status: FinancePayment["status"];
  student: { id: string; name: string };
  campusId: string;
  academicYearId: string;
  currency: "INR";
  amountMinor: number;
  method: PaymentMethod;
  reference?: string;
  note?: string;
  allocations: Array<{
    feeOrderId: string;
    label: string;
    amountMinor: number;
    chargeAllocations: PaymentChargeAllocation[];
  }>;
  paidAt: string;
  issuedAt: string;
  collectedBy: string;
  fileName: string;
  documentHtml: string;
  paperSize: FinanceReceiptTemplate["paperSize"];
}
export interface FinanceReceiptTemplate {
  id: string;
  title: string;
  headerText?: string;
  footerText?: string;
  signatureLabel: string;
  paperSize: "A4" | "A5" | "THERMAL_80MM";
  accentColor: string;
  showInstitutionLogo: boolean;
  showInstitutionAddress: boolean;
  showPaymentMethod: boolean;
  showPaymentReference: boolean;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}
export interface FinanceDashboard {
  campusId: string;
  academicYearId: string;
  totalAssignedMinor: number;
  grossCollectedMinor: number;
  reversedMinor: number;
  collectedMinor: number;
  outstandingMinor: number;
  collectedTodayMinor: number;
  openOrders: number;
  paidOrders: number;
  paymentCount: number;
  adjustmentCount: number;
  generatedAt: string;
}
export interface FinancePaymentAdjustment {
  id: string;
  adjustmentNumber: string;
  paymentId: string;
  receiptNumber: string;
  studentId: string;
  campusId: string;
  academicYearId: string;
  type: "VOID" | "REFUND";
  amountMinor: number;
  reason: string;
  allocations: Array<{
    feeOrderId: string;
    chargeId: string;
    feeHeadId: string;
    label: string;
    amountMinor: number;
  }>;
  createdBy: string;
  createdAt: string;
}
export interface FeeOrderRecovery {
  id: string;
  eventId: string;
  studentId: string;
  studentName: string;
  registrationNumber: string;
  campusId: string;
  academicYearId: string;
  status: "PENDING" | "RESOLVED";
  attempts: number;
  lastError: string;
  lastAttemptAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

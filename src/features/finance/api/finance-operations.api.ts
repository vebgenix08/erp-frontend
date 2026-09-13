import { graphqlClient } from "../../../shared/api/graphql-client";
import type {
  FeeOrder,
  FeeOrderRecovery,
  GeneralCharge,
  FinanceDashboard,
  FinancePayment,
  FinancePaymentAdjustment,
  FinanceReceipt,
  FinanceReceiptTemplate,
  PaymentMethod,
} from "../model/finance-operations.types";

const orderFields =
  "id orderNumber sourceType sourceId note studentId studentName registrationNumber enrollmentId campusId academicYearId programId classId sectionId structureCode structureName scheduleCode scheduleName collectionPolicy currency totalMinor paidMinor balanceMinor status createdAt updatedAt charges { id feeHeadId feeHeadCode label refundable sequence amountMinor paidMinor balanceMinor }";
const paymentFields =
  "id campusId academicYearId studentId studentName receiptNumber amountMinor reversedMinor currency method reference note status paidAt createdAt allocations { feeOrderId label amountMinor chargeAllocations { chargeId feeHeadId label amountMinor } }";
const adjustmentFields =
  "id adjustmentNumber paymentId receiptNumber studentId campusId academicYearId type amountMinor reason createdBy createdAt allocations { feeOrderId chargeId feeHeadId label amountMinor }";
const recoveryFields =
  "id eventId studentId studentName registrationNumber campusId academicYearId status attempts lastError lastAttemptAt resolvedAt resolvedBy createdAt updatedAt";
export async function listFeeOrders(filter: {
  campusId?: string;
  academicYearId?: string;
  studentId?: string;
  classId?: string;
  sectionId?: string;
  status?: FeeOrder["status"];
  sourceType?: FeeOrder["sourceType"];
  payableOnly?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  return (
    await graphqlClient<{ feeOrders: FeeOrder[] }, { filter: typeof filter }>(
      `query FeeOrders($filter: FeeOrderFilter) { feeOrders(filter:$filter) { ${orderFields} } }`,
      { filter },
    )
  ).feeOrders;
}
export async function listFeeOrderPage(filter: Parameters<typeof listFeeOrders>[0]) {
  return (
    await graphqlClient<
      { feeOrderPage: { items: FeeOrder[]; total: number; limit: number; offset: number } },
      { filter: typeof filter }
    >(
      `query FeeOrderPage($filter: FeeOrderFilter) { feeOrderPage(filter:$filter) { items { ${orderFields} } total limit offset } }`,
      { filter },
    )
  ).feeOrderPage;
}
export async function listFinancePayments(filter: {
  campusId?: string;
  academicYearId?: string;
  studentId?: string;
  status?: FinancePayment["status"];
  method?: FinancePayment["method"];
  paidFrom?: string;
  paidTo?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  return (
    await graphqlClient<{ financePayments: FinancePayment[] }, { filter: typeof filter }>(
      `query FinancePayments($filter: PaymentFilter) { financePayments(filter:$filter) { ${paymentFields} } }`,
      { filter },
    )
  ).financePayments;
}
export async function listFinancePaymentPage(filter: Parameters<typeof listFinancePayments>[0]) {
  return (
    await graphqlClient<
      {
        financePaymentPage: {
          items: FinancePayment[];
          total: number;
          limit: number;
          offset: number;
        };
      },
      { filter: typeof filter }
    >(
      `query FinancePaymentPage($filter: PaymentFilter) { financePaymentPage(filter:$filter) { items { ${paymentFields} } total limit offset } }`,
      { filter },
    )
  ).financePaymentPage;
}
export async function collectFinancePayment(input: {
  studentId: string;
  method: PaymentMethod;
  reference?: string;
  note?: string;
  allocations: Array<{
    feeOrderId: string;
    amountMinor: number;
    chargeAllocations?: Array<{ chargeId: string; amountMinor: number }>;
  }>;
  idempotencyKey: string;
}) {
  return (
    await graphqlClient<{ collectFinancePayment: FinancePayment }, { input: typeof input }>(
      `mutation CollectFinancePayment($input: CollectPaymentInput!) { collectFinancePayment(input:$input) { ${paymentFields} } }`,
      { input },
    )
  ).collectFinancePayment;
}
export async function getFinanceReceipt(paymentId: string) {
  return (
    await graphqlClient<{ financeReceipt: FinanceReceipt }, { paymentId: string }>(
      `query FinanceReceipt($paymentId: ID!) { financeReceipt(paymentId:$paymentId) { receiptNumber paymentId status student { id name } campusId academicYearId currency amountMinor method reference note allocations { feeOrderId label amountMinor chargeAllocations { chargeId feeHeadId label amountMinor } } paidAt issuedAt collectedBy fileName documentHtml paperSize } }`,
      { paymentId },
    )
  ).financeReceipt;
}
const receiptTemplateFields =
  "id title headerText footerText signatureLabel paperSize accentColor showInstitutionLogo showInstitutionAddress showPaymentMethod showPaymentReference updatedBy createdAt updatedAt";
export async function getFinanceReceiptTemplate() {
  return (
    await graphqlClient<{ financeReceiptTemplate: FinanceReceiptTemplate }>(
      `query FinanceReceiptTemplate { financeReceiptTemplate { ${receiptTemplateFields} } }`,
    )
  ).financeReceiptTemplate;
}
export async function saveFinanceReceiptTemplate(
  input: Omit<FinanceReceiptTemplate, "id" | "updatedBy" | "createdAt" | "updatedAt">,
) {
  return (
    await graphqlClient<
      { saveFinanceReceiptTemplate: FinanceReceiptTemplate },
      { input: typeof input }
    >(
      `mutation SaveFinanceReceiptTemplate($input: SaveFinanceReceiptTemplateInput!) { saveFinanceReceiptTemplate(input:$input) { ${receiptTemplateFields} } }`,
      { input },
    )
  ).saveFinanceReceiptTemplate;
}
export async function getFinanceDashboard(campusId: string, academicYearId: string) {
  return (
    await graphqlClient<
      { financeDashboard: FinanceDashboard },
      { scope: { campusId: string; academicYearId: string } }
    >(
      `query FinanceDashboard($scope: FeeConfigurationScopeInput!) { financeDashboard(scope:$scope) { campusId academicYearId totalAssignedMinor grossCollectedMinor reversedMinor collectedMinor outstandingMinor collectedTodayMinor openOrders paidOrders paymentCount adjustmentCount generatedAt } }`,
      { scope: { campusId, academicYearId } },
    )
  ).financeDashboard;
}
export async function listFinancePaymentAdjustments(filter: {
  paymentId?: string;
  campusId?: string;
  academicYearId?: string;
  type?: FinancePaymentAdjustment["type"];
}) {
  return (
    await graphqlClient<
      { financePaymentAdjustments: FinancePaymentAdjustment[] },
      { filter: typeof filter }
    >(
      `query FinancePaymentAdjustments($filter: PaymentAdjustmentFilter) { financePaymentAdjustments(filter:$filter) { ${adjustmentFields} } }`,
      { filter },
    )
  ).financePaymentAdjustments;
}
export async function createFinancePaymentAdjustment(input: {
  paymentId: string;
  type: FinancePaymentAdjustment["type"];
  amountMinor?: number;
  reason: string;
  idempotencyKey: string;
}) {
  return (
    await graphqlClient<
      { createFinancePaymentAdjustment: FinancePaymentAdjustment },
      { input: typeof input }
    >(
      `mutation CreateFinancePaymentAdjustment($input: CreatePaymentAdjustmentInput!) { createFinancePaymentAdjustment(input:$input) { ${adjustmentFields} } }`,
      { input },
    )
  ).createFinancePaymentAdjustment;
}
export async function listFeeOrderRecoveries(filter: {
  campusId?: string;
  academicYearId?: string;
  status?: FeeOrderRecovery["status"];
  search?: string;
}) {
  return (
    await graphqlClient<{ feeOrderRecoveries: FeeOrderRecovery[] }, { filter: typeof filter }>(
      `query FeeOrderRecoveries($filter: FeeOrderRecoveryFilter) { feeOrderRecoveries(filter:$filter) { ${recoveryFields} } }`,
      { filter },
    )
  ).feeOrderRecoveries;
}
export async function retryFeeOrderRecovery(id: string) {
  return (
    await graphqlClient<{ retryFeeOrderRecovery: FeeOrderRecovery }, { id: string }>(
      `mutation RetryFeeOrderRecovery($id: ID!) { retryFeeOrderRecovery(id:$id) { ${recoveryFields} } }`,
      { id },
    )
  ).retryFeeOrderRecovery;
}
const generalChargeFields =
  "id campusId academicYearId name note feeHeadId feeHeadCode amountMinor collectionPolicy target { type ids } status assignedCount failureReason createdBy createdAt updatedAt";
export async function listGeneralCharges(filter: {
  campusId?: string;
  academicYearId?: string;
  status?: GeneralCharge["status"];
}) {
  return (
    await graphqlClient<{ generalCharges: GeneralCharge[] }, { filter: typeof filter }>(
      `query GeneralCharges($filter: GeneralChargeFilter) { generalCharges(filter:$filter) { ${generalChargeFields} } }`,
      { filter },
    )
  ).generalCharges;
}
export async function createGeneralCharge(input: {
  campusId: string;
  academicYearId: string;
  name: string;
  note?: string;
  feeHeadId: string;
  amountMinor: number;
  collectionPolicy: GeneralCharge["collectionPolicy"];
  target: GeneralCharge["target"];
  idempotencyKey: string;
}) {
  return (
    await graphqlClient<{ createGeneralCharge: GeneralCharge }, { input: typeof input }>(
      `mutation CreateGeneralCharge($input: CreateGeneralChargeInput!) { createGeneralCharge(input:$input) { ${generalChargeFields} } }`,
      { input },
    )
  ).createGeneralCharge;
}
export async function retryGeneralCharge(id: string) {
  return (
    await graphqlClient<{ retryGeneralCharge: GeneralCharge }, { id: string }>(
      `mutation RetryGeneralCharge($id: ID!) { retryGeneralCharge(id:$id) { ${generalChargeFields} } }`,
      { id },
    )
  ).retryGeneralCharge;
}

import { graphqlClient } from "../../../shared/api/graphql-client";
import type {
  AcademicYear,
  AcademicYearInput,
  Campus,
  CampusAcademicUnit,
  CampusAcademicUnitInput,
  CampusInput,
  InstitutionProfile,
  InstitutionProfileInput,
  NotificationPolicy,
  NotificationPolicyInput,
  NumberingPolicy,
  NumberingPolicyInput,
  TenantAdminDashboard,
  TenantTemplate,
  TenantTemplateInput,
} from "../model/settings.types";

const institutionFields =
  "id tenantId name shortName contactEmail contactPhone address logoUrl logoFileId createdAt updatedAt";
const campusFields =
  "id tenantId code name status address contactEmail contactPhone createdAt updatedAt deactivatedAt";
const academicUnitFields =
  "id tenantId campusId code name type curriculumOrAffiliationId status createdAt updatedAt deactivatedAt";
const academicYearFields =
  "id tenantId code name startDate endDate status createdAt updatedAt activatedAt closedAt reopenedAt lifecycleReason";

export async function getInstitutionProfile() {
  return (
    await graphqlClient<{ institutionProfile: InstitutionProfile | null }>(
      `query InstitutionProfile { institutionProfile { ${institutionFields} } }`,
    )
  ).institutionProfile;
}
export async function getInstitutionBranding() {
  return (
    await graphqlClient<{
      institutionBranding: {
        name: string;
        shortName?: string;
        logoUrl?: string;
        logoFileId?: string;
      } | null;
    }>("query InstitutionBranding { institutionBranding { name shortName logoUrl logoFileId } }")
  ).institutionBranding;
}
export async function saveInstitutionProfile(input: InstitutionProfileInput) {
  return (
    await graphqlClient<
      { updateInstitutionProfile: InstitutionProfile },
      { input: InstitutionProfileInput }
    >(
      `mutation UpdateInstitutionProfile($input: UpdateInstitutionProfileInput!) { updateInstitutionProfile(input: $input) { ${institutionFields} } }`,
      { input },
    )
  ).updateInstitutionProfile;
}
export async function listCampuses() {
  return (
    await graphqlClient<{ campuses: Campus[] }>(`query Campuses { campuses { ${campusFields} } }`)
  ).campuses;
}
export async function createCampus(input: CampusInput) {
  return (
    await graphqlClient<{ createCampus: Campus }, { input: CampusInput }>(
      `mutation CreateCampus($input: CreateCampusInput!) { createCampus(input: $input) { ${campusFields} } }`,
      { input },
    )
  ).createCampus;
}
export async function createCampusSetup(
  input: CampusInput & { academicUnits: CampusAcademicUnitInput[] },
) {
  return (
    await graphqlClient<
      { createCampusSetup: { campus: Campus; academicUnits: CampusAcademicUnit[] } },
      { input: typeof input }
    >(
      `mutation CreateCampusSetup($input:CreateCampusSetupInput!){createCampusSetup(input:$input){campus{${campusFields}} academicUnits{${academicUnitFields}}}}`,
      { input },
    )
  ).createCampusSetup;
}
export async function updateCampus(id: string, input: CampusInput) {
  return (
    await graphqlClient<{ updateCampus: Campus }, { id: string; input: CampusInput }>(
      `mutation UpdateCampus($id: ID!, $input: UpdateCampusInput!) { updateCampus(id: $id, input: $input) { ${campusFields} } }`,
      { id, input },
    )
  ).updateCampus;
}
export async function deactivateCampus(id: string) {
  return (
    await graphqlClient<{ deactivateCampus: Campus }, { id: string }>(
      `mutation DeactivateCampus($id: ID!) { deactivateCampus(id: $id) { ${campusFields} } }`,
      { id },
    )
  ).deactivateCampus;
}
export async function reactivateCampus(id: string) {
  return (
    await graphqlClient<{ reactivateCampus: Campus }, { id: string }>(
      `mutation ReactivateCampus($id: ID!) { reactivateCampus(id: $id) { ${campusFields} } }`,
      { id },
    )
  ).reactivateCampus;
}
export async function listCampusAcademicUnits(campusId?: string) {
  return (
    await graphqlClient<
      { campusAcademicUnits: CampusAcademicUnit[] },
      { filter?: { campusId: string } }
    >(
      `query CampusAcademicUnits($filter: CampusAcademicUnitFilter) { campusAcademicUnits(filter:$filter) { ${academicUnitFields} } }`,
      campusId ? { filter: { campusId } } : {},
    )
  ).campusAcademicUnits;
}
export async function createCampusAcademicUnit(campusId: string, input: CampusAcademicUnitInput) {
  return (
    await graphqlClient<
      { createCampusAcademicUnit: CampusAcademicUnit },
      { campusId: string; input: CampusAcademicUnitInput }
    >(
      `mutation CreateCampusAcademicUnit($campusId:ID!,$input:CreateCampusAcademicUnitInput!){createCampusAcademicUnit(campusId:$campusId,input:$input){${academicUnitFields}}}`,
      { campusId, input },
    )
  ).createCampusAcademicUnit;
}
export async function listAcademicYears() {
  return (
    await graphqlClient<{ academicYears: AcademicYear[] }>(
      `query AcademicYears { academicYears { ${academicYearFields} } }`,
    )
  ).academicYears;
}
export async function createAcademicYear(input: AcademicYearInput) {
  function toDateTime(value: string, endOfDay: boolean): string {
    const normalized = value.trim();
    if (!normalized) throw new Error("Start date and end date are required");
    const candidate = /^\d{4}-\d{2}-\d{2}$/.test(normalized)
      ? `${normalized}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`
      : normalized;
    const date = new Date(candidate);
    if (Number.isNaN(date.getTime())) throw new Error("Enter valid academic year dates");
    return date.toISOString();
  }
  const graphqlInput: AcademicYearInput = {
    ...input,
    startDate: toDateTime(input.startDate, false),
    endDate: toDateTime(input.endDate, true),
  };
  return (
    await graphqlClient<{ createAcademicYear: AcademicYear }, { input: AcademicYearInput }>(
      `mutation CreateAcademicYear($input: CreateAcademicYearInput!) { createAcademicYear(input: $input) { ${academicYearFields} } }`,
      { input: graphqlInput },
    )
  ).createAcademicYear;
}
export async function activateAcademicYear(id: string) {
  return (
    await graphqlClient<{ activateAcademicYear: AcademicYear }, { id: string }>(
      `mutation ActivateAcademicYear($id: ID!) { activateAcademicYear(id: $id) { ${academicYearFields} } }`,
      { id },
    )
  ).activateAcademicYear;
}
export async function closeAcademicYear(id: string, reason: string) {
  return (
    await graphqlClient<{ closeAcademicYear: AcademicYear }, { id: string; reason: string }>(
      `mutation CloseAcademicYear($id: ID!, $reason: String!) { closeAcademicYear(id: $id, reason: $reason) { ${academicYearFields} } }`,
      { id, reason },
    )
  ).closeAcademicYear;
}
export async function reopenAcademicYear(id: string, reason: string) {
  return (
    await graphqlClient<{ reopenAcademicYear: AcademicYear }, { id: string; reason: string }>(
      `mutation ReopenAcademicYear($id: ID!, $reason: String!) { reopenAcademicYear(id: $id, reason: $reason) { ${academicYearFields} } }`,
      { id, reason },
    )
  ).reopenAcademicYear;
}
export async function getTenantAdminDashboard(input: {
  campusId: string;
  academicYearId: string;
  from?: string;
  to?: string;
}) {
  return (
    await graphqlClient<{ tenantAdminDashboard: TenantAdminDashboard }, { input: typeof input }>(
      `query TenantAdminDashboard($input: TenantAdminDashboardInput!) { tenantAdminDashboard(input:$input) { activeStudents activeStaff applicationsAwaitingAction admissionsConfirmed collectedTodayMinor outstandingMinor openWorkItems studentsMissingSections studentsMissingFeeOrders enquiriesToday pendingEnquiryFollowUps applicationsSubmittedToday paymentsToday unpaidStudents failedStaffInvites failedFinanceEvents failedAdmissionEvents applicationCount generatedAt applicationStatusDistribution { key label count } studentClassDistribution { key label count } collectionTrend { period label value } collectionByPaymentMethod { method paymentCount amountMinor } topOutstandingClasses { classId className studentCount outstandingMinor } recentSecurityChanges { id change subject occurredAt status } recentApplications { id applicationNumber studentName phone status updatedAt } recentActivity { id occurredAt activity module subject performedBy status } } }`,
      { input },
    )
  ).tenantAdminDashboard;
}
const templateFields =
  "id tenantId name templateType status version publishedVersion description subject body layout sections fields requiredSystemKeys createdAt updatedAt publishedAt archivedAt";
type TemplateWire = Omit<TenantTemplate, "fields" | "sections"> & {
  fields: string | TenantTemplate["fields"];
  sections: string | TenantTemplate["sections"];
};
function jsonArray<T>(value: string | T[]): T[] {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
function fromTemplateWire(template: TemplateWire): TenantTemplate {
  return {
    ...template,
    fields: jsonArray(template.fields),
    sections: jsonArray(template.sections),
  };
}
function toTemplateInput(input: Partial<TenantTemplateInput>) {
  return {
    ...input,
    ...(input.fields ? { fields: JSON.stringify(input.fields) } : {}),
    ...(input.sections ? { sections: JSON.stringify(input.sections) } : {}),
  };
}
export async function listTenantTemplates() {
  return (
    await graphqlClient<{ tenantTemplates: TemplateWire[] }>(
      `query TenantTemplates { tenantTemplates { ${templateFields} } }`,
    )
  ).tenantTemplates.map(fromTemplateWire);
}
export async function createTenantTemplate(input: TenantTemplateInput) {
  return fromTemplateWire(
    (
      await graphqlClient<
        { createTenantTemplate: TemplateWire },
        { input: ReturnType<typeof toTemplateInput> }
      >(
        `mutation CreateTenantTemplate($input: CreateTenantTemplateInput!) { createTenantTemplate(input: $input) { ${templateFields} } }`,
        { input: toTemplateInput(input) },
      )
    ).createTenantTemplate,
  );
}
export async function updateTenantTemplate(id: string, input: Partial<TenantTemplateInput>) {
  return fromTemplateWire(
    (
      await graphqlClient<
        { updateTenantTemplate: TemplateWire },
        { id: string; input: ReturnType<typeof toTemplateInput> }
      >(
        `mutation UpdateTenantTemplate($id: ID!, $input: UpdateTenantTemplateInput!) { updateTenantTemplate(id: $id, input: $input) { ${templateFields} } }`,
        { id, input: toTemplateInput(input) },
      )
    ).updateTenantTemplate,
  );
}
export async function publishTenantTemplate(id: string) {
  return fromTemplateWire(
    (
      await graphqlClient<{ publishTenantTemplate: TemplateWire }, { id: string }>(
        `mutation PublishTenantTemplate($id: ID!) { publishTenantTemplate(id: $id) { ${templateFields} } }`,
        { id },
      )
    ).publishTenantTemplate,
  );
}
export async function archiveTenantTemplate(id: string) {
  return (
    await graphqlClient<{ archiveTenantTemplate: boolean }, { id: string }>(
      `mutation ArchiveTenantTemplate($id: ID!) { archiveTenantTemplate(id: $id) }`,
      { id },
    )
  ).archiveTenantTemplate;
}
const numberingFields =
  "id stream name format prefix separator padding scope reset nextNumber active issuedCount sample createdAt updatedAt";
export async function listNumberingPolicies() {
  return (
    await graphqlClient<{ numberingPolicies: NumberingPolicy[] }>(
      `query NumberingPolicies { numberingPolicies { ${numberingFields} } }`,
    )
  ).numberingPolicies;
}
export async function saveNumberingPolicy(input: NumberingPolicyInput) {
  return (
    await graphqlClient<{ saveNumberingPolicy: NumberingPolicy }, { input: NumberingPolicyInput }>(
      `mutation SaveNumberingPolicy($input: SaveNumberingPolicyInput!) { saveNumberingPolicy(input: $input) { ${numberingFields} } }`,
      { input },
    )
  ).saveNumberingPolicy;
}
const notificationFields =
  "id tenantId adminEmail replyToEmail emailEnabled smsEnabled timezone createdAt updatedAt events { event label audience email sms }";
export async function getNotificationPolicy() {
  return (
    await graphqlClient<{ notificationPolicy: NotificationPolicy }>(
      `query NotificationPolicy { notificationPolicy { ${notificationFields} } }`,
    )
  ).notificationPolicy;
}
export async function saveNotificationPolicy(input: NotificationPolicyInput) {
  const graphqlInput = {
    ...input,
    events: input.events.map((event) => ({
      event: event.event,
      audience: event.audience,
      email: event.email,
      sms: event.sms,
    })),
  };
  return (
    await graphqlClient<
      { updateNotificationPolicy: NotificationPolicy },
      { input: typeof graphqlInput }
    >(
      `mutation UpdateNotificationPolicy($input: UpdateNotificationPolicyInput!) { updateNotificationPolicy(input: $input) { ${notificationFields} } }`,
      { input: graphqlInput },
    )
  ).updateNotificationPolicy;
}

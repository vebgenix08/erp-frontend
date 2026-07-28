import { graphqlClient } from "../../../shared/api/graphql-client";
import type {
  AdmissionApplication,
  ApplicationDuplicateCheck,
  ApplicationStatus,
  CreateApplicationInput,
} from "../model/application.types";
const fields =
  "id applicationNumber admissionNumber enquiryId campusId academicYearId academicTargetId sectionId status studentName dateOfBirth gender phone email address parentName parentPhone parentRelation templateId templateVersion customFields documents { fileId documentType fileName } reviews { decision reviewedBy reviewedAt remarks } stageHistory { status at actorId remarks } createdAt updatedAt submittedAt approvedAt rejectedAt rejectionReason confirmedAt cancelledAt cancellationReason";
type Wire = Omit<AdmissionApplication, "customFields"> & {
  customFields?: string | Record<string, unknown>;
};
function map(value: Wire): AdmissionApplication {
  let customFields: Record<string, unknown> | undefined;
  if (typeof value.customFields === "string") {
    try {
      const parsed = JSON.parse(value.customFields);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed))
        customFields = parsed;
    } catch {
      customFields = undefined;
    }
  } else customFields = value.customFields;
  const record: Wire = { ...value };
  delete record.customFields;
  return { ...(record as Omit<AdmissionApplication, "customFields">), ...(customFields ? { customFields } : {}) };
}
function wire<T extends { customFields?: Record<string, unknown> }>(input: T) {
  return {
    ...input,
    ...(input.customFields
      ? { customFields: JSON.stringify(input.customFields) }
      : {}),
  };
}
export async function listApplications(filter?: {
  status?: ApplicationStatus;
  campusId?: string;
  academicYearId?: string;
  academicTargetId?: string;
  search?: string;
}) {
  return (
    await graphqlClient<{ applications: Wire[] }, { filter?: typeof filter }>(
      `query Applications($filter:ApplicationFilter){ applications(filter:$filter){ ${fields} } }`,
      filter ? { filter } : {},
    )
  ).applications.map(map);
}
export async function getApplication(id: string) {
  const value = await graphqlClient<{ application: Wire }, { id: string }>(
    `query Application($id:ID!){ application(id:$id){ ${fields} } }`,
    { id },
  );
  return map(value.application);
}
export interface ApplicationPage {
  items: AdmissionApplication[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
export async function listApplicationPage(filter: {
  status?: ApplicationStatus;
  campusId?: string;
  academicYearId?: string;
  academicTargetId?: string;
  search?: string;
  page: number;
  pageSize: number;
}): Promise<ApplicationPage> {
  const result = await graphqlClient<
    { applicationPage: Omit<ApplicationPage, "items"> & { items: Wire[] } },
    { filter: typeof filter }
  >(
    `query ApplicationPage($filter:ApplicationFilter!){ applicationPage(filter:$filter){ items { ${fields} } total page pageSize totalPages } }`,
    { filter },
  );
  return { ...result.applicationPage, items: result.applicationPage.items.map(map) };
}
export async function createApplication(input: CreateApplicationInput) {
  const value = await graphqlClient<
    { createApplication: Wire },
    { input: ReturnType<typeof wire<CreateApplicationInput>> }
  >(
    `mutation CreateApplication($input:CreateApplicationInput!){ createApplication(input:$input){ ${fields} } }`,
    { input: wire(input) },
  );
  return map(value.createApplication);
}
export async function updateApplication(
  id: string,
  input: Partial<CreateApplicationInput>,
) {
  const value = await graphqlClient<
    { updateApplication: Wire },
    {
      id: string;
      input: ReturnType<typeof wire<Partial<CreateApplicationInput>>>;
    }
  >(
    `mutation UpdateApplication($id:ID!,$input:UpdateApplicationInput!){ updateApplication(id:$id,input:$input){ ${fields} } }`,
    { id, input: wire(input) },
  );
  return map(value.updateApplication);
}
async function transition(
  name: string,
  id: string,
  input?: Record<string, unknown>,
) {
  const inputVariable = input
    ? `,$input:${name === "approveApplication" ? "ApplicationReviewInput" : name === "rejectApplication" ? "ApplicationRejectInput!" : "ApplicationCancelInput!"}`
    : "";
  const inputArgument = input ? ",input:$input" : "";
  const value = await graphqlClient<
    Record<string, Wire>,
    Record<string, unknown>
  >(
    `mutation Transition($id:ID!${inputVariable}){ ${name}(id:$id${inputArgument}){ ${fields} } }`,
    input ? { id, input } : { id },
  );
  return map(value[name]!);
}
export const submitApplication = (id: string) =>
  transition("submitApplication", id);
export const approveApplication = (id: string, remarks?: string) =>
  transition("approveApplication", id, remarks ? { remarks } : {});
export const rejectApplication = (id: string, reason: string) =>
  transition("rejectApplication", id, { reason });
export const cancelApplication = (id: string, reason: string) =>
  transition("cancelApplication", id, { reason });
export async function checkApplicationDuplicates(id: string) {
  return (
    await graphqlClient<
      { applicationDuplicateCheck: ApplicationDuplicateCheck },
      { id: string }
    >(
      `query ApplicationDuplicateCheck($id:ID!){ applicationDuplicateCheck(id:$id){ applicationId hasPotentialDuplicates checkedAt matches { applicationId applicationNumber admissionNumber studentName status reasons } } }`,
      { id },
    )
  ).applicationDuplicateCheck;
}
export async function confirmApplication(
  id: string,
  duplicateReviewAcknowledged: boolean,
) {
  const value = await graphqlClient<
    { confirmApplication: Wire },
    { id: string; input: { duplicateReviewAcknowledged: boolean } }
  >(
    `mutation ConfirmApplication($id:ID!,$input:AdmissionConfirmationInput!){ confirmApplication(id:$id,input:$input){ ${fields} } }`,
    { id, input: { duplicateReviewAcknowledged } },
  );
  return map(value.confirmApplication);
}

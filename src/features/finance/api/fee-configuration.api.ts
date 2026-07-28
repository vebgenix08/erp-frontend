import { graphqlClient } from "../../../shared/api/graphql-client";
import type {
  FeeCollectionPolicy,
  FeeConfiguration,
  FeeHead,
  FeeHeadCategory,
  FeeMapping,
  FeeSchedule,
  FeeSchedulePattern,
  FeeStructure,
} from "../model/fee-configuration.types";

const headFields = "id code name category description refundable status";
const scheduleFields =
  "id campusId academicYearId code name pattern collectionPolicy status";
const structureFields =
  "id campusId academicYearId code name currency totalAmountMinor status components { feeHeadId amountMinor allocationPriority }";
const mappingFields =
  "id campusId academicYearId structureId scheduleId status target { programId classId sectionId }";
const allFields = `feeHeads { ${headFields} } schedules { ${scheduleFields} } structures { ${structureFields} } mappings { ${mappingFields} }`;

export async function getFeeConfiguration(
  scope: { campusId: string; academicYearId: string }
): Promise<FeeConfiguration>;
export async function getFeeConfiguration(
  campusId: string,
  academicYearId: string
): Promise<FeeConfiguration>;
export async function getFeeConfiguration(
  campusIdOrScope: string | { campusId: string; academicYearId: string },
  academicYearId?: string,
): Promise<FeeConfiguration> {
  const scope =
    typeof campusIdOrScope === "string"
      ? { campusId: campusIdOrScope, academicYearId: academicYearId! }
      : campusIdOrScope;
  return (
    await graphqlClient<
      { feeConfiguration: FeeConfiguration },
      { scope: { campusId: string; academicYearId: string } }
    >(
      `query FeeConfiguration($scope: FeeConfigurationScopeInput!) { feeConfiguration(scope:$scope) { ${allFields} } }`,
      { scope },
    )
  ).feeConfiguration;
}

export async function createFeeHead(input: {
  name: string;
  category: FeeHeadCategory;
  description?: string;
  refundable: boolean;
}) {
  return (
    await graphqlClient<{ createFeeHead: FeeHead }, { input: typeof input }>(
      `mutation CreateFeeHead($input: CreateFeeHeadInput!) { createFeeHead(input:$input) { ${headFields} } }`,
      { input },
    )
  ).createFeeHead;
}

export async function updateFeeHead(
  id: string,
  input: {
    name: string;
    category: FeeHeadCategory;
    description?: string;
    refundable: boolean;
  },
) {
  return (
    await graphqlClient<
      { updateFeeHead: FeeHead },
      { id: string; input: typeof input }
    >(
      `mutation UpdateFeeHead($id:ID!,$input:UpdateFeeHeadInput!) { updateFeeHead(id:$id,input:$input) { ${headFields} } }`,
      { id, input },
    )
  ).updateFeeHead;
}

export async function createFeeSchedule(input: {
  campusId: string;
  academicYearId: string;
  name: string;
  pattern: FeeSchedulePattern;
  collectionPolicy: FeeCollectionPolicy;
}) {
  return (
    await graphqlClient<
      { createFeeSchedule: FeeSchedule },
      { input: typeof input }
    >(
      `mutation CreateFeeSchedule($input: CreateFeeScheduleInput!) { createFeeSchedule(input:$input) { ${scheduleFields} } }`,
      { input },
    )
  ).createFeeSchedule;
}

export async function createFeeStructure(input: {
  campusId: string;
  academicYearId: string;
  name: string;
  components: Array<{
    feeHeadId: string;
    amountMinor: number;
    allocationPriority: number;
  }>;
}) {
  return (
    await graphqlClient<
      { createFeeStructure: FeeStructure },
      { input: typeof input }
    >(
      `mutation CreateFeeStructure($input: CreateFeeStructureInput!) { createFeeStructure(input:$input) { ${structureFields} } }`,
      { input },
    )
  ).createFeeStructure;
}

export async function createFeeMapping(input: {
  campusId: string;
  academicYearId: string;
  structureId: string;
  scheduleId: string;
  target: { programId?: string; classId: string; sectionId?: string };
}) {
  return (
    await graphqlClient<
      { createFeeMapping: FeeMapping },
      { input: typeof input }
    >(
      `mutation CreateFeeMapping($input: CreateFeeMappingInput!) { createFeeMapping(input:$input) { ${mappingFields} } }`,
      { input },
    )
  ).createFeeMapping;
}

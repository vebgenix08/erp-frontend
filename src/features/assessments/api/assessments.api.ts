import { graphqlClient } from "../../../shared/api/graphql-client";
import type {
  AssessmentDefinition,
  AssessmentDefinitionStatus,
  SaveAssessmentDefinitionInput,
} from "../model/assessment.types";

const fields =
  "id campusId academicYearId classId name assessmentDate attendanceWindowStart attendanceWindowEnd maximumMarks sequence status version createdBy createdAt updatedBy updatedAt";

export async function listAssessmentDefinitions(input: {
  academicYearId: string;
  campusId?: string;
  classId?: string;
}) {
  const result = await graphqlClient<
    { assessmentDefinitions: AssessmentDefinition[] },
    { input: typeof input }
  >(
    `query AssessmentDefinitions($input:AssessmentDefinitionFilterInput!){assessmentDefinitions(input:$input){${fields}}}`,
    { input },
  );
  return result.assessmentDefinitions;
}

export async function saveAssessmentDefinition(input: SaveAssessmentDefinitionInput) {
  const result = await graphqlClient<
    { saveAssessmentDefinition: AssessmentDefinition },
    { input: SaveAssessmentDefinitionInput }
  >(
    `mutation SaveAssessmentDefinition($input:SaveAssessmentDefinitionInput!){saveAssessmentDefinition(input:$input){${fields}}}`,
    { input },
  );
  return result.saveAssessmentDefinition;
}

export async function setAssessmentDefinitionStatus(input: {
  id: string;
  status: AssessmentDefinitionStatus;
  expectedVersion: number;
}) {
  const result = await graphqlClient<
    { setAssessmentDefinitionStatus: AssessmentDefinition },
    { input: typeof input }
  >(
    `mutation SetAssessmentDefinitionStatus($input:SetAssessmentDefinitionStatusInput!){setAssessmentDefinitionStatus(input:$input){${fields}}}`,
    { input },
  );
  return result.setAssessmentDefinitionStatus;
}

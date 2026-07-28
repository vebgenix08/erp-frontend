import { graphqlClient } from "../../../shared/api/graphql-client";
import type {
  PlatformIntegration,
  PlatformIntegrationCode,
} from "../model/platform-integration.types";
const fields = "id code status secretReference settings createdAt updatedAt";
export async function listPlatformIntegrations() {
  const result = await graphqlClient<{
    platformIntegrations: PlatformIntegration[];
  }>(`query PlatformIntegrations { platformIntegrations { ${fields} } }`);
  return result.platformIntegrations;
}
export async function setPlatformIntegration(input: {
  code: PlatformIntegrationCode;
  status: PlatformIntegration["status"];
  secretReference?: string;
  settings?: Record<string, string | number | boolean>;
}) {
  const result = await graphqlClient<
    { setPlatformIntegration: PlatformIntegration },
    { input: typeof input }
  >(
    `mutation SetPlatformIntegration($input: SetPlatformIntegrationInput!) { setPlatformIntegration(input: $input) { ${fields} } }`,
    { input },
  );
  return result.setPlatformIntegration;
}

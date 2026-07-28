import { graphqlClient } from "../../../shared/api/graphql-client";
import type { PlatformFeatureFlag } from "../model/platform-feature-flags.types";

const fields = "id code name description isEnabled status createdAt updatedAt";
export async function listPlatformFeatureFlags() {
  const result = await graphqlClient<{ platformFeatureFlags: PlatformFeatureFlag[] }>(`query PlatformFeatureFlags { platformFeatureFlags { ${fields} } }`);
  return result.platformFeatureFlags;
}
export async function createPlatformFeatureFlag(input: { code: string; name: string; description?: string; isEnabled: boolean }) {
  const result = await graphqlClient<{ createPlatformFeatureFlag: PlatformFeatureFlag }, { input: typeof input }>(
    `mutation CreatePlatformFeatureFlag($input: CreateFeatureFlagInput!) { createPlatformFeatureFlag(input: $input) { ${fields} } }`,
    { input },
  );
  return result.createPlatformFeatureFlag;
}
export async function updatePlatformFeatureFlag(id: string, isEnabled: boolean) {
  const result = await graphqlClient<{ updatePlatformFeatureFlag: PlatformFeatureFlag }, { input: { id: string; isEnabled: boolean } }>(`mutation UpdatePlatformFeatureFlag($input: UpdateFeatureFlagInput!) { updatePlatformFeatureFlag(input: $input) { ${fields} } }`, { input: { id, isEnabled } });
  return result.updatePlatformFeatureFlag;
}

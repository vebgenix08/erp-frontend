import { graphqlClient } from "../../../shared/api/graphql-client";
import type { PlatformEntitlement, TenantCapability } from "../model/platform-entitlement.types";
const fields = "id tenantId featureCode status limits createdAt updatedAt";
export async function listTenantCapabilityCatalog() {
  const result = await graphqlClient<{ tenantCapabilityCatalog: TenantCapability[] }>(
    `query TenantCapabilityCatalog { tenantCapabilityCatalog { code name description owner designSections dependencies } }`,
  );
  return result.tenantCapabilityCatalog;
}
export async function listPlatformEntitlements(tenantId?: string) {
  const result = await graphqlClient<
    { tenantEntitlements: PlatformEntitlement[] },
    { tenantId: string | null }
  >(
    `query TenantEntitlements($tenantId: ID) { tenantEntitlements(tenantId: $tenantId) { ${fields} } }`,
    { tenantId: tenantId ?? null },
  );
  return result.tenantEntitlements;
}
export async function setPlatformEntitlement(input: {
  tenantId: string;
  featureCode: string;
  status: "ENABLED" | "DISABLED";
  limits?: Record<string, number>;
}) {
  const result = await graphqlClient<
    { setTenantEntitlement: PlatformEntitlement },
    { input: typeof input }
  >(
    `mutation SetTenantEntitlement($input: SetTenantEntitlementInput!) { setTenantEntitlement(input: $input) { ${fields} } }`,
    { input },
  );
  return result.setTenantEntitlement;
}

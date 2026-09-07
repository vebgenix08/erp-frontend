import { graphqlClient } from "../../../shared/api/graphql-client";
import type {
  ProvisionTenantInput,
  ProvisionTenantResult,
  TenantRecord,
  TenantUpdateInput,
} from "../model/tenant.types";

const tenantFields = `id name organizationName slug type status contactEmail contactPhone address academicYearStartMonth createdAt updatedAt deactivatedAt deletionRequestedAt deletionReason deletedAt purgeEligibleAt`;

export async function listTenants(): Promise<TenantRecord[]> {
  const result = await graphqlClient<
    { tenants: { edges: Array<{ node: TenantRecord }> } },
    { first: number; after: string | null }
  >(
    `
    query PlatformTenants($first: Int!, $after: String) {
      tenants(first: $first, after: $after) {
        edges { node { ${tenantFields} } }
        pageInfo { endCursor hasNextPage }
      }
    }
  `,
    { first: 100, after: null },
  );
  return result.tenants.edges.map((edge) => edge.node);
}

export async function getTenant(id: string): Promise<TenantRecord> {
  const result = await graphqlClient<{ tenant: TenantRecord }, { tenantId: string }>(
    `
    query PlatformTenant($tenantId: ID!) {
      tenant(tenantId: $tenantId) { ${tenantFields} }
    }
  `,
    { tenantId: id },
  );
  return result.tenant;
}

export async function provisionTenant(input: ProvisionTenantInput): Promise<ProvisionTenantResult> {
  const result = await graphqlClient<
    { provisionTenant: ProvisionTenantResult },
    { input: ProvisionTenantInput & { clientRequestId: string } }
  >(
    `
    mutation ProvisionTenant($input: ProvisionTenantInput!) {
      provisionTenant(input: $input) { tenantId organizationName slug onboardingStatus primaryAdminInviteStatus warnings { code message } }
    }
  `,
    { input: { ...input, clientRequestId: crypto.randomUUID() } },
  );
  return result.provisionTenant;
}

export async function updateTenant(id: string, input: TenantUpdateInput): Promise<TenantRecord> {
  const result = await graphqlClient<
    { updateTenant: TenantRecord },
    { input: TenantUpdateInput & { tenantId: string; clientRequestId: string } }
  >(
    `
    mutation UpdateTenant($input: UpdateTenantInput!) {
      updateTenant(input: $input) { ${tenantFields} }
    }
  `,
    { input: { ...input, tenantId: id, clientRequestId: crypto.randomUUID() } },
  );
  return result.updateTenant;
}

export async function deactivateTenant(id: string): Promise<TenantRecord> {
  const result = await graphqlClient<
    { deactivateTenant: TenantRecord },
    { tenantId: string; clientRequestId: string }
  >(
    `
    mutation DeactivateTenant($tenantId: ID!, $clientRequestId: ID!) {
      deactivateTenant(tenantId: $tenantId, clientRequestId: $clientRequestId) { ${tenantFields} }
    }
  `,
    { tenantId: id, clientRequestId: crypto.randomUUID() },
  );
  return result.deactivateTenant;
}

async function runTenantLifecycleMutation(
  field: "activateTenant" | "suspendTenant" | "confirmTenantDeletion",
  tenantId: string,
): Promise<TenantRecord> {
  const result = await graphqlClient<
    Record<typeof field, TenantRecord>,
    { tenantId: string; clientRequestId: string }
  >(
    `
    mutation TenantLifecycle($tenantId: ID!, $clientRequestId: ID!) {
      ${field}(tenantId: $tenantId, clientRequestId: $clientRequestId) { ${tenantFields} }
    }
  `,
    { tenantId, clientRequestId: crypto.randomUUID() },
  );
  return result[field];
}

export const activateTenant = (tenantId: string) =>
  runTenantLifecycleMutation("activateTenant", tenantId);
export const suspendTenant = (tenantId: string) =>
  runTenantLifecycleMutation("suspendTenant", tenantId);
export const confirmTenantDeletion = (tenantId: string) =>
  runTenantLifecycleMutation("confirmTenantDeletion", tenantId);

export async function requestTenantDeletion(
  tenantId: string,
  reason: string,
): Promise<TenantRecord> {
  const result = await graphqlClient<
    { requestTenantDeletion: TenantRecord },
    { tenantId: string; reason: string; clientRequestId: string }
  >(
    `
    mutation RequestTenantDeletion($tenantId: ID!, $reason: String!, $clientRequestId: ID!) {
      requestTenantDeletion(tenantId: $tenantId, reason: $reason, clientRequestId: $clientRequestId) { ${tenantFields} }
    }
  `,
    { tenantId, reason, clientRequestId: crypto.randomUUID() },
  );
  return result.requestTenantDeletion;
}

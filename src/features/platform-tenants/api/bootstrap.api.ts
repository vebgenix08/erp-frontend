import { graphqlClient } from "../../../shared/api/graphql-client";

export interface FirstAdminBootstrap {
  id: string;
  tenantId: string;
  adminName: string;
  adminEmail: string;
  adminPhone?: string;
  status: "PENDING" | "INVITED" | "COMPLETED" | "FAILED";
  inviteError?: string;
  inviteAttempts: number;
  lastInviteAttemptAt?: string;
  createdAt: string;
  invitedAt?: string;
  completedAt?: string;
}
export interface InviteDeliveryEvent {
  id: string;
  messageId: string;
  eventType:
    | "SEND"
    | "DELIVERY"
    | "DELIVERY_DELAY"
    | "BOUNCE"
    | "COMPLAINT"
    | "REJECT"
    | "RENDERING_FAILURE";
  occurredAt: string;
  recipients: string[];
}
const fields =
  "id tenantId adminName adminEmail adminPhone status inviteError inviteAttempts lastInviteAttemptAt createdAt invitedAt completedAt";
export async function getFirstAdminBootstrap(tenantId: string) {
  const result = await graphqlClient<
    { firstAdminBootstrap: FirstAdminBootstrap | null },
    { tenantId: string }
  >(
    `query FirstAdminBootstrap($tenantId: ID!) { firstAdminBootstrap(tenantId: $tenantId) { ${fields} } }`,
    { tenantId },
  );
  return result.firstAdminBootstrap;
}
export async function createFirstAdminBootstrap(input: {
  tenantId: string;
  adminName: string;
  adminEmail: string;
  adminPhone?: string;
}) {
  const result = await graphqlClient<
    { createFirstAdminBootstrap: FirstAdminBootstrap },
    { input: typeof input }
  >(
    `mutation CreateFirstAdminBootstrap($input: CreateFirstAdminBootstrapInput!) { createFirstAdminBootstrap(input: $input) { ${fields} } }`,
    { input },
  );
  return result.createFirstAdminBootstrap;
}
export async function resendFirstAdminBootstrapInvite(tenantId: string) {
  const result = await graphqlClient<
    { resendFirstAdminBootstrapInvite: FirstAdminBootstrap },
    { tenantId: string }
  >(
    `mutation ResendFirstAdminBootstrapInvite($tenantId: ID!) { resendFirstAdminBootstrapInvite(tenantId: $tenantId) { ${fields} } }`,
    { tenantId },
  );
  return result.resendFirstAdminBootstrapInvite;
}
export async function listInviteDeliveryEvents(email: string) {
  const result = await graphqlClient<
    { inviteDeliveryEvents: InviteDeliveryEvent[] },
    { email: string }
  >(
    `query InviteDeliveryEvents($email: AWSEmail!) { inviteDeliveryEvents(email: $email) { id messageId eventType occurredAt recipients } }`,
    { email },
  );
  return result.inviteDeliveryEvents;
}

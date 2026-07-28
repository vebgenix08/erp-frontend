import { graphqlClient } from "../../../shared/api/graphql-client";
import type { PlatformAuditLogItem } from "../model/platform-audit-log.types";

export async function listPlatformAuditLogs() {
  const result = await graphqlClient<{ platformAuditLogs: PlatformAuditLogItem[] }>(`query PlatformAuditLogs { platformAuditLogs { id action entityType entityId actorId tenantId tenantName createdAt } }`);
  return result.platformAuditLogs;
}

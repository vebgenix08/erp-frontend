import { graphqlClient } from "../../../shared/api/graphql-client";
import type { PlatformDashboardSummary } from "../model/platform-dashboard.types";
import type { PlatformAuditLogItem } from "../../platform-audit-logs/model/platform-audit-log.types";

export async function getPlatformDashboard() {
  return graphqlClient<{
    platformDashboardSummary: PlatformDashboardSummary;
    platformAuditLogs: PlatformAuditLogItem[];
  }>(`
    query PlatformDashboard {
      platformDashboardSummary { tenantCount activeTenantCount suspendedTenantCount bootstrapCount activeFeatureFlagCount auditLogCount onboardingTenantCount deletionPendingTenantCount failedBootstrapCount pendingBootstrapCount }
      platformAuditLogs { id action entityType entityId actorId tenantId tenantName createdAt }
    }
  `);
}

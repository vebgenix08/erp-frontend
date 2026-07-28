export interface PlatformAuditLogItem {
  id: string;
  action: string;
  entityType: string;
  entityId?: string | undefined;
  actorId?: string | undefined;
  tenantId?: string | undefined;
  tenantName?: string | undefined;
  createdAt: string;
}

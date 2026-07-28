export type PlatformIntegrationCode = "EMAIL" | "SMS" | "PAYMENTS" | "STORAGE";
export interface PlatformIntegration {
  id: string;
  code: PlatformIntegrationCode;
  status: "CONFIGURED" | "DISABLED" | "DEGRADED";
  secretReference?: string;
  settings: Record<string, string | number | boolean>;
  createdAt: string;
  updatedAt: string;
}

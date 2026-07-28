export interface PlatformEntitlement {
  id: string;
  tenantId: string;
  featureCode: string;
  status: "ENABLED" | "DISABLED";
  limits?: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export interface TenantCapability {
  code: string;
  name: string;
  description: string;
  owner: string;
  designSections: number[];
  dependencies: string[];
}

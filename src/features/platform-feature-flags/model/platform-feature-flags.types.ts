export interface PlatformFeatureFlag {
  id: string;
  code: string;
  name: string;
  description?: string | undefined;
  isEnabled: boolean;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
}

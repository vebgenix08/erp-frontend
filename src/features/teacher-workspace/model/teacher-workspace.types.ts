import type { LucideIcon } from "lucide-react";

export type TeacherWorkspaceSection =
  | "teaching"
  | "section"
  | "department"
  | "coordinator"
  | "leadership";

export type TeacherInstitutionMode = "SCHOOL" | "COLLEGE" | "DEGREE_COLLEGE";

export type TeacherPageKind =
  | "dashboard"
  | "schedule"
  | "marks"
  | "reports"
  | "profile"
  | "directory"
  | "workflow"
  | "timeline";

export interface TeacherPageDefinition {
  id: string;
  slug: string;
  label: string;
  title: string;
  description: string;
  icon: LucideIcon;
  kind: TeacherPageKind;
  section: TeacherWorkspaceSection;
  showInNavigation?: boolean;
  requiresTeachingAssignment?: boolean;
  requiredResponsibilityTypes?: string[];
  requiredRoleCodes?: string[];
}

export interface TeacherNavigationGroup {
  id: string;
  label: string;
  pages: TeacherPageDefinition[];
}

export interface TeacherWorkspaceCapabilities {
  hasEmployee: boolean;
  hasTeachingAssignments: boolean;
  responsibilityTypes: ReadonlySet<string>;
  roleCodes: ReadonlySet<string>;
}

export interface TeacherWorkspaceContext {
  campusId: string | null;
  campusName: string;
  academicYearId: string | null;
  academicYearName: string;
  institutionMode: TeacherInstitutionMode;
  academicUnitId: string | null;
  academicUnitName: string;
  academicPeriod: string;
  classLabel: string;
  subjectLabel: string;
  userName: string;
  userEmail: string;
}

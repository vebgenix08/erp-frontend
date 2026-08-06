export type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "INVITED";
export interface IdentityUser { id: string; email: string; name: string; status: UserStatus; createdAt: string; updatedAt: string; deactivatedAt?: string; }
export interface IdentityRole { id: string; code: string; name: string; description?: string; isSystemRole: boolean; isActive: boolean; createdAt: string; updatedAt: string; }
export interface PermissionCatalogItem { code: string; domain: string; resource: string; action: string; label: string; }
export type AccessScopeType = "TENANT" | "CAMPUS" | "PROGRAM" | "CLASS" | "SECTION" | "ASSIGNED_ONLY";
export interface AccessScope { scopeType: AccessScopeType; campusIds?: string[]; programIds?: string[]; classIds?: string[]; sectionIds?: string[]; }
export interface UserRoleAssignment { id: string; userId: string; roleId: string; scope: AccessScope; isActive: boolean; createdAt: string; updatedAt: string; }
export interface RolePermissionBinding { id: string; roleId: string; permission: string; }
export interface IdentityAccessSnapshot { permissions: PermissionCatalogItem[]; assignments: UserRoleAssignment[]; rolePermissions: RolePermissionBinding[]; }
export interface PageResult<T> { items: T[]; page: number; pageSize: number; total: number; totalPages: number; }
export interface IdentityUserPageFilter { search?: string; status?: UserStatus; page?: number; pageSize?: number; }
export interface IdentityRolePageFilter { search?: string; isActive?: boolean; page?: number; pageSize?: number; }
export interface IdentityAssignmentPageFilter { userId?: string; userIds?: string[]; roleId?: string; isActive?: boolean; page?: number; pageSize?: number; }

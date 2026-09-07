import {
  Ban,
  Building2,
  Check,
  KeyRound,
  Lock,
  Plus,
  Search,
  Shield,
  ShieldCheck,
  UserCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { listCampuses } from "../../tenant-settings/api/settings.api";
import type { Campus } from "../../tenant-settings/model/settings.types";
import { Modal } from "../../../shared/ui/modal";
import { EmptyState, ErrorState, LoadingState } from "../../../shared/ui/page-state";
import {
  assignIdentityUserRole,
  createIdentityRole,
  getIdentityAccess,
  listIdentityAssignmentPage,
  listIdentityRolePage,
  listIdentityUserPage,
  revokeIdentityUserRole,
  saveIdentityRolePermissions,
  updateIdentityRole,
} from "../api/access.api";
import type {
  AccessScopeType,
  IdentityAccessSnapshot,
  IdentityRole,
  IdentityUser,
  UserRoleAssignment,
} from "../model/access.types";
import { cn } from "../../../shared/ui/utils";
import { Button } from "../../../shared/ui/button";
import { Input } from "../../../shared/ui/input";
import { Label } from "../../../shared/ui/label";
import { Badge } from "../../../shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../shared/ui/card";
import { Separator } from "../../../shared/ui/separator";
import { ServerPagination } from "../../../shared/ui/server-pagination";

export type AccessView = "users" | "roles" | "permissions";

export function AccessManagement({ view }: { view: AccessView }) {
  const [users, setUsers] = useState<IdentityUser[]>([]);
  const [roles, setRoles] = useState<IdentityRole[]>([]);
  const [roleOptions, setRoleOptions] = useState<IdentityRole[]>([]);
  const [access, setAccess] = useState<IdentityAccessSnapshot | null>(null);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);
  const [activeUsers, setActiveUsers] = useState(0);
  const [totalRoles, setTotalRoles] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [profileUser, setProfileUser] = useState<IdentityUser | null>(null);
  const [profileAssignments, setProfileAssignments] = useState<UserRoleAssignment[]>([]);
  const [roleModal, setRoleModal] = useState(false);
  const [assignModal, setAssignModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<IdentityUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<IdentityRole | null>(null);
  const [roleForm, setRoleForm] = useState({ code: "", name: "", description: "" });
  const [assignment, setAssignment] = useState({
    roleId: "",
    scopeType: "TENANT" as AccessScopeType,
    campusIds: [] as string[],
  });

  const loadBase = async () => {
    setLoading(true);
    setError(null);
    try {
      const [roleLookup, nextAccess, nextCampuses, userCount, activeUserCount] = await Promise.all([
        listIdentityRolePage({ page: 1, pageSize: 100 }),
        getIdentityAccess(),
        listCampuses(),
        listIdentityUserPage({ page: 1, pageSize: 1 }),
        listIdentityUserPage({ status: "ACTIVE", page: 1, pageSize: 1 }),
      ]);
      setRoles(roleLookup.items);
      setRoleOptions(roleLookup.items);
      setAccess(nextAccess);
      setCampuses(nextCampuses.filter((item) => item.status === "ACTIVE"));
      setTotalUsers(userCount.total);
      setActiveUsers(activeUserCount.total);
      setTotalRoles(roleLookup.total);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to load access control");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBase();
  }, []);

  useEffect(() => {
    if (loading || view === "permissions") return;
    const timer = window.setTimeout(() => {
      void (async () => {
        setError(null);
        try {
          if (view === "users") {
            const query = search.trim();
            const result = await listIdentityUserPage({
              ...(query ? { search: query } : {}),
              page,
              pageSize,
            });
            setUsers(result.items);
            setTotal(result.total);
            const assignments = result.items.length
              ? await listIdentityAssignmentPage({
                  userIds: result.items.map((item) => item.id),
                  page: 1,
                  pageSize: 100,
                })
              : { items: [] as UserRoleAssignment[] };
            setAccess((current) =>
              current ? { ...current, assignments: assignments.items } : current,
            );
          } else {
            const query = search.trim();
            const result = await listIdentityRolePage({
              ...(query ? { search: query } : {}),
              page,
              pageSize,
            });
            setRoles(result.items);
            setTotal(result.total);
          }
        } catch (value) {
          setError(value instanceof Error ? value.message : "Unable to load access records");
        }
      })();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [loading, page, pageSize, search, view]);

  useEffect(() => setPage(1), [search, view]);

  const roleName = (id: string) =>
    roleOptions.find((item) => item.id === id)?.name ?? "Unavailable role";
  const assignmentsFor = (userId: string) =>
    access?.assignments.filter((item) => item.userId === userId && item.isActive) ?? [];

  async function openProfile(user: IdentityUser) {
    setProfileUser(user);
    setProfileAssignments([]);
    try {
      const history = await listIdentityAssignmentPage({
        userId: user.id,
        page: 1,
        pageSize: 100,
      });
      setProfileAssignments(history.items);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to load role history");
    }
  }

  const scopeLabel = (scope: { scopeType: AccessScopeType; campusIds?: string[] }) =>
    scope.scopeType === "TENANT"
      ? "All campuses"
      : scope.scopeType === "CAMPUS"
        ? (scope.campusIds ?? [])
            .map((id) => campuses.find((item) => item.id === id)?.name)
            .filter(Boolean)
            .join(", ") || "Selected campuses"
        : scope.scopeType.replaceAll("_", " ").toLowerCase();

  async function submitRole(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const saved = await createIdentityRole({
        ...roleForm,
        code: roleForm.code
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, "_"),
      });
      setRoles((current) => [...current, saved].sort((a, b) => a.name.localeCompare(b.name)));
      setRoleOptions((current) => [...current, saved].sort((a, b) => a.name.localeCompare(b.name)));
      setTotal((current) => current + 1);
      setTotalRoles((current) => current + 1);
      setRoleModal(false);
      setRoleForm({ code: "", name: "", description: "" });
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to create role");
    } finally {
      setBusy(false);
    }
  }

  async function submitAssignment(event: FormEvent) {
    event.preventDefault();
    if (!selectedUser) return;
    setBusy(true);
    setError(null);
    try {
      const saved = await assignIdentityUserRole({
        userId: selectedUser.id,
        roleId: assignment.roleId,
        scope: {
          scopeType: assignment.scopeType,
          ...(assignment.scopeType === "CAMPUS" ? { campusIds: assignment.campusIds } : {}),
        },
      });
      setAccess((current) =>
        current ? { ...current, assignments: [...current.assignments, saved] } : current,
      );
      setAssignModal(false);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to assign role");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    setBusy(true);
    try {
      const saved = await revokeIdentityUserRole(id);
      setAccess((current) =>
        current
          ? {
              ...current,
              assignments: current.assignments.map((item) => (item.id === saved.id ? saved : item)),
            }
          : current,
      );
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to revoke assignment");
    } finally {
      setBusy(false);
    }
  }

  async function togglePermission(code: string) {
    if (!selectedRole || !access) return;
    const current = new Set(
      access.rolePermissions
        .filter((item) => item.roleId === selectedRole.id)
        .map((item) => item.permission),
    );
    if (current.has(code)) current.delete(code);
    else current.add(code);
    setBusy(true);
    try {
      const saved = await saveIdentityRolePermissions({
        roleId: selectedRole.id,
        permissions: [...current],
      });
      setAccess((value) =>
        value
          ? {
              ...value,
              rolePermissions: [
                ...value.rolePermissions.filter((item) => item.roleId !== selectedRole.id),
                ...saved,
              ],
            }
          : value,
      );
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to save permissions");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingState label="Loading users and access directory..." />;
  if (error && !access) return <ErrorState message={error} retry={() => void loadBase()} />;

  return (
    <section className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              {view === "users"
                ? "User Management & Identity"
                : view === "roles"
                  ? "Access Roles Catalog"
                  : "Permission Security Matrix"}
            </h1>
            <Badge
              variant="secondary"
              className="text-[10px] font-bold text-brand-700 bg-brand-50 border-brand-200"
            >
              RBAC Governance
            </Badge>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {view === "users"
              ? "Assign campus-scoped privileges, manage authenticated identity profiles, and revoke permissions."
              : view === "roles"
                ? "Manage system-defined and custom institutional access roles."
                : "Configure granular module permissions and action-level capabilities per role."}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {view === "roles" && (
            <Button
              size="sm"
              onClick={() => setRoleModal(true)}
              className="h-9 px-4 text-xs font-bold gap-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-xs"
            >
              <Plus size={14} /> Add Role
            </Button>
          )}
        </div>
      </header>

      {/* KPI Stats Overview Ribbon */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs">
          <div className="flex items-center gap-2 text-slate-500">
            <UsersRound size={15} className="text-brand-600" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Users
            </span>
          </div>
          <p className="mt-1.5 text-xl font-extrabold text-slate-900">{totalUsers}</p>
          <p className="text-[10px] text-slate-400 font-medium mt-0.5">Onboarded identities</p>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs">
          <div className="flex items-center gap-2 text-slate-500">
            <UserCheck size={15} className="text-emerald-600" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Active Status
            </span>
          </div>
          <p className="mt-1.5 text-xl font-extrabold text-emerald-600">{activeUsers}</p>
          <p className="text-[10px] text-slate-400 font-medium mt-0.5">Verified credentials</p>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs">
          <div className="flex items-center gap-2 text-slate-500">
            <ShieldCheck size={15} className="text-indigo-600" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Configured Roles
            </span>
          </div>
          <p className="mt-1.5 text-xl font-extrabold text-slate-900">{totalRoles}</p>
          <p className="text-[10px] text-slate-400 font-medium mt-0.5">Security role tiers</p>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs">
          <div className="flex items-center gap-2 text-slate-500">
            <Building2 size={15} className="text-amber-600" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Campuses
            </span>
          </div>
          <p className="mt-1.5 text-xl font-extrabold text-slate-900">{campuses.length}</p>
          <p className="text-[10px] text-slate-400 font-medium mt-0.5">Operating scopes</p>
        </div>
      </div>

      {/* Navigation View Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <Link
          to="/admin/access/users"
          className={cn(
            "flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all",
            view === "users"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
          )}
        >
          <UserRound size={14} /> Users & Access
        </Link>
        <Link
          to="/admin/access/roles"
          className={cn(
            "flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all",
            view === "roles"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
          )}
        >
          <Shield size={14} /> Roles Catalog
        </Link>
        <Link
          to="/admin/access/permissions"
          className={cn(
            "flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all",
            view === "permissions"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
          )}
        >
          <Lock size={14} /> Permission Matrix
        </Link>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-bold text-rose-700"
        >
          {error}
        </div>
      )}

      {/* Search Toolbar */}
      {view !== "permissions" && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <Input
              aria-label="Search access records"
              placeholder={
                view === "users" ? "Search user by name, email, or role..." : "Search role name..."
              }
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-10 pl-10 rounded-xl text-xs font-semibold"
            />
          </div>
        </div>
      )}

      {/* USERS VIEW */}
      {view === "users" &&
        (users.length ? (
          <div className="space-y-3">
            {users.map((user) => {
              const initials =
                user.name
                  .split(" ")
                  .slice(0, 2)
                  .map((w) => w[0])
                  .join("")
                  .toUpperCase() || "US";

              const assignedRoles = assignmentsFor(user.id);

              return (
                <Card
                  key={user.id}
                  className="p-0 overflow-hidden border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all bg-white"
                >
                  <CardContent className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4">
                    {/* User Identity Column */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 border border-brand-200 text-brand-700 font-extrabold text-xs shadow-2xs">
                        {initials}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-900 text-xs truncate">{user.name}</p>
                          <Badge
                            variant={user.status === "ACTIVE" ? "success" : "secondary"}
                            className="text-[9px] px-1.5 py-0 font-bold shrink-0"
                          >
                            {user.status}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                          {user.email}
                        </p>
                      </div>
                    </div>

                    {/* Assigned Roles & Scopes */}
                    <div className="flex flex-wrap items-center gap-1.5 flex-1 lg:justify-center">
                      {assignedRoles.map((item) => (
                        <div
                          key={item.id}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs shadow-2xs"
                        >
                          <ShieldCheck size={13} className="text-indigo-600 shrink-0" />
                          <span className="font-bold text-slate-800 text-[11px]">
                            {roleName(item.roleId)}
                          </span>
                          <span className="text-slate-300">·</span>
                          <span className="text-[10px] text-slate-500 font-semibold">
                            {scopeLabel(item.scope)}
                          </span>
                          <button
                            type="button"
                            title="Revoke assignment"
                            aria-label={`Revoke ${roleName(item.roleId)} from ${user.name}`}
                            disabled={busy}
                            onClick={() => void revoke(item.id)}
                            className="h-4 w-4 rounded-md text-slate-400 hover:bg-rose-100 hover:text-rose-600 transition-colors flex items-center justify-center shrink-0 ml-0.5"
                          >
                            <Ban size={11} />
                          </button>
                        </div>
                      ))}
                      {!assignedRoles.length && (
                        <span className="text-[11px] text-slate-400 italic bg-slate-50 px-2.5 py-1 rounded-lg border border-dashed border-slate-200">
                          No role assigned
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void openProfile(user)}
                        className="h-8 px-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-lg"
                      >
                        <UserRound size={13} /> History
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(user);
                          setAssignment({
                            roleId: roleOptions.find((role) => role.isActive)?.id ?? "",
                            scopeType: "TENANT",
                            campusIds: [],
                          });
                          setAssignModal(true);
                        }}
                        className="h-8 px-3 text-xs font-bold gap-1 rounded-lg border-slate-200 text-brand-600 hover:bg-brand-50 hover:border-brand-300 shadow-2xs"
                      >
                        <ShieldCheck size={13} /> Assign Role
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            <ServerPagination
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
              onPageSizeChange={(value) => {
                setPageSize(value);
                setPage(1);
              }}
            />
          </div>
        ) : (
          <EmptyState
            title="No tenant users found"
            description="Authenticated staff will appear here after identity onboarding completes."
          />
        ))}

      {/* ROLES VIEW */}
      {view === "roles" &&
        (roles.length ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {roles.map((role) => (
              <Card
                key={role.id}
                className="flex flex-col justify-between border border-slate-200/90 shadow-2xs bg-white rounded-2xl"
              >
                <CardHeader className="p-4 pb-3 border-b border-slate-100">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 shadow-2xs">
                        <UsersRound size={16} />
                      </span>
                      <div className="min-w-0">
                        <CardTitle className="text-xs font-bold text-slate-900 truncate">
                          {role.name}
                        </CardTitle>
                        <CardDescription className="text-[10px] text-slate-400 font-semibold mt-0.5">
                          {role.isSystemRole ? "Controlled System Role" : "Tenant-Defined Role"}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge
                      variant={role.isActive ? "success" : "secondary"}
                      className="text-[9px] px-1.5 py-0 font-bold shrink-0"
                    >
                      {role.isActive ? "ACTIVE" : "INACTIVE"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-3 flex-1 flex flex-col justify-between space-y-3">
                  <p className="text-xs text-slate-500 font-medium">
                    {role.description || "No description provided for this role definition."}
                  </p>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-[10px] text-slate-400 font-mono font-semibold">
                      CODE: {role.code}
                    </span>
                    {!role.isSystemRole && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        onClick={() =>
                          void updateIdentityRole(role.id, { isActive: !role.isActive }).then(
                            (saved) => {
                              setRoles((current) =>
                                current.map((item) => (item.id === saved.id ? saved : item)),
                              );
                              setRoleOptions((current) =>
                                current.map((item) => (item.id === saved.id ? saved : item)),
                              );
                            },
                          )
                        }
                        className="text-xs font-bold text-slate-600 hover:text-slate-900"
                      >
                        {role.isActive ? "Deactivate" : "Activate"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            <div className="sm:col-span-2">
              <ServerPagination
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={setPage}
                onPageSizeChange={(value) => {
                  setPageSize(value);
                  setPage(1);
                }}
              />
            </div>
          </div>
        ) : (
          <EmptyState
            title="No roles found"
            description="Create a tenant-specific role or adjust search filters."
          />
        ))}

      {/* PERMISSIONS VIEW */}
      {view === "permissions" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Roles list */}
          <Card className="md:col-span-1 h-fit border border-slate-200/90 shadow-2xs rounded-2xl bg-white p-0 overflow-hidden">
            <CardHeader className="p-3.5 pb-2 border-b border-slate-100">
              <CardTitle className="text-xs font-bold text-slate-900">
                Select Security Role
              </CardTitle>
            </CardHeader>
            <div className="p-2 space-y-1">
              {roleOptions
                .filter((role) => role.isActive)
                .map((role) => (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRole(role)}
                    className={cn(
                      "w-full text-left rounded-xl px-3 py-2 text-xs transition-all",
                      selectedRole?.id === role.id
                        ? "bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold"
                        : "text-slate-600 hover:bg-slate-50",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <KeyRound
                        size={13}
                        className={
                          selectedRole?.id === role.id ? "text-indigo-600" : "text-slate-400"
                        }
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold">{role.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                          {access?.rolePermissions.filter((item) => item.roleId === role.id)
                            .length ?? 0}{" "}
                          permissions
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
            </div>
          </Card>

          {/* Permissions grid */}
          <div className="md:col-span-3 space-y-4">
            {selectedRole ? (
              [...new Set(access?.permissions.map((item) => item.domain) ?? [])].map((domain) => (
                <Card
                  key={domain}
                  className="border border-slate-200/90 shadow-2xs rounded-2xl bg-white p-0 overflow-hidden"
                >
                  <CardHeader className="p-3.5 pb-2 border-b border-slate-100 flex-row items-center justify-between">
                    <CardTitle className="text-xs font-bold capitalize text-slate-800">
                      {domain}
                    </CardTitle>
                    <span className="text-[10px] font-bold text-slate-400">
                      {access?.permissions.filter((item) => item.domain === domain).length}{" "}
                      capabilities
                    </span>
                  </CardHeader>
                  <CardContent className="p-3 divide-y divide-slate-100">
                    {access?.permissions
                      .filter((item) => item.domain === domain)
                      .map((permission) => {
                        const checked = access.rolePermissions.some(
                          (item) =>
                            item.roleId === selectedRole.id && item.permission === permission.code,
                        );
                        return (
                          <label
                            key={permission.code}
                            className="flex items-center justify-between py-2 cursor-pointer hover:bg-slate-50/70 rounded-lg px-2 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={busy}
                                onChange={() => void togglePermission(permission.code)}
                                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <div>
                                <p className="text-xs font-bold text-slate-800">
                                  {permission.resource}
                                </p>
                                <p className="text-[10px] text-slate-400 font-medium">
                                  {permission.action}
                                </p>
                              </div>
                            </div>
                            {checked && <Check size={14} className="text-indigo-600 font-bold" />}
                          </label>
                        );
                      })}
                  </CardContent>
                </Card>
              ))
            ) : (
              <EmptyState
                title="Select a security role"
                description="Choose a role to review and grant permissions."
              />
            )}
          </div>
        </div>
      )}

      {/* User Profile History Modal */}
      <Modal
        open={Boolean(profileUser)}
        title={profileUser?.name ?? "User Profile"}
        {...(profileUser?.email ? { description: profileUser.email } : {})}
        onClose={() => setProfileUser(null)}
      >
        {profileUser ? (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div>
                <dt className="text-slate-400 font-bold uppercase text-[9px]">Status</dt>
                <dd className="font-extrabold text-slate-800 mt-0.5">{profileUser.status}</dd>
              </div>
              <div>
                <dt className="text-slate-400 font-bold uppercase text-[9px]">Active Roles</dt>
                <dd className="font-extrabold text-brand-600 mt-0.5">
                  {profileAssignments.filter((item) => item.isActive).length} active
                </dd>
              </div>
              <div>
                <dt className="text-slate-400 font-bold uppercase text-[9px]">Created</dt>
                <dd className="font-semibold text-slate-700 mt-0.5">
                  {new Date(profileUser.createdAt).toLocaleDateString()}
                </dd>
              </div>
              <div>
                <dt className="text-slate-400 font-bold uppercase text-[9px]">Last Modified</dt>
                <dd className="font-semibold text-slate-700 mt-0.5">
                  {new Date(profileUser.updatedAt).toLocaleDateString()}
                </dd>
              </div>
            </dl>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900">Role Assignment History</h4>
              {profileAssignments.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-2xs"
                >
                  <div className="flex items-center justify-between gap-3">
                    <strong className="text-slate-900">{roleName(item.roleId)}</strong>
                    <Badge
                      variant={item.isActive ? "success" : "secondary"}
                      className="text-[9px] px-1.5 py-0 font-bold"
                    >
                      {item.isActive ? "ACTIVE" : "REVOKED"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500 font-medium">
                    {scopeLabel(item.scope)} · Assigned {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
              {!profileAssignments.length && (
                <p className="text-xs text-slate-400">No role assignment history found.</p>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Add Role Modal */}
      <Modal
        open={roleModal}
        title="Create Tenant Role"
        description="Custom roles allow scoping granular permissions for faculty and staff."
        onClose={() => setRoleModal(false)}
      >
        <form className="space-y-4" onSubmit={(e) => void submitRole(e)}>
          <div className="space-y-1.5">
            <Label htmlFor="new-role-name" className="text-xs font-bold text-slate-700">
              Role Name
            </Label>
            <Input
              id="new-role-name"
              required
              placeholder="e.g. Department Head, Fee Clerk"
              value={roleForm.name}
              onChange={(event) =>
                setRoleForm((v) => ({ ...v, name: event.target.value, code: event.target.value }))
              }
              className="h-10 rounded-xl text-xs font-semibold"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-role-desc" className="text-xs font-bold text-slate-700">
              Description
            </Label>
            <textarea
              id="new-role-desc"
              value={roleForm.description}
              onChange={(event) => setRoleForm((v) => ({ ...v, description: event.target.value }))}
              rows={3}
              placeholder="Describe access responsibilities..."
              className="flex w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none shadow-2xs"
            />
          </div>
          <Separator />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRoleModal(false)}
              className="h-9 px-4 text-xs font-bold rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={busy}
              className="h-9 px-4 text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-xs"
            >
              Create Role
            </Button>
          </div>
        </form>
      </Modal>

      {/* Assign Role Modal */}
      <Modal
        open={assignModal}
        title={`Assign Role to ${selectedUser?.name ?? "User"}`}
        description="Select the security role and specify the institutional scope."
        onClose={() => setAssignModal(false)}
      >
        <form className="space-y-4" onSubmit={(e) => void submitAssignment(e)}>
          <div className="space-y-1.5">
            <Label htmlFor="assign-role-id" className="text-xs font-bold text-slate-700">
              Security Role
            </Label>
            <select
              id="assign-role-id"
              required
              value={assignment.roleId}
              onChange={(event) => setAssignment((v) => ({ ...v, roleId: event.target.value }))}
              className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-2xs"
            >
              {roleOptions
                .filter((role) => role.isActive)
                .map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="assign-scope" className="text-xs font-bold text-slate-700">
              Access Scope
            </Label>
            <select
              id="assign-scope"
              value={assignment.scopeType}
              onChange={(event) =>
                setAssignment((v) => ({
                  ...v,
                  scopeType: event.target.value as AccessScopeType,
                  campusIds: [],
                }))
              }
              className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-2xs"
            >
              <option value="TENANT">All Campuses (Global Access)</option>
              <option value="CAMPUS">Selected Campus(es) Only</option>
              <option value="ASSIGNED_ONLY">Assigned Records Only</option>
            </select>
          </div>

          {assignment.scopeType === "CAMPUS" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Allowed Campuses</Label>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2 max-h-40 overflow-y-auto">
                {campuses.map((campus) => (
                  <label
                    key={campus.id}
                    className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={assignment.campusIds.includes(campus.id)}
                      onChange={(event) =>
                        setAssignment((v) => ({
                          ...v,
                          campusIds: event.target.checked
                            ? [...v.campusIds, campus.id]
                            : v.campusIds.filter((id) => id !== campus.id),
                        }))
                      }
                      className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    <span>{campus.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <Separator />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAssignModal(false)}
              className="h-9 px-4 text-xs font-bold rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={
                busy ||
                !assignment.roleId ||
                (assignment.scopeType === "CAMPUS" && !assignment.campusIds.length)
              }
              className="h-9 px-4 text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-xs"
            >
              Confirm Assignment
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}

import { Ban, Check, KeyRound, Plus, Search, ShieldCheck, UserRound, UsersRound } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
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
import type { AccessScopeType, IdentityAccessSnapshot, IdentityRole, IdentityUser, UserRoleAssignment } from "../model/access.types";
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
      const [roleLookup, nextAccess, nextCampuses] = await Promise.all([
        listIdentityRolePage({ page: 1, pageSize: 100 }),
        getIdentityAccess(),
        listCampuses(),
      ]);
      setRoles(roleLookup.items);
      setRoleOptions(roleLookup.items);
      setAccess(nextAccess);
      setCampuses(nextCampuses.filter((item) => item.status === "ACTIVE"));
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
            const result = await listIdentityUserPage({ ...(query ? { search: query } : {}), page, pageSize });
            setUsers(result.items);
            setTotal(result.total);
            const assignments = result.items.length
              ? await listIdentityAssignmentPage({ userIds: result.items.map((item) => item.id), page: 1, pageSize: 100 })
              : { items: [] as UserRoleAssignment[] };
            setAccess((current) => current ? { ...current, assignments: assignments.items } : current);
          } else {
            const query = search.trim();
            const result = await listIdentityRolePage({ ...(query ? { search: query } : {}), page, pageSize });
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

  const roleName = (id: string) => roleOptions.find((item) => item.id === id)?.name ?? "Unavailable role";
  const assignmentsFor = (userId: string) =>
    access?.assignments.filter((item) => item.userId === userId && item.isActive) ?? [];

  async function openProfile(user: IdentityUser) {
    setProfileUser(user);
    setProfileAssignments([]);
    try {
      const history = await listIdentityAssignmentPage({ userId: user.id, page: 1, pageSize: 100 });
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
        code: roleForm.code.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_"),
      });
      setRoles((current) => [...current, saved].sort((a, b) => a.name.localeCompare(b.name)));
      setRoleOptions((current) => [...current, saved].sort((a, b) => a.name.localeCompare(b.name)));
      setTotal((current) => current + 1);
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
      access.rolePermissions.filter((item) => item.roleId === selectedRole.id).map((item) => item.permission),
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

  if (loading) return <LoadingState label="Loading users and access" />;
  if (error && !access) return <ErrorState message={error} retry={() => void loadBase()} />;

  return (
    <section className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            {view === "users" ? "Users and access" : view === "roles" ? "Roles" : "Permission matrix"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {view === "users"
              ? "Assign tenant and campus-scoped responsibilities without exposing internal references."
              : view === "roles"
                ? "Use controlled system roles or add a tenant-specific role."
                : "Grant actions to roles. Data visibility is restricted separately by assignment scope."}
          </p>
        </div>
        {view === "roles" && (
          <Button size="sm" onClick={() => setRoleModal(true)}>
            <Plus size={15} /> Add role
          </Button>
        )}
      </header>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Search toolbar */}
      {view !== "permissions" && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <Input
              aria-label="Search access records"
              placeholder={view === "users" ? "Search name or email" : "Search role"}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      )}

      {/* Users view */}
      {view === "users" && (
        users.length ? (
          <div className="space-y-3">
            {users.map((user) => (
              <Card key={user.id}>
                <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                      <UserRound size={18} />
                    </span>
                    <div>
                      <p className="font-semibold text-slate-900">{user.name}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {assignmentsFor(user.id).map((item) => (
                      <div
                        key={item.id}
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-55 px-2.5 py-1 text-xs"
                      >
                        <span className="font-semibold text-slate-800">{roleName(item.roleId)}</span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-500">{scopeLabel(item.scope)}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Revoke assignment"
                          aria-label={`Revoke ${roleName(item.roleId)} from ${user.name}`}
                          disabled={busy}
                          onClick={() => void revoke(item.id)}
                          className="h-4 w-4 rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600 shrink-0 p-0"
                        >
                          <Ban size={10} />
                        </Button>
                      </div>
                    ))}
                    {!assignmentsFor(user.id).length && (
                      <span className="text-xs text-slate-400 italic">No role assigned</span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <Badge variant={user.status === "ACTIVE" ? "success" : "secondary"}>
                      {user.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void openProfile(user)}
                    >
                      <UserRound size={14} /> Profile
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
                    >
                      <ShieldCheck size={14} /> Assign role
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            <ServerPagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={(value) => { setPageSize(value); setPage(1); }} />
          </div>
        ) : (
          <EmptyState
            title="No tenant users"
            description="Authenticated and invited staff will appear here after identity onboarding completes."
          />
        )
      )}

      {/* Roles view */}
      {view === "roles" && (
        roles.length ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {roles.map((role) => (
              <Card key={role.id} className="flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                        <UsersRound size={16} />
                      </span>
                      <div>
                        <CardTitle className="text-sm font-bold text-slate-900">{role.name}</CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                          {role.isSystemRole ? "Controlled system role" : "Tenant-defined role"}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant={role.isActive ? "success" : "secondary"}>
                      {role.isActive ? "ACTIVE" : "INACTIVE"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 pb-5 space-y-4 flex-1 flex flex-col justify-between">
                  <p className="text-sm text-slate-500">{role.description || "No description added."}</p>
                  <div>
                    <Separator className="my-3" />
                    {role.isSystemRole ? (
                      <p className="flex items-center gap-1.5 text-xs text-slate-400">
                        <ShieldCheck size={13} /> Protected role identity
                      </p>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() =>
                          void updateIdentityRole(role.id, { isActive: !role.isActive }).then((saved) => {
                            setRoles((current) => current.map((item) => (item.id === saved.id ? saved : item)));
                            setRoleOptions((current) => current.map((item) => (item.id === saved.id ? saved : item)));
                          })
                        }
                      >
                        {role.isActive ? "Deactivate" : "Activate"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            <div className="sm:col-span-2">
              <ServerPagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={(value) => { setPageSize(value); setPage(1); }} />
            </div>
          </div>
        ) : (
          <EmptyState title="No roles found" description="Create a tenant-specific role or change the search." />
        )
      )}

      <Modal
        open={Boolean(profileUser)}
        title={profileUser?.name ?? "User profile"}
        {...(profileUser?.email ? { description: profileUser.email } : {})}
        onClose={() => setProfileUser(null)}
      >
        {profileUser ? (
          <div className="space-y-4">
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
              <div><dt className="text-slate-500">Status</dt><dd className="font-semibold">{profileUser.status}</dd></div>
              <div><dt className="text-slate-500">Created</dt><dd className="font-semibold">{new Date(profileUser.createdAt).toLocaleString()}</dd></div>
              <div><dt className="text-slate-500">Last updated</dt><dd className="font-semibold">{new Date(profileUser.updatedAt).toLocaleString()}</dd></div>
              <div><dt className="text-slate-500">Active assignments</dt><dd className="font-semibold">{profileAssignments.filter((item) => item.isActive).length}</dd></div>
            </dl>
            <Separator />
            <div className="space-y-2">
              <h4 className="font-semibold text-slate-900">Role and scope history</h4>
              {profileAssignments.map((item) => (
                <div key={item.id} className="rounded-md border border-slate-200 p-3 text-sm">
                  <div className="flex justify-between gap-3"><strong>{roleName(item.roleId)}</strong><Badge variant={item.isActive ? "success" : "secondary"}>{item.isActive ? "ACTIVE" : "REVOKED"}</Badge></div>
                  <p className="mt-1 text-slate-500">{scopeLabel(item.scope)} · {new Date(item.createdAt).toLocaleString()}</p>
                </div>
              ))}
              {!profileAssignments.length ? <p className="text-sm text-slate-500">No role assignment history.</p> : null}
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Permissions view */}
      {view === "permissions" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Roles list */}
          <Card className="md:col-span-1 h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold">Roles</CardTitle>
            </CardHeader>
            <Separator />
            <div className="p-1.5 space-y-0.5">
              {roleOptions
                .filter((role) => role.isActive)
                .map((role) => (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRole(role)}
                    className={cn(
                      "w-full text-left rounded-md px-3 py-2 text-sm transition-colors",
                      selectedRole?.id === role.id
                        ? "bg-indigo-50 text-indigo-700 font-semibold"
                        : "text-slate-650 hover:bg-slate-50",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <KeyRound size={14} className={selectedRole?.id === role.id ? "text-indigo-600" : "text-slate-400"} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate">{role.name}</p>
                        <p className="text-[10px] text-slate-400 font-normal mt-0.5">
                          {access?.rolePermissions.filter((item) => item.roleId === role.id).length ?? 0} permissions
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
            </div>
          </Card>

          {/* Permissions grid */}
          <div className="md:col-span-3 space-y-5">
            {selectedRole ? (
              [...new Set(access?.permissions.map((item) => item.domain) ?? [])].map((domain) => (
                <Card key={domain}>
                  <CardHeader className="flex-row items-center justify-between pb-3">
                    <CardTitle className="text-sm font-bold capitalize text-slate-800">{domain}</CardTitle>
                    <span className="text-xs font-semibold text-slate-400">
                      {access?.permissions.filter((item) => item.domain === domain).length} actions
                    </span>
                  </CardHeader>
                  <Separator />
                  <CardContent className="pt-3 pb-3 divide-y divide-slate-100">
                    {access?.permissions
                      .filter((item) => item.domain === domain)
                      .map((permission) => {
                        const checked = access.rolePermissions.some(
                          (item) => item.roleId === selectedRole.id && item.permission === permission.code,
                        );
                        return (
                          <label
                            key={permission.code}
                            className="flex items-center justify-between py-2.5 cursor-pointer hover:bg-slate-50/50 rounded-md px-2 -mx-2 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={busy}
                                onChange={() => void togglePermission(permission.code)}
                                className="h-4 w-4 rounded border-slate-300 text-indigo-650 focus:ring-indigo-600"
                              />
                              <div>
                                <p className="text-sm font-semibold text-slate-800">{permission.resource}</p>
                                <p className="text-xs text-slate-400">{permission.action}</p>
                              </div>
                            </div>
                            {checked && <Check size={16} className="text-indigo-600" />}
                          </label>
                        );
                      })}
                  </CardContent>
                </Card>
              ))
            ) : (
              <EmptyState title="Select a role" description="Choose a role to review and grant its action permissions." />
            )}
          </div>
        </div>
      )}

      {/* Add Role Modal */}
      <Modal
        open={roleModal}
        title="Add tenant role"
        description="Role references are derived from the name and cannot be changed after creation."
        onClose={() => setRoleModal(false)}
      >
        <form className="space-y-4" onSubmit={(e) => void submitRole(e)}>
          <div className="space-y-1.5">
            <Label htmlFor="new-role-name">Role name</Label>
            <Input
              id="new-role-name"
              required
              value={roleForm.name}
              onChange={(event) => setRoleForm((v) => ({ ...v, name: event.target.value, code: event.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-role-desc">Description</Label>
            <textarea
              id="new-role-desc"
              value={roleForm.description}
              onChange={(event) => setRoleForm((v) => ({ ...v, description: event.target.value }))}
              rows={3}
              className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600 resize-none"
            />
          </div>
          <Separator />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setRoleModal(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={busy}>
              Create role
            </Button>
          </div>
        </form>
      </Modal>

      {/* Assign Role Modal */}
      <Modal
        open={assignModal}
        title={`Assign role to ${selectedUser?.name ?? "user"}`}
        description="Permission and scope are both enforced by the backend."
        onClose={() => setAssignModal(false)}
      >
        <form className="space-y-4" onSubmit={(e) => void submitAssignment(e)}>
          <div className="space-y-1.5">
            <Label htmlFor="assign-role-id">Role</Label>
            <select
              id="assign-role-id"
              required
              value={assignment.roleId}
              onChange={(event) => setAssignment((v) => ({ ...v, roleId: event.target.value }))}
              className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600"
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
            <Label htmlFor="assign-scope">Access scope</Label>
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
              className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600"
            >
              <option value="TENANT">All campuses</option>
              <option value="CAMPUS">Selected campuses</option>
              <option value="ASSIGNED_ONLY">Assigned records only</option>
            </select>
          </div>

          {assignment.scopeType === "CAMPUS" && (
            <div className="space-y-1.5">
              <Label>Allowed campuses</Label>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3 space-y-2 max-h-40 overflow-y-auto">
                {campuses.map((campus) => (
                  <label key={campus.id} className="flex items-center gap-2 cursor-pointer">
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
                      className="h-4 w-4 rounded border-slate-300 text-accent-650 focus:ring-accent-600"
                    />
                    <span className="text-sm text-slate-700">{campus.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <Separator />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setAssignModal(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={busy || !assignment.roleId || (assignment.scopeType === "CAMPUS" && !assignment.campusIds.length)}
            >
              Assign role
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}

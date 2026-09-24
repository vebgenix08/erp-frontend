import { ChevronLeft, ChevronRight, GraduationCap, LogOut, Menu, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import { RouteContentBoundary } from "../../../shared/ui/route-content-boundary";
import { useSession } from "../../session/model/session-provider";
import {
  SelectedAcademicYearProvider,
  useSelectedAcademicYear,
} from "../../tenant-settings/model/selected-academic-year-provider";
import {
  SelectedCampusProvider,
  useSelectedCampus,
} from "../../tenant-settings/model/selected-campus-provider";
import { cn } from "../../../shared/ui/utils";
import { ModernSelect } from "../../../shared/ui/select";
import {
  canAccessTeacherPage,
  findTeacherNavigationGroup,
  findTeacherPage,
  getVisibleTeacherNavigation,
  teacherPagePath,
} from "../model/teacher-workspace.config";
import { TeacherWorkspaceContextProvider } from "../model/teacher-workspace-context";
import type { TeacherInstitutionMode } from "../model/teacher-workspace.types";
import { getTeacherWorkloadWorkspace } from "../../teacher-workload/api/teacher-workload.api";
import type { TeacherWorkloadWorkspace } from "../../teacher-workload/model/teacher-workload.types";
import { getSessionDashboardPath } from "../../session/api/session.api";
import { useMemberProfilePhoto } from "../../session/model/use-member-profile-photo";
import { useInstitutionBranding } from "../../tenant-settings/model/use-institution-branding";
import { invalidateRequestCache } from "../../../shared/api/request-coordinator";

export function TeacherWorkspaceLayout() {
  return (
    <SelectedCampusProvider>
      <SelectedAcademicYearProvider>
        <TeacherWorkspaceShell />
      </SelectedAcademicYearProvider>
    </SelectedCampusProvider>
  );
}

function TeacherWorkspaceShell() {
  const { session } = useSession();
  const { campuses, selectedCampus, selectCampus, loading: campusLoading } = useSelectedCampus();
  const {
    academicYears,
    selectedAcademicYear,
    selectedAcademicYearId,
    selectAcademicYear,
    loading: yearLoading,
  } = useSelectedAcademicYear();
  const { pageSlug } = useParams<{ pageSlug: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [workspace, setWorkspace] = useState<TeacherWorkloadWorkspace | null>(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(true);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [workspaceRevision, setWorkspaceRevision] = useState(0);
  const [workspaceCampusId, setWorkspaceCampusId] = useState("");
  const tenantId = session?.selectedTenant?.tenantId ?? session?.tenant?.tenantId;
  const { name: institutionName, logoUrl: institutionLogo } = useInstitutionBranding(tenantId);
  const memberPhoto = useMemberProfilePhoto(
    workspace?.teacher.profilePhotoFileId ?? session?.user.profilePhotoFileId,
  );
  const resolvedPageSlug = pageSlug ?? location.pathname.split("/")[2];

  const roleCodes = useMemo(
    () =>
      new Set(
        [
          session?.user.role?.trim().toUpperCase(),
          ...(session?.user.roles ?? []).map((role) => role.code.trim().toUpperCase()),
        ].filter((value): value is string => Boolean(value)),
      ),
    [session?.user.role, session?.user.roles],
  );

  const responsibilityTypes = useMemo(
    () => new Set(workspace?.responsibilities.map((item) => item.responsibilityType) ?? []),
    [workspace?.responsibilities],
  );

  const capabilities = useMemo(
    () => ({
      hasEmployee: Boolean(workspace?.teacher.id),
      hasTeachingAssignments: Boolean(workspace?.assignments.length),
      responsibilityTypes,
      roleCodes,
    }),
    [responsibilityTypes, roleCodes, workspace?.assignments.length, workspace?.teacher.id],
  );

  const visibleNavigation = useMemo(
    () => getVisibleTeacherNavigation(capabilities),
    [capabilities],
  );

  const page = findTeacherPage(resolvedPageSlug);
  const activeNavigationGroup = findTeacherNavigationGroup(page);

  useEffect(() => setMobileOpen(false), [location.pathname]);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen((value) => !value);
      }
      if (event.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  useEffect(() => {
    let active = true;
    setWorkspaceLoading(true);
    setWorkspaceError(null);
    void getTeacherWorkloadWorkspace({
      ...(selectedAcademicYear?.id ? { academicYearId: selectedAcademicYear.id } : {}),
      viewMode: "PUBLISHED",
      weekStartDate: new Date().toISOString(),
    })
      .then((value) => {
        if (active) setWorkspace(value);
      })
      .catch((value: unknown) => {
        if (!active) return;
        setWorkspace(null);
        setWorkspaceError(
          value instanceof Error ? value.message : "Unable to load academic workspace",
        );
      })
      .finally(() => {
        if (active) setWorkspaceLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedAcademicYear?.id, workspaceRevision]);

  const scopedCampuses = workspace
    ? workspace.campusBreakdown
        .filter((campus) => workspace.teacher.campusIds.includes(campus.campusId))
        .map((campus) => ({ id: campus.campusId, name: campus.campusName }))
    : campuses.map((campus) => ({ id: campus.id, name: campus.name }));

  const selectedWorkspaceCampus =
    scopedCampuses.find((campus) => campus.id === workspaceCampusId) ??
    scopedCampuses.find((campus) => campus.id === selectedCampus?.id) ??
    scopedCampuses[0] ??
    null;

  useEffect(() => {
    if (selectedWorkspaceCampus && selectedWorkspaceCampus.id !== workspaceCampusId) {
      setWorkspaceCampusId(selectedWorkspaceCampus.id);
    }
  }, [selectedWorkspaceCampus, workspaceCampusId]);

  if (!workspaceLoading && workspace && !canAccessTeacherPage(page, capabilities)) {
    return <Navigate to="/teacher/dashboard" replace />;
  }
  const defaultDashboard = getSessionDashboardPath(session);
  const missingTeacher = /active teacher|not linked to an active teaching employee/i.test(
    workspaceError ?? "",
  );
  if (!workspaceLoading && !workspace && missingTeacher && defaultDashboard !== location.pathname) {
    return <Navigate to={defaultDashboard} replace />;
  }

  const institutionMode: TeacherInstitutionMode = inferInstitutionMode(
    selectedWorkspaceCampus?.name,
  );
  const userEmail = session?.user.email?.trim() ?? "";
  const localPart = userEmail.split("@")[0] ?? "";
  const userName =
    workspace?.teacher.fullName ??
    (workspaceLoading
      ? "Loading profile"
      : localPart
          .split(/[._-]/)
          .map((part) => (part ? part[0]!.toUpperCase() + part.slice(1) : ""))
          .join(" ") || "Faculty Member");

  const operatingContext = {
    campusId: selectedWorkspaceCampus?.id ?? null,
    campusName:
      selectedWorkspaceCampus?.name ??
      (campusLoading || workspaceLoading ? "Loading campus" : "Campus not selected"),
    academicYearId: selectedAcademicYearId ?? workspace?.academicYear.id ?? null,
    academicYearName:
      selectedAcademicYear?.name ??
      workspace?.academicYear.name ??
      (yearLoading || workspaceLoading ? "Loading year" : "Academic year not selected"),
    institutionMode,
    academicUnitId: null,
    academicUnitName: "All Units",
    academicPeriod:
      selectedAcademicYear?.name ?? workspace?.academicYear.name ?? "No academic period",
    classLabel: "Assigned Classes",
    subjectLabel: "Assigned Subjects",
    userName,
    userEmail,
  };

  const responsibilityLabels = [...responsibilityTypes].map(readableResponsibility);
  const accessLabel =
    workspaceLoading && !workspace
      ? "Loading access"
      : [
          workspace?.assignments.length ? "Teaching" : null,
          ...responsibilityLabels,
          roleCodes.has("PRINCIPAL") ? "Principal" : null,
          roleCodes.has("VICE_PRINCIPAL") ? "Vice Principal" : null,
          roleCodes.has("DEAN") ? "Dean" : null,
        ]
          .filter(
            (value, index, values): value is string =>
              Boolean(value) && values.indexOf(value) === index,
          )
          .join(" · ") || readableResponsibility(workspace?.teacher.staffType ?? "ACADEMIC_STAFF");
  const primaryAccessLabel =
    workspaceLoading && !workspace
      ? "Loading access"
      : roleCodes.has("PRINCIPAL")
        ? "Principal"
        : roleCodes.has("VICE_PRINCIPAL")
          ? "Vice Principal"
          : roleCodes.has("DEAN")
            ? "Dean"
            : responsibilityTypes.has("HOD")
              ? "HOD"
              : responsibilityTypes.has("PROGRAM_COORDINATOR")
                ? "Program Coordinator"
                : responsibilityTypes.has("CLASS_TEACHER")
                  ? "Class Teacher"
                  : "Teaching";

  const searchPages = visibleNavigation.flatMap((group) =>
    group.pages.map((item) => ({ group, page: item })),
  );
  const visibleSearchPages = search.trim()
    ? searchPages.filter((item) =>
        `${item.page.label} ${item.page.title} ${item.group.label}`
          .toLowerCase()
          .includes(search.trim().toLowerCase()),
      )
    : searchPages;
  const PageIcon = page.icon;

  return (
    <TeacherWorkspaceContextProvider
      value={{
        activeNavigationGroup,
        visibleNavigation,
        capabilities,
        accessLabel,
        operatingContext,
        workspace,
        workspaceLoading,
        workspaceError,
        retryWorkspace: () => {
          invalidateRequestCache();
          setWorkspaceRevision((value) => value + 1);
        },
      }}
    >
      <div className="flex h-screen w-full overflow-hidden bg-slate-50 text-slate-900">
        {mobileOpen ? (
          <button
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden"
          />
        ) : null}
        {searchOpen ? (
          <div
            className="fixed inset-0 z-[90] flex items-start justify-center bg-slate-950/50 px-4 pt-20 backdrop-blur-sm"
            onMouseDown={() => setSearchOpen(false)}
          >
            <div
              className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="flex items-center gap-3 border-b border-slate-200 p-4">
                <Search size={18} className="text-slate-400" />
                <input
                  autoFocus
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search Teacher workspace pages..."
                  className="min-w-0 flex-1 border-0 text-sm font-semibold outline-none"
                />
                <button
                  aria-label="Close search"
                  onClick={() => setSearchOpen(false)}
                  className="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100"
                >
                  <X size={17} />
                </button>
              </div>
              <div className="max-h-96 overflow-y-auto p-2">
                {visibleSearchPages.map(({ group: targetGroup, page: targetPage }) => (
                  <button
                    key={targetPage.id}
                    onClick={() => {
                      navigate(teacherPagePath(targetPage));
                      setSearchOpen(false);
                      setSearch("");
                    }}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left hover:bg-slate-100 transition-colors"
                  >
                    <span>
                      <strong className="block text-xs text-slate-900">{targetPage.label}</strong>
                      <small className="text-[11px] text-slate-500">{targetPage.description}</small>
                    </span>
                    <span className="ml-3 shrink-0 text-[10px] font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-100">
                      {targetGroup.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-800 bg-[#0f172a] text-slate-200 shadow-xl transition-all lg:relative lg:translate-x-0",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
            collapsed ? "w-[80px]" : "w-[280px]",
          )}
        >
          {/* Sidebar Header Brand */}
          <div className="flex min-h-16 items-center gap-3 border-b border-slate-800/80 px-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-brand-600 text-white shadow-xs">
              {institutionLogo ? (
                <img
                  src={institutionLogo}
                  alt={`${institutionName ?? "Institution"} logo`}
                  className="h-full w-full bg-white object-contain p-0.5"
                />
              ) : (
                <GraduationCap size={20} />
              )}
            </span>
            {!collapsed ? (
              <div className="min-w-0 flex-1">
                <strong className="block truncate text-sm font-bold text-white tracking-tight">
                  {institutionName ?? session?.tenant?.displayName ?? "Vebgenix ERP"}
                </strong>
                <span className="block truncate text-xs font-medium text-slate-400">
                  Teacher Workspace
                </span>
              </div>
            ) : null}
            <button
              aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
              onClick={() => setCollapsed((value) => !value)}
              className="hidden h-7 w-7 place-items-center rounded-lg bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-white lg:grid transition-colors"
            >
              {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
            </button>
            <button
              aria-label="Close navigation"
              onClick={() => setMobileOpen(false)}
              className="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-800 lg:hidden text-slate-400 hover:text-white"
            >
              <X size={17} />
            </button>
          </div>

          {/* Navigation Items (Clean Grouping with Dashboard under Overview) */}
          <nav
            aria-label="Teacher workspace navigation"
            className="flex-1 overflow-y-auto px-3 py-4 space-y-5"
          >
            {visibleNavigation.map((group) => (
              <div key={group.label}>
                {!collapsed ? (
                  <div className="mb-1.5 px-3 text-[14px] font-semibold leading-5 text-slate-300">
                    {group.label}
                  </div>
                ) : null}
                <div className="space-y-1">
                  {group.pages.map((item) => {
                    const active = item.id === page.id;
                    const Icon = item.icon;
                    return (
                      <button
                        title={collapsed ? item.label : undefined}
                        key={item.id}
                        onClick={() => navigate(teacherPagePath(item))}
                        className={cn(
                          "flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-[14px] font-medium leading-5 transition-colors",
                          active
                            ? "bg-brand-600 text-white shadow-sm font-semibold"
                            : "text-slate-300 hover:bg-slate-800/70 hover:text-white",
                          collapsed && "justify-center px-0",
                        )}
                      >
                        <Icon
                          size={16}
                          className={cn("shrink-0", active ? "text-white" : "text-slate-400")}
                        />
                        {!collapsed ? <span className="truncate">{item.label}</span> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Sidebar Footer User Info */}
          <div className="border-t border-slate-800/80 p-3 bg-slate-950/40">
            <div className={cn("flex items-center gap-2.5", collapsed && "justify-center")}>
              <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg bg-brand-600 text-xs font-extrabold text-white shadow-xs">
                {memberPhoto ? (
                  <img
                    src={memberPhoto}
                    alt={`${userName} profile`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  userName
                    .split(" ")
                    .map((part) => part[0])
                    .slice(0, 2)
                    .join("")
                )}
              </span>
              {!collapsed ? (
                <div className="min-w-0 flex-1">
                  <strong className="block truncate text-sm font-bold text-white">
                    {userName}
                  </strong>
                  <span className="block truncate text-xs text-slate-400 font-medium">
                    {accessLabel}
                  </span>
                </div>
              ) : null}
              <a
                href="/logout"
                aria-label="Sign out"
                className={cn(
                  "grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors",
                  collapsed && "hidden",
                )}
                title="Sign out"
              >
                <LogOut size={14} />
              </a>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Topbar */}
          <header className="flex min-h-16 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 lg:px-6 shadow-2xs">
            {/* Left Title / Breadcrumbs */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                aria-label="Open navigation"
                onClick={() => setMobileOpen(true)}
                className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-600 lg:hidden hover:bg-slate-50"
              >
                <Menu size={18} />
              </button>
              <div className="flex items-center gap-2 min-w-0">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-700 shrink-0">
                  <PageIcon size={16} />
                </span>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    {activeNavigationGroup.label}
                  </span>
                  <h1 className="truncate text-sm font-bold text-slate-900 leading-tight">
                    {page.title || page.label}
                  </h1>
                </div>
              </div>
            </div>

            {/* Right Context Selectors & Profile Pill */}
            <div className="flex items-center gap-3">
              {/* Campus Selector */}
              {scopedCampuses.length > 0 ? (
                <div className="hidden sm:block">
                  <ModernSelect
                    aria-label="Operating campus"
                    disabled={workspaceLoading || !scopedCampuses.length}
                    value={selectedWorkspaceCampus?.id ?? ""}
                    onValueChange={(val) => {
                      setWorkspaceCampusId(val);
                      selectCampus(val);
                    }}
                    className="min-w-[140px] max-w-[200px]"
                    options={scopedCampuses.map((campus) => ({
                      label: campus.name,
                      value: campus.id,
                    }))}
                  />
                </div>
              ) : null}

              {/* Academic Year Selector */}
              {academicYears.length > 0 || workspace ? (
                <div className="hidden md:block">
                  <ModernSelect
                    aria-label="Operating academic year"
                    disabled={yearLoading || (!academicYears.length && !workspace)}
                    value={selectedAcademicYear?.id ?? workspace?.academicYear.id ?? ""}
                    onValueChange={(val) => selectAcademicYear(val)}
                    className="min-w-[130px] max-w-[180px]"
                    options={
                      academicYears.length
                        ? academicYears.map((year) => ({ label: year.name, value: year.id }))
                        : workspace
                          ? [
                              {
                                label: workspace.academicYear.name,
                                value: workspace.academicYear.id,
                              },
                            ]
                          : []
                    }
                  />
                </div>
              ) : null}

              {/* Quick Search Button */}
              <button
                aria-label="Search Teacher workspace"
                onClick={() => setSearchOpen(true)}
                className="hidden min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors sm:flex"
              >
                <Search size={14} className="text-slate-400" />
                <span>Search</span>
                <kbd className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[9px] font-mono text-slate-400 shadow-2xs">
                  Ctrl K
                </kbd>
              </button>

              {/* Unified User Profile Pill */}
              <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 shadow-2xs">
                <span className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-lg bg-brand-600 text-xs font-extrabold text-white shadow-2xs">
                  {memberPhoto ? (
                    <img
                      src={memberPhoto}
                      alt={`${userName} profile`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    userName
                      .split(" ")
                      .map((part) => part[0])
                      .slice(0, 2)
                      .join("")
                  )}
                </span>
                <div className="text-left hidden lg:block">
                  <strong className="block max-w-[120px] truncate text-sm font-bold text-slate-900 leading-tight">
                    {userName}
                  </strong>
                  <span className="block max-w-[120px] truncate text-xs font-semibold text-brand-600">
                    {primaryAccessLabel}
                  </span>
                </div>
              </div>
            </div>
          </header>

          {/* Page Content Body */}
          <div className="flex-1 overflow-y-auto">
            <RouteContentBoundary resetKey={`${location.pathname}${location.search}`}>
              <Outlet />
            </RouteContentBoundary>
          </div>
        </main>
      </div>
    </TeacherWorkspaceContextProvider>
  );
}

function inferInstitutionMode(label: string | undefined): TeacherInstitutionMode {
  const value = label?.trim().toUpperCase() ?? "";
  if (value.includes("DEGREE")) return "DEGREE_COLLEGE";
  if (value.includes("COLLEGE") || value.includes("PU")) return "COLLEGE";
  return "SCHOOL";
}

function readableResponsibility(value: string) {
  if (value === "HOD") return "HOD";
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

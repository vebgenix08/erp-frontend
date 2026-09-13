import {
  BadgeIndianRupee,
  Bell,
  BookOpen,
  Building2,
  CalendarRange,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  FileSearch,
  FileText,
  GraduationCap,
  Hash,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  UserRoundCog,
  UsersRound,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
  type NavLinkRenderProps,
} from "react-router-dom";
import {
  fetchCurrentTenantSummary,
  getSessionTenantLabel,
} from "../../features/session/api/session.api";
import { useSession } from "../../features/session/model/session-provider";
import { getInstitutionProfile } from "../../features/tenant-settings/api/settings.api";
import { getFileDownloadUrl } from "../../features/storage/api/files.api";
import { SelectedAcademicYearProvider } from "../../features/tenant-settings/model/selected-academic-year-provider";
import { SelectedCampusProvider } from "../../features/tenant-settings/model/selected-campus-provider";
import { OperatingContextControls } from "./operating-context-controls";
import { cn } from "../../shared/ui/utils";
import { Avatar, AvatarFallback } from "../../shared/ui/avatar";
import { Button } from "../../shared/ui/button";
import { Input } from "../../shared/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../shared/ui/tooltip";
import { RouteContentBoundary } from "../../shared/ui/route-content-boundary";

import { NetworkStatusProvider } from "../../shared/ui/offline-screen";

export function TenantLayout() {
  return (
    <NetworkStatusProvider>
      <SelectedCampusProvider>
        <SelectedAcademicYearProvider>
          <TenantWorkspace />
        </SelectedAcademicYearProvider>
      </SelectedCampusProvider>
    </NetworkStatusProvider>
  );
}

function TenantWorkspace() {
  const { session, clearSession } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdSearch, setCmdSearch] = useState("");
  const [institutionName, setInstitutionName] = useState<string | null>(null);
  const [institutionLogo, setInstitutionLogo] = useState<string | null>(null);
  const [registryName, setRegistryName] = useState<string | null>(null);

  useEffect(() => setMobileOpen(false), [location.pathname]);

  // Keyboard shortcut handler for Ctrl + K or Cmd + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setCmdOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    let active = true;
    void getInstitutionProfile()
      .then(async (profile) => {
        if (!active) return;
        setInstitutionName(profile?.name ?? null);
        const logo = profile?.logoFileId
          ? await getFileDownloadUrl(profile.logoFileId)
          : (profile?.logoUrl ?? null);
        if (active) setInstitutionLogo(logo);
      })
      .catch(() => {
        if (active) setInstitutionName(null);
      });
    return () => {
      active = false;
    };
  }, [session?.selectedTenant?.tenantId, session?.tenant?.tenantId]);

  useEffect(() => {
    let active = true;
    void fetchCurrentTenantSummary()
      .then((summary) => {
        if (active) setRegistryName(summary.name);
      })
      .catch(() => {
        if (active) setRegistryName(null);
      });
    return () => {
      active = false;
    };
  }, [session?.selectedTenant?.tenantId, session?.tenant?.tenantId]);

  const dashboardLink = ["/admin/dashboard", "Dashboard", LayoutDashboard] as const;

  const setupLinks = [
    ["/admin/setup/campuses", "Campuses", Building2],
    ["/admin/setup/academic-structure", "Academic Setup", BookOpen],
    ["/admin/academics/class-setup", "Class Setup", CalendarRange],
    ["/admin/academics/assessments", "Assessment Setup", ClipboardCheck],
  ] as const;

  const administrationLinks = [
    ["/admin/setup/numbering", "Numbering", Hash],
    ["/admin/setup/templates", "Templates", FileText],
    ["/admin/setup/notifications", "Notifications", Bell],
  ] as const;

  const financeLinks = [
    ["/admin/finance/dashboard", "Finance Dashboard", BadgeIndianRupee],
    ["/admin/finance/setup", "Finance Setup", Settings2],
    ["/admin/finance/collections", "Fee Collections", BadgeIndianRupee],
    ["/admin/finance/general-charges", "Additional Fees", FileText],
    ["/admin/finance/outstanding", "Outstanding Fees", FileSearch],
    ["/admin/finance/receipts", "Receipts Register", FileText],
    ["/admin/finance/receipt-template", "Receipt Template", FileText],
    ["/admin/finance/reconciliation", "Bank Reconciliation", RefreshCw],
  ] as const;

  const peopleLinks = [
    ["/admin/students", "Students Directory", GraduationCap],
    ["/admin/staff", "Staff Directory", UsersRound],
  ] as const;

  const academicOperationsLinks = [
    ["/admin/student-documents", "Certificates & ID Cards", FileText],
    ["/admin/campus-transfers", "Campus Transfers", RefreshCw],
  ] as const;

  const admissionsLinks = [
    ["/admin/admissions/enquiries", "Admission Enquiries", FileSearch],
    ["/admin/admissions/applications", "Student Applications", ClipboardCheck],
    ["/admin/admissions/admitted-students", "Admitted Students", GraduationCap],
  ] as const;

  const accessLinks = [
    ["/admin/access/users", "User Management", UserRoundCog],
    ["/admin/access/roles", "Role Management", ShieldCheck],
    ["/admin/access/permissions", "Permissions Matrix", KeyRound],
  ] as const;

  const allSearchItems = [
    ...setupLinks.map(([to, label]) => ({ category: "Academic Setup", label, to })),
    ...financeLinks.map(([to, label]) => ({ category: "Finance", label, to })),
    ...peopleLinks.map(([to, label]) => ({ category: "Students & Staff", label, to })),
    ...academicOperationsLinks.map(([to, label]) => ({
      category: "Academic Operations",
      label,
      to,
    })),
    ...admissionsLinks.map(([to, label]) => ({ category: "Admissions", label, to })),
    ...accessLinks.map(([to, label]) => ({ category: "Access & Security", label, to })),
    ...administrationLinks.map(([to, label]) => ({ category: "Administration", label, to })),
  ];

  const filteredSearch = cmdSearch.trim()
    ? allSearchItems.filter((item) =>
        `${item.label} ${item.category}`.toLowerCase().includes(cmdSearch.trim().toLowerCase()),
      )
    : allSearchItems;

  const tenantLabel =
    institutionName ??
    registryName ??
    getSessionTenantLabel(session?.selectedTenant ?? session?.tenant ?? null);

  const userEmail = session?.user.email ?? "Admin";
  const userInitial = userEmail.slice(0, 1).toUpperCase();

  return (
    <TooltipProvider>
      <div className="flex h-screen w-full overflow-hidden bg-slate-50">
        {/* MobileScrim */}
        {mobileOpen && (
          <button
            className="fixed inset-0 z-30 bg-slate-900/60 backdrop-blur-xs md:hidden"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Global Command Palette Modal (Ctrl + K) */}
        {cmdOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-900/50 backdrop-blur-xs">
            <div
              className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-4 shadow-2xl space-y-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-slate-400 min-w-0 flex-1">
                  <Search className="h-4 w-4 shrink-0" />
                  <Input
                    autoFocus
                    value={cmdSearch}
                    onChange={(e) => setCmdSearch(e.target.value)}
                    placeholder="Search pages, modules, or actions... (Esc to close)"
                    className="border-none shadow-none h-8 text-xs focus-visible:ring-0 pl-0"
                  />
                </div>
                <button
                  onClick={() => setCmdOpen(false)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto space-y-1 py-1">
                {filteredSearch.map((item) => (
                  <button
                    key={item.to}
                    onClick={() => {
                      setCmdOpen(false);
                      setCmdSearch("");
                      navigate(item.to);
                    }}
                    className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-all text-left"
                  >
                    <span>{item.label}</span>
                    <span className="text-[10px] font-normal text-slate-400">{item.category}</span>
                  </button>
                ))}
                {!filteredSearch.length && (
                  <div className="py-8 text-center text-xs text-slate-400 font-medium">
                    No results found for "{cmdSearch}"
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Clean Slate 900 Dark Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-[#0f172a] text-slate-300 shadow-xl transition-transform duration-200 border-r border-slate-800",
            "md:relative md:translate-x-0",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          {/* Brand header */}
          <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-slate-800/80 bg-[#0b1329]/50">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-900 text-brand-400 shadow-xs border border-slate-700 p-0.5">
              {institutionLogo ? (
                <img
                  src={institutionLogo}
                  alt={`${tenantLabel} logo`}
                  className="h-full w-full object-contain rounded-lg"
                />
              ) : (
                <GraduationCap size={18} className="text-white" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white leading-tight">{tenantLabel}</p>
              <p className="truncate text-xs font-medium text-slate-400">Enterprise ERP</p>
            </div>
            <button
              className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white md:hidden"
              aria-label="Close navigation"
              onClick={() => setMobileOpen(false)}
            >
              <X size={15} />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-3">
            {/* Dashboard Link */}
            <div>
              <NavLink
                to={dashboardLink[0]}
                className={({ isActive }: NavLinkRenderProps) =>
                  cn(
                    "flex min-h-10 items-center gap-3 rounded-lg px-3 text-[14px] font-medium leading-5 transition-colors",
                    isActive
                      ? "bg-brand-600 text-white font-semibold shadow-xs"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white",
                  )
                }
              >
                <LayoutDashboard size={16} className="shrink-0" />
                <span>Dashboard</span>
              </NavLink>
            </div>

            {/* Categorized ERP Nav Groups */}
            <div className="space-y-3.5">
              <SidebarGroup
                categoryLabel="Admissions"
                links={admissionsLinks}
                defaultOpen={location.pathname.startsWith("/admin/admissions")}
              />

              <SidebarGroup
                categoryLabel="Students & staff"
                links={peopleLinks}
                defaultOpen={
                  location.pathname.startsWith("/admin/staff") ||
                  location.pathname.startsWith("/admin/students")
                }
              />

              <SidebarGroup
                categoryLabel="Academic operations"
                links={academicOperationsLinks}
                defaultOpen={location.pathname.startsWith("/admin/student-documents")}
              />

              <SidebarGroup
                categoryLabel="Academic setup"
                links={setupLinks}
                defaultOpen={
                  location.pathname.startsWith("/admin/setup/campuses") ||
                  location.pathname.startsWith("/admin/setup/academic") ||
                  location.pathname.startsWith("/admin/academics")
                }
              />

              <SidebarGroup
                categoryLabel="Finance"
                links={financeLinks}
                defaultOpen={location.pathname.startsWith("/admin/finance")}
              />

              <SidebarGroup
                categoryLabel="Administration"
                links={administrationLinks}
                defaultOpen={
                  location.pathname.startsWith("/admin/setup/numbering") ||
                  location.pathname.startsWith("/admin/setup/templates") ||
                  location.pathname.startsWith("/admin/setup/notifications")
                }
              />

              <SidebarGroup
                categoryLabel="Users & access"
                links={accessLinks}
                defaultOpen={location.pathname.startsWith("/admin/access")}
              />
            </div>
          </nav>

          {/* User Account Info Footer */}
          <div className="border-t border-slate-800 bg-[#0b1329]/40 p-3">
            <div className="flex items-center gap-2.5 rounded-lg border border-slate-800 bg-slate-900/90 p-2">
              <Avatar className="h-7 w-7 shrink-0 rounded-md">
                <AvatarFallback className="bg-brand-600 text-white text-xs font-bold">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white leading-none">Tenant Admin</p>
                <p className="truncate text-xs text-slate-400 font-mono mt-0.5">{userEmail}</p>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="h-6 w-6 text-slate-400 hover:bg-slate-800 hover:text-white"
                    aria-label="Sign out"
                    onClick={() => {
                      clearSession();
                      navigate("/login", { replace: true });
                    }}
                  >
                    <LogOut size={14} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Sign out</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </aside>

        {/* Main Content Workspace */}
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Topbar Header with Backdrop Blur */}
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/90 backdrop-blur-md px-6 z-20 gap-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <button
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 md:hidden"
                aria-label="Open navigation"
                onClick={() => setMobileOpen(true)}
              >
                <Menu size={19} />
              </button>

              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-500 truncate">{tenantLabel}</p>
                <p className="text-base font-bold text-slate-900 truncate">
                  Enterprise Administration
                </p>
              </div>
            </div>

            {/* Right Side Tools: Campus & Academic Year Controls + Ctrl+K Search */}
            <div className="flex shrink-0 items-center gap-3">
              {/* Command Palette Quick Button */}
              <button
                onClick={() => setCmdOpen(true)}
                className="hidden sm:flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-500 shadow-2xs hover:bg-slate-50/80 hover:border-slate-300 transition-all"
              >
                <Search className="h-4 w-4 text-slate-400" />
                <span>Quick Search...</span>
                <kbd className="rounded-md bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                  Ctrl K
                </kbd>
              </button>

              <OperatingContextControls />

              {/* User Profile Pill in Top Right */}
              <NavLink
                to="/admin/profile"
                className="flex h-10 items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold shadow-2xs hover:bg-slate-50/80 hover:border-slate-300 transition-all shrink-0"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-brand-600 text-white font-extrabold text-[11px] shadow-xs">
                  {userInitial}
                </span>
                <div className="hidden md:flex flex-col text-left min-w-0">
                  <span className="text-[11px] font-bold text-slate-800 leading-none truncate max-w-[130px]">
                    {userEmail.split("@")[0]}
                  </span>
                  <span className="text-[9px] font-semibold text-slate-400 leading-tight mt-0.5">
                    Tenant Admin
                  </span>
                </div>
              </NavLink>
            </div>
          </header>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-5 md:p-6">
            <RouteContentBoundary resetKey={`${location.pathname}${location.search}`}>
              <Outlet />
            </RouteContentBoundary>
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}

type NavTuple = readonly [string, string, typeof Settings2];

function SidebarGroup({
  categoryLabel,
  defaultOpen,
  links,
}: {
  categoryLabel: string;
  defaultOpen: boolean;
  links: readonly NavTuple[];
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="space-y-0.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-10 w-full items-center justify-between rounded-lg px-3 text-[14px] font-medium leading-5 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
      >
        <span>{categoryLabel}</span>
        {open ? (
          <ChevronDown size={12} className="text-slate-400" />
        ) : (
          <ChevronRight size={12} className="text-slate-400" />
        )}
      </button>

      {open && (
        <div className="space-y-0.5 pl-1">
          {links.map(([to, text, Icon]) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }: NavLinkRenderProps) =>
                cn(
                  "flex min-h-10 items-center gap-3 rounded-lg px-3 text-[14px] font-medium leading-5 transition-colors",
                  isActive
                    ? "bg-brand-600 text-white font-semibold shadow-xs"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white",
                )
              }
            >
              <Icon size={14} className="shrink-0" />
              <span className="truncate">{text}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

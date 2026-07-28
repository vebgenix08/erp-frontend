import {
  BadgeIndianRupee,
  Bell,
  Building2,
  CalendarDays,
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
  Settings2,
  ShieldCheck,
  UserRoundCog,
  UserRoundCheck,
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../shared/ui/tooltip";

export function TenantLayout() {
  return (
    <SelectedCampusProvider>
      <SelectedAcademicYearProvider>
        <TenantWorkspace />
      </SelectedAcademicYearProvider>
    </SelectedCampusProvider>
  );
}

function TenantWorkspace() {
  const { session, clearSession } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [institutionName, setInstitutionName] = useState<string | null>(null);
  const [institutionLogo, setInstitutionLogo] = useState<string | null>(null);
  const [registryName, setRegistryName] = useState<string | null>(null);

  useEffect(() => setMobileOpen(false), [location.pathname]);

  useEffect(() => {
    let active = true;
    void getInstitutionProfile()
      .then(async (profile) => {
        if (!active) return;
        setInstitutionName(profile?.name ?? null);
        const logo = profile?.logoFileId
          ? await getFileDownloadUrl(profile.logoFileId)
          : profile?.logoUrl ?? null;
        if (active) setInstitutionLogo(logo);
      })
      .catch(() => {
        if (active) setInstitutionName(null);
      });
    return () => { active = false; };
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
    return () => { active = false; };
  }, [session?.selectedTenant?.tenantId, session?.tenant?.tenantId]);

  const dashboardLink = ["/admin/dashboard", "Dashboard", LayoutDashboard] as const;

  const setupLinks = [
    ["/admin/setup/campuses", "Campuses", Building2],
    ["/admin/setup/academic-years", "Academic Years", CalendarDays],
    ["/admin/setup/academic-structure", "Academic Structure", GraduationCap],
    ["/admin/academics/teaching-assignments", "Teaching Assignments", UserRoundCheck],
  ] as const;

  const administrationLinks = [
    ["/admin/setup/readiness", "Setup Readiness", ClipboardCheck],
    ["/admin/setup/numbering", "Numbering", Hash],
    ["/admin/setup/templates", "Templates", FileText],
    ["/admin/setup/notifications", "Notifications", Bell],
  ] as const;

  const financeLinks = [
    ["/admin/finance/dashboard", "Finance Dashboard", BadgeIndianRupee],
    ["/admin/finance/setup", "Finance Setup", Settings2],
    ["/admin/finance/collections", "Collections", BadgeIndianRupee],
    ["/admin/finance/general-charges", "Additional Fees", FileText],
    ["/admin/finance/outstanding", "Outstanding Fees", FileSearch],
    ["/admin/finance/receipts", "Receipts", FileText],
    ["/admin/finance/receipt-template", "Receipt Template", FileText],
    ["/admin/finance/reconciliation", "Reconciliation", RefreshCw],
  ] as const;

  const peopleLinks = [
    ["/admin/staff", "Staff Directory", UsersRound],
    ["/admin/students", "Students Directory", GraduationCap],
    ["/admin/student-documents", "Certificates & ID Cards", FileText],
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

  const tenantLabel =
    institutionName ??
    registryName ??
    getSessionTenantLabel(session?.selectedTenant ?? session?.tenant ?? null);

  const userEmail = session?.user.email ?? "Admin";
  const userInitial = userEmail.slice(0, 1).toUpperCase();

  return (
    <TooltipProvider>
      <div className="flex h-screen w-full overflow-hidden bg-slate-50">
        {/* Mobile scrim */}
        {mobileOpen && (
          <button
            className="fixed inset-0 z-30 bg-slate-900/60 backdrop-blur-xs md:hidden"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Clean Slate 900 Dark Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 flex w-56 flex-col bg-[#0f172a] text-slate-300 shadow-xl transition-transform duration-200 border-r border-slate-800",
            "md:relative md:translate-x-0",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          {/* Brand header */}
          <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-slate-800/80 bg-[#0b1329]/50">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white text-brand-600 shadow-xs">
              {institutionLogo?<img src={institutionLogo} alt={`${tenantLabel} logo`} className="h-full w-full object-contain p-0.5"/>:<GraduationCap size={18}/>}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-white leading-tight">{tenantLabel}</p>
              <p className="truncate text-[10px] font-medium text-slate-400">Enterprise ERP</p>
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
                    "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors",
                    isActive
                      ? "bg-brand-600 text-white font-bold shadow-xs"
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
              <SidebarGroup categoryLabel="Admissions" links={admissionsLinks} defaultOpen={location.pathname.startsWith("/admin/admissions")} />

              <SidebarGroup
                categoryLabel="Students & staff"
                links={peopleLinks}
                defaultOpen={location.pathname.startsWith("/admin/staff") || location.pathname.startsWith("/admin/students")}
              />

              <SidebarGroup
                categoryLabel="Academic setup"
                links={setupLinks}
                defaultOpen={location.pathname.startsWith("/admin/setup/campuses") || location.pathname.startsWith("/admin/setup/academic")}
              />

              <SidebarGroup categoryLabel="Finance" links={financeLinks} defaultOpen={location.pathname.startsWith("/admin/finance")} />

              <SidebarGroup categoryLabel="Administration" links={administrationLinks} defaultOpen={location.pathname.startsWith("/admin/setup/readiness") || location.pathname.startsWith("/admin/setup/numbering") || location.pathname.startsWith("/admin/setup/templates") || location.pathname.startsWith("/admin/setup/notifications")} />

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
                <p className="truncate text-xs font-bold text-white leading-none">Tenant Admin</p>
                <p className="truncate text-[10px] text-slate-400 font-mono mt-0.5">{userEmail}</p>
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
          {/* Topbar Header */}
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 z-20 gap-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <button
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 md:hidden"
                aria-label="Open navigation"
                onClick={() => setMobileOpen(true)}
              >
                <Menu size={19} />
              </button>

              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500 truncate">{tenantLabel}</p>
                <p className="text-sm font-bold text-slate-900 truncate">Enterprise Administration</p>
              </div>
            </div>

            {/* Right Side Tools: Campus & Academic Year Controls */}
            <div className="flex shrink-0 items-center gap-3">
              <OperatingContextControls />

              <button
                type="button"
                className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
                aria-label="Notifications"
              >
                <Bell size={16} />
              </button>

              <NavLink
                to="/admin/profile"
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-1 text-xs font-bold hover:bg-white hover:border-slate-300 transition-colors"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded bg-brand-600 text-white font-extrabold text-[11px]">
                  {institutionLogo?<img src={institutionLogo} alt="" className="h-full w-full bg-white object-contain"/>:tenantLabel.slice(0, 1).toUpperCase()}
                </span>
                <span className="hidden md:inline text-slate-800">{tenantLabel}</span>
              </NavLink>
            </div>
          </header>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-5 md:p-6">
            <Outlet />
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
        className="flex w-full items-center justify-between px-3 py-1 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
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
                  "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors",
                  isActive
                    ? "bg-brand-600 text-white font-bold shadow-xs"
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

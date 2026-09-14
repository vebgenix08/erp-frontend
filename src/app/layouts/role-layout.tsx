import {
  BadgeIndianRupee,
  ClipboardCheck,
  FileSearch,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  RefreshCw,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  NavLink,
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
  type NavLinkRenderProps,
} from "react-router-dom";
import { useSession } from "../../features/session/model/session-provider";
import { getSessionDashboardPath } from "../../features/session/api/session.api";
import { SelectedAcademicYearProvider } from "../../features/tenant-settings/model/selected-academic-year-provider";
import { SelectedCampusProvider } from "../../features/tenant-settings/model/selected-campus-provider";
import { useInstitutionBranding } from "../../features/tenant-settings/model/use-institution-branding";
import { useMemberProfilePhoto } from "../../features/session/model/use-member-profile-photo";
import { OperatingContextControls } from "./operating-context-controls";
import { cn } from "../../shared/ui/utils";
import { Avatar, AvatarFallback, AvatarImage } from "../../shared/ui/avatar";
import { Button } from "../../shared/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../shared/ui/tooltip";
import { RouteContentBoundary } from "../../shared/ui/route-content-boundary";

const portalDefinitions = {
  accountant: {
    label: "Accountant",
    color: "bg-violet-600",
    accentOpen: "bg-violet-50 text-violet-700",
    accentFallback: "bg-violet-100 text-violet-700",
    links: [
      ["/accountant/dashboard", "Dashboard", LayoutDashboard],
      ["/accountant/collections", "Collections", BadgeIndianRupee],
      ["/accountant/outstanding", "Outstanding Fees", FileSearch],
      ["/accountant/receipts", "Receipts", FileText],
      ["/accountant/reconciliation", "Reconciliation", RefreshCw],
    ],
  },
  admissions: {
    label: "Admission Officer",
    color: "bg-sky-600",
    accentOpen: "bg-sky-50 text-sky-700",
    accentFallback: "bg-sky-100 text-sky-700",
    links: [
      ["/admissions/dashboard", "Dashboard", LayoutDashboard],
      ["/admissions/enquiries", "Enquiries", FileSearch],
      ["/admissions/applications", "Applications", ClipboardCheck],
    ],
  },
  student: {
    label: "Student",
    color: "bg-blue-600",
    accentOpen: "bg-blue-50 text-blue-700",
    accentFallback: "bg-blue-100 text-blue-700",
    links: [["/student/dashboard", "Dashboard", LayoutDashboard]],
  },
  parent: {
    label: "Parent",
    color: "bg-pink-600",
    accentOpen: "bg-pink-50 text-pink-700",
    accentFallback: "bg-pink-100 text-pink-700",
    links: [["/parent/dashboard", "Dashboard", LayoutDashboard]],
  },
  library: {
    label: "Librarian",
    color: "bg-amber-600",
    accentOpen: "bg-amber-50 text-amber-700",
    accentFallback: "bg-amber-100 text-amber-700",
    links: [["/library/dashboard", "Dashboard", LayoutDashboard]],
  },
  transport: {
    label: "Transport Manager",
    color: "bg-orange-600",
    accentOpen: "bg-orange-50 text-orange-700",
    accentFallback: "bg-orange-100 text-orange-700",
    links: [["/transport/dashboard", "Dashboard", LayoutDashboard]],
  },
  hostel: {
    label: "Hostel Warden",
    color: "bg-rose-600",
    accentOpen: "bg-rose-50 text-rose-700",
    accentFallback: "bg-rose-100 text-rose-700",
    links: [["/hostel/dashboard", "Dashboard", LayoutDashboard]],
  },
  exams: {
    label: "Exam Coordinator",
    color: "bg-purple-600",
    accentOpen: "bg-purple-50 text-purple-700",
    accentFallback: "bg-purple-100 text-purple-700",
    links: [["/exams/dashboard", "Dashboard", LayoutDashboard]],
  },
  hr: {
    label: "HR Manager",
    color: "bg-fuchsia-600",
    accentOpen: "bg-fuchsia-50 text-fuchsia-700",
    accentFallback: "bg-fuchsia-100 text-fuchsia-700",
    links: [["/hr/dashboard", "Dashboard", LayoutDashboard]],
  },
} as const;

export function RoleLayout() {
  return (
    <SelectedCampusProvider>
      <SelectedAcademicYearProvider>
        <RoleWorkspace />
      </SelectedAcademicYearProvider>
    </SelectedCampusProvider>
  );
}

function RoleWorkspace() {
  const { session, clearSession } = useSession();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const tenantId = session?.selectedTenant?.tenantId ?? session?.tenant?.tenantId;
  const { name: institutionName, logoUrl: institutionLogo } = useInstitutionBranding(tenantId);
  const memberPhoto = useMemberProfilePhoto(session?.user.profilePhotoFileId);
  useEffect(() => setMobileOpen(false), [location.pathname]);

  const prefix = location.pathname.split("/")[1] as keyof typeof portalDefinitions;
  const portal = portalDefinitions[prefix] ?? portalDefinitions.accountant;
  const requiredRole: Partial<Record<keyof typeof portalDefinitions, string>> = {
    accountant: "ACCOUNTANT",
    admissions: "ADMISSION_OFFICER",
    student: "STUDENT",
    parent: "PARENT",
    library: "LIBRARIAN",
    transport: "TRANSPORT_MANAGER",
    hostel: "HOSTEL_WARDEN",
    exams: "EXAM_COORDINATOR",
    hr: "HR_MANAGER",
  };
  if (session?.user.role?.trim().toUpperCase() !== requiredRole[prefix]) {
    return <Navigate to={getSessionDashboardPath(session)} replace />;
  }
  const active = portal.links.find(([to]) => location.pathname.startsWith(to));

  return (
    <TooltipProvider>
      <div className="flex h-screen w-full overflow-hidden bg-slate-50">
        {/* Mobile scrim */}
        {mobileOpen && (
          <button
            className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200 bg-white shadow-sm transition-transform duration-300",
            "md:relative md:translate-x-0",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          {/* Brand */}
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded text-white shadow-sm",
                portal.color,
              )}
            >
              {institutionLogo ? (
                <img
                  src={institutionLogo}
                  alt={`${institutionName ?? "Institution"} logo`}
                  className="h-full w-full bg-white object-contain p-0.5"
                />
              ) : (
                <GraduationCap size={18} />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-bold text-slate-900">
                {institutionName ?? session?.tenant?.displayName ?? "Vebgenix ERP"}
              </p>
              <p className="truncate text-sm text-slate-500">{portal.label} workspace</p>
            </div>
            <button
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 md:hidden"
              aria-label="Close navigation"
              onClick={() => setMobileOpen(false)}
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-3.5">
            <div className="space-y-0.5">
              {portal.links.map(([to, label, Icon]) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }: NavLinkRenderProps) =>
                    cn(
                      "flex min-h-10 items-center gap-3 rounded-lg px-3 text-[14px] font-medium leading-5 transition-colors",
                      isActive
                        ? cn(portal.accentOpen, "font-semibold")
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                    )
                  }
                >
                  <Icon size={19} className="shrink-0" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          </nav>

          {/* User section */}
          <div className="border-t border-slate-100 p-3">
            <div className="flex items-center gap-2 rounded-md px-2 py-2">
              <Avatar className="h-8 w-8 shrink-0">
                {memberPhoto ? (
                  <AvatarImage
                    src={memberPhoto}
                    alt={`${session?.user.email ?? portal.label} profile`}
                  />
                ) : null}
                <AvatarFallback className={cn("text-xs", portal.accentFallback)}>
                  {session?.user.email?.slice(0, 1).toUpperCase() ?? "U"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-900">{portal.label}</p>
                <p className="truncate text-xs text-slate-500">{session?.user.email}</p>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Sign out"
                    onClick={() => {
                      clearSession();
                      navigate("/login", { replace: true });
                    }}
                  >
                    <LogOut size={15} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Sign out</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Topbar */}
          <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 shadow-sm">
            <button
              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 md:hidden"
              aria-label="Open navigation"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-400">{portal.label}</p>
              <h1 className="text-base font-semibold text-slate-900 leading-tight">
                {active?.[1] ?? "Workspace"}
              </h1>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <OperatingContextControls />
              <Avatar className="h-8 w-8 shrink-0">
                {memberPhoto ? (
                  <AvatarImage
                    src={memberPhoto}
                    alt={`${session?.user.fullName ?? session?.user.email ?? "Member"} profile`}
                  />
                ) : null}
                <AvatarFallback>
                  {session?.user.email?.slice(0, 1).toUpperCase() ?? "U"}
                </AvatarFallback>
              </Avatar>
            </div>
          </header>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5">
            <RouteContentBoundary resetKey={`${location.pathname}${location.search}`}>
              <Outlet />
            </RouteContentBoundary>
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}

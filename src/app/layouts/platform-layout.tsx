import {
  Activity,
  Building2,
  ChevronRight,
  Cloud,
  Flag,
  GraduationCap,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  PackageCheck,
  ScrollText,
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
import { useSession } from "../../features/session/model/session-provider";
import { cn } from "../../shared/ui/utils";
import { Avatar, AvatarFallback } from "../../shared/ui/avatar";
import { Button } from "../../shared/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../shared/ui/tooltip";
import { RouteContentBoundary } from "../../shared/ui/route-content-boundary";

export function PlatformLayout() {
  const { session, clearSession } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => setMobileOpen(false), [location.pathname]);

  const links = [
    ["/platform/dashboard", "Dashboard", LayoutDashboard],
    ["/platform/tenants", "Tenants", Building2],
    ["/platform/audit-logs", "Audit logs", ScrollText],
    ["/platform/features", "Features", Flag],
    ["/platform/entitlements", "Entitlements", PackageCheck],
    ["/platform/integrations", "Integrations", Cloud],
    ["/platform/operations", "Operations", Activity],
  ] as const;

  const activeLabel = links.find(([to]) => location.pathname.startsWith(to))?.[1] ?? "Console";

  return (
    <TooltipProvider>
      <div className="flex h-screen w-full overflow-hidden bg-slate-100">
        {/* Mobile scrim */}
        {mobileOpen && (
          <button
            className="fixed inset-0 z-30 bg-slate-900/50 md:hidden"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-300 bg-slate-900 text-slate-100 transition-transform duration-200",
            "md:relative md:translate-x-0",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          {/* Brand */}
          <div className="flex items-center gap-3 border-b border-slate-800 bg-slate-950 px-5 py-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-accent-600 text-white font-bold">
              <GraduationCap size={21} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-bold text-white leading-tight">Vebgenix ERP</p>
              <p className="mt-0.5 truncate text-xs font-semibold uppercase tracking-wide text-slate-400">
                Platform Console
              </p>
            </div>
            <button
              className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white md:hidden"
              aria-label="Close navigation"
              onClick={() => setMobileOpen(false)}
            >
              <X size={16} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1.5 overflow-y-auto p-3">
            <p className="mb-2 px-3 pt-2 text-[14px] font-semibold text-slate-300">
              Platform Controls
            </p>
            <div className="space-y-0.5">
              {links.map(([to, label, Icon]) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }: NavLinkRenderProps) =>
                    cn(
                      "flex min-h-10 items-center gap-3 rounded-lg px-3 text-[14px] font-medium leading-5 transition-colors",
                      isActive
                        ? "bg-accent-600 text-white font-semibold"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white",
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
          <div className="border-t border-slate-800 bg-slate-950 p-2.5">
            <div className="flex items-center gap-2 rounded px-2 py-1.5 border border-slate-800 bg-slate-900/60">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarFallback className="bg-slate-800 text-white text-xs font-bold">
                  {session?.user.email?.slice(0, 1).toUpperCase() ?? "A"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white">Super Admin</p>
                <p className="truncate text-[10px] text-slate-400 font-mono">
                  {session?.user.email ?? "Platform administrator"}
                </p>
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

        {/* Main */}
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Topbar with Breadcrumbs */}
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-300 bg-white px-6 z-20">
            <div className="flex items-center gap-3 min-w-0">
              <button
                className="rounded p-1 text-slate-600 hover:bg-slate-100 md:hidden"
                aria-label="Open navigation"
                onClick={() => setMobileOpen(true)}
              >
                <Menu size={18} />
              </button>

              {/* Breadcrumbs */}
              <nav
                aria-label="Breadcrumb"
                className="flex items-center gap-1.5 text-xs text-slate-500 font-medium truncate"
              >
                <Home size={14} className="text-slate-400 shrink-0" />
                <ChevronRight size={12} className="text-slate-300 shrink-0" />
                <span className="font-semibold text-slate-600">Platform Control</span>
                <ChevronRight size={12} className="text-slate-300 shrink-0" />
                <span className="font-bold text-slate-900 truncate">{activeLabel}</span>
              </nav>
            </div>

            <span className="hidden shrink-0 rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 uppercase tracking-wider sm:inline-flex">
              Development Environment
            </span>
          </header>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-5">
            <RouteContentBoundary resetKey={`${location.pathname}${location.search}`}>
              <Outlet />
            </RouteContentBoundary>
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}

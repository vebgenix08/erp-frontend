import {
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Layers,
  Receipt,
  RefreshCw,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserPlus,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getTenantAdminDashboard } from "../api/settings.api";
import type { TenantAdminDashboard } from "../model/settings.types";
import { useSelectedAcademicYear } from "../model/selected-academic-year-provider";
import { useSelectedCampus } from "../model/selected-campus-provider";
import { PaymentMethodsBreakdown, SvgBarChart, SvgLineChart } from "./dashboard-charts";
import { Badge } from "../../../shared/ui/badge";
import { Button } from "../../../shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../shared/ui/card";
import { EmptyState, ErrorState, LoadingState } from "../../../shared/ui/page-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../shared/ui/table";
import { cn } from "../../../shared/ui/utils";

const money = (minor: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(minor / 100);

export function OperationalAdminDashboard() {
  const { selectedCampus } = useSelectedCampus();
  const { selectedAcademicYear } = useSelectedAcademicYear();

  const [data, setData] = useState<TenantAdminDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(() => {
    if (!selectedCampus || !selectedAcademicYear) return;
    setRefreshing(true);
    setError(null);

    getTenantAdminDashboard({
      campusId: selectedCampus.id,
      academicYearId: selectedAcademicYear.id,
    })
      .then((dash) => {
        setData(dash);
      })
      .catch((value) =>
        setError(value instanceof Error ? value.message : "Unable to load operational dashboard"),
      )
      .finally(() => setRefreshing(false));
  }, [selectedAcademicYear, selectedCampus]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const studentsByClassData = useMemo(() => {
    const colors = [
      "#3b82f6",
      "#10b981",
      "#f59e0b",
      "#8b5cf6",
      "#06b6d4",
      "#ec4899",
      "#6366f1",
      "#14b8a6",
      "#f97316",
    ];
    return (data?.studentClassDistribution ?? []).map((item, idx) => ({
      label: item.label,
      value: item.count,
      color: colors[idx % colors.length]!,
    }));
  }, [data]);

  if (!selectedCampus || !selectedAcademicYear) {
    return (
      <EmptyState
        title="Select campus and academic year"
        description="The operational dashboard follows the context selected in the top bar."
      />
    );
  }

  if (error && !data) return <ErrorState message={error} retry={loadData} />;
  if (!data) return <LoadingState label="Loading live operational control center..." />;

  // Total exception count
  const totalExceptions =
    data.studentsMissingFeeOrders +
    data.unpaidStudents +
    data.studentsMissingSections +
    data.failedStaffInvites +
    data.failedFinanceEvents +
    data.failedAdmissionEvents;

  // 10 Sleek RO-Style Top Stat Cards
  const kpiCards = [
    {
      title: "Active Students",
      value: data.activeStudents.toLocaleString("en-IN"),
      subtext: `${selectedCampus.name} enrolled`,
      badge: "Enrolled",
      badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
      icon: GraduationCap,
      iconClass: "text-blue-600 bg-blue-50 border-blue-200",
      to: "/admin/students",
    },
    {
      title: "Active Staff & Faculty",
      value: data.activeStaff.toLocaleString("en-IN"),
      subtext: "Teaching & operations staff",
      badge: "Active",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: UsersRound,
      iconClass: "text-emerald-600 bg-emerald-50 border-emerald-200",
      to: "/admin/staff",
    },
    {
      title: "Today's Fee Collection",
      value: money(data.collectedTodayMinor),
      subtext: `${data.paymentsToday} valid payments today`,
      badge: "Real-time",
      badgeClass: "bg-teal-50 text-teal-700 border-teal-200",
      icon: Banknote,
      iconClass: "text-teal-600 bg-teal-50 border-teal-200",
      to: "/admin/finance/collections",
    },
    {
      title: "Outstanding Balance",
      value: money(data.outstandingMinor),
      subtext: `${data.unpaidStudents} students with dues`,
      badge: "Collectible",
      badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
      icon: ShieldAlert,
      iconClass: "text-rose-600 bg-rose-50 border-rose-200",
      to: "/admin/finance/outstanding",
    },
    {
      title: "New Enquiries Today",
      value: data.enquiriesToday.toLocaleString("en-IN"),
      subtext: `${data.pendingEnquiryFollowUps} follow-ups pending`,
      badge: "Intake Leads",
      badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
      icon: UserPlus,
      iconClass: "text-amber-600 bg-amber-50 border-amber-200",
      to: "/admin/admissions/enquiries",
    },
    {
      title: "Pending Applications",
      value: data.applicationsAwaitingAction.toLocaleString("en-IN"),
      subtext: "Awaiting review or action",
      badge: "Review Needed",
      badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
      icon: ClipboardCheck,
      iconClass: "text-indigo-600 bg-indigo-50 border-indigo-200",
      to: "/admin/admissions/applications",
    },
    {
      title: "Confirmed Admissions",
      value: data.admissionsConfirmed.toLocaleString("en-IN"),
      subtext: "Confirmed in active session",
      badge: "Intake",
      badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
      icon: UserRound,
      iconClass: "text-purple-600 bg-purple-50 border-purple-200",
      to: "/admin/admissions/admitted-students",
    },
    {
      title: "Missing Section Links",
      value: data.studentsMissingSections.toLocaleString("en-IN"),
      subtext: "Enrolled without section",
      badge: "Unassigned",
      badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
      icon: UserCheck,
      iconClass: "text-sky-600 bg-sky-50 border-sky-200",
      to: "/admin/students",
    },
    {
      title: "Actionable Exceptions",
      value: totalExceptions.toLocaleString("en-IN"),
      subtext: `${data.openWorkItems} setup/workflow · ${data.unpaidStudents} unpaid`,
      badge: totalExceptions > 0 ? "Attention" : "Clean",
      badgeClass:
        totalExceptions > 0
          ? "bg-rose-50 text-rose-700 border-rose-200"
          : "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: AlertTriangle,
      iconClass:
        totalExceptions > 0
          ? "text-rose-600 bg-rose-50 border-rose-200"
          : "text-emerald-600 bg-emerald-50 border-emerald-200",
      to: "/admin/finance/reconciliation",
    },
  ];

  const collectionLabels = data.collectionTrend.map((item) => item.label);
  const collectionSeries = [
    {
      name: "Collection (₹)",
      color: "#2563eb",
      values: data.collectionTrend.map((item) => item.value / 100),
    },
  ];
  const hasCollectionTrend = data.collectionTrend.some((item) => item.value > 0);
  const failedOperationalEvents = data.failedFinanceEvents + data.failedAdmissionEvents;
  const paymentMethodChartItems = data.collectionByPaymentMethod
    .filter((item) => item.amountMinor > 0)
    .map((item) => ({
      label: item.method.replaceAll("_", " "),
      value: item.amountMinor / 100,
      color: "#1d4ed8",
    }));

  return (
    <section className="space-y-5 pb-10">
      {/* 1. CLEAN HEADER TOOLBAR ACTION BAR */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Daily Operational Control Center
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {selectedCampus.name} · {selectedAcademicYear.name} ({selectedAcademicYear.code})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Refresh Action */}
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={refreshing}
            className="h-8 text-xs font-bold gap-1.5"
          >
            <RefreshCw size={13} className={cn(refreshing && "animate-spin")} />
            Refresh Data
          </Button>

          {/* Export Action */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="h-8 text-xs font-bold gap-1.5"
          >
            <Download size={13} /> Print / Export PDF
          </Button>
        </div>
      </header>

      {/* 2. 10 SLEEK RO-STYLE KPI CARDS GRID */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          const CardInner = (
            <Card className="h-full border border-slate-200/90 bg-white p-3.5 hover:border-brand-400 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-150">
              <div className="flex items-start justify-between">
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl border",
                    card.iconClass,
                  )}
                >
                  <Icon size={18} />
                </span>
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10px] font-bold",
                    card.badgeClass,
                  )}
                >
                  {card.badge}
                </span>
              </div>

              <div className="mt-2.5">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                  {card.title}
                </p>
                <p className="text-xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                  {card.value}
                </p>
              </div>

              <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-1.5 text-[10px] text-slate-400 font-medium">
                <span className="truncate">{card.subtext}</span>
                <ArrowUpRight size={12} className="text-slate-400 shrink-0" />
              </div>
            </Card>
          );

          return (
            <Link key={card.title} to={card.to} className="block transition-all">
              {CardInner}
            </Link>
          );
        })}
      </div>

      {/* 3. ROW 2: 3 UPGRADED CORE CHARTS & REALIZATION CARDS */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Card 1: Today's Operational Realization Hub */}
        <Card className="lg:col-span-4 p-0 overflow-hidden border border-slate-200/90 shadow-xs bg-white">
          <CardHeader className="p-3.5 pb-2.5 border-b border-slate-100 flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xs font-bold text-slate-900">
                Today's Operational Realization
              </CardTitle>
              <p className="text-[11px] text-slate-500 font-medium">
                Live activity recorded across intake channels
              </p>
            </div>
            <Badge variant="secondary" className="text-[10px] font-bold">
              Real-Time
            </Badge>
          </CardHeader>
          <CardContent className="p-3.5 space-y-3">
            {/* 3 Clickable Lead Metric Tiles */}
            <div className="grid grid-cols-3 gap-2">
              <Link
                to="/admin/admissions/enquiries"
                className="rounded-xl border border-blue-100 bg-blue-50/50 p-2.5 text-center hover:bg-blue-50 transition-all hover:scale-[1.02]"
              >
                <div className="flex justify-center mb-1">
                  <UserPlus size={15} className="text-blue-600" />
                </div>
                <p className="text-lg font-extrabold text-slate-900">
                  {data.enquiriesToday.toLocaleString("en-IN")}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-0.5">
                  Enquiries
                </p>
              </Link>
              <Link
                to="/admin/admissions/enquiries"
                className="rounded-xl border border-amber-100 bg-amber-50/50 p-2.5 text-center hover:bg-amber-50 transition-all hover:scale-[1.02]"
              >
                <div className="flex justify-center mb-1">
                  <Clock size={15} className="text-amber-600" />
                </div>
                <p className="text-lg font-extrabold text-slate-900">
                  {data.pendingEnquiryFollowUps.toLocaleString("en-IN")}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-0.5">
                  Follow-ups
                </p>
              </Link>
              <Link
                to="/admin/admissions/applications"
                className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-2.5 text-center hover:bg-emerald-50 transition-all hover:scale-[1.02]"
              >
                <div className="flex justify-center mb-1">
                  <FileText size={15} className="text-emerald-600" />
                </div>
                <p className="text-lg font-extrabold text-slate-900">
                  {data.applicationsSubmittedToday.toLocaleString("en-IN")}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-0.5">
                  Applications
                </p>
              </Link>
            </div>

            {/* Quick Action Footer */}
            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
              <Link
                to="/admin/admissions/enquiries"
                className="text-[11px] font-bold text-brand-600 hover:underline flex items-center gap-0.5"
              >
                + Register Enquiry <ChevronRight size={12} />
              </Link>
              <Link
                to="/admin/admissions/applications"
                className="text-[11px] font-bold text-slate-600 hover:text-slate-900 hover:underline flex items-center gap-0.5"
              >
                Review Queue <ChevronRight size={12} />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Fee Collection Velocity Trend */}
        <Card className="lg:col-span-4 p-0 overflow-hidden border border-slate-200/90 shadow-xs bg-white">
          <CardHeader className="p-3.5 pb-2.5 border-b border-slate-100 flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xs font-bold text-slate-900">
                Fee Collection Velocity
              </CardTitle>
              <p className="text-[11px] text-slate-500 font-medium">
                Daily realization trends in INR
              </p>
            </div>
            <Badge variant="secondary" className="text-[10px] font-bold">
              {data.paymentsToday} payments today
            </Badge>
          </CardHeader>
          <CardContent className="p-3.5 space-y-2.5">
            {hasCollectionTrend ? (
              <SvgLineChart
                labels={collectionLabels}
                series={collectionSeries}
                height={145}
                unit="₹"
              />
            ) : (
              <div className="flex h-36 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
                No fee collections recorded for this period.
              </div>
            )}

            {/* 3-Column Velocity Summary Ribbon */}
            <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-2 text-center">
              <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                <p className="text-[9px] font-bold uppercase text-slate-400">Today's Realized</p>
                <p className="text-xs font-extrabold text-emerald-700 mt-0.5">
                  {money(data.collectedTodayMinor)}
                </p>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                <p className="text-[9px] font-bold uppercase text-slate-400">Pending Dues</p>
                <p className="text-xs font-extrabold text-rose-700 mt-0.5">
                  {money(data.outstandingMinor)}
                </p>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                <p className="text-[9px] font-bold uppercase text-slate-400">Active Receipts</p>
                <p className="text-xs font-extrabold text-brand-700 mt-0.5">{data.paymentsToday}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Enrolment by Class & Grade Distribution Matrix */}
        <Card className="lg:col-span-4 p-0 overflow-hidden border border-slate-200/90 shadow-xs bg-white">
          <CardHeader className="p-3.5 pb-2.5 border-b border-slate-100 flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xs font-bold text-slate-900">Enrolment by Class</CardTitle>
              <p className="text-[11px] text-slate-500 font-medium">Live class-level enrolment</p>
            </div>
            <Badge
              variant="secondary"
              className="text-[10px] font-bold text-brand-700 bg-brand-50 border-brand-200"
            >
              {data.activeStudents} Enrolled
            </Badge>
          </CardHeader>
          <CardContent className="p-3.5 space-y-3">
            {/* 2. Top Grades Enrolment List (Clean 2-Column Grid) */}
            <div className="grid grid-cols-2 gap-1.5 pt-0.5">
              {studentsByClassData.slice(0, 6).map((item) => {
                const maxClassCount = Math.max(...studentsByClassData.map((c) => c.value), 1);
                const pct = ((item.value / maxClassCount) * 100).toFixed(0);
                const sharePct =
                  data.activeStudents > 0
                    ? ((item.value / data.activeStudents) * 100).toFixed(1)
                    : "0";

                return (
                  <div
                    key={item.label}
                    className="p-1.5 rounded-lg border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-all space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="font-bold text-slate-800 truncate">{item.label}</span>
                      </div>
                      <span className="font-extrabold text-slate-900 shrink-0">
                        {item.value}{" "}
                        <span className="text-[9px] text-slate-400 font-normal">({sharePct}%)</span>
                      </span>
                    </div>
                    <div className="h-1 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        style={{ width: `${pct}%`, backgroundColor: item.color }}
                        className="h-full rounded-full transition-all"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 3. Summary Footer */}
            <div className="border-t border-slate-100 pt-2 flex items-center justify-between text-[11px] text-slate-500">
              <span className="font-semibold">
                Avg: {(data.activeStudents / Math.max(1, studentsByClassData.length)).toFixed(1)} /
                class
              </span>
              <Link
                to="/admin/students"
                className="font-bold text-brand-600 hover:underline flex items-center gap-0.5"
              >
                View All {studentsByClassData.length} Classes <ChevronRight size={12} />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Card 5: Today's Collections & Payment Modes */}
        <Card className="p-0 overflow-hidden border border-slate-200/90 shadow-xs bg-white">
          <CardHeader className="p-3.5 pb-2.5 border-b border-slate-100 flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xs font-bold text-slate-900">
                Today's Collections & Modes
              </CardTitle>
              <p className="text-[11px] text-slate-500 font-medium">
                Real-time payment channel breakdown
              </p>
            </div>
            <Badge variant="secondary" className="text-[10px] font-bold">
              Live Channels
            </Badge>
          </CardHeader>
          <CardContent className="p-3.5 space-y-3 text-xs">
            {/* Real-time Collections vs Outstanding */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100 text-center space-y-0.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700">
                  Collected Today
                </span>
                <p className="text-lg font-extrabold text-emerald-800">
                  {money(data.collectedTodayMinor)}
                </p>
                <p className="text-[9px] text-emerald-600 font-medium">
                  {data.paymentsToday} payments received
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-rose-50/60 border border-rose-100 text-center space-y-0.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-rose-700">
                  Outstanding Balance
                </span>
                <p className="text-base font-extrabold text-rose-800">
                  {money(data.outstandingMinor)}
                </p>
                <p className="text-[9px] text-rose-600 font-medium">
                  {data.unpaidStudents} students with dues
                </p>
              </div>
            </div>

            {/* Stacked Payment Breakdown */}
            <PaymentMethodsBreakdown
              items={data.collectionByPaymentMethod}
              totalAmountMinor={data.collectedTodayMinor}
            />

            {/* Quick Action Link */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[11px]">
              <Link
                to="/admin/finance/collections"
                className="font-bold text-brand-600 hover:underline flex items-center gap-0.5"
              >
                + Record Payment <ChevronRight size={12} />
              </Link>
              <Link
                to="/admin/finance/outstanding"
                className="font-bold text-slate-600 hover:text-slate-900 hover:underline flex items-center gap-0.5"
              >
                Dues Register <ChevronRight size={12} />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Card 6: Operational Health & Compliance Center */}
        <Card className="p-0 overflow-hidden border border-slate-200/90 shadow-xs bg-white">
          <CardHeader className="p-3.5 pb-2.5 border-b border-slate-100 flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xs font-bold text-slate-900">Operational Health</CardTitle>
              <p className="text-[11px] text-slate-500 font-medium">
                Compliance & integrity metrics
              </p>
            </div>
            <ShieldCheck size={16} className="text-emerald-600" />
          </CardHeader>
          <CardContent className="p-3.5 space-y-2 text-xs">
            {/* Operational status derived from persisted workflow failures. */}
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-2.5 space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-800">Failed operational events</span>
                <span
                  className={cn(
                    "font-extrabold",
                    failedOperationalEvents > 0 ? "text-rose-700" : "text-emerald-700",
                  )}
                >
                  {failedOperationalEvents.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/* 4 Interactive Diagnostics */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50/80 border border-slate-100">
                <span className="flex items-center gap-2 font-semibold text-slate-700">
                  <GraduationCap size={14} className="text-blue-600" /> Active Students
                </span>
                <div className="flex items-center gap-1.5">
                  <strong className="text-slate-900 font-extrabold">{data.activeStudents}</strong>
                  <Badge variant="secondary" className="text-[9px] px-1 py-0 font-bold">Current</Badge>
                </div>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50/80 border border-slate-100">
                <span className="flex items-center gap-2 font-semibold text-slate-700">
                  <UsersRound size={14} className="text-emerald-600" /> Active Employees
                </span>
                <div className="flex items-center gap-1.5">
                  <strong className="text-slate-900 font-extrabold">{data.activeStaff}</strong>
                  <Badge variant="secondary" className="text-[9px] px-1 py-0 font-bold">Current</Badge>
                </div>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50/80 border border-slate-100">
                <span className="flex items-center gap-2 font-semibold text-slate-700">
                  <ClipboardCheck size={14} className="text-amber-600" /> Pending Applications
                </span>
                <div className="flex items-center gap-1.5">
                  <strong className="text-slate-900 font-extrabold">
                    {data.applicationsAwaitingAction}
                  </strong>
                  <Badge
                    variant={data.applicationsAwaitingAction > 0 ? "warning" : "success"}
                    className="text-[9px] px-1 py-0 font-bold"
                  >
                    {data.applicationsAwaitingAction > 0 ? "Review" : "Cleared"}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50/80 border border-slate-100">
                <span className="flex items-center gap-2 font-semibold text-slate-700">
                  <AlertTriangle size={14} className="text-rose-600" /> Open Exceptions
                </span>
                <div className="flex items-center gap-1.5">
                  <strong className="text-rose-700 font-extrabold">{totalExceptions}</strong>
                  <Badge
                    variant={totalExceptions > 0 ? "warning" : "success"}
                    className="text-[9px] px-1 py-0 font-bold"
                  >
                    {totalExceptions > 0 ? "Action" : "Clean"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Footer link */}
            <div className="border-t border-slate-100 pt-2 flex items-center justify-between text-[11px]">
              <Link
                to="/admin/finance/reconciliation"
                className="font-bold text-brand-600 hover:underline flex items-center gap-0.5"
              >
                Audit & Diagnostics <ChevronRight size={12} />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 5. ROW 4: ACTIONABLE EXCEPTIONS, OUTSTANDING CLASSES LEADERBOARD, AND SECURITY GOVERNANCE */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* 1. Actionable Exceptions & Priority Queue */}
        <Card className="p-0 overflow-hidden border border-slate-200/90 shadow-xs bg-white">
          <CardHeader className="p-3.5 pb-2.5 border-b border-slate-100 flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xs font-bold text-slate-900">
                Actionable Exceptions
              </CardTitle>
              <p className="text-[11px] text-slate-500 font-medium">
                Pending operational bottlenecks
              </p>
            </div>
            <Badge
              variant={totalExceptions > 0 ? "warning" : "success"}
              className="text-[10px] font-bold"
            >
              {totalExceptions} Total
            </Badge>
          </CardHeader>
          <CardContent className="space-y-2 p-3 text-xs">
            {[
              {
                label: "Students with unpaid balance",
                count: data.unpaidStudents,
                to: "/admin/finance/outstanding",
                icon: Banknote,
                badge: Number(data.unpaidStudents) > 0 ? "High Priority" : "Clean",
                badgeClass:
                  Number(data.unpaidStudents) > 0
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200",
                iconClass:
                  Number(data.unpaidStudents) > 0
                    ? "text-rose-600 bg-rose-50"
                    : "text-emerald-600 bg-emerald-50",
              },
              {
                label: "Students missing section links",
                count: data.studentsMissingSections,
                to: "/admin/students",
                icon: UsersRound,
                badge: Number(data.studentsMissingSections) > 0 ? "Action Needed" : "Clean",
                badgeClass:
                  Number(data.studentsMissingSections) > 0
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200",
                iconClass:
                  Number(data.studentsMissingSections) > 0
                    ? "text-amber-600 bg-amber-50"
                    : "text-emerald-600 bg-emerald-50",
              },
              {
                label: "Failed staff email invites",
                count: data.failedStaffInvites,
                to: "/admin/staff",
                icon: UserPlus,
                badge: Number(data.failedStaffInvites) > 0 ? "Resend Needed" : "Clean",
                badgeClass:
                  Number(data.failedStaffInvites) > 0
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200",
                iconClass:
                  Number(data.failedStaffInvites) > 0
                    ? "text-rose-600 bg-rose-50"
                    : "text-emerald-600 bg-emerald-50",
              },
              {
                label: "Students without fee orders",
                count: data.studentsMissingFeeOrders,
                to: "/admin/finance/reconciliation",
                icon: Receipt,
                badge: Number(data.studentsMissingFeeOrders) > 0 ? "Generate" : "Clean",
                badgeClass:
                  Number(data.studentsMissingFeeOrders) > 0
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-slate-50 text-slate-600 border-slate-200",
                iconClass: "text-slate-500 bg-slate-50",
              },
              {
                label: "Failed finance ledger events",
                count: data.failedFinanceEvents,
                to: "/admin/finance/reconciliation",
                icon: ShieldAlert,
                badge: Number(data.failedFinanceEvents) > 0 ? "Failed" : "Clean",
                badgeClass:
                  Number(data.failedFinanceEvents) > 0
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : "bg-slate-50 text-slate-600 border-slate-200",
                iconClass: "text-slate-500 bg-slate-50",
              },
              {
                label: "Failed admission intake events",
                count: data.failedAdmissionEvents,
                to: "/admin/admissions/applications",
                icon: ClipboardCheck,
                badge: Number(data.failedAdmissionEvents) > 0 ? "Review" : "Clean",
                badgeClass:
                  Number(data.failedAdmissionEvents) > 0
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : "bg-slate-50 text-slate-600 border-slate-200",
                iconClass: "text-slate-500 bg-slate-50",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-xl border transition-all hover:scale-[1.01]",
                    Number(item.count) > 0
                      ? "bg-white border-slate-200/90 shadow-xs hover:border-brand-300"
                      : "bg-slate-50/60 border-slate-100 text-slate-500 hover:bg-slate-50",
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200/60 shrink-0",
                        item.iconClass,
                      )}
                    >
                      <Icon size={14} />
                    </span>
                    <span
                      className={cn(
                        "text-[11px] font-semibold truncate",
                        Number(item.count) > 0 ? "text-slate-800" : "text-slate-500",
                      )}
                    >
                      {item.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-1.5">
                    <span
                      className={cn(
                        "text-xs font-extrabold",
                        Number(item.count) > 0 ? "text-slate-900" : "text-slate-400",
                      )}
                    >
                      {Number(item.count).toLocaleString("en-IN")}
                    </span>
                    <span
                      className={cn(
                        "text-[9px] font-bold px-1.5 py-0.5 rounded-full border",
                        item.badgeClass,
                      )}
                    >
                      {item.badge}
                    </span>
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        {/* 2. Top Outstanding Classes Leaderboard */}
        <Card className="p-0 overflow-hidden border border-slate-200/90 shadow-xs bg-white">
          <CardHeader className="p-3.5 pb-2.5 border-b border-slate-100 flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xs font-bold text-slate-900">
                Top Outstanding Classes
              </CardTitle>
              <p className="text-[11px] text-slate-500 font-medium">
                Ranked by collectible balance
              </p>
            </div>
            <Link
              to="/admin/finance/outstanding"
              className="text-[11px] font-bold text-brand-600 hover:underline flex items-center gap-0.5"
            >
              View All <ChevronRight size={12} />
            </Link>
          </CardHeader>
          <CardContent className="p-3 space-y-2">
            {data.topOutstandingClasses.length ? (
              data.topOutstandingClasses.map((item, idx) => {
                const maxVal = Math.max(
                  ...data.topOutstandingClasses.map((c) => c.outstandingMinor),
                  1,
                );
                const pct = ((item.outstandingMinor / maxVal) * 100).toFixed(0);
                return (
                  <div
                    key={item.classId}
                    className="p-2 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-all space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-extrabold border",
                            idx === 0
                              ? "bg-amber-100 text-amber-800 border-amber-200"
                              : idx === 1
                                ? "bg-slate-100 text-slate-700 border-slate-200"
                                : idx === 2
                                  ? "bg-orange-50 text-orange-700 border-orange-200"
                                  : "bg-slate-50 text-slate-500 border-slate-200",
                          )}
                        >
                          #{idx + 1}
                        </span>
                        <span className="text-xs font-extrabold text-slate-900">
                          {item.className}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          ({item.studentCount} students)
                        </span>
                      </div>
                      <span className="text-xs font-extrabold text-rose-700">
                        {money(item.outstandingMinor)}
                      </span>
                    </div>
                    {/* Relative progress bar */}
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        style={{ width: `${pct}%` }}
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          idx === 0 ? "bg-rose-500" : idx === 1 ? "bg-rose-400" : "bg-amber-400",
                        )}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <EmptyState
                title="No outstanding balances"
                description="No collectible class balances remain."
              />
            )}
          </CardContent>
        </Card>

        {/* 3. Access & Security Governance Log */}
        <Card className="p-0 overflow-hidden border border-slate-200/90 shadow-xs bg-white">
          <CardHeader className="p-3.5 pb-2.5 border-b border-slate-100 flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xs font-bold text-slate-900">
                Access & Security Changes
              </CardTitle>
              <p className="text-[11px] text-slate-500 font-medium">
                Recent role assignments & audit trail
              </p>
            </div>
            <Link
              to="/admin/access/roles"
              className="text-[11px] font-bold text-brand-600 hover:underline flex items-center gap-0.5"
            >
              Manage Access <ChevronRight size={12} />
            </Link>
          </CardHeader>
          <CardContent className="space-y-2 p-3">
            {data.recentSecurityChanges.length ? (
              data.recentSecurityChanges.map((item) => {
                const initials =
                  item.subject
                    .split(" ")
                    .slice(0, 2)
                    .map((w) => w[0])
                    .join("")
                    .toUpperCase() || "US";

                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-2.5 p-2 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-all text-xs"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 border border-indigo-200 text-[10px] font-extrabold text-indigo-700 shrink-0 mt-0.5">
                      {initials}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="font-bold text-slate-800 text-[11px] truncate flex items-center gap-1">
                          <Shield size={11} className="text-brand-600 shrink-0" />
                          {item.change}
                        </p>
                        <Badge
                          variant="success"
                          className="text-[9px] px-1 py-0 font-bold shrink-0"
                        >
                          {item.status}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-600 font-semibold truncate mt-0.5">
                        {item.subject}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                        <Clock size={10} className="text-slate-400" />
                        {new Date(item.occurredAt).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <EmptyState
                title="No recent access changes"
                description="Role and permission changes will appear here."
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* 6. COLLECTION BY PAYMENT METHOD BREAKDOWN (DUAL BAR & METHOD MATRIX) */}
      <Card className="p-0 overflow-hidden border border-slate-200/90 shadow-xs bg-white">
        <CardHeader className="p-3.5 pb-2.5 border-b border-slate-100 flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xs font-bold text-slate-900">
              Today's Collection by Payment Channel
            </CardTitle>
            <p className="text-[11px] text-slate-500 font-medium">
              Real-time payment channel comparison and transaction volume
            </p>
          </div>
          <Link
            to="/admin/finance/collections"
            className="text-[11px] font-bold text-brand-600 hover:underline flex items-center gap-0.5"
          >
            Open Collections <ChevronRight size={12} />
          </Link>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-center">
            {/* Left: SVG Bar Chart Comparison */}
            <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-slate-100 pb-4 lg:pb-0 lg:pr-6">
              <p className="text-[11px] font-bold text-slate-700 mb-2">Volume by Channel (₹)</p>
              {paymentMethodChartItems.length ? (
                <SvgBarChart items={paymentMethodChartItems} height={140} unit="₹" />
              ) : (
                <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 text-center text-xs font-semibold text-slate-500">
                  No payment-channel activity recorded today.
                </div>
              )}
            </div>

            {/* Right: Detailed Payment Mode Breakdown */}
            <div className="lg:col-span-7 space-y-2">
              <PaymentMethodsBreakdown
                items={data.collectionByPaymentMethod}
                totalAmountMinor={data.collectedTodayMinor}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 7. ROW 5: UPGRADED OPERATIONAL TABLES & RECENT ACTIVITY (12 COLS GRID) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Finance activity is intentionally sourced from the aggregated service response. */}
        <Card className="lg:col-span-6 p-0 overflow-hidden border border-slate-200/90 shadow-xs bg-white">
          <CardHeader className="p-3.5 pb-2.5 border-b border-slate-100 flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xs font-bold text-slate-900">
                Recent Finance Activity
              </CardTitle>
              <p className="text-[11px] text-slate-500 font-medium">
                Latest finance events for the selected context
              </p>
            </div>
            <Link
              to="/admin/finance/collections"
              className="text-[11px] font-bold text-brand-600 hover:underline flex items-center gap-0.5"
            >
              Finance Ledger <ChevronRight size={12} />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {data.recentActivity.some((item) => item.module === "FINANCE") ? (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-slate-50/50">
                    <TableHead className="py-2.5 text-[11px] font-bold text-slate-700">
                      Time
                    </TableHead>
                    <TableHead className="py-2.5 text-[11px] font-bold text-slate-700">
                      Activity
                    </TableHead>
                    <TableHead className="py-2.5 text-[11px] font-bold text-slate-700">
                      Subject
                    </TableHead>
                    <TableHead className="py-2.5 text-[11px] font-bold text-slate-700">
                      Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentActivity
                    .filter((item) => item.module === "FINANCE")
                    .slice(0, 5)
                    .map((item) => (
                      <TableRow
                        key={item.id}
                        className="text-xs hover:bg-slate-50/80 transition-colors"
                      >
                        <TableCell className="py-2.5 text-slate-500">
                          {new Date(item.occurredAt).toLocaleString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                        <TableCell className="py-2.5 font-bold text-slate-900">
                          {item.activity}
                        </TableCell>
                        <TableCell className="py-2.5 text-slate-600">{item.subject}</TableCell>
                        <TableCell className="py-2.5">
                          <Badge variant="secondary" className="text-[10px] font-bold">
                            {item.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState
                title="No finance activity recorded"
                description="Finance events for the selected campus and academic year will appear here."
              />
            )}
          </CardContent>
        </Card>

        {/* Live Operational & Audit Activity Stream (6 Cols) */}
        <Card className="lg:col-span-6 p-0 overflow-hidden border border-slate-200/90 shadow-xs bg-white">
          <CardHeader className="p-3.5 pb-2.5 border-b border-slate-100 flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xs font-bold text-slate-900">
                Recent Operational Activity
              </CardTitle>
              <p className="text-[11px] text-slate-500 font-medium">
                Real-time system transaction events
              </p>
            </div>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {data.recentActivity.length} recent events
            </span>
          </CardHeader>
          <CardContent className="p-0">
            {data.recentActivity.length ? (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-slate-50/50">
                    <TableHead className="py-2.5 text-[11px] font-bold text-slate-700">
                      Time
                    </TableHead>
                    <TableHead className="py-2.5 text-[11px] font-bold text-slate-700">
                      Activity Event
                    </TableHead>
                    <TableHead className="py-2.5 text-[11px] font-bold text-slate-700">
                      Subject
                    </TableHead>
                    <TableHead className="py-2.5 text-[11px] font-bold text-right text-slate-700">
                      Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentActivity.slice(0, 5).map((act, idx) => {
                    const isFee =
                      act.activity.toLowerCase().includes("fee") ||
                      act.activity.toLowerCase().includes("payment");
                    const isRole =
                      act.activity.toLowerCase().includes("role") ||
                      act.activity.toLowerCase().includes("access");
                    const isStaff =
                      act.activity.toLowerCase().includes("staff") ||
                      act.activity.toLowerCase().includes("faculty");

                    return (
                      <TableRow
                        key={`${act.module}-${act.id}-${idx}`}
                        className="text-xs hover:bg-slate-50/80 transition-colors"
                      >
                        <TableCell className="py-2.5 font-semibold text-slate-500 whitespace-nowrap text-[11px]">
                          <span className="flex items-center gap-1">
                            <Clock size={11} className="text-slate-400" />
                            {new Date(act.occurredAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </TableCell>
                        <TableCell className="py-2.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className={cn(
                                "flex h-6 w-6 items-center justify-center rounded-lg shrink-0",
                                isFee
                                  ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                                  : isRole
                                    ? "bg-indigo-50 text-indigo-600 border border-indigo-200"
                                    : isStaff
                                      ? "bg-purple-50 text-purple-600 border border-purple-200"
                                      : "bg-blue-50 text-blue-600 border border-blue-200",
                              )}
                            >
                              {isFee ? (
                                <Banknote size={12} />
                              ) : isRole ? (
                                <Shield size={12} />
                              ) : isStaff ? (
                                <UsersRound size={12} />
                              ) : (
                                <GraduationCap size={12} />
                              )}
                            </span>
                            <span className="font-bold text-slate-800 text-[11px] truncate">
                              {act.activity}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2.5 text-slate-600 font-semibold text-[11px] truncate max-w-[140px]">
                          {act.subject}
                        </TableCell>
                        <TableCell className="py-2.5 text-right">
                          <Badge
                            variant="success"
                            className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border-emerald-200"
                          >
                            {act.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <EmptyState
                title="No recent activity logged"
                description="Operational events (fee collections, user updates, attendance) will appear here."
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* 8. QUICK ACTIONS ROW */}
      <Card className="p-4 bg-slate-50/90 border-slate-200/90">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Layers size={14} className="text-brand-600" />
              Quick Administrative Actions
            </h3>
            <p className="text-[11px] text-slate-500">
              Direct shortcuts to essential operational tasks.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/admin/admissions/applications">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs font-bold gap-1.5 bg-white hover:bg-slate-50"
              >
                <UserPlus size={14} className="text-brand-600" /> Manage Applications
              </Button>
            </Link>
            <Link to="/admin/finance/collections">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs font-bold gap-1.5 bg-white hover:bg-slate-50"
              >
                <Banknote size={14} className="text-emerald-600" /> Collect Fee
              </Button>
            </Link>
            <Link to="/admin/staff/new">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs font-bold gap-1.5 bg-white hover:bg-slate-50"
              >
                <UsersRound size={14} className="text-purple-600" /> Invite Staff
              </Button>
            </Link>
            <Link to="/admin/finance/reconciliation">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs font-bold gap-1.5 bg-white hover:bg-slate-50"
              >
                <FileSpreadsheet size={14} className="text-amber-600" /> Reconciliation
              </Button>
            </Link>
            <Link to="/admin/setup/academic-structure">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs font-bold gap-1.5 bg-white hover:bg-slate-50"
              >
                <Settings size={14} className="text-slate-600" /> Academic Setup
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </section>
  );
}

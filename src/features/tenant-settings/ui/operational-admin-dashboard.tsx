import {
  AlertTriangle,
  Banknote,
  ClipboardCheck,
  Download,
  FileSpreadsheet,
  GraduationCap,
  RefreshCw,
  ShieldAlert,
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
import { SvgDonutChart, SvgLineChart } from "./dashboard-charts";
import { Badge } from "../../../shared/ui/badge";
import { Button } from "../../../shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../shared/ui/card";
import { EmptyState, ErrorState, LoadingState } from "../../../shared/ui/page-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../shared/ui/table";
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

  const applicationsByStatusData = useMemo(() => {
    const colors: Record<string, string> = {
      DRAFT: "#64748b",
      SUBMITTED: "#3b82f6",
      APPROVED: "#10b981",
      CONFIRMED: "#8b5cf6",
      REJECTED: "#f43f5e",
      CANCELLED: "#94a3b8",
    };
    return (data?.applicationStatusDistribution ?? []).map((item) => ({
      label: item.label,
      value: item.count,
      color: colors[item.key] ?? "#06b6d4",
    }));
  }, [data]);

  const studentsByClassData = useMemo(() => {
    const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#06b6d4", "#6366f1", "#14b8a6"];
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
  if (!data) return <LoadingState label="Loading live operational control center" />;

  // REAL SUMMARY CARDS DATA FROM BACKEND
  const summaryCards = [
    {
      title: "Active Students",
      value: (data.activeStudents || 0).toLocaleString("en-IN"),
      subtext: `${selectedCampus.name} active count`,
      badgeBg: "bg-blue-50 text-blue-600 border-blue-200",
      icon: GraduationCap,
      to: "/admin/students",
    },
    {
      title: "Active Employees",
      value: (data.activeStaff || 0).toLocaleString("en-IN"),
      subtext: "Teaching & non-teaching staff",
      badgeBg: "bg-emerald-50 text-emerald-600 border-emerald-200",
      icon: UsersRound,
      to: "/admin/staff",
    },
    {
      title: "Applications Pending",
      value: (data.applicationsAwaitingAction || 0).toLocaleString("en-IN"),
      subtext: "Awaiting review or action",
      badgeBg: "bg-amber-50 text-amber-600 border-amber-200",
      icon: ClipboardCheck,
      to: "/admin/admissions/applications",
    },
    {
      title: "Admissions Confirmed",
      value: (data.admissionsConfirmed || 0).toLocaleString("en-IN"),
      subtext: "Confirmed in active year",
      badgeBg: "bg-purple-50 text-purple-600 border-purple-200",
      icon: UserRound,
      to: "/admin/admissions/admitted-students",
    },
    {
      title: "Collection Today",
      value: money(data.collectedTodayMinor || 0),
      subtext: "Valid successful payments today",
      badgeBg: "bg-teal-50 text-teal-600 border-teal-200",
      icon: Banknote,
      to: "/admin/finance/collections",
    },
    {
      title: "Outstanding Balance",
      value: money(data.outstandingMinor || 0),
      subtext: "Collectible fee balance",
      badgeBg: "bg-rose-50 text-rose-600 border-rose-200",
      icon: ShieldAlert,
      to: "/admin/finance/outstanding",
    },
    {
      title: "Students Missing Sections",
      value: (data.studentsMissingSections || 0).toLocaleString("en-IN"),
      subtext: "Enrolled without section link",
      badgeBg: "bg-amber-50 text-amber-600 border-amber-200",
      icon: UserCheck,
      to: "/admin/students",
    },
    {
      title: "Open Work Items",
      value: (data.openWorkItems || 0).toLocaleString("en-IN"),
      subtext: "Tasks requiring action",
      badgeBg: "bg-sky-50 text-sky-600 border-sky-200",
      icon: AlertTriangle,
      to: "/admin/dashboard",
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

  return (
    <section className="space-y-5 pb-10">
      {/* HEADER / TOOLBAR ACTION BAR */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Daily Operational Control Center</h1>
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
          <Button variant="outline" size="sm" onClick={() => window.print()} className="h-8 text-xs font-bold gap-1.5">
            <Download size={13} /> Print / Export PDF
          </Button>
        </div>
      </header>

      {/* ROW 1: 8 CLICKABLE SUMMARY KPI CARDS GRID */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.title} to={card.to} className="block transition-transform hover:-translate-y-0.5">
              <Card className="h-full border border-slate-200 bg-white p-3.5 hover:border-brand-300 hover:shadow-xs transition-all">
                <div className="flex items-start justify-between">
                  <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl border", card.badgeBg)}>
                    <Icon size={18} />
                  </span>
                </div>

                <div className="mt-3">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{card.title}</p>
                  <p className="text-xl font-extrabold text-slate-900 tracking-tight mt-0.5">{card.value}</p>
                </div>

                <p className="mt-2 text-[10px] text-slate-400 font-medium border-t border-slate-100 pt-1.5 truncate">
                  {card.subtext}
                </p>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* ROW 2: MAIN TREND CHARTS (3 COLUMNS) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* 1. Real Today's Financial & Operational Realization */}
        <Card className="lg:col-span-4 p-0 overflow-hidden">
          <CardHeader className="p-3.5 pb-2 border-b border-slate-100 flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold text-slate-900">Today's Operational Summary</CardTitle>
            <Badge variant="secondary" className="text-[10px] font-semibold">Live Real-Time</Badge>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-2 p-3">
            {[
              ["Enquiries", data.enquiriesToday, "/admin/admissions/enquiries"],
              ["Follow-ups", data.pendingEnquiryFollowUps, "/admin/admissions/enquiries"],
              ["Applications", data.applicationsSubmittedToday, "/admin/admissions/applications"],
            ].map(([label, value, to]) => (
              <Link key={String(label)} to={String(to)} className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-center hover:border-brand-200 transition-all">
                <p className="text-xl font-extrabold text-slate-900">{Number(value).toLocaleString("en-IN")}</p>
                <p className="mt-1 text-[10px] font-bold uppercase text-slate-500">{label}</p>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* 2. Fee Collection Trend (4 Cols) */}
        <Card className="lg:col-span-4 p-0 overflow-hidden">
          <CardHeader className="p-3.5 pb-2 border-b border-slate-100 flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold text-slate-900">Fee Collection Trend</CardTitle>
            <Badge variant="secondary" className="text-[10px] font-semibold">{data.paymentsToday} payments today</Badge>
          </CardHeader>
          <CardContent className="p-3">
            <SvgLineChart labels={collectionLabels} series={collectionSeries} height={170} unit="₹" />
          </CardContent>
        </Card>

        {/* 3. Students by Class (4 Cols) */}
        <Card className="lg:col-span-4 p-0 overflow-hidden">
          <CardHeader className="p-3.5 pb-2 border-b border-slate-100 flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold text-slate-900">Students by Class</CardTitle>
            <Badge variant="secondary" className="text-[10px] font-semibold">{data.activeStudents} Enrolled</Badge>
          </CardHeader>
          <CardContent className="p-3">
            <SvgDonutChart segments={studentsByClassData} totalLabel="Total Students" totalValue={data.activeStudents} size={150} />
          </CardContent>
        </Card>
      </div>

      {/* ROW 3: SUB-CHARTS & TODAY'S SUMMARY */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* 1. Applications by Status */}
        <Card className="p-0 overflow-hidden">
          <CardHeader className="p-3.5 pb-2 border-b border-slate-100 flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold text-slate-900">Applications by Status</CardTitle>
            <Badge variant="secondary" className="text-[10px] font-semibold">{data.applicationCount} Total</Badge>
          </CardHeader>
          <CardContent className="p-3">
            <SvgDonutChart segments={applicationsByStatusData} totalLabel="Total Apps" totalValue={data.applicationCount} size={135} />
          </CardContent>
        </Card>

        {/* 2. Collection Today Summary */}
        <Card className="p-0 overflow-hidden">
          <CardHeader className="p-3.5 pb-2 border-b border-slate-100 flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold text-slate-900">Today's Collections</CardTitle>
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Collected Today</span>
              <p className="text-xl font-extrabold text-emerald-700">{money(data.collectedTodayMinor || 0)}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Outstanding Balance</span>
              <p className="text-lg font-extrabold text-rose-700">{money(data.outstandingMinor || 0)}</p>
            </div>
          </CardContent>
        </Card>

        {/* 3. Operational Summary */}
        <Card className="p-0 overflow-hidden">
          <CardHeader className="p-3.5 pb-2 border-b border-slate-100 flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold text-slate-900">Operational Health</CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-2 text-xs">
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
              <span className="flex items-center gap-2 font-semibold text-slate-700">
                <GraduationCap size={14} className="text-brand-600" /> Active Students
              </span>
              <strong className="text-slate-900 font-extrabold">{data.activeStudents}</strong>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
              <span className="flex items-center gap-2 font-semibold text-slate-700">
                <UsersRound size={14} className="text-emerald-600" /> Active Employees
              </span>
              <strong className="text-slate-900 font-extrabold">{data.activeStaff}</strong>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
              <span className="flex items-center gap-2 font-semibold text-slate-700">
                <ClipboardCheck size={14} className="text-amber-600" /> Pending Applications
              </span>
              <strong className="text-slate-900 font-extrabold">{data.applicationsAwaitingAction}</strong>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
              <span className="flex items-center gap-2 font-semibold text-slate-700">
                <AlertTriangle size={14} className="text-rose-600" /> Open Work Items
              </span>
              <strong className="text-slate-900 font-extrabold">{data.openWorkItems}</strong>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* ROW 4: EXCEPTIONS, OUTSTANDING CLASSES, AND SECURITY CHANGES */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-0 overflow-hidden">
          <CardHeader className="p-3.5 pb-2 border-b border-slate-100">
            <CardTitle className="text-xs font-bold text-slate-900">Actionable Exceptions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-3 text-xs">
            {[
              ["Students without fee orders", data.studentsMissingFeeOrders, "/admin/finance/reconciliation"],
              ["Students with unpaid balance", data.unpaidStudents, "/admin/finance/outstanding"],
              ["Failed staff invitations", data.failedStaffInvites, "/admin/staff"],
              ["Failed finance events", data.failedFinanceEvents, "/admin/finance/reconciliation"],
              ["Failed admission events", data.failedAdmissionEvents, "/admin/admissions/applications"],
            ].map(([label, value, to]) => (
              <Link key={String(label)} to={String(to)} className="flex items-center justify-between rounded-lg bg-slate-50 p-2 hover:bg-slate-100">
                <span className="font-semibold text-slate-700">{label}</span>
                <Badge variant={Number(value) > 0 ? "warning" : "secondary"}>{Number(value).toLocaleString("en-IN")}</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="p-0 overflow-hidden">
          <CardHeader className="p-3.5 pb-2 border-b border-slate-100 flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold text-slate-900">Top Outstanding Classes</CardTitle>
            <Link to="/admin/finance/outstanding" className="text-[11px] font-bold text-brand-600 hover:underline">View all</Link>
          </CardHeader>
          <CardContent className="p-0">
            {data.topOutstandingClasses.length ? (
              <Table>
                <TableHeader><TableRow><TableHead>Class</TableHead><TableHead>Students</TableHead><TableHead className="text-right">Outstanding</TableHead></TableRow></TableHeader>
                <TableBody>
                  {data.topOutstandingClasses.map((item) => (
                    <TableRow key={item.classId}>
                      <TableCell className="font-semibold">{item.className}</TableCell>
                      <TableCell>{item.studentCount}</TableCell>
                      <TableCell className="text-right font-bold text-rose-700">{money(item.outstandingMinor)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : <EmptyState title="No outstanding balances" description="No collectible class balances remain." />}
          </CardContent>
        </Card>

        <Card className="p-0 overflow-hidden">
          <CardHeader className="p-3.5 pb-2 border-b border-slate-100 flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold text-slate-900">Access and Permission Changes</CardTitle>
            <Link to="/admin/access/roles" className="text-[11px] font-bold text-brand-600 hover:underline">Manage access</Link>
          </CardHeader>
          <CardContent className="space-y-2 p-3">
            {data.recentSecurityChanges.length ? data.recentSecurityChanges.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-100 p-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-slate-800">{item.change}</p>
                  <Badge variant="secondary" className="text-[9px]">{item.status}</Badge>
                </div>
                <p className="mt-1 truncate text-[11px] text-slate-500">{item.subject}</p>
                <p className="mt-1 text-[10px] text-slate-400">{new Date(item.occurredAt).toLocaleString("en-IN")}</p>
              </div>
            )) : <EmptyState title="No recent access changes" description="Role and permission changes will appear here." />}
          </CardContent>
        </Card>
      </div>

      {/* COLLECTION BY PAYMENT METHOD */}
      <Card className="p-0 overflow-hidden">
        <CardHeader className="p-3.5 pb-2 border-b border-slate-100 flex-row items-center justify-between">
          <CardTitle className="text-xs font-bold text-slate-900">Today's Collection by Payment Method</CardTitle>
          <Link to="/admin/finance/collections" className="text-[11px] font-bold text-brand-600 hover:underline">Open collections</Link>
        </CardHeader>
        <CardContent className="p-0">
          {data.collectionByPaymentMethod.length ? (
            <Table>
              <TableHeader><TableRow><TableHead>Method</TableHead><TableHead>Payments</TableHead><TableHead className="text-right">Collected</TableHead></TableRow></TableHeader>
              <TableBody>
                {data.collectionByPaymentMethod.map((item) => (
                  <TableRow key={item.method}>
                    <TableCell className="font-semibold">{item.method.replaceAll("_", " ")}</TableCell>
                    <TableCell>{item.paymentCount}</TableCell>
                    <TableCell className="text-right font-bold text-emerald-700">{money(item.amountMinor)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : <EmptyState title="No collections today" description="Successful payments collected today will be grouped here." />}
        </CardContent>
      </Card>

      {/* ROW 5: REAL OPERATIONAL TABLES & RECENT ACTIVITY (12 COLS GRID) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Real Admission Applications Table (6 Cols) */}
        <Card className="lg:col-span-6 p-0 overflow-hidden">
          <CardHeader className="p-3.5 pb-2 border-b border-slate-100 flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold text-slate-900">Admission Applications</CardTitle>
            <Link to="/admin/admissions/applications" className="text-[11px] font-bold text-brand-600 hover:underline">
              View All ({data.applicationCount})
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {data.recentApplications.length ? (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="py-2 text-[11px] font-bold">App No.</TableHead>
                    <TableHead className="py-2 text-[11px] font-bold">Applicant Name</TableHead>
                    <TableHead className="py-2 text-[11px] font-bold">Phone</TableHead>
                    <TableHead className="py-2 text-[11px] font-bold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentApplications.slice(0, 5).map((app) => (
                    <TableRow key={app.id} className="text-xs">
                      <TableCell className="py-2 font-bold text-brand-700">
                        <Link to={`/admin/admissions/applications/${app.id}`} className="hover:underline">{app.applicationNumber ?? "Draft"}</Link>
                      </TableCell>
                      <TableCell className="py-2 font-semibold text-slate-800">{app.studentName}</TableCell>
                      <TableCell className="py-2 text-slate-600 font-medium">{app.phone || "-"}</TableCell>
                      <TableCell className="py-2">
                        <Badge variant={app.status === "APPROVED" ? "success" : app.status === "CONFIRMED" ? "brand" : "warning"} className="text-[10px] font-bold px-1.5 py-0">
                          {app.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState title="No admission applications yet" description="Applications submitted by prospective students will appear here." />
            )}
          </CardContent>
        </Card>

        {/* Real Audit & Recent Activity Table (6 Cols) */}
        <Card className="lg:col-span-6 p-0 overflow-hidden">
          <CardHeader className="p-3.5 pb-2 border-b border-slate-100 flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold text-slate-900">Recent Operational Activity</CardTitle>
            <span className="text-[11px] text-slate-400 font-medium">{data.recentActivity.length} recent events</span>
          </CardHeader>
          <CardContent className="p-0">
            {data.recentActivity.length ? (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="py-2 text-[11px] font-bold">Time</TableHead>
                    <TableHead className="py-2 text-[11px] font-bold">Activity</TableHead>
                    <TableHead className="py-2 text-[11px] font-bold">Subject</TableHead>
                    <TableHead className="py-2 text-[11px] font-bold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentActivity.slice(0, 5).map((act) => (
                    <TableRow key={`${act.module}-${act.id}`} className="text-xs">
                      <TableCell className="py-2 font-medium text-slate-500">
                        {new Date(act.occurredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </TableCell>
                      <TableCell className="py-2 font-semibold text-slate-800">{act.activity}</TableCell>
                      <TableCell className="py-2 text-slate-600 font-medium truncate max-w-[120px]">{act.subject}</TableCell>
                      <TableCell className="py-2">
                        <Badge variant="secondary" className="text-[10px] font-semibold px-1.5 py-0">
                          {act.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState title="No recent activity logged" description="Operational events (admissions, fee collections, user updates) will be recorded here." />
            )}
          </CardContent>
        </Card>
      </div>

      {/* QUICK ACTIONS ROW */}
      <Card className="p-4 bg-slate-50/80 border-slate-200">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-xs font-bold text-slate-900">Quick Administrative Actions</h3>
            <p className="text-[11px] text-slate-500">Direct shortcuts to essential operational tasks.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/admin/admissions/applications">
              <Button size="sm" variant="outline" className="h-8 text-xs font-bold gap-1.5 bg-white">
                <UserPlus size={14} className="text-brand-600" /> Manage Applications
              </Button>
            </Link>
            <Link to="/admin/finance/collections">
              <Button size="sm" variant="outline" className="h-8 text-xs font-bold gap-1.5 bg-white">
                <Banknote size={14} className="text-emerald-600" /> Collect Fee
              </Button>
            </Link>
            <Link to="/admin/staff/new">
              <Button size="sm" variant="outline" className="h-8 text-xs font-bold gap-1.5 bg-white">
                <UsersRound size={14} className="text-purple-600" /> Invite Staff
              </Button>
            </Link>
            <Link to="/admin/finance/reconciliation">
              <Button size="sm" variant="outline" className="h-8 text-xs font-bold gap-1.5 bg-white">
                <FileSpreadsheet size={14} className="text-amber-600" /> Reconciliation
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </section>
  );
}

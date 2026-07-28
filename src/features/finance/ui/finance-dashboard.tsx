import {
  Building2,
  CheckCircle2,
  CreditCard,
  FileText,
  Hourglass,
  Layers,
  Receipt,
  RotateCcw,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getFinanceDashboard, listFinancePayments } from "../api/finance-operations.api";
import type { FinanceDashboard as Summary, FinancePayment } from "../model/finance-operations.types";
import { useSelectedCampus } from "../../tenant-settings/model/selected-campus-provider";
import { useSelectedAcademicYear } from "../../tenant-settings/model/selected-academic-year-provider";
import { EmptyState, ErrorState, LoadingState } from "../../../shared/ui/page-state";
import { Button } from "../../../shared/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../shared/ui/table";
import { Badge } from "../../../shared/ui/badge";

const money = (minor: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(minor / 100);

const dateStr = (value?: string) =>
  value
    ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(
        new Date(value),
      )
    : "—";

export function FinanceDashboard({
  basePath = "/admin/finance",
}: {
  basePath?: string;
}) {
  const navigate = useNavigate();
  const { selectedCampus } = useSelectedCampus();
  const { selectedAcademicYear } = useSelectedAcademicYear();
  const [data, setData] = useState<Summary | null>(null);
  const [recentPayments, setRecentPayments] = useState<FinancePayment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!selectedCampus || !selectedAcademicYear) {
      setLoading(false);
      return () => {
        active = false;
      };
    }
    setLoading(true);
    setError(null);
    void Promise.all([
      getFinanceDashboard(selectedCampus.id, selectedAcademicYear.id),
      listFinancePayments({
        campusId: selectedCampus.id,
        academicYearId: selectedAcademicYear.id,
      }),
    ])
      .then(([summaryRes, paymentsRes]) => {
        if (active) {
          setData(summaryRes);
          setRecentPayments(paymentsRes.slice(0, 5));
        }
      })
      .catch((value) => {
        if (active)
          setError(
            value instanceof Error
              ? value.message
              : "Unable to load finance dashboard",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedAcademicYear, selectedCampus]);

  if (!selectedCampus || !selectedAcademicYear)
    return (
      <EmptyState
        title="Select campus and academic year"
        description="Finance metrics follow the operating context."
      />
    );
  if (error) return <ErrorState message={error} />;
  if (loading || !data) return <LoadingState label="Loading finance dashboard" />;

  const totalFeeOrdersVal = data.totalAssignedMinor;
  const totalCollectionsVal = data.collectedMinor;
  const totalOutstandingVal = data.outstandingMinor;
  const todayCollectionVal = data.collectedTodayMinor;

  return (
    <section className="space-y-6 pb-12">
      {/* Top Header & Context Controls */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Finance Dashboard</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Overview of income, collections, and outstanding for {selectedCampus.name} · {selectedAcademicYear.name}.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-800">
            {selectedCampus.name}
          </span>
          <span className="px-3 py-1 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-800">
            {selectedAcademicYear.name}
          </span>
        </div>
      </header>

      {/* Top 5 Summary KPI Cards Row (100% REAL LIVE BACKEND DATA) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {/* Card 1: Total Fee Orders */}
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Wallet size={18} />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Total Fee Orders</span>
          </div>
          <div>
            <strong className="text-lg font-black text-slate-900 leading-tight block">
              {money(totalFeeOrdersVal)}
            </strong>
            <div className="flex items-center justify-between mt-1 text-[10.5px]">
              <span className="text-slate-500 font-semibold">{data.openOrders + data.paidOrders} Orders</span>
              <span className="font-bold text-emerald-600">Assigned</span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Collections */}
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center">
              <CreditCard size={18} />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Total Collections</span>
          </div>
          <div>
            <strong className="text-lg font-black text-slate-900 leading-tight block">
              {money(totalCollectionsVal)}
            </strong>
            <div className="flex items-center justify-between mt-1 text-[10.5px]">
              <span className="text-slate-500 font-semibold">{data.paymentCount} Payments</span>
              <span className="font-bold text-emerald-600">Collected</span>
            </div>
          </div>
        </div>

        {/* Card 3: Total Outstanding */}
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center">
              <Hourglass size={18} />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Total Outstanding</span>
          </div>
          <div>
            <strong className="text-lg font-black text-slate-900 leading-tight block">
              {money(totalOutstandingVal)}
            </strong>
            <div className="flex items-center justify-between mt-1 text-[10.5px]">
              <span className="text-slate-500 font-semibold">{data.openOrders} Open Orders</span>
              <span className="font-bold text-amber-600">Pending</span>
            </div>
          </div>
        </div>

        {/* Card 4: Paid Orders */}
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
              <RotateCcw size={18} />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Paid Orders</span>
          </div>
          <div>
            <strong className="text-lg font-black text-slate-900 leading-tight block">
              {data.paidOrders}
            </strong>
            <div className="flex items-center justify-between mt-1 text-[10.5px]">
              <span className="text-slate-500 font-semibold">Completed Orders</span>
              <span className="font-bold text-emerald-600">Paid</span>
            </div>
          </div>
        </div>

        {/* Card 5: Today's Collection */}
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center">
              <Building2 size={18} />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Today's Collection</span>
          </div>
          <div>
            <strong className="text-lg font-black text-slate-900 leading-tight block">
              {money(todayCollectionVal)}
            </strong>
            <div className="flex items-center justify-between mt-1 text-[10.5px]">
              <span className="text-slate-500 font-semibold">Today</span>
              <span className="font-bold text-emerald-600">Collected Today</span>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Content Row (Summary Metrics & Quick Actions) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4">
        {/* Collection Summary Box */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 shadow-2xs">
          <h3 className="text-xs font-extrabold text-slate-900 border-b border-slate-100 pb-2">
            Collection & Outstanding Summary
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Total Fee Assigned</span>
              <strong className="text-xl font-black text-slate-900 block">{money(totalFeeOrdersVal)}</strong>
              <span className="text-[11px] text-slate-500 font-medium">{data.openOrders + data.paidOrders} total fee orders</span>
            </div>
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-1">
              <span className="text-[10px] font-bold text-emerald-700 uppercase">Total Collected</span>
              <strong className="text-xl font-black text-emerald-800 block">{money(totalCollectionsVal)}</strong>
              <span className="text-[11px] text-emerald-600 font-medium">{data.paymentCount} payments recorded</span>
            </div>
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-1">
              <span className="text-[10px] font-bold text-amber-700 uppercase">Total Outstanding</span>
              <strong className="text-xl font-black text-amber-800 block">{money(totalOutstandingVal)}</strong>
              <span className="text-[11px] text-amber-600 font-medium">{data.openOrders} pending orders</span>
            </div>
          </div>
        </div>

        {/* Quick Actions Box */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-2xs">
          <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-2">
            Quick Actions
          </h3>
          <div className="space-y-1.5 text-xs font-bold text-slate-700">
            <button
              type="button"
              onClick={() => navigate(`${basePath}/fee-schedules`)}
              className="w-full text-left p-2 rounded-lg hover:bg-slate-100 flex items-center gap-2 cursor-pointer"
            >
              <FileText size={14} className="text-brand-600" /> Create Fee Order
            </button>
            <button
              type="button"
              onClick={() => navigate(`${basePath}/collections`)}
              className="w-full text-left p-2 rounded-lg hover:bg-slate-100 flex items-center gap-2 cursor-pointer"
            >
              <CreditCard size={14} className="text-brand-600" /> Record Payment
            </button>
            <button
              type="button"
              onClick={() => navigate(`${basePath}/receipts`)}
              className="w-full text-left p-2 rounded-lg hover:bg-slate-100 flex items-center gap-2 cursor-pointer"
            >
              <Receipt size={14} className="text-brand-600" /> Generate Receipt
            </button>
            <button
              type="button"
              onClick={() => navigate(`${basePath}/outstanding`)}
              className="w-full text-left p-2 rounded-lg hover:bg-slate-100 flex items-center gap-2 cursor-pointer"
            >
              <Hourglass size={14} className="text-brand-600" /> Outstanding Report
            </button>
            <button
              type="button"
              onClick={() => navigate(`${basePath}/reconciliation`)}
              className="w-full text-left p-2 rounded-lg hover:bg-slate-100 flex items-center gap-2 cursor-pointer"
            >
              <Layers size={14} className="text-brand-600" /> Fee Reconciliation
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Content Row (100% REAL RECENT PAYMENTS) */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-2xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="text-xs font-extrabold text-slate-900">Recent Collections ({recentPayments.length})</h3>
          <Button size="sm" variant="ghost" onClick={() => navigate(`${basePath}/collections`)} className="h-6 text-xs font-bold text-brand-600">
            View All Collections →
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 text-xs font-bold text-slate-600">
              <TableHead>Receipt No.</TableHead>
              <TableHead>Payment ID</TableHead>
              <TableHead>Payment Date</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Reference No.</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="text-xs">
            {recentPayments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-400 font-medium">
                  No fee collections recorded yet for this campus.
                </TableCell>
              </TableRow>
            ) : (
              recentPayments.map((p) => (
                <TableRow key={p.id} className="hover:bg-slate-50/60">
                  <TableCell className="font-mono font-bold text-brand-700">{p.receiptNumber}</TableCell>
                  <TableCell className="font-mono text-slate-600 text-[11px]">{p.id.substring(0, 8)}</TableCell>
                  <TableCell className="text-slate-600 font-medium">{dateStr(p.paidAt)}</TableCell>
                  <TableCell>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-[10.5px] font-bold">
                      {p.method.replaceAll("_", " ")}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-slate-600 text-[11px]">{p.reference || "—"}</TableCell>
                  <TableCell className="font-extrabold text-slate-900">{money(p.amountMinor)}</TableCell>
                  <TableCell>
                    <Badge variant={p.status === "SUCCESS" ? "success" : "secondary"}>
                      {p.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Bottom Summary KPI Strip (100% REAL BACKEND METRICS) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <Wallet size={18} />
          </div>
          <div>
            <span className="text-[10.5px] font-bold text-slate-400 block uppercase">Total Fee Orders</span>
            <p className="text-base font-black text-slate-900 leading-tight">{data.openOrders + data.paidOrders}</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center shrink-0">
            <Hourglass size={18} />
          </div>
          <div>
            <span className="text-[10.5px] font-bold text-slate-400 block uppercase">Open Orders</span>
            <p className="text-base font-black text-slate-900 leading-tight">{data.openOrders}</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <span className="text-[10.5px] font-bold text-slate-400 block uppercase">Paid Orders</span>
            <p className="text-base font-black text-slate-900 leading-tight">{data.paidOrders}</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
            <Receipt size={18} />
          </div>
          <div>
            <span className="text-[10.5px] font-bold text-slate-400 block uppercase">Payments Received</span>
            <p className="text-base font-black text-slate-900 leading-tight">{data.paymentCount}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

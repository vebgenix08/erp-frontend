import {
  ArrowRight,
  Building2,
  CreditCard,
  FileText,
  Hourglass,
  Layers,
  Plus,
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
          setRecentPayments(paymentsRes.slice(0, 6));
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
        description="Finance metrics follow the operating campus context."
      />
    );
  if (error) return <ErrorState message={error} />;
  if (loading || !data) return <LoadingState label="Loading finance dashboard" />;

  const totalFeeOrdersVal = data.totalAssignedMinor;
  const totalCollectionsVal = data.collectedMinor;
  const totalOutstandingVal = data.outstandingMinor;
  const todayCollectionVal = data.collectedTodayMinor;

  const collectionPercent = totalFeeOrdersVal > 0
    ? Math.min(100, Math.round((totalCollectionsVal / totalFeeOrdersVal) * 100))
    : 0;

  return (
    <section className="space-y-6 font-sans text-slate-900 pb-12">
      {/* Top Header & Context Actions */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Finance Dashboard</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Real-time financial overview of collections, dues, and fee orders for {selectedCampus.name} ({selectedAcademicYear.name})
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`${basePath}/fee-schedules`)}
            className="h-9 px-3 text-xs font-semibold border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Fee Schedule
          </Button>
          <Button
            size="sm"
            onClick={() => navigate(`${basePath}/collections`)}
            className="h-9 px-4 text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
          >
            <CreditCard className="h-3.5 w-3.5 mr-1.5" /> Record Payment
          </Button>
        </div>
      </header>

      {/* Top 5 Summary KPI Cards Bar */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Card 1: Total Fee Orders */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between h-[104px]">
          <div className="h-5 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Fee Orders
            </span>
            <div className="h-7 w-7 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
              <Wallet className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 leading-none">{money(totalFeeOrdersVal)}</div>
          <div className="text-[11px] text-slate-500 font-medium leading-none flex items-center justify-between">
            <span>{data.openOrders + data.paidOrders} Orders</span>
            <span className="font-bold text-emerald-600">Assigned</span>
          </div>
        </div>

        {/* Card 2: Total Collections */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between h-[104px]">
          <div className="h-5 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Collections
            </span>
            <div className="h-7 w-7 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
              <CreditCard className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 leading-none">{money(totalCollectionsVal)}</div>
          <div className="text-[11px] text-slate-500 font-medium leading-none flex items-center justify-between">
            <span>{data.paymentCount} Payments</span>
            <span className="font-bold text-blue-600">Collected</span>
          </div>
        </div>

        {/* Card 3: Total Outstanding */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between h-[104px]">
          <div className="h-5 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Outstanding
            </span>
            <div className="h-7 w-7 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
              <Hourglass className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 leading-none">{money(totalOutstandingVal)}</div>
          <div className="text-[11px] text-slate-500 font-medium leading-none flex items-center justify-between">
            <span>{data.openOrders} Open Orders</span>
            <span className="font-bold text-amber-600">Pending</span>
          </div>
        </div>

        {/* Card 4: Paid Orders */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between h-[104px]">
          <div className="h-5 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Paid Orders
            </span>
            <div className="h-7 w-7 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
              <RotateCcw className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 leading-none">{data.paidOrders}</div>
          <div className="text-[11px] text-slate-500 font-medium leading-none flex items-center justify-between">
            <span>Completed Orders</span>
            <span className="font-bold text-emerald-600">100% Paid</span>
          </div>
        </div>

        {/* Card 5: Today's Collection */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between h-[104px]">
          <div className="h-5 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Today's Collection
            </span>
            <div className="h-7 w-7 rounded-full bg-sky-50 flex items-center justify-center text-sky-600 shrink-0">
              <Building2 className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 leading-none">{money(todayCollectionVal)}</div>
          <div className="text-[11px] text-slate-500 font-medium leading-none flex items-center justify-between">
            <span>Today's Receipts</span>
            <span className="font-bold text-sky-600">Collected</span>
          </div>
        </div>
      </div>

      {/* Middle Content Section: Collection Progress & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Collection & Progress Card (8 Cols) */}
        <div className="lg:col-span-8 rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900">Collection & Outstanding Analysis</h2>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
              {collectionPercent}% Collected
            </span>
          </div>

          {/* Visual Collection Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-slate-600">
              <span>Collection Realization Rate</span>
              <span>{money(totalCollectionsVal)} of {money(totalFeeOrdersVal)}</span>
            </div>
            <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${collectionPercent}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Fee Assigned</span>
              <strong className="text-lg font-black text-slate-900 block">{money(totalFeeOrdersVal)}</strong>
              <span className="text-[11px] text-slate-500 font-medium">{data.openOrders + data.paidOrders} fee orders</span>
            </div>
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-1">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Total Collected</span>
              <strong className="text-lg font-black text-emerald-800 block">{money(totalCollectionsVal)}</strong>
              <span className="text-[11px] text-emerald-600 font-medium">{data.paymentCount} payments</span>
            </div>
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-1">
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Total Outstanding</span>
              <strong className="text-lg font-black text-amber-800 block">{money(totalOutstandingVal)}</strong>
              <span className="text-[11px] text-amber-600 font-medium">{data.openOrders} pending orders</span>
            </div>
          </div>
        </div>

        {/* Quick Navigation Card (4 Cols) */}
        <div className="lg:col-span-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
            Finance Quick Actions
          </h2>
          <div className="space-y-2 text-xs font-semibold">
            <button
              type="button"
              onClick={() => navigate(`${basePath}/collections`)}
              className="w-full p-2.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 flex items-center justify-between text-slate-800 transition-all"
            >
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-blue-600" />
                <span>Record Fee Payment</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => navigate(`${basePath}/fee-schedules`)}
              className="w-full p-2.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 flex items-center justify-between text-slate-800 transition-all"
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-purple-600" />
                <span>Fee Schedules & Orders</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => navigate(`${basePath}/receipts`)}
              className="w-full p-2.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 flex items-center justify-between text-slate-800 transition-all"
            >
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-emerald-600" />
                <span>Generate Fee Receipt</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => navigate(`${basePath}/outstanding`)}
              className="w-full p-2.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 flex items-center justify-between text-slate-800 transition-all"
            >
              <div className="flex items-center gap-2">
                <Hourglass className="h-4 w-4 text-amber-600" />
                <span>Outstanding Dues Report</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => navigate(`${basePath}/reconciliation`)}
              className="w-full p-2.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 flex items-center justify-between text-slate-800 transition-all"
            >
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-sky-600" />
                <span>Fee Reconciliation</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Table: Recent Collections */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Recent Collections ({recentPayments.length})</h2>
            <p className="text-xs text-slate-500 mt-0.5">Latest fee collection receipts recorded in the system</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`${basePath}/collections`)}
            className="h-8 text-xs font-semibold text-blue-600 border-blue-200 hover:bg-blue-50"
          >
            View All Collections <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow className="border-b border-slate-200">
                <TableHead className="font-bold text-slate-700 text-xs py-3">Receipt No.</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs py-3">Payment ID</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs py-3">Payment Date</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs py-3">Mode</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs py-3">Ref No.</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs py-3">Amount</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs py-3 text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100">
              {recentPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-xs text-slate-400 font-medium">
                    No fee collections recorded yet for this campus.
                  </TableCell>
                </TableRow>
              ) : (
                recentPayments.map((p) => (
                  <TableRow key={p.id} className="hover:bg-slate-50/60 transition-colors">
                    <TableCell className="font-mono text-xs font-bold text-blue-700 py-3">
                      {p.receiptNumber}
                    </TableCell>
                    <TableCell className="font-mono text-slate-500 text-[11px] py-3">
                      {p.id.substring(0, 8)}
                    </TableCell>
                    <TableCell className="text-slate-600 font-medium text-xs py-3">
                      {dateStr(p.paidAt)}
                    </TableCell>
                    <TableCell className="py-3 text-xs">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-[10.5px] font-bold text-slate-700 border border-slate-200">
                        {p.method.replaceAll("_", " ")}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-slate-500 text-[11px] py-3">
                      {p.reference || "—"}
                    </TableCell>
                    <TableCell className="font-extrabold text-slate-900 text-xs py-3">
                      {money(p.amountMinor)}
                    </TableCell>
                    <TableCell className="py-3 text-right">
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
      </div>
    </section>
  );
}

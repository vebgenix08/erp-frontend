import {
  AlertTriangle,
  ArrowDownLeft,
  BadgeIndianRupee,
  CheckCircle2,
  RefreshCw,
  RotateCw,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useSelectedAcademicYear } from "../../tenant-settings/model/selected-academic-year-provider";
import { useSelectedCampus } from "../../tenant-settings/model/selected-campus-provider";
import {
  listFeeOrderRecoveries,
  getFinanceDashboard,
  listFinancePaymentAdjustments,
  listFinancePayments,
  retryFeeOrderRecovery,
} from "../api/finance-operations.api";
import type {
  FeeOrderRecovery,
  FinanceDashboard,
  FinancePaymentAdjustment,
} from "../model/finance-operations.types";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../../shared/ui/page-state";
import { Button } from "../../../shared/ui/button";
import { Card, CardContent } from "../../../shared/ui/card";
import { Badge } from "../../../shared/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../shared/ui/table";

const money = (minor: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    minor / 100,
  );

const date = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export function FinanceReconciliation() {
  const { selectedCampus } = useSelectedCampus();
  const { selectedAcademicYear } = useSelectedAcademicYear();
  const [adjustments, setAdjustments] = useState<FinancePaymentAdjustment[]>([]);
  const [recoveries, setRecoveries] = useState<FeeOrderRecovery[]>([]);
  const [summary, setSummary] = useState<FinanceDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!selectedCampus || !selectedAcademicYear) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [dashboard, , adjustmentRows, recoveryRows] = await Promise.all([
        getFinanceDashboard(selectedCampus.id, selectedAcademicYear.id),
        listFinancePayments({
          campusId: selectedCampus.id,
          academicYearId: selectedAcademicYear.id,
        }),
        listFinancePaymentAdjustments({
          campusId: selectedCampus.id,
          academicYearId: selectedAcademicYear.id,
        }),
        listFeeOrderRecoveries({
          campusId: selectedCampus.id,
          academicYearId: selectedAcademicYear.id,
          status: "PENDING",
        }),
      ]);
      setSummary(dashboard);
      setAdjustments(adjustmentRows);
      setRecoveries(recoveryRows);
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : "Unable to load reconciliation statement",
      );
    } finally {
      setLoading(false);
    }
  }, [selectedAcademicYear, selectedCampus]);

  useEffect(() => {
    void load();
  }, [load]);

  async function retry(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await retryFeeOrderRecovery(id);
      await load();
    } catch (value) {
      setError(value instanceof Error ? value.message : "Fee order retry failed");
    } finally {
      setBusyId(null);
    }
  }

  if (!selectedCampus) {
    return (
      <EmptyState
        title="Select an operating campus"
        description="Reconciliation is campus scoped."
      />
    );
  }
  if (!selectedAcademicYear) {
    return (
      <EmptyState
        title="Select an academic year"
        description="Reconciliation is academic-year scoped."
      />
    );
  }
  if (loading) return <LoadingState label="Loading reconciliation statement" />;
  if (error) return <ErrorState message={error} retry={() => void load()} />;
  if (!summary) {
    return (
      <ErrorState
        message="Reconciliation summary is unavailable"
        retry={() => void load()}
      />
    );
  }

  return (
    <section className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Internal reconciliation</h2>
          <p className="mt-1 text-sm text-slate-500">
            {selectedCampus.name} · {selectedAcademicYear.name}. Gross receipts less recorded voids and refunds.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          <RefreshCw size={15} />
          Refresh
        </Button>
      </header>

      {/* Metrics Card Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="relative overflow-hidden">
          <CardContent className="pt-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Gross collection</p>
            <p className="mt-1.5 text-2xl font-bold text-slate-900">{money(summary.grossCollectedMinor)}</p>
            <span className="absolute right-4 top-4 text-blue-500 opacity-60">
              <BadgeIndianRupee size={20} />
            </span>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <CardContent className="pt-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Voids and refunds</p>
            <p className="mt-1.5 text-2xl font-bold text-slate-905">{money(summary.reversedMinor)}</p>
            <span className="absolute right-4 top-4 text-rose-500 opacity-60">
              <ArrowDownLeft size={20} />
            </span>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <CardContent className="pt-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Net collection</p>
            <p className="mt-1.5 text-2xl font-bold text-slate-900">{money(summary.collectedMinor)}</p>
            <span className="absolute right-4 top-4 text-emerald-500 opacity-60">
              <CheckCircle2 size={20} />
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Summary Banner */}
      <Card>
        <CardContent className="p-5 flex flex-wrap items-center gap-6 divide-x divide-slate-200">
          <div className="space-y-0.5">
            <strong className="block text-xl font-bold text-slate-900">{summary.paymentCount}</strong>
            <span className="block text-xs text-slate-500">Receipts</span>
          </div>
          <div className="pl-6 space-y-0.5">
            <strong className="block text-xl font-bold text-slate-900">{summary.adjustmentCount}</strong>
            <span className="block text-xs text-slate-500">Adjustments</span>
          </div>
          <div className="pl-6 space-y-0.5">
            <strong className="block text-xl font-bold text-slate-900">{summary.paymentCount + summary.adjustmentCount}</strong>
            <span className="block text-xs text-slate-500">Ledger records explained</span>
          </div>
        </CardContent>
      </Card>

      {/* Recoveries List */}
      {recoveries.length > 0 && (
        <div className="space-y-3">
          <h3 className="flex items-center gap-1.5 text-base font-bold text-amber-700">
            <AlertTriangle size={17} /> Fee-order recovery
          </h3>
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Failure</TableHead>
                  <TableHead>Last attempt</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recoveries.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <p className="font-semibold text-slate-900">{item.studentName}</p>
                        <p className="text-xs text-slate-500 font-mono">{item.registrationNumber}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-650 text-sm">{item.attempts}</TableCell>
                    <TableCell className="text-red-650 text-xs">{item.lastError}</TableCell>
                    <TableCell className="text-slate-500 text-xs">{date(item.lastAttemptAt)}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busyId === item.id}
                        onClick={() => void retry(item.id)}
                        className="h-8 px-2.5 text-xs"
                      >
                        <RotateCw size={13} />
                        {busyId === item.id ? "Retrying..." : "Retry after setup"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Adjustment Ledger */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-slate-805">Adjustment ledger</h3>
        {adjustments.length > 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Adjustment</TableHead>
                  <TableHead>Receipt</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Recorded</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adjustments.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-semibold text-slate-900">{item.adjustmentNumber}</TableCell>
                    <TableCell className="text-slate-700 font-medium">{item.receiptNumber}</TableCell>
                    <TableCell>
                      <Badge variant={item.type === "VOID" ? "destructive" : "secondary"}>
                        {item.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-900 font-semibold">{money(item.amountMinor)}</TableCell>
                    <TableCell className="text-slate-650 text-sm max-w-xs truncate">{item.reason}</TableCell>
                    <TableCell className="text-slate-505 text-xs">{date(item.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <EmptyState
            title="No payment adjustments"
            description="Voids and approved refunds will appear here without changing the original receipt."
          />
        )}
      </div>
    </section>
  );
}

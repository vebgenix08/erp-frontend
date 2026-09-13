import {
  Banknote,
  Columns3,
  FileText,
  FileSpreadsheet,
  RotateCcw,
  Search,
  WalletCards,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { listClasses } from "../../academic-structure/api/academic-structure.api";
import type { AcademicClass } from "../../academic-structure/model/academic-structure.types";
import {
  exportRowsToExcel,
  exportRowsToPdf,
  type ExportColumn,
} from "../../../shared/lib/tabular-export";
import { loadColumnPreference, saveColumnPreference } from "../../../shared/lib/column-preferences";
import { useSelectedAcademicYear } from "../../tenant-settings/model/selected-academic-year-provider";
import { useSelectedCampus } from "../../tenant-settings/model/selected-campus-provider";
import {
  collectFinancePayment,
  createFinancePaymentAdjustment,
  getFinanceReceipt,
  listFeeOrderPage,
  listFinancePaymentPage,
} from "../api/finance-operations.api";
import type {
  FeeOrder,
  FinancePayment,
  FinancePaymentAdjustment,
  FinanceReceipt,
  PaymentMethod,
} from "../model/finance-operations.types";
import { downloadReceiptPdf, printReceiptPdf, type ReceiptCopyMode } from "../lib/receipt-document";
import { EmptyState, ErrorState, LoadingState } from "../../../shared/ui/page-state";
import { Modal } from "../../../shared/ui/modal";
import { Button } from "../../../shared/ui/button";
import { Input } from "../../../shared/ui/input";
import { Label } from "../../../shared/ui/label";
import { Badge } from "../../../shared/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../shared/ui/table";
import { Separator } from "../../../shared/ui/separator";
import { ServerPagination } from "../../../shared/ui/server-pagination";

type Mode = "collections" | "outstanding" | "receipts";
type OrderColumnId =
  | "student"
  | "class"
  | "order"
  | "structure"
  | "policy"
  | "total"
  | "paid"
  | "balance"
  | "status";
type ReceiptColumnId = "receipt" | "student" | "paid" | "reversed" | "method" | "status" | "date";
type FinanceColumnId = OrderColumnId | ReceiptColumnId;

const orderColumns: Array<{ id: OrderColumnId; label: string }> = [
  { id: "student", label: "Student" },
  { id: "class", label: "Class" },
  { id: "order", label: "Fee order" },
  { id: "structure", label: "Structure" },
  { id: "policy", label: "Collection policy" },
  { id: "total", label: "Total" },
  { id: "paid", label: "Paid" },
  { id: "balance", label: "Balance" },
  { id: "status", label: "Status" },
];
const receiptColumns: Array<{ id: ReceiptColumnId; label: string }> = [
  { id: "receipt", label: "Receipt" },
  { id: "student", label: "Student" },
  { id: "paid", label: "Paid" },
  { id: "reversed", label: "Reversed" },
  { id: "method", label: "Method" },
  { id: "status", label: "Status" },
  { id: "date", label: "Date" },
];

const money = (minor: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(minor / 100);

const date = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export function FinanceOperations({ mode }: { mode: Mode }) {
  return <FinanceOperationsContent key={mode} mode={mode} />;
}

function FinanceOperationsContent({ mode }: { mode: Mode }) {
  const { selectedCampus } = useSelectedCampus();
  const { selectedAcademicYear } = useSelectedAcademicYear();
  const [orders, setOrders] = useState<FeeOrder[]>([]);
  const [payments, setPayments] = useState<FinancePayment[]>([]);
  const [classes, setClasses] = useState<AcademicClass[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [classId, setClassId] = useState("");
  const [orderStatus, setOrderStatus] = useState<FeeOrder["status"] | "">("");
  const [sourceType, setSourceType] = useState<FeeOrder["sourceType"] | "">(() => {
    const value = new URLSearchParams(window.location.search).get("sourceType");
    return value === "ANNUAL" || value === "GENERAL" || value === "TRANSFER_ADJUSTMENT"
      ? value
      : "";
  });
  const [receiptStatus, setReceiptStatus] = useState<FinancePayment["status"] | "">("");
  const [receiptMethod, setReceiptMethod] = useState<PaymentMethod | "">("");
  const [paidFrom, setPaidFrom] = useState("");
  const [paidTo, setPaidTo] = useState("");

  const [selectedOrders, setSelectedOrders] = useState<Map<string, FeeOrder>>(new Map());
  const [exportScope, setExportScope] = useState<"FILTERED" | "SELECTED">("FILTERED");
  const [exporting, setExporting] = useState(false);
  const financeColumns = mode === "receipts" ? receiptColumns : orderColumns;
  const financeColumnPreferenceKey = `vebgenix.finance.${mode}.columns.v2`;
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [selectedColumnIds, setSelectedColumnIds] = useState<FinanceColumnId[]>(() =>
    loadColumnPreference(
      financeColumnPreferenceKey,
      financeColumns.map((column) => column.id),
      financeColumns.map((column) => column.id),
      mode === "receipts" ? ["receipt", "student"] : ["student", "class"],
    ),
  );
  const visibleColumnIds = useMemo(() => new Set(selectedColumnIds), [selectedColumnIds]);

  const [selected, setSelected] = useState<FeeOrder | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("UPI");
  const [reference, setReference] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [adjustAllocation, setAdjustAllocation] = useState(false);
  const [manualAllocation, setManualAllocation] = useState<Record<string, string>>({});
  const [collectionRequestId, setCollectionRequestId] = useState("");

  const [receipt, setReceipt] = useState<FinanceReceipt | null>(null);
  const [receiptCopies, setReceiptCopies] = useState<ReceiptCopyMode>("student");
  const [reviewPayment, setReviewPayment] = useState<FinancePayment | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<FinancePaymentAdjustment["type"]>("VOID");
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");

  const load = useCallback(async () => {
    if (!selectedCampus || !selectedAcademicYear) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (mode === "receipts") {
        const result = await listFinancePaymentPage({
          campusId: selectedCampus.id,
          academicYearId: selectedAcademicYear.id,
          ...(search ? { search } : {}),
          ...(receiptStatus ? { status: receiptStatus } : {}),
          ...(receiptMethod ? { method: receiptMethod } : {}),
          ...(paidFrom ? { paidFrom } : {}),
          ...(paidTo ? { paidTo } : {}),
          limit: pageSize,
          offset: (page - 1) * pageSize,
        });
        setPayments(result.items);
        setTotal(result.total);
      } else {
        const result = await listFeeOrderPage({
          campusId: selectedCampus.id,
          academicYearId: selectedAcademicYear.id,
          ...(classId ? { classId } : {}),
          ...(orderStatus ? { status: orderStatus } : {}),
          ...(sourceType ? { sourceType } : {}),
          ...(!orderStatus ? { payableOnly: true } : {}),
          ...(search ? { search } : {}),
          limit: pageSize,
          offset: (page - 1) * pageSize,
        });
        setOrders(result.items);
        setTotal(result.total);
      }
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to load financial records");
    } finally {
      setLoading(false);
    }
  }, [
    classId,
    mode,
    orderStatus,
    sourceType,
    page,
    pageSize,
    paidFrom,
    paidTo,
    receiptMethod,
    receiptStatus,
    search,
    selectedAcademicYear,
    selectedCampus,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selectedCampus) {
      setClasses([]);
      return;
    }
    void listClasses(selectedCampus.id).then((rows) =>
      setClasses(rows.filter((item) => item.status === "ACTIVE")),
    );
  }, [selectedCampus]);

  useEffect(() => {
    setSelectedOrders(new Map());
    setPage(1);
  }, [
    classId,
    mode,
    orderStatus,
    sourceType,
    paidFrom,
    paidTo,
    receiptMethod,
    receiptStatus,
    search,
    selectedAcademicYear?.id,
    selectedCampus?.id,
  ]);

  useEffect(() => {
    saveColumnPreference(financeColumnPreferenceKey, selectedColumnIds);
  }, [financeColumnPreferenceKey, selectedColumnIds]);

  const classNameById = useMemo(
    () => new Map(classes.map((item) => [item.id, item.name])),
    [classes],
  );

  const outstandingOrders = useMemo(
    () =>
      orders.filter(
        (item) => item.balanceMinor > 0 && item.status !== "CANCELLED" && item.status !== "CLOSED",
      ),
    [orders],
  );

  const totalOutstanding = outstandingOrders.reduce((sum, item) => sum + item.balanceMinor, 0);

  async function getFilteredFeeOrders(): Promise<FeeOrder[]> {
    if (!selectedCampus || !selectedAcademicYear) return [];
    const all: FeeOrder[] = [];
    for (let offset = 0; ; offset += 100) {
      const batch = await listFeeOrderPage({
        campusId: selectedCampus.id,
        academicYearId: selectedAcademicYear.id,
        ...(classId ? { classId } : {}),
        ...(orderStatus ? { status: orderStatus } : {}),
        ...(sourceType ? { sourceType } : {}),
        ...(!orderStatus ? { payableOnly: true } : {}),
        ...(search ? { search } : {}),
        limit: 100,
        offset,
      });
      all.push(
        ...batch.items.filter(
          (item) =>
            item.balanceMinor > 0 && item.status !== "CANCELLED" && item.status !== "CLOSED",
        ),
      );
      if (batch.items.length < 100) return all;
    }
  }

  async function exportFeeOrders(format: "XLSX" | "PDF") {
    setExporting(true);
    setError(null);
    try {
      const rows =
        exportScope === "SELECTED" ? [...selectedOrders.values()] : await getFilteredFeeOrders();
      if (!rows.length) throw new Error("No fee records are available to export");
      const columns = (
        [
          {
            id: "student",
            header: "Student",
            value: (row: FeeOrder) => row.studentName,
            width: 24,
          },
          {
            id: "class",
            header: "Class",
            value: (row: FeeOrder) => classNameById.get(row.classId) ?? "—",
            width: 15,
          },
          {
            id: "order",
            header: "Fee Order",
            value: (row: FeeOrder) => row.orderNumber,
            width: 20,
          },
          {
            id: "structure",
            header: "Structure",
            value: (row: FeeOrder) => row.structureName,
            width: 26,
          },
          {
            id: "policy",
            header: "Collection Policy",
            value: (row: FeeOrder) => row.collectionPolicy.replaceAll("_", " "),
            width: 18,
          },
          {
            id: "total",
            header: "Total",
            value: (row: FeeOrder) => row.totalMinor / 100,
            width: 14,
          },
          { id: "paid", header: "Paid", value: (row: FeeOrder) => row.paidMinor / 100, width: 14 },
          {
            id: "balance",
            header: "Balance",
            value: (row: FeeOrder) => row.balanceMinor / 100,
            width: 14,
          },
          { id: "status", header: "Status", value: (row: FeeOrder) => row.status, width: 16 },
        ] satisfies Array<ExportColumn<FeeOrder> & { id: OrderColumnId }>
      ).filter((column) => visibleColumnIds.has(column.id));
      const suffix = exportScope === "SELECTED" ? "selected" : "filtered";
      if (format === "XLSX")
        await exportRowsToExcel(`fee-records-${suffix}`, "Fee Records", columns, rows);
      else await exportRowsToPdf(`fee-records-${suffix}`, "Student Fee Records", columns, rows);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to export fee records");
    } finally {
      setExporting(false);
    }
  }

  function toggleOrder(order: FeeOrder) {
    setSelectedOrders((current) => {
      const next = new Map(current);
      if (next.has(order.id)) next.delete(order.id);
      else next.set(order.id, order);
      return next;
    });
  }

  function beginCollection(order: FeeOrder) {
    setSelected(order);
    setReference("");
    setPaymentNote("");
    setAdjustAllocation(false);
    setManualAllocation({});
    setCollectionRequestId(crypto.randomUUID());
    setError(null);
    setAmount((order.balanceMinor / 100).toFixed(2));
  }

  async function collect(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    const minor = Math.round(Number(amount) * 100);
    if (!Number.isSafeInteger(minor) || minor <= 0 || minor > selected.balanceMinor) {
      setError(`Enter an amount between ${money(1)} and ${money(selected.balanceMinor)}`);
      return;
    }
    const chargeAllocations = adjustAllocation
      ? selected.charges
          .map((charge) => ({
            chargeId: charge.id,
            amountMinor: Math.round(Number(manualAllocation[charge.id] ?? "0") * 100),
          }))
          .filter((allocation) => allocation.amountMinor > 0)
      : undefined;
    if (
      chargeAllocations &&
      chargeAllocations.reduce((sum, allocation) => sum + allocation.amountMinor, 0) !== minor
    ) {
      setError("Adjusted allocation must equal the amount received");
      return;
    }
    if (
      chargeAllocations?.some((allocation) => {
        const charge = selected.charges.find((item) => item.id === allocation.chargeId);
        return !charge || allocation.amountMinor > charge.balanceMinor;
      })
    ) {
      setError("Adjusted allocation cannot exceed a fee-head balance");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload = await collectFinancePayment({
        studentId: selected.studentId,
        method,
        reference: reference.trim(),
        note: paymentNote.trim(),
        allocations: [
          {
            feeOrderId: selected.id,
            amountMinor: minor,
            ...(chargeAllocations ? { chargeAllocations } : {}),
          },
        ],
        idempotencyKey: collectionRequestId,
      });
      setSelected(null);
      setCollectionRequestId("");
      await load();
      setReceipt(await getFinanceReceipt(payload.id));
    } catch (value) {
      setError(
        value instanceof Error ? value.message : "Payment collection could not be completed",
      );
    } finally {
      setBusy(false);
    }
  }

  async function openReceipt(id: string) {
    setError(null);
    try {
      setReceipt(await getFinanceReceipt(id));
    } catch (value) {
      setError(value instanceof Error ? value.message : "Receipt document could not be retrieved");
    }
  }

  function beginReview(payment: FinancePayment) {
    setReviewPayment(payment);
    setAdjustmentType("VOID");
    setAdjustmentAmount(((payment.amountMinor - payment.reversedMinor) / 100).toFixed(2));
    setAdjustmentReason("");
    setError(null);
  }

  const refundableMinor = reviewPayment
    ? reviewPayment.amountMinor - reviewPayment.reversedMinor
    : 0;

  async function submitAdjustment(event: FormEvent) {
    event.preventDefault();
    if (!reviewPayment) return;
    const parsed = Math.round(Number(adjustmentAmount) * 100);
    if (
      adjustmentType === "REFUND" &&
      (!Number.isSafeInteger(parsed) || parsed <= 0 || parsed > refundableMinor)
    ) {
      setError(`Refund amount must be between ${money(1)} and ${money(refundableMinor)}`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createFinancePaymentAdjustment({
        paymentId: reviewPayment.id,
        type: adjustmentType,
        reason: adjustmentReason.trim(),
        idempotencyKey: crypto.randomUUID(),
        ...(adjustmentType === "REFUND" ? { amountMinor: parsed } : {}),
      });
      setReviewPayment(null);
      await load();
    } catch (value) {
      setError(
        value instanceof Error ? value.message : "Payment adjustment could not be completed",
      );
    } finally {
      setBusy(false);
    }
  }

  const reviewLedgerReady =
    reviewPayment?.allocations.every((allocation) => allocation.chargeAllocations.length > 0) ??
    false;

  const parsedCollectionMinor = Math.round(Number(amount || "0") * 100);
  const automaticAllocationPreview = useMemo(() => {
    if (!selected || !Number.isSafeInteger(parsedCollectionMinor)) return [];
    let remaining = Math.max(0, parsedCollectionMinor);
    return [...selected.charges]
      .sort((a, b) => a.sequence - b.sequence)
      .map((charge) => {
        const paidNowMinor = Math.min(charge.balanceMinor, remaining);
        remaining -= paidNowMinor;
        return { ...charge, paidNowMinor };
      });
  }, [parsedCollectionMinor, selected]);
  const allocationPreview = useMemo(
    () =>
      adjustAllocation && selected
        ? [...selected.charges]
            .sort((a, b) => a.sequence - b.sequence)
            .map((charge) => ({
              ...charge,
              paidNowMinor: Math.round(Number(manualAllocation[charge.id] ?? "0") * 100),
            }))
        : automaticAllocationPreview,
    [adjustAllocation, automaticAllocationPreview, manualAllocation, selected],
  );
  const previewAllocatedMinor = allocationPreview.reduce(
    (sum, charge) => sum + Math.max(0, charge.paidNowMinor),
    0,
  );

  if (!selectedCampus) {
    return (
      <EmptyState
        title="Select an operating campus"
        description="Finance records are always campus scoped."
      />
    );
  }
  if (!selectedAcademicYear) {
    return (
      <EmptyState
        title="Select an academic year"
        description="Finance records are always academic-year scoped."
      />
    );
  }

  return (
    <section className="space-y-5">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            {mode === "collections"
              ? "Fee collection"
              : mode === "outstanding"
                ? "Outstanding fees"
                : "Receipts"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {selectedCampus.name} · {selectedAcademicYear.name}
          </p>
        </div>
        {mode !== "receipts" && (
          <div className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
            <WalletCards size={14} className="text-slate-400" />
            <span>{money(totalOutstanding)} outstanding on this page</span>
          </div>
        )}
        {mode === "receipts" && (
          <>
            <select
              aria-label="Filter payment method"
              value={receiptMethod}
              onChange={(event) => setReceiptMethod(event.target.value as PaymentMethod | "")}
              className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700"
            >
              <option value="">All methods</option>
              {["CASH", "CARD", "UPI", "BANK_TRANSFER", "CHEQUE", "ONLINE"].map((value) => (
                <option key={value} value={value}>
                  {value.replaceAll("_", " ")}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter receipt status"
              value={receiptStatus}
              onChange={(event) =>
                setReceiptStatus(event.target.value as FinancePayment["status"] | "")
              }
              className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700"
            >
              <option value="">All statuses</option>
              {["SUCCESS", "PARTIALLY_REFUNDED", "VOIDED", "REFUNDED"].map((value) => (
                <option key={value} value={value}>
                  {value.replaceAll("_", " ")}
                </option>
              ))}
            </select>
            <Input
              aria-label="Paid from"
              type="date"
              value={paidFrom}
              onChange={(event) => setPaidFrom(event.target.value)}
              className="w-auto"
            />
            <Input
              aria-label="Paid to"
              type="date"
              value={paidTo}
              onChange={(event) => setPaidTo(event.target.value)}
              className="w-auto"
            />
          </>
        )}
      </header>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={
              mode === "receipts"
                ? "Search receipt or student"
                : "Search student, registration or order"
            }
            className="pl-9"
          />
        </div>
        {mode !== "receipts" && (
          <>
            <select
              aria-label="Filter class"
              value={classId}
              onChange={(event) => setClassId(event.target.value)}
              className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-600"
            >
              <option value="">All classes</option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter fee type"
              value={sourceType}
              onChange={(event) =>
                setSourceType(event.target.value as FeeOrder["sourceType"] | "")
              }
              className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-600"
            >
              <option value="">All fee types</option>
              <option value="ANNUAL">Annual fees</option>
              <option value="GENERAL">Additional fees</option>
              <option value="TRANSFER_ADJUSTMENT">Transfer adjustments</option>
            </select>
            <select
              aria-label="Filter order status"
              value={orderStatus}
              onChange={(event) => setOrderStatus(event.target.value as FeeOrder["status"] | "")}
              className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-600"
            >
              <option value="">Outstanding</option>
              <option value="OPEN">Open</option>
              <option value="PARTIALLY_PAID">Partially paid</option>
            </select>
          </>
        )}
        <Button size="sm" onClick={() => void load()}>
          Search
        </Button>
        {mode !== "receipts" && (
          <>
            <select
              aria-label="Export selection"
              value={exportScope}
              onChange={(event) => setExportScope(event.target.value as "FILTERED" | "SELECTED")}
              className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-600"
            >
              <option value="FILTERED">Filtered results</option>
              <option value="SELECTED" disabled={!selectedOrders.size}>
                Selected ({selectedOrders.size})
              </option>
            </select>
            <Button
              variant="outline"
              size="icon-sm"
              title="Download Excel"
              disabled={exporting || (exportScope === "SELECTED" && !selectedOrders.size)}
              onClick={() => void exportFeeOrders("XLSX")}
            >
              <FileSpreadsheet size={16} />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              title="Download PDF"
              disabled={exporting || (exportScope === "SELECTED" && !selectedOrders.size)}
              onClick={() => void exportFeeOrders("PDF")}
            >
              <FileText size={16} />
            </Button>
          </>
        )}
        <Button
          variant="outline"
          size="sm"
          aria-expanded={columnsOpen}
          onClick={() => setColumnsOpen((current) => !current)}
        >
          <Columns3 size={15} /> Columns ({selectedColumnIds.length})
        </Button>
      </div>

      {columnsOpen && (
        <div
          className="border-y border-slate-200 bg-white px-4 py-3"
          aria-label="Finance table columns"
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-slate-800">Visible finance columns</p>
              <p className="text-[11px] text-slate-500">
                Selections are retained for this finance page after refresh.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedColumnIds(financeColumns.map((column) => column.id))}
            >
              Select all
            </Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {financeColumns.map((column) => (
              <label
                key={column.id}
                className="flex cursor-pointer items-center gap-2 rounded border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={visibleColumnIds.has(column.id)}
                  onChange={() =>
                    setSelectedColumnIds((current) => {
                      if (current.includes(column.id) && current.length === 1) return current;
                      return current.includes(column.id)
                        ? current.filter((item) => item !== column.id)
                        : [...current, column.id];
                    })
                  }
                  className="h-4 w-4 rounded border-slate-300"
                />
                {column.label}
              </label>
            ))}
          </div>
        </div>
      )}

      {error ? (
        <ErrorState message={error} retry={() => void load()} />
      ) : loading ? (
        <LoadingState
          label={mode === "receipts" ? "Loading receipts" : "Loading student fee orders"}
        />
      ) : mode === "receipts" ? (
        <ReceiptTable
          payments={payments}
          visibleColumns={visibleColumnIds}
          openReceipt={openReceipt}
          reviewPayment={beginReview}
        />
      ) : (
        <OrderTable
          orders={outstandingOrders}
          classes={classNameById}
          selected={selectedOrders}
          toggleOrder={toggleOrder}
          setSelected={setSelectedOrders}
          visibleColumns={visibleColumnIds}
          {...(mode === "collections" ? { collect: beginCollection } : {})}
        />
      )}
      {!loading && !error ? (
        <ServerPagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={(value) => {
            setPageSize(value);
            setPage(1);
          }}
        />
      ) : null}

      {/* Collect Payment Modal */}
      <Modal
        open={Boolean(selected)}
        title="Collect payment"
        {...(selected
          ? {
              description: `${selected.studentName} · ${selected.registrationNumber}`,
            }
          : {})}
        onClose={() => {
          if (!busy) {
            setSelected(null);
            setCollectionRequestId("");
          }
        }}
      >
        <form onSubmit={(event) => void collect(event)} className="space-y-4">
          <div className="grid grid-cols-3 gap-3 border-y border-slate-200 py-4 text-sm">
            <div>
              <span className="block text-xs text-slate-500">Order total</span>
              <strong className="text-slate-900">{money(selected?.totalMinor ?? 0)}</strong>
            </div>
            <div>
              <span className="block text-xs text-slate-500">Total paid</span>
              <strong className="text-slate-900">{money(selected?.paidMinor ?? 0)}</strong>
            </div>
            <div>
              <span className="block text-xs text-slate-500">Balance</span>
              <strong className="text-slate-900">{money(selected?.balanceMinor ?? 0)}</strong>
            </div>
            <p className="col-span-3 text-xs text-slate-500">
              {selected?.orderNumber} · {selected?.structureName} ·{" "}
              {selected?.collectionPolicy === "FULL_ONLY"
                ? "Full balance collection required"
                : "Partial payment allowed"}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="col-amount">Amount (INR)</Label>
              <Input
                id="col-amount"
                required
                inputMode="decimal"
                type="text"
                value={amount}
                onChange={(event) =>
                  /^\d*(\.\d{0,2})?$/.test(event.target.value) && setAmount(event.target.value)
                }
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="col-method">Payment method</Label>
              <select
                id="col-method"
                value={method}
                onChange={(event) => setMethod(event.target.value as PaymentMethod)}
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600"
              >
                <option value="UPI">UPI</option>
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="BANK_TRANSFER">Bank transfer</option>
                <option value="CHEQUE">Cheque</option>
                <option value="ONLINE">Online</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Payment date</Label>
              <Input
                type="text"
                value={new Intl.DateTimeFormat("en-IN", {
                  dateStyle: "medium",
                }).format(new Date())}
                readOnly
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="col-ref">
                {method === "CASH" ? "Reference (optional)" : "Transaction reference"}
              </Label>
              <Input
                id="col-ref"
                required={method !== "CASH"}
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                placeholder="Transaction or cheque reference"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="col-note">Note (optional)</Label>
                <span className="text-xs text-slate-400">{paymentNote.length}/500</span>
              </div>
              <textarea
                id="col-note"
                value={paymentNote}
                maxLength={500}
                rows={2}
                onChange={(event) => setPaymentNote(event.target.value)}
                placeholder="Add collection context for the finance record"
                className="flex w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600"
              />
            </div>
          </div>

          <div className="space-y-3 border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <strong className="block text-sm text-slate-900">Allocation preview</strong>
                <span className="text-xs text-slate-500">
                  Automatic allocation follows the priority saved in the fee structure.
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setAdjustAllocation((current) => !current);
                  setManualAllocation(
                    Object.fromEntries(
                      automaticAllocationPreview.map((charge) => [
                        charge.id,
                        charge.paidNowMinor ? (charge.paidNowMinor / 100).toFixed(2) : "",
                      ]),
                    ),
                  );
                }}
              >
                {adjustAllocation ? "Use automatic allocation" : "Adjust allocation"}
              </Button>
            </div>
            <div className="overflow-hidden rounded-md border border-slate-200">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fee head</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Paid now</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allocationPreview.map((charge) => (
                    <TableRow key={charge.id}>
                      <TableCell className="font-semibold">{charge.label}</TableCell>
                      <TableCell>{money(charge.amountMinor)}</TableCell>
                      <TableCell>{money(charge.paidMinor)}</TableCell>
                      <TableCell>{money(charge.balanceMinor)}</TableCell>
                      <TableCell>
                        {adjustAllocation ? (
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={manualAllocation[charge.id] ?? ""}
                            aria-label={`Allocate to ${charge.label}`}
                            onChange={(event) =>
                              /^\d*(\.\d{0,2})?$/.test(event.target.value) &&
                              setManualAllocation((current) => ({
                                ...current,
                                [charge.id]: event.target.value,
                              }))
                            }
                            className="h-8 w-28"
                          />
                        ) : (
                          <strong>{money(charge.paidNowMinor)}</strong>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span
                className={
                  previewAllocatedMinor === parsedCollectionMinor
                    ? "text-slate-600"
                    : "font-semibold text-red-700"
                }
              >
                Allocated {money(previewAllocatedMinor)}
              </span>
              <strong className="text-slate-900">
                Balance after payment:{" "}
                {money(Math.max(0, (selected?.balanceMinor ?? 0) - parsedCollectionMinor))}
              </strong>
            </div>
          </div>

          <Separator />
          <div className="flex justify-end">
            <Button
              disabled={
                busy ||
                (method !== "CASH" && !reference.trim()) ||
                previewAllocatedMinor !== parsedCollectionMinor
              }
            >
              {busy ? "Collecting..." : "Collect & generate receipt"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Receipt Modal */}
      <Modal
        open={Boolean(receipt)}
        title={receipt?.receiptNumber ?? "Receipt"}
        description="Generated by Finance service"
        onClose={() => setReceipt(null)}
      >
        {receipt && (
          <div className="space-y-4">
            <ReceiptDocument receipt={receipt} />
            <Separator />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div
                className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-1"
                aria-label="Receipt copies"
              >
                <button
                  type="button"
                  onClick={() => setReceiptCopies("student")}
                  className={`rounded px-3 py-1.5 text-xs font-semibold ${receiptCopies === "student" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
                >
                  Student copy
                </button>
                <button
                  type="button"
                  onClick={() => setReceiptCopies("both")}
                  className={`rounded px-3 py-1.5 text-xs font-semibold ${receiptCopies === "both" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
                >
                  Student + office
                </button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    void printReceipt(receipt, receiptCopies).catch((cause) =>
                      setError(
                        cause instanceof Error ? cause.message : "Receipt could not be printed",
                      ),
                    )
                  }
                >
                  Print
                </Button>
                <Button
                  size="sm"
                  onClick={() =>
                    void downloadReceipt(receipt, receiptCopies).catch((cause) =>
                      setError(
                        cause instanceof Error ? cause.message : "Receipt could not be downloaded",
                      ),
                    )
                  }
                >
                  Download
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Adjustments Modal */}
      <Modal
        open={Boolean(reviewPayment)}
        title="Payment correction review"
        {...(reviewPayment
          ? {
              description: `${reviewPayment.receiptNumber} · ${reviewPayment.studentName}`,
            }
          : {})}
        onClose={() => !busy && setReviewPayment(null)}
      >
        <form onSubmit={(event) => void submitAdjustment(event)} className="space-y-4">
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-sm space-y-1">
            <span className="block text-slate-400 font-medium">Original payment</span>
            <strong className="block text-xl text-slate-900">
              {money(reviewPayment?.amountMinor ?? 0)}
            </strong>
            <span className="block text-xs text-slate-500">
              {money(reviewPayment?.reversedMinor ?? 0)} reversed ·{" "}
              {money((reviewPayment?.amountMinor ?? 0) - (reviewPayment?.reversedMinor ?? 0))}{" "}
              remaining
            </span>
          </div>

          {!reviewLedgerReady && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-705"
            >
              This payment predates charge-level allocation tracking. Automated correction is
              blocked.
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="adj-type">Action</Label>
            <select
              id="adj-type"
              disabled={!reviewLedgerReady}
              value={adjustmentType}
              onChange={(event) =>
                setAdjustmentType(event.target.value as FinancePaymentAdjustment["type"])
              }
              className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600 disabled:opacity-50"
            >
              <option value="VOID">Void incorrect payment in full</option>
              <option value="REFUND" disabled={refundableMinor <= 0}>
                Refund eligible amount
              </option>
            </select>
          </div>

          {adjustmentType === "REFUND" ? (
            <div className="space-y-1.5">
              <Label htmlFor="adj-amount">Refund amount (INR)</Label>
              <Input
                id="adj-amount"
                type="text"
                inputMode="decimal"
                required
                value={adjustmentAmount}
                onChange={(event) =>
                  /^\d*(\.\d{0,2})?$/.test(event.target.value) &&
                  setAdjustmentAmount(event.target.value)
                }
                placeholder="0.00"
              />
              <span className="block text-xs text-slate-400 mt-1">
                {money(refundableMinor)} currently eligible from refundable fee heads
              </span>
            </div>
          ) : (
            <p className="text-xs text-slate-500 leading-normal bg-slate-50 border border-slate-200 rounded-md p-3">
              Voiding restores the entire remaining payment to the original fee order. It does not
              delete the payment or receipt.
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="adj-reason">Reason</Label>
            <textarea
              id="adj-reason"
              required
              minLength={10}
              value={adjustmentReason}
              onChange={(event) => setAdjustmentReason(event.target.value)}
              placeholder="Record the verified reason for this correction"
              rows={3}
              className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600 resize-none"
            />
          </div>

          <Separator />
          <div className="flex justify-end">
            <Button
              variant="destructive"
              disabled={busy || !reviewLedgerReady || adjustmentReason.trim().length < 10}
            >
              {busy
                ? "Processing..."
                : adjustmentType === "VOID"
                  ? "Confirm void"
                  : "Confirm refund"}
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}

function OrderTable({
  orders,
  classes,
  selected,
  toggleOrder,
  setSelected,
  visibleColumns,
  collect,
}: {
  orders: FeeOrder[];
  classes: Map<string, string>;
  selected: Map<string, FeeOrder>;
  toggleOrder: (order: FeeOrder) => void;
  setSelected: (orders: Map<string, FeeOrder>) => void;
  visibleColumns: ReadonlySet<FinanceColumnId>;
  collect?: (order: FeeOrder) => void;
}) {
  if (!orders.length)
    return (
      <EmptyState
        title="No outstanding fee orders"
        description="Orders appear after admission confirmation, enrollment, and an active class fee mapping."
      />
    );

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <input
                type="checkbox"
                aria-label="Select all displayed fee records"
                checked={orders.length > 0 && orders.every((order) => selected.has(order.id))}
                onChange={() => {
                  const next = new Map(selected);
                  if (orders.every((order) => selected.has(order.id)))
                    orders.forEach((order) => next.delete(order.id));
                  else orders.forEach((order) => next.set(order.id, order));
                  setSelected(next);
                }}
                className="h-4 w-4 rounded border-slate-300"
              />
            </TableHead>
            {visibleColumns.has("student") && <TableHead>Student</TableHead>}
            {visibleColumns.has("class") && <TableHead>Class</TableHead>}
            {visibleColumns.has("order") && <TableHead>Fee order</TableHead>}
            {visibleColumns.has("structure") && <TableHead>Structure</TableHead>}
            {visibleColumns.has("policy") && <TableHead>Collection policy</TableHead>}
            {visibleColumns.has("total") && <TableHead>Total</TableHead>}
            {visibleColumns.has("paid") && <TableHead>Paid</TableHead>}
            {visibleColumns.has("balance") && <TableHead>Balance</TableHead>}
            {visibleColumns.has("status") && <TableHead>Status</TableHead>}
            {collect ? <TableHead>Action</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => {
            return (
              <TableRow
                key={order.id}
                className={collect ? "cursor-pointer" : undefined}
                onClick={collect ? () => collect(order) : undefined}
              >
                <TableCell onClick={(event) => event.stopPropagation()}>
                  <input
                    type="checkbox"
                    aria-label={`Select fee record for ${order.studentName}`}
                    checked={selected.has(order.id)}
                    onChange={() => toggleOrder(order)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                </TableCell>
                {visibleColumns.has("student") && (
                  <TableCell>
                    <Link
                      className="font-semibold text-slate-900 hover:text-accent-600 transition-colors"
                      to={`/admin/students/${order.studentId}`}
                      onClick={(event) => event.stopPropagation()}
                    >
                      {order.studentName}
                    </Link>
                  </TableCell>
                )}
                {visibleColumns.has("class") && (
                  <TableCell className="text-slate-650 text-sm">
                    {classes.get(order.classId) ?? "—"}
                  </TableCell>
                )}
                {visibleColumns.has("order") && (
                  <TableCell className="text-slate-500 font-mono text-xs">
                    {order.orderNumber}
                  </TableCell>
                )}
                {visibleColumns.has("structure") && (
                  <TableCell>
                    <span className="block text-sm text-slate-800">{order.structureName}</span>
                    <span className="block text-[11px] text-slate-400">{order.scheduleName}</span>
                  </TableCell>
                )}
                {visibleColumns.has("policy") && (
                  <TableCell>
                    <span className="block text-sm text-slate-800">
                      {order.collectionPolicy === "FULL_ONLY" ? "Full balance" : "Partial allowed"}
                    </span>
                  </TableCell>
                )}
                {visibleColumns.has("total") && (
                  <TableCell className="text-slate-650 text-sm">
                    {money(order.totalMinor)}
                  </TableCell>
                )}
                {visibleColumns.has("paid") && (
                  <TableCell className="text-slate-650 text-sm">{money(order.paidMinor)}</TableCell>
                )}
                {visibleColumns.has("balance") && (
                  <TableCell>
                    <strong className="text-slate-900">{money(order.balanceMinor)}</strong>
                  </TableCell>
                )}
                {visibleColumns.has("status") && (
                  <TableCell>
                    <Badge
                      variant={
                        order.status === "PAID"
                          ? "success"
                          : order.status === "PARTIALLY_PAID"
                            ? "brand"
                            : "warning"
                      }
                    >
                      {order.status.replaceAll("_", " ")}
                    </Badge>
                  </TableCell>
                )}
                {collect ? (
                  <TableCell onClick={(event) => event.stopPropagation()}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => collect(order)}
                      className="h-8 px-2.5 text-xs"
                    >
                      <Banknote size={13} />
                      Collect
                    </Button>
                  </TableCell>
                ) : null}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function ReceiptTable({
  payments,
  openReceipt,
  reviewPayment,
  visibleColumns,
}: {
  payments: FinancePayment[];
  openReceipt: (id: string) => void;
  reviewPayment: (payment: FinancePayment) => void;
  visibleColumns: ReadonlySet<FinanceColumnId>;
}) {
  if (!payments.length)
    return (
      <EmptyState
        title="No receipts found"
        description="Successful backend-generated receipts appear here."
      />
    );

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            {visibleColumns.has("receipt") && <TableHead>Receipt</TableHead>}
            {visibleColumns.has("student") && <TableHead>Student</TableHead>}
            {visibleColumns.has("paid") && <TableHead>Paid</TableHead>}
            {visibleColumns.has("reversed") && <TableHead>Reversed</TableHead>}
            {visibleColumns.has("method") && <TableHead>Method</TableHead>}
            {visibleColumns.has("status") && <TableHead>Status</TableHead>}
            {visibleColumns.has("date") && <TableHead>Date</TableHead>}
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((payment) => (
            <TableRow key={payment.id}>
              {visibleColumns.has("receipt") && (
                <TableCell className="font-semibold text-slate-900">
                  {payment.receiptNumber}
                </TableCell>
              )}
              {visibleColumns.has("student") && (
                <TableCell className="text-slate-750">{payment.studentName}</TableCell>
              )}
              {visibleColumns.has("paid") && (
                <TableCell className="text-slate-650 text-sm">
                  {money(payment.amountMinor)}
                </TableCell>
              )}
              {visibleColumns.has("reversed") && (
                <TableCell className="text-slate-650 text-sm">
                  {money(payment.reversedMinor)}
                </TableCell>
              )}
              {visibleColumns.has("method") && (
                <TableCell className="text-slate-650 text-sm">
                  {payment.method.replaceAll("_", " ")}
                </TableCell>
              )}
              {visibleColumns.has("status") && (
                <TableCell>
                  <Badge variant={payment.status === "SUCCESS" ? "success" : "secondary"}>
                    {payment.status.replaceAll("_", " ")}
                  </Badge>
                </TableCell>
              )}
              {visibleColumns.has("date") && (
                <TableCell className="text-slate-500 text-xs">{date(payment.paidAt)}</TableCell>
              )}
              <TableCell>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title="View receipt"
                    aria-label={`View receipt ${payment.receiptNumber}`}
                    onClick={() => openReceipt(payment.id)}
                  >
                    <FileText size={15} />
                  </Button>
                  {payment.status !== "VOIDED" && payment.status !== "REFUNDED" && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title="Review correction or refund"
                      aria-label={`Review ${payment.receiptNumber}`}
                      onClick={() => void reviewPayment(payment)}
                    >
                      <RotateCcw size={15} />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ReceiptDocument({ receipt }: { receipt: FinanceReceipt }) {
  return (
    <article className="border border-slate-200 bg-white rounded-lg p-5 text-sm space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <span className="block text-xs text-slate-400 font-medium">Receipt number</span>
          <strong className="block text-slate-905">{receipt.receiptNumber}</strong>
        </div>
        <Badge variant={receipt.status === "SUCCESS" ? "success" : "secondary"}>
          {receipt.status}
        </Badge>
      </header>
      <Separator />
      <dl className="grid grid-cols-2 gap-3">
        <div>
          <dt className="text-slate-400 font-medium text-xs">Student</dt>
          <dd className="font-semibold text-slate-800">{receipt.student.name}</dd>
        </div>
        <div>
          <dt className="text-slate-400 font-medium text-xs">Paid amount</dt>
          <dd className="font-semibold text-slate-800">{money(receipt.amountMinor)}</dd>
        </div>
        <div>
          <dt className="text-slate-400 font-medium text-xs">Method</dt>
          <dd className="font-semibold text-slate-800">{receipt.method.replaceAll("_", " ")}</dd>
        </div>
        <div>
          <dt className="text-slate-400 font-medium text-xs">Paid on</dt>
          <dd className="font-semibold text-slate-800">{date(receipt.paidAt)}</dd>
        </div>
        {receipt.reference && (
          <div className="col-span-2">
            <dt className="text-slate-400 font-medium text-xs">Reference</dt>
            <dd className="font-semibold text-slate-850 bg-slate-50 border border-slate-150 rounded px-2.5 py-1 text-xs">
              {receipt.reference}
            </dd>
          </div>
        )}
      </dl>
      <Separator />
      <div className="space-y-2">
        <span className="block text-xs text-slate-400 font-medium">Allocated charges</span>
        {receipt.allocations.map((item) => (
          <div key={item.feeOrderId} className="py-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-650">{item.label}</span>
              <strong className="text-slate-900">{money(item.amountMinor)}</strong>
            </div>
            {item.chargeAllocations.map((charge) => (
              <div
                key={charge.chargeId}
                className="mt-1 flex items-center justify-between pl-4 text-slate-500"
              >
                <span>{charge.label}</span>
                <span>{money(charge.amountMinor)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
      {receipt.note ? (
        <>
          <Separator />
          <div>
            <span className="block text-xs font-medium text-slate-400">Note</span>
            <p className="mt-1 text-xs text-slate-650">{receipt.note}</p>
          </div>
        </>
      ) : null}
      <Separator />
      <footer className="text-[10px] text-slate-400 text-center leading-normal">
        Issued {date(receipt.issuedAt)} · This receipt is generated from the authoritative payment
        record.
      </footer>
    </article>
  );
}

async function printReceipt(receipt: FinanceReceipt, copies: ReceiptCopyMode) {
  await printReceiptPdf(receipt, copies);
}

async function downloadReceipt(receipt: FinanceReceipt, copies: ReceiptCopyMode) {
  await downloadReceiptPdf(receipt, copies);
}

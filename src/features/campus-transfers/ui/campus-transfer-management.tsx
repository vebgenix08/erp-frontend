import { ArrowRight, CheckCircle2, RefreshCw, Search, XCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { listClasses } from "../../academic-structure/api/academic-structure.api";
import type { AcademicClass } from "../../academic-structure/model/academic-structure.types";
import {
  approveCampusTransfer,
  cancelCampusTransfer,
  listCampusTransferPage,
  retryCampusTransfer,
  type CampusTransfer,
} from "../../students/api/students.api";
import { listCampuses } from "../../tenant-settings/api/settings.api";
import type { Campus } from "../../tenant-settings/model/settings.types";
import { Badge } from "../../../shared/ui/badge";
import { Button } from "../../../shared/ui/button";
import { Input } from "../../../shared/ui/input";
import { Modal } from "../../../shared/ui/modal";
import { EmptyState, ErrorState, LoadingState } from "../../../shared/ui/page-state";
import { ServerPagination } from "../../../shared/ui/server-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../shared/ui/table";

const statuses: Array<CampusTransfer["status"] | "ALL"> = [
  "ALL",
  "UNDER_REVIEW",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
];
const badge = (status: CampusTransfer["status"]) =>
  status === "COMPLETED"
    ? "success"
    : status === "FAILED"
      ? "destructive"
      : status === "UNDER_REVIEW"
        ? "warning"
        : "secondary";

export function CampusTransferManagement() {
  const [items, setItems] = useState<CampusTransfer[]>([]),
    [campuses, setCampuses] = useState<Campus[]>([]),
    [classes, setClasses] = useState<AcademicClass[]>([]);
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState<(typeof statuses)[number]>("ALL"),
    [page, setPage] = useState(1),
    [pageSize, setPageSize] = useState(20),
    [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<CampusTransfer | null>(null),
    [cancelReason, setCancelReason] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = search.trim();
      const [result, campusRows] = await Promise.all([
        listCampusTransferPage({
          ...(query ? { search: query } : {}),
          ...(status !== "ALL" ? { status } : {}),
          page,
          pageSize,
        }),
        listCampuses(),
      ]);
      const classRows = (
        await Promise.all(campusRows.map((campus) => listClasses(campus.id)))
      ).flat();
      setItems(result.items);
      setTotal(result.total);
      setCampuses(campusRows);
      setClasses(classRows);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to load campus transfers");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, status]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => setPage(1), [search, status]);
  const campusNames = useMemo(
    () => new Map(campuses.map((item) => [item.id, item.name])),
    [campuses],
  );
  const classNames = useMemo(() => new Map(classes.map((item) => [item.id, item.name])), [classes]);
  const replace = (saved: CampusTransfer) => {
    setItems((current) => current.map((item) => (item.id === saved.id ? saved : item)));
    setSelected(saved);
  };
  const approve = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      replace(await approveCampusTransfer(selected.id));
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to approve transfer");
    } finally {
      setBusy(false);
    }
  };
  const retry = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      replace(await retryCampusTransfer(selected.id));
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to retry transfer");
    } finally {
      setBusy(false);
    }
  };
  const cancel = async () => {
    if (!selected || !cancelReason.trim()) return;
    setBusy(true);
    setError(null);
    try {
      replace(await cancelCampusTransfer(selected.id, cancelReason.trim()));
      setCancelReason("");
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to cancel transfer");
    } finally {
      setBusy(false);
    }
  };
  if (loading && !items.length) return <LoadingState label="Loading campus transfers" />;
  if (error && !items.length) return <ErrorState message={error} retry={() => void load()} />;
  return (
    <section className="space-y-5">
      <header>
        <h1 className="text-xl font-bold text-slate-900">Campus transfers</h1>
        <p className="mt-1 text-sm text-slate-500">
          Review student movement, finance handling, recovery status and enrollment completion.
        </p>
      </header>
      {error ? (
        <div
          role="alert"
          className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-3 border-y border-slate-200 bg-white py-3">
        <div className="relative min-w-64 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-9"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search student or registration number"
          />
        </div>
        <select
          aria-label="Transfer status"
          value={status}
          onChange={(event) => setStatus(event.target.value as typeof status)}
          className="h-9 border border-slate-200 bg-white px-3 text-sm"
        >
          {statuses.map((item) => (
            <option key={item} value={item}>
              {item.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </div>
      {items.length ? (
        <>
          <div className="overflow-x-auto border border-slate-200 bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Movement</TableHead>
                  <TableHead>Effective date</TableHead>
                  <TableHead>Finance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <strong className="block text-slate-900">{item.studentName}</strong>
                      <span className="text-xs text-slate-500">
                        {item.registrationNumber}
                        {item.registrationAction === "REGENERATE"
                          ? ` -> ${item.targetRegistrationNumber}`
                          : ""}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-2 text-sm">
                        {campusNames.get(item.source.campusId) ?? "Unavailable campus"}
                        <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                        {campusNames.get(item.target.campusId) ?? "Unavailable campus"}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {classNames.get(item.source.classId) ?? "Unavailable class"} to{" "}
                        {classNames.get(item.target.classId) ?? "Unavailable class"}
                      </span>
                    </TableCell>
                    <TableCell>{new Date(item.effectiveAt).toLocaleDateString("en-IN")}</TableCell>
                    <TableCell className="max-w-64 text-xs text-slate-600">
                      {item.warning ??
                        (item.financeAssessment
                          ? "Finance assessment completed"
                          : "Pending assessment")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={badge(item.status)}>{item.status.replaceAll("_", " ")}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelected(item);
                          setCancelReason("");
                        }}
                      >
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
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
        </>
      ) : (
        <EmptyState
          title="No campus transfers"
          description="Transfer requests created from a student profile will appear here."
        />
      )}
      <Modal
        open={Boolean(selected)}
        title={selected ? `Campus transfer for ${selected.studentName}` : "Campus transfer"}
        description="Internal references are intentionally hidden. Review the operational evidence before acting."
        onClose={() => setSelected(null)}
      >
        {selected ? (
          <div className="space-y-4 text-sm">
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">From</dt>
                <dd className="font-semibold">
                  {campusNames.get(selected.source.campusId) ?? "Unavailable campus"} ·{" "}
                  {classNames.get(selected.source.classId) ?? "Unavailable class"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">To</dt>
                <dd className="font-semibold">
                  {campusNames.get(selected.target.campusId) ?? "Unavailable campus"} ·{" "}
                  {classNames.get(selected.target.classId) ?? "Unavailable class"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Reason</dt>
                <dd className="font-semibold">{selected.reason}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Status</dt>
                <dd>
                  <Badge variant={badge(selected.status)}>
                    {selected.status.replaceAll("_", " ")}
                  </Badge>
                </dd>
              </div>
            </dl>
            {selected.warning ? (
              <div className="border border-amber-200 bg-amber-50 p-3 text-amber-800">
                {selected.warning}
              </div>
            ) : null}
            {selected.failureReason ? (
              <div className="border border-red-200 bg-red-50 p-3 text-red-700">
                {selected.failureReason}
              </div>
            ) : null}
            <div>
              <h3 className="font-semibold text-slate-900">Workflow history</h3>
              <div className="mt-2 divide-y divide-slate-100 border border-slate-200">
                {selected.history.map((item, index) => (
                  <div
                    key={`${item.at}-${index}`}
                    className="flex items-start justify-between gap-3 px-3 py-2"
                  >
                    <span>{item.note ?? item.status.replaceAll("_", " ")}</span>
                    <time className="shrink-0 text-xs text-slate-400">
                      {new Date(item.at).toLocaleString("en-IN")}
                    </time>
                  </div>
                ))}
              </div>
            </div>
            {["UNDER_REVIEW", "FAILED"].includes(selected.status) ? (
              <div className="space-y-3 border-t border-slate-200 pt-4">
                <Input
                  value={cancelReason}
                  onChange={(event) => setCancelReason(event.target.value)}
                  placeholder="Cancellation reason (required only when cancelling)"
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    disabled={busy || !cancelReason.trim()}
                    onClick={() => void cancel()}
                  >
                    <XCircle className="h-4 w-4" />
                    Cancel transfer
                  </Button>
                  {selected.status === "UNDER_REVIEW" ? (
                    <Button disabled={busy} onClick={() => void approve()}>
                      <CheckCircle2 className="h-4 w-4" />
                      Approve finance review
                    </Button>
                  ) : (
                    <Button disabled={busy} onClick={() => void retry()}>
                      <RefreshCw className="h-4 w-4" />
                      Retry workflow
                    </Button>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </section>
  );
}

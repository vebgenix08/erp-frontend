import { CheckSquare, Plus, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { listClasses, listSections } from "../../academic-structure/api/academic-structure.api";
import { listStudentPage } from "../../students/api/students.api";
import { useSelectedAcademicYear } from "../../tenant-settings/model/selected-academic-year-provider";
import { useSelectedCampus } from "../../tenant-settings/model/selected-campus-provider";
import { getFeeConfiguration } from "../api/fee-configuration.api";
import { createGeneralCharge, listGeneralCharges } from "../api/finance-operations.api";
import type { FeeHead } from "../model/fee-configuration.types";
import type { GeneralCharge } from "../model/finance-operations.types";
import type { AcademicClass, Section } from "../../academic-structure/model/academic-structure.types";
import type { Student } from "../../students/model/student.types";
import { EmptyState, ErrorState, LoadingState } from "../../../shared/ui/page-state";
import { Modal } from "../../../shared/ui/modal";
import { Button } from "../../../shared/ui/button";
import { Input } from "../../../shared/ui/input";
import { Label } from "../../../shared/ui/label";
import { Badge } from "../../../shared/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../shared/ui/table";
import { Separator } from "../../../shared/ui/separator";
import { cn } from "../../../shared/ui/utils";

const money = (minor: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(minor / 100);


export function GeneralChargeManagement() {
  const { selectedCampus } = useSelectedCampus();
  const { selectedAcademicYear } = useSelectedAcademicYear();
  const [charges, setCharges] = useState<GeneralCharge[]>([]);
  const [heads, setHeads] = useState<FeeHead[]>([]);
  const [classes, setClasses] = useState<AcademicClass[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [feeHeadId, setFeeHeadId] = useState("");
  const [amount, setAmount] = useState("");
  const [policy, setPolicy] = useState<GeneralCharge["collectionPolicy"]>("FULL_ONLY");
  const [targetType, setTargetType] = useState<GeneralCharge["target"]["type"]>("CLASS");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    if (!selectedCampus || !selectedAcademicYear) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [history, config, classRows, sectionRows, studentRows] = await Promise.all([
        listGeneralCharges({ campusId: selectedCampus.id, academicYearId: selectedAcademicYear.id }),
        getFeeConfiguration(selectedCampus.id, selectedAcademicYear.id),
        listClasses(selectedCampus.id),
        listSections(selectedCampus.id),
        listStudentPage({
          campusId: selectedCampus.id,
          academicYearId: selectedAcademicYear.id,
          status: "ACTIVE",
          page: 1,
          pageSize: 100,
          sortBy: "name",
          sortDirection: "ASC",
        }),
      ]);
      setCharges(history);
      setHeads(config.feeHeads.filter((item) => item.status === "ACTIVE"));
      setClasses(classRows.filter((item) => item.status === "ACTIVE"));
      setSections(sectionRows.filter((item) => item.status === "ACTIVE"));
      setStudents(studentRows.items);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to load general charges");
    } finally {
      setLoading(false);
    }
  }, [selectedAcademicYear, selectedCampus]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (
      targetType !== "STUDENT" ||
      !selectedCampus ||
      !selectedAcademicYear
    )
      return;
    const timer = window.setTimeout(() => {
      void listStudentPage({
        campusId: selectedCampus.id,
        academicYearId: selectedAcademicYear.id,
        status: "ACTIVE",
        ...(search.trim() ? { search: search.trim() } : {}),
        page: 1,
        pageSize: 100,
        sortBy: "name",
        sortDirection: "ASC",
      })
        .then((page) => setStudents(page.items))
        .catch((value) =>
          setError(
            value instanceof Error
              ? value.message
              : "Unable to search students",
          ),
        );
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search, selectedAcademicYear, selectedCampus, targetType]);

  const targets = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (targetType === "CLASS") {
      return classes
        .filter((item) => !query || item.name.toLowerCase().includes(query))
        .map((item) => ({ id: item.id, label: item.name, detail: "Class" }));
    }
    if (targetType === "SECTION") {
      return sections
        .filter((item) => !query || item.name.toLowerCase().includes(query))
        .map((item) => ({
          id: item.id,
          label: item.name,
          detail: classes.find((row) => row.id === item.classId)?.name ?? "Section",
        }));
    }
    return students
      .filter((item) => !query || `${item.name} ${item.registrationNumber}`.toLowerCase().includes(query))
      .map((item) => ({ id: item.id, label: item.name, detail: item.registrationNumber }));
  }, [classes, search, sections, students, targetType]);

  function startCreate() {
    setName("");
    setNote("");
    setFeeHeadId(heads[0]?.id ?? "");
    setAmount("");
    setPolicy("FULL_ONLY");
    setTargetType("CLASS");
    setSelectedIds([]);
    setSearch("");
    setError(null);
    setOpen(true);
  }

  function toggle(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!selectedCampus || !selectedAcademicYear || !selectedIds.length) {
      setError("Select at least one target");
      return;
    }
    const amountMinor = Math.round(Number(amount) * 100);
    if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
      setError("Enter a valid charge amount");
      return;
    }
    try {
      setSaving(true);
      setError(null);
      await createGeneralCharge({
        campusId: selectedCampus.id,
        academicYearId: selectedAcademicYear.id,
        name: name.trim(),
        ...(note.trim() ? { note: note.trim() } : {}),
        feeHeadId,
        amountMinor,
        collectionPolicy: policy,
        target: { type: targetType, ids: selectedIds },
        idempotencyKey: crypto.randomUUID(),
      });
      setOpen(false);
      await load();
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to assign general charge");
    } finally {
      setSaving(false);
    }
  }

  if (!selectedCampus || !selectedAcademicYear) {
    return (
      <EmptyState
        title="Select campus and academic year"
        description="Additional fees are assigned inside the active operating context."
      />
    );
  }
  if (loading) return <LoadingState label="Loading additional fees" />;

  return (
    <section className="space-y-5">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Additional fee assignment</h2>
          <p className="mt-1 text-sm text-slate-500">
            Collect exam, transport, library, hostel, activity, and other fees through configured fee heads.
          </p>
        </div>
        <Button size="sm" variant="brand" onClick={startCreate} className="h-8 text-xs font-bold">
          <Plus size={14} /> Assign additional fee
        </Button>
      </header>

      {error && !open && <ErrorState message={error} retry={() => void load()} />}

      {/* Charges Table */}
      {charges.length ? (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Charge</TableHead>
                <TableHead>Fee head</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Students</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {charges.map((charge) => (
                <TableRow key={charge.id}>
                  <TableCell>
                    <div>
                      <p className="font-semibold text-slate-900">{charge.name}</p>
                      <span className="text-[10px] text-slate-400 capitalize">
                        {charge.collectionPolicy.replaceAll("_", " ").toLowerCase()}
                      </span>
                      {charge.note ? (
                        <p className="mt-1 max-w-sm text-xs text-slate-500">
                          {charge.note}
                        </p>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-650 font-semibold text-sm">
                    {charge.feeHeadCode}
                  </TableCell>
                  <TableCell className="text-slate-900 font-semibold">
                    {money(charge.amountMinor)}
                  </TableCell>
                  <TableCell className="text-slate-650 text-sm">
                    {charge.target.type} · {charge.target.ids.length}
                  </TableCell>
                  <TableCell className="text-slate-650 text-sm">
                    {charge.assignedCount}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      <Badge variant={charge.status === "ASSIGNED" ? "success" : "secondary"}>
                        {charge.status}
                      </Badge>
                      {charge.failureReason && (
                        <span className="block text-[10px] text-red-500 max-w-xs truncate">
                          {charge.failureReason}
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState
          title="No additional fees assigned"
          description="Assign exam, transport, library, hostel, activity, or another configured fee head."
        />
      )}

      {/* Modal Dialog */}
      <Modal
        open={open}
        title="Assign additional fee"
        description={`${selectedCampus.name} · ${selectedAcademicYear.name}`}
        onClose={() => !saving && setOpen(false)}
      >
        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          {error && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
                <Label htmlFor="chg-name">Fee description</Label>
              <Input
                id="chg-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Example: Term 1 examination fee"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="chg-head">Fee head</Label>
              <select
                id="chg-head"
                required
                value={feeHeadId}
                onChange={(e) => setFeeHeadId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600"
              >
                <option value="">Select fee head</option>
                {heads.map((head) => (
                  <option key={head.id} value={head.id}>
                    {head.name} · {head.code}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="chg-amount">Amount (INR)</Label>
              <Input
                id="chg-amount"
                required
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => /^\d*(\.\d{0,2})?$/.test(e.target.value) && setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="chg-policy">Collection policy</Label>
              <select
                id="chg-policy"
                value={policy}
                onChange={(e) => setPolicy(e.target.value as GeneralCharge["collectionPolicy"])}
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600"
              >
                <option value="FULL_ONLY">Collect in full</option>
                <option value="PARTIAL_ALLOWED">Allow partial collection</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="chg-target">Assign to</Label>
              <select
                id="chg-target"
                value={targetType}
                onChange={(e) => {
                  setTargetType(e.target.value as GeneralCharge["target"]["type"]);
                  setSelectedIds([]);
                  setSearch("");
                }}
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600"
              >
                <option value="CLASS">Classes</option>
                <option value="SECTION">Sections</option>
                <option value="STUDENT">Individual students</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="chg-note">Note (optional)</Label>
            <textarea
              id="chg-note"
              rows={3}
              maxLength={500}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Add internal context for this fee assignment"
              className="flex w-full resize-y rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-accent-600"
            />
            <p className="text-right text-[10px] text-slate-400">
              {note.length}/500
            </p>
          </div>

          {/* Targets Selector List */}
          <div className="space-y-2.5 p-3 rounded-lg border border-slate-200 bg-slate-50">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${targetType.toLowerCase()}`}
                className="pl-9 bg-white"
              />
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {targets.map((target) => (
                <label
                  key={target.id}
                  className={cn(
                    "flex items-center gap-2.5 p-2 rounded-md border transition-all cursor-pointer",
                    selectedIds.includes(target.id)
                      ? "bg-accent-50 border-accent-200"
                      : "bg-white border-slate-200 hover:bg-slate-50",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(target.id)}
                    onChange={() => toggle(target.id)}
                    className="h-4 w-4 rounded border-slate-300 text-accent-650 focus:ring-accent-600 shrink-0"
                  />
                  <span className="min-w-0 flex-1">
                    <strong className="block text-sm text-slate-805 font-bold">{target.label}</strong>
                    <small className="block text-[10px] text-slate-400">{target.detail}</small>
                  </span>
                </label>
              ))}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
              <CheckSquare size={13} className="text-slate-400" />
              {selectedIds.length} targets selected
            </div>
          </div>

          <Separator />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" disabled={saving} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" disabled={saving || !selectedIds.length}>
              {saving ? "Assigning..." : `Assign to ${selectedIds.length} target${selectedIds.length === 1 ? "" : "s"}`}
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}

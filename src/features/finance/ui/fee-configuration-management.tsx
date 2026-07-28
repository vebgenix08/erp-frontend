import {
  ArrowDown,
  ArrowUp,
  CalendarClock,
  CheckCircle2,
  Layers3,
  Pencil,
  Plus,
  ReceiptIndianRupee,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  listClasses,
  listSections,
} from "../../academic-structure/api/academic-structure.api";
import type {
  AcademicClass,
  Section,
} from "../../academic-structure/model/academic-structure.types";
import { useSelectedAcademicYear } from "../../tenant-settings/model/selected-academic-year-provider";
import { useSelectedCampus } from "../../tenant-settings/model/selected-campus-provider";
import { Modal } from "../../../shared/ui/modal";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../../shared/ui/page-state";
import {
  createFeeHead,
  createFeeMapping,
  createFeeSchedule,
  createFeeStructure,
  getFeeConfiguration,
  updateFeeHead,
} from "../api/fee-configuration.api";
import type {
  FeeCollectionPolicy,
  FeeConfiguration,
  FeeHead,
  FeeHeadCategory,
  FeeSchedulePattern,
} from "../model/fee-configuration.types";
import { Button } from "../../../shared/ui/button";
import { Input } from "../../../shared/ui/input";
import { Label } from "../../../shared/ui/label";
import { Badge } from "../../../shared/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../shared/ui/table";
import { cn } from "../../../shared/ui/utils";

export type FeeConfigurationTab = "heads" | "schedules" | "structures" | "mappings";

const tabs = [
  { key: "heads", label: "Fee heads", icon: ReceiptIndianRupee, to: "/admin/finance/fee-heads" },
  { key: "schedules", label: "Schedules", icon: CalendarClock, to: "/admin/finance/fee-schedules" },
  { key: "structures", label: "Structures", icon: Layers3, to: "/admin/finance/fee-structures" },
  { key: "mappings", label: "Class mapping", icon: CheckCircle2, to: "/admin/finance/assignments" },
] as const;

const categories: FeeHeadCategory[] = [
  "TUITION",
  "ADMISSION",
  "EXAM",
  "LIBRARY",
  "LAB",
  "TRANSPORT",
  "HOSTEL",
  "OTHER",
];

const empty: FeeConfiguration = {
  feeHeads: [],
  schedules: [],
  structures: [],
  mappings: [],
};

const money = (minor: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    minor / 100,
  );

const minor = (value: string) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0)
    throw new Error("Enter an amount greater than zero");
  return Math.round(number * 100);
};

interface FeeConfigurationManagementProps {
  tab: FeeConfigurationTab;
}

export function FeeConfigurationManagement({ tab }: FeeConfigurationManagementProps) {
  const { selectedCampus, loading: campusLoading, error: campusError } = useSelectedCampus();
  const { selectedAcademicYear, loading: yearLoading, error: yearError } = useSelectedAcademicYear();
  const [data, setData] = useState<FeeConfiguration>(empty);
  const [classes, setClasses] = useState<AcademicClass[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [editingHeadId, setEditingHeadId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<FeeHeadCategory>("TUITION");
  const [description, setDescription] = useState("");
  const [refundable, setRefundable] = useState(false);

  const [schedulePattern, setSchedulePattern] = useState<FeeSchedulePattern>("ANNUAL");
  const [collectionPolicy, setCollectionPolicy] = useState<FeeCollectionPolicy>("FULL_ONLY");

  const [components, setComponents] = useState<
    Array<{ id: string; feeHeadId: string; amount: string }>
  >([]);

  const [structureId, setStructureId] = useState("");
  const [scheduleId, setScheduleId] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");

  const campusId = selectedCampus?.id;
  const academicYearId = selectedAcademicYear?.id;

  const load = useCallback(async () => {
    if (!campusId || !academicYearId) return;
    setLoading(true);
    setError(null);
    try {
      const [config, campusClasses] = await Promise.all([
        getFeeConfiguration({ campusId, academicYearId }),
        listClasses(campusId),
      ]);
      setData(config);
      setClasses(campusClasses.filter((item) => item.status === "ACTIVE"));
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to load finance setup");
    } finally {
      setLoading(false);
    }
  }, [academicYearId, campusId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!campusId || !classId) {
      setSections([]);
      setSectionId("");
      return;
    }
    listSections(campusId)
      .then((items) => setSections(items.filter((item) => item.status === "ACTIVE" && item.classId === classId)))
      .catch(() => setSections([]));
  }, [campusId, classId]);

  const activeHeads = useMemo(
    () => data.feeHeads.filter((item) => item.status === "ACTIVE"),
    [data.feeHeads],
  );
  const activeSchedules = useMemo(
    () => data.schedules.filter((item) => item.status === "ACTIVE"),
    [data.schedules],
  );
  const activeStructures = useMemo(
    () => data.structures.filter((item) => item.status === "ACTIVE"),
    [data.structures],
  );

  const lookup = useMemo(() => {
    const headMap = new Map(data.feeHeads.map((item) => [item.id, item.name]));
    const scheduleMap = new Map(data.schedules.map((item) => [item.id, item.name]));
    const structureMap = new Map(data.structures.map((item) => [item.id, item.name]));
    const classMap = new Map(classes.map((item) => [item.id, item.name]));
    const sectionMap = new Map(sections.map((item) => [item.id, item.name]));
    return { heads: headMap, schedules: scheduleMap, structures: structureMap, classes: classMap, sections: sectionMap };
  }, [data, classes, sections]);

  function begin() {
    setEditingHeadId(null);
    setName("");
    setDescription("");
    setRefundable(false);
    setCategory("TUITION");
    setCollectionPolicy("FULL_ONLY");
    setSchedulePattern("ANNUAL");

    if (activeHeads[0]) {
      setComponents([{ id: "comp_1", feeHeadId: activeHeads[0].id, amount: "" }]);
    } else setComponents([]);

    setStructureId(activeStructures[0]?.id ?? "");
    setScheduleId(activeSchedules[0]?.id ?? "");
    setClassId(classes[0]?.id ?? "");
    setSectionId("");
    setOpen(true);
  }

  function beginFeeHeadEdit(head: FeeHead) {
    setEditingHeadId(head.id);
    setName(head.name);
    setCategory(head.category);
    setDescription(head.description ?? "");
    setRefundable(head.refundable);
    setError(null);
    setOpen(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!campusId || !academicYearId) return;
    setBusy(true);
    setError(null);
    try {
      if (tab === "heads") {
        const input = {
          name: name.trim(),
          category,
          refundable,
          ...(description.trim() ? { description: description.trim() } : {}),
        };
        if (editingHeadId) await updateFeeHead(editingHeadId, input);
        else await createFeeHead(input);
      }
      if (tab === "schedules") {
        await createFeeSchedule({
          campusId,
          academicYearId,
          name: name.trim(),
          pattern: schedulePattern,
          collectionPolicy,
        });
      }
      if (tab === "structures") {
        if (components.some((item) => !item.feeHeadId || !item.amount))
          throw new Error("Choose a fee head and amount for every component");
        await createFeeStructure({
          campusId,
          academicYearId,
          name: name.trim(),
          components: components.map((item) => ({
            feeHeadId: item.feeHeadId,
            amountMinor: minor(item.amount),
            allocationPriority:
              components.findIndex((component) => component.id === item.id) + 1,
          })),
        });
      }
      if (tab === "mappings") {
        if (!structureId || !scheduleId || !classId)
          throw new Error("Structure, schedule, and class are required");
        await createFeeMapping({
          campusId,
          academicYearId,
          structureId,
          scheduleId,
          target: {
            classId,
            ...(sectionId ? { sectionId } : {}),
          },
        });
      }
      setOpen(false);
      load();
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to save finance configuration");
    } finally {
      setBusy(false);
    }
  }

  if (campusLoading || yearLoading || loading) return <LoadingState label="Loading finance setup" />;
  if (campusError || yearError)
    return <ErrorState message={campusError ?? yearError ?? "Unable to load finance context"} />;
  if (!selectedCampus) {
    return (
      <EmptyState
        title="Create a campus first"
        description="Finance configuration always belongs to an operating campus."
      />
    );
  }
  if (!selectedAcademicYear) {
    return (
      <EmptyState
        title="Create an academic year first"
        description="Fee structures and schedules are academic-year scoped."
      />
    );
  }

  const blocked =
    (tab === "structures" && !activeHeads.length) ||
    (tab === "mappings" && (!activeStructures.length || !activeSchedules.length || !classes.length));

  const rows =
    tab === "heads"
      ? data.feeHeads
      : tab === "schedules"
        ? data.schedules
        : tab === "structures"
          ? data.structures
          : data.mappings;

  return (
    <section className="space-y-4">
      {/* Action Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Fee setup</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {selectedCampus.name} · {selectedAcademicYear.name} context.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="brand" disabled={blocked} onClick={begin} className="h-8 text-xs font-bold">
            <Plus size={14} />
            Add{" "}
            {tab === "heads"
              ? "fee head"
              : tab === "schedules"
                ? "schedule"
                : tab === "structures"
                  ? "structure"
                  : "mapping"}
          </Button>
        </div>
      </header>

      {error && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 font-medium">
          {error}
        </div>
      )}

      {/* Tabs */}
      <nav className="flex border-b border-slate-200" aria-label="Finance configuration steps">
        {tabs.map(({ key, label, icon: Icon, to }) => {
          const isActive = tab === key;
          const count =
            key === "heads"
              ? data.feeHeads.length
              : key === "schedules"
                ? data.schedules.length
                : key === "structures"
                  ? data.structures.length
                  : data.mappings.length;
          return (
            <Link
              key={key}
              to={to}
              className={cn(
                "flex items-center gap-2 border-b-2 px-4 py-2 text-xs font-semibold transition-all outline-none",
                isActive
                  ? "border-brand-600 text-brand-700 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300",
              )}
            >
              <Icon size={14} className={isActive ? "text-brand-600" : "text-slate-400"} />
              <span>{label}</span>
              <span
                className={cn(
                  "ml-1 rounded border px-1.5 py-0.2 text-[10px] font-mono font-bold",
                  isActive ? "bg-brand-50 text-brand-700 border-brand-200" : "bg-slate-100 text-slate-500 border-slate-200",
                )}
              >
                {count}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Content */}
      {blocked ? (
        <EmptyState
          title="Complete preceding setup steps"
          description={
            tab === "structures"
              ? "Create at least one active fee head before building a structure."
              : "Create a structure, schedule, and academic class before mapping fees."
          }
        />
      ) : rows.length ? (
        <div className="rounded border border-slate-200 bg-white overflow-hidden shadow-xs">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name / Target</TableHead>
                <TableHead>Reference code</TableHead>
                <TableHead>Details & breakdown</TableHead>
                <TableHead className="text-right">Status</TableHead>
                {tab === "heads" && <TableHead className="text-right">Action</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-semibold text-slate-900">
                    {"name" in row
                      ? row.name
                      : (lookup.classes.get(row.target.classId) ?? "Unavailable class")}
                  </TableCell>
                  <TableCell className="text-xs font-mono text-slate-500">
                    {"code" in row ? row.code : "MAPPING"}
                  </TableCell>
                  <TableCell className="text-slate-700 text-xs">
                    {"category" in row
                      ? row.category.replaceAll("_", " ")
                      : "pattern" in row
                        ? `${row.pattern.replaceAll("_", " ")} · ${row.collectionPolicy === "FULL_ONLY" ? "Full balance collection" : "Partial collection allowed"}`
                        : "components" in row
                          ? `${row.components.length} heads · ${money(row.totalAmountMinor)}`
                          : `${lookup.structures.get(row.structureId) ?? "Structure"} · ${lookup.schedules.get(row.scheduleId) ?? "Schedule"}${row.target.sectionId ? ` · ${lookup.sections.get(row.target.sectionId) ?? "Section"}` : ""}`}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={row.status === "ACTIVE" ? "success" : "secondary"}>
                      {row.status}
                    </Badge>
                  </TableCell>
                  {tab === "heads" && (
                    <TableCell className="text-right">
                      {"category" in row && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => beginFeeHeadEdit(row)}
                          aria-label={`Edit ${row.name}`}
                        >
                          <Pencil size={14} />
                          Edit
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState
          title={`No ${tabs.find((item) => item.key === tab)?.label.toLowerCase()} configured`}
          description="Create the first record for the selected campus and academic year."
        />
      )}

      {/* Modal Dialog */}
      <Modal
        open={open}
        title={`${editingHeadId ? "Edit" : "Add"} ${tab === "heads" ? "fee head" : tab === "schedules" ? "fee schedule" : tab === "structures" ? "fee structure" : "class mapping"}`}
        description="Reference codes are generated automatically by backend."
        onClose={() => !busy && setOpen(false)}
      >
        <form onSubmit={(e) => void submit(e)} className="space-y-3">
          {tab === "heads" && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="head-name">Name</Label>
                  <Input
                    id="head-name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Tuition fee"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="head-cat">Category</Label>
                  <select
                    id="head-cat"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as FeeHeadCategory)}
                    className="flex h-8 w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-600"
                  >
                    {categories.map((item) => (
                      <option key={item} value={item}>
                        {item.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="head-desc">Description</Label>
                <textarea
                  id="head-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="flex w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-600 resize-none"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={refundable}
                  onChange={(e) => setRefundable(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-600"
                />
                <span className="text-xs text-slate-700 font-medium">Refund review eligible</span>
              </label>
            </div>
          )}

          {tab === "schedules" && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="sched-name">Schedule name</Label>
                <Input
                  id="sched-name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Annual collection"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="schedule-pattern">Charging pattern</Label>
                <select
                  id="schedule-pattern"
                  value={schedulePattern}
                  onChange={(event) =>
                    setSchedulePattern(event.target.value as FeeSchedulePattern)
                  }
                  className="flex h-8 w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-600"
                >
                  <option value="ANNUAL">Annual collection</option>
                  <option value="ONE_TIME">One-time charge</option>
                  <option value="PERIODIC">Periodic collection</option>
                  <option value="MANUAL">Manual individual charge</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="collection-policy">Collection policy</Label>
                <select
                  id="collection-policy"
                  value={collectionPolicy}
                  onChange={(event) =>
                    setCollectionPolicy(event.target.value as FeeCollectionPolicy)
                  }
                  className="flex h-8 w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-600"
                >
                  <option value="FULL_ONLY">Require full balance</option>
                  <option value="PARTIAL_ALLOWED">Allow partial payments</option>
                </select>
              </div>
            </div>
          )}

          {tab === "structures" && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="struct-name">Structure name</Label>
                <Input
                  id="struct-name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Primary school standard fee"
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Fee components</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setComponents((curr) => [
                        ...curr,
                        { id: `comp_${curr.length + 1}`, feeHeadId: activeHeads[0]?.id ?? "", amount: "" },
                      ])
                    }
                    className="h-6 text-[11px] px-2"
                  >
                    <Plus size={12} /> Add component
                  </Button>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {components.map((comp, componentIndex) => (
                    <div key={comp.id} className="flex items-center gap-2">
                      <select
                        value={comp.feeHeadId}
                        onChange={(e) =>
                          setComponents((curr) =>
                            curr.map((item) =>
                              item.id === comp.id ? { ...item, feeHeadId: e.target.value } : item,
                            ),
                          )
                        }
                        className="flex h-8 flex-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-600"
                      >
                        {activeHeads.map((head) => (
                          <option key={head.id} value={head.id}>
                            {head.name} ({head.category.replaceAll("_", " ")})
                          </option>
                        ))}
                      </select>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="Amount (₹)"
                        value={comp.amount}
                        onChange={(e) =>
                          /^\d*(\.\d{0,2})?$/.test(e.target.value) &&
                          setComponents((curr) =>
                            curr.map((item) =>
                              item.id === comp.id ? { ...item, amount: e.target.value } : item,
                            ),
                          )
                        }
                        required
                        className="h-8 w-32 text-xs"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        title="Move earlier in payment allocation"
                        disabled={componentIndex === 0}
                          onClick={() =>
                            setComponents((current) => {
                              const next = [...current];
                              const currentItem = next[componentIndex];
                              const previousItem = next[componentIndex - 1];
                              if (!currentItem || !previousItem) return current;
                              next[componentIndex - 1] = currentItem;
                              next[componentIndex] = previousItem;
                              return next;
                            })
                        }
                        className="h-8 w-8"
                      >
                        <ArrowUp size={13} />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        title="Move later in payment allocation"
                        disabled={componentIndex === components.length - 1}
                          onClick={() =>
                            setComponents((current) => {
                              const next = [...current];
                              const currentItem = next[componentIndex];
                              const nextItem = next[componentIndex + 1];
                              if (!currentItem || !nextItem) return current;
                              next[componentIndex] = nextItem;
                              next[componentIndex + 1] = currentItem;
                              return next;
                            })
                        }
                        className="h-8 w-8"
                      >
                        <ArrowDown size={13} />
                      </Button>
                      {components.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setComponents((curr) => curr.filter((item) => item.id !== comp.id))}
                          className="h-8 w-8 text-slate-400 hover:text-red-600"
                        >
                          <Trash2 size={13} />
                        </Button>
                      )}
                    </div>
                  ))}
                  <p className="text-xs text-slate-500">
                    Payments are allocated from top to bottom. Use the arrow
                    controls to change priority.
                  </p>
                </div>
              </div>
            </div>
          )}

          {tab === "mappings" && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="map-struct">Fee structure</Label>
                  <select
                    id="map-struct"
                    value={structureId}
                    onChange={(e) => setStructureId(e.target.value)}
                    className="flex h-8 w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-600"
                  >
                    {activeStructures.map((struct) => (
                      <option key={struct.id} value={struct.id}>
                        {struct.name} ({money(struct.totalAmountMinor)})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="map-sched">Schedule</Label>
                  <select
                    id="map-sched"
                    value={scheduleId}
                    onChange={(e) => setScheduleId(e.target.value)}
                    className="flex h-8 w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-600"
                  >
                    {activeSchedules.map((sched) => (
                      <option key={sched.id} value={sched.id}>
                        {sched.name} ({sched.pattern.replaceAll("_", " ")})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="map-class">Academic class</Label>
                  <select
                    id="map-class"
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                    className="flex h-8 w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-600"
                  >
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="map-sec">Section (optional)</Label>
                  <select
                    id="map-sec"
                    value={sectionId}
                    onChange={(e) => setSectionId(e.target.value)}
                    className="flex h-8 w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-600"
                  >
                    <option value="">All sections</option>
                    {sections.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        Section {sec.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Dialog Action Footer */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)} disabled={busy} className="h-8 text-xs">
              Cancel
            </Button>
            <Button type="submit" variant="brand" size="sm" disabled={busy} className="h-8 text-xs font-bold">
              {busy ? "Saving..." : "Save configuration"}
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}

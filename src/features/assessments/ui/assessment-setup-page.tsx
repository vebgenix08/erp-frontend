import { CalendarClock, CheckCircle2, Edit3, LockKeyhole, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { listClasses } from "../../academic-structure/api/academic-structure.api";
import type { AcademicClass } from "../../academic-structure/model/academic-structure.types";
import { useSelectedAcademicYear } from "../../tenant-settings/model/selected-academic-year-provider";
import { useSelectedCampus } from "../../tenant-settings/model/selected-campus-provider";
import { Badge } from "../../../shared/ui/badge";
import { Button } from "../../../shared/ui/button";
import { Input } from "../../../shared/ui/input";
import { Label } from "../../../shared/ui/label";
import { Modal } from "../../../shared/ui/modal";
import { EmptyState, ErrorState, LoadingState } from "../../../shared/ui/page-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../shared/ui/table";
import {
  listAssessmentDefinitions,
  saveAssessmentDefinition,
  setAssessmentDefinitionStatus,
} from "../api/assessments.api";
import type {
  AssessmentDefinition,
  SaveAssessmentDefinitionInput,
} from "../model/assessment.types";

interface AssessmentForm {
  id?: string;
  expectedVersion?: number;
  classId: string;
  name: string;
  assessmentDate: string;
  attendanceWindowStart: string;
  attendanceWindowEnd: string;
  maximumMarks: string;
  sequence: string;
}

const emptyForm = (): AssessmentForm => ({
  classId: "",
  name: "",
  assessmentDate: "",
  attendanceWindowStart: "",
  attendanceWindowEnd: "",
  maximumMarks: "",
  sequence: "",
});

export function AssessmentSetupPage() {
  const { selectedCampus, loading: campusLoading } = useSelectedCampus();
  const { selectedAcademicYear, loading: yearLoading } = useSelectedAcademicYear();
  const [items, setItems] = useState<AssessmentDefinition[]>([]);
  const [classes, setClasses] = useState<AcademicClass[]>([]);
  const [status, setStatus] = useState<"ALL" | AssessmentDefinition["status"]>("ALL");
  const [classFilter, setClassFilter] = useState("");
  const [form, setForm] = useState<AssessmentForm>(emptyForm);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!selectedCampus || !selectedAcademicYear) {
      setItems([]);
      setClasses([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [definitions, classRows] = await Promise.all([
        listAssessmentDefinitions({
          academicYearId: selectedAcademicYear.id,
          campusId: selectedCampus.id,
        }),
        listClasses(selectedCampus.id),
      ]);
      setItems(
        definitions.sort(
          (left, right) =>
            left.sequence - right.sequence ||
            left.assessmentDate.localeCompare(right.assessmentDate),
        ),
      );
      setClasses(classRows.filter((item) => item.status === "ACTIVE"));
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to load assessment setup");
    } finally {
      setLoading(false);
    }
  }, [selectedAcademicYear, selectedCampus]);

  useEffect(() => {
    void load();
  }, [load]);

  const classNames = useMemo(() => new Map(classes.map((item) => [item.id, item.name])), [classes]);
  const visibleItems = items.filter(
    (item) =>
      (status === "ALL" || item.status === status) &&
      (!classFilter || !item.classId || item.classId === classFilter),
  );

  function edit(item: AssessmentDefinition) {
    setForm({
      id: item.id,
      expectedVersion: item.version,
      classId: item.classId ?? "",
      name: item.name,
      assessmentDate: item.assessmentDate,
      attendanceWindowStart: item.attendanceWindowStart,
      attendanceWindowEnd: item.attendanceWindowEnd,
      maximumMarks: String(item.maximumMarks),
      sequence: String(item.sequence),
    });
    setOpen(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!selectedCampus || !selectedAcademicYear) return;
    setBusy(true);
    setError(null);
    try {
      const input: SaveAssessmentDefinitionInput = {
        ...(form.id ? { id: form.id } : {}),
        ...(form.expectedVersion ? { expectedVersion: form.expectedVersion } : {}),
        campusId: selectedCampus.id,
        academicYearId: selectedAcademicYear.id,
        ...(form.classId ? { classId: form.classId } : {}),
        name: form.name.trim(),
        assessmentDate: form.assessmentDate,
        attendanceWindowStart: form.attendanceWindowStart,
        attendanceWindowEnd: form.attendanceWindowEnd,
        maximumMarks: Number(form.maximumMarks),
        sequence: Number(form.sequence),
      };
      await saveAssessmentDefinition(input);
      setOpen(false);
      setForm(emptyForm());
      await load();
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to save assessment");
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(item: AssessmentDefinition, nextStatus: "OPEN" | "CLOSED") {
    setBusy(true);
    setError(null);
    try {
      await setAssessmentDefinitionStatus({
        id: item.id,
        status: nextStatus,
        expectedVersion: item.version,
      });
      await load();
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to update assessment status");
    } finally {
      setBusy(false);
    }
  }

  if (campusLoading || yearLoading || loading)
    return <LoadingState label="Loading assessment setup" />;
  if (!selectedCampus || !selectedAcademicYear)
    return (
      <EmptyState
        title="Select the operating context"
        description="A campus and academic year are required before assessments can be configured."
      />
    );
  if (error && !items.length) return <ErrorState message={error} retry={() => void load()} />;

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-950">Assessment Setup</h1>
          <p className="mt-1 text-sm text-slate-500">
            Define test and internal-assessment windows before teachers record marks.
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-600">
            {selectedCampus.name} · {selectedAcademicYear.name}
          </p>
        </div>
        <Button
          onClick={() => {
            setForm(emptyForm());
            setOpen(true);
          }}
        >
          <Plus />
          Add assessment
        </Button>
      </header>

      {error ? (
        <div
          role="alert"
          className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"
        >
          {error}
        </div>
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="grid gap-3 border-b border-slate-200 p-4 md:grid-cols-2">
          <label>
            <span className="mb-1.5 block text-xs font-bold text-slate-600">Class scope</span>
            <select
              value={classFilter}
              onChange={(event) => setClassFilter(event.target.value)}
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="">All classes</option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-slate-600">Status</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as typeof status)}
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="ALL">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="OPEN">Open</option>
              <option value="CLOSED">Closed</option>
            </select>
          </label>
        </div>
        {visibleItems.length ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Assessment</TableHead>
                  <TableHead>Class scope</TableHead>
                  <TableHead>Assessment date</TableHead>
                  <TableHead>Attendance window</TableHead>
                  <TableHead>Maximum marks</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead aria-label="Actions" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-semibold">{item.sequence}</TableCell>
                    <TableCell>
                      <strong className="text-slate-950">{item.name}</strong>
                    </TableCell>
                    <TableCell>
                      {item.classId
                        ? (classNames.get(item.classId) ?? "Unavailable class")
                        : "All classes"}
                    </TableCell>
                    <TableCell>{formatDate(item.assessmentDate)}</TableCell>
                    <TableCell>
                      {formatDate(item.attendanceWindowStart)} -{" "}
                      {formatDate(item.attendanceWindowEnd)}
                    </TableCell>
                    <TableCell>{item.maximumMarks}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          item.status === "OPEN"
                            ? "warning"
                            : item.status === "CLOSED"
                              ? "secondary"
                              : "blue"
                        }
                      >
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {item.status === "DRAFT" ? (
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            title="Edit draft"
                            aria-label={`Edit ${item.name}`}
                            onClick={() => edit(item)}
                            disabled={busy}
                          >
                            <Edit3 />
                          </Button>
                        ) : null}
                        {item.status === "DRAFT" ? (
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            title="Open marks entry"
                            aria-label={`Open ${item.name}`}
                            onClick={() => void changeStatus(item, "OPEN")}
                            disabled={busy}
                          >
                            <CheckCircle2 />
                          </Button>
                        ) : null}
                        {item.status === "OPEN" ? (
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            title="Close marks entry"
                            aria-label={`Close ${item.name}`}
                            onClick={() => void changeStatus(item, "CLOSED")}
                            disabled={busy}
                          >
                            <LockKeyhole />
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <EmptyState
            title="No assessments in this view"
            description="Add an assessment or change the filters."
          />
        )}
      </section>

      <Modal
        open={open}
        title={form.id ? "Edit draft assessment" : "Add assessment"}
        description="Maximum marks and attendance dates are enforced when teachers enter results."
        onClose={() => {
          if (!busy) setOpen(false);
        }}
      >
        <form onSubmit={(event) => void submit(event)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="assessment-name">Assessment name</Label>
              <Input
                id="assessment-name"
                required
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Test 1"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="assessment-class">Class scope</Label>
              <select
                id="assessment-class"
                value={form.classId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, classId: event.target.value }))
                }
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              >
                <option value="">All classes in this campus</option>
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="assessment-date">Assessment date</Label>
              <Input
                id="assessment-date"
                required
                type="date"
                value={form.assessmentDate}
                onChange={(event) =>
                  setForm((current) => ({ ...current, assessmentDate: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="assessment-order">Display order</Label>
              <Input
                id="assessment-order"
                required
                type="text"
                inputMode="numeric"
                value={form.sequence}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    sequence: event.target.value.replace(/[^0-9]/g, ""),
                  }))
                }
                placeholder="1"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="attendance-start">Attendance window starts</Label>
              <Input
                id="attendance-start"
                required
                type="date"
                value={form.attendanceWindowStart}
                onChange={(event) =>
                  setForm((current) => ({ ...current, attendanceWindowStart: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="attendance-end">Attendance window ends</Label>
              <Input
                id="attendance-end"
                required
                type="date"
                value={form.attendanceWindowEnd}
                onChange={(event) =>
                  setForm((current) => ({ ...current, attendanceWindowEnd: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="maximum-marks">Maximum marks</Label>
              <Input
                id="maximum-marks"
                required
                type="text"
                inputMode="decimal"
                value={form.maximumMarks}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    maximumMarks: event.target.value.replace(/[^0-9.]/g, ""),
                  }))
                }
                placeholder="100"
              />
            </div>
          </div>
          <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-800">
            <CalendarClock className="mr-2 inline h-4 w-4" />
            Attendance is counted only from submitted subject sessions inside this window.
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving..." : "Save draft"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

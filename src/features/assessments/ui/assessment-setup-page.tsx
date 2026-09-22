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
  AssessmentGradeBand,
  AssessmentRubricCriterion,
  AssessmentScoringMode,
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
  passMarks: string;
  weightage: string;
  decimalPlaces: string;
  scoringMode: AssessmentScoringMode;
  commentsEnabled: boolean;
  moderationRequired: boolean;
  gradeScale: AssessmentGradeBand[];
  rubricCriteria: AssessmentRubricCriterion[];
  sequence: string;
}

const percentageBands = (
  rows: Array<[string, string, number, number, number?]>,
): AssessmentGradeBand[] =>
  rows.map(([code, label, minimumPercentage, maximumPercentage, gradePoint]) => ({
    code,
    label,
    minimumPercentage,
    maximumPercentage,
    ...(gradePoint !== undefined ? { gradePoint } : {}),
  }));

const gradingPresets = {
  SCHOOL: {
    passPercentage: 35,
    decimalPlaces: "0",
    gradeScale: percentageBands([
      ["A1", "Outstanding", 91, 100],
      ["A2", "Excellent", 81, 90.99],
      ["B1", "Very good", 71, 80.99],
      ["B2", "Good", 61, 70.99],
      ["C1", "Satisfactory", 51, 60.99],
      ["C2", "Developing", 41, 50.99],
      ["D", "Basic", 35, 40.99],
      ["E", "Needs improvement", 0, 34.99],
    ]),
  },
  PU: {
    passPercentage: 35,
    decimalPlaces: "0",
    gradeScale: percentageBands([
      ["DIST", "Distinction", 85, 100],
      ["I", "First class", 60, 84.99],
      ["II", "Second class", 50, 59.99],
      ["PASS", "Pass", 35, 49.99],
      ["FAIL", "Not passed", 0, 34.99],
    ]),
  },
  DEGREE: {
    passPercentage: 40,
    decimalPlaces: "1",
    gradeScale: percentageBands([
      ["O", "Outstanding", 90, 100, 10],
      ["A+", "Excellent", 80, 89.99, 9],
      ["A", "Very good", 70, 79.99, 8],
      ["B+", "Good", 60, 69.99, 7],
      ["B", "Above average", 55, 59.99, 6],
      ["C", "Average", 50, 54.99, 5],
      ["P", "Pass", 40, 49.99, 4],
      ["F", "Fail", 0, 39.99, 0],
    ]),
  },
};

const emptyForm = (): AssessmentForm => ({
  classId: "",
  name: "",
  assessmentDate: "",
  attendanceWindowStart: "",
  attendanceWindowEnd: "",
  maximumMarks: "",
  passMarks: "",
  weightage: "100",
  decimalPlaces: "0",
  scoringMode: "MARKS",
  commentsEnabled: true,
  moderationRequired: true,
  gradeScale: [],
  rubricCriteria: [],
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
      passMarks: String(item.passMarks),
      weightage: String(item.weightage),
      decimalPlaces: String(item.decimalPlaces),
      scoringMode: item.scoringMode,
      commentsEnabled: item.commentsEnabled,
      moderationRequired: item.moderationRequired,
      gradeScale: item.gradeScale.map((band) => ({ ...band })),
      rubricCriteria: item.rubricCriteria.map((criterion) => ({ ...criterion })),
      sequence: String(item.sequence),
    });
    setOpen(true);
  }

  function applyPreset(key: keyof typeof gradingPresets) {
    const preset = gradingPresets[key];
    setForm((current) => {
      const maximum = Number(current.maximumMarks || 100);
      return {
        ...current,
        passMarks: String((maximum * preset.passPercentage) / 100),
        decimalPlaces: preset.decimalPlaces,
        gradeScale: preset.gradeScale.map((band) => ({ ...band })),
      };
    });
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
        passMarks: Number(form.passMarks || 0),
        weightage: Number(form.weightage || 100),
        decimalPlaces: Number(form.decimalPlaces),
        scoringMode: form.scoringMode,
        commentsEnabled: form.commentsEnabled,
        moderationRequired: form.moderationRequired,
        gradeScale: form.gradeScale,
        rubricCriteria: form.scoringMode === "RUBRIC" ? form.rubricCriteria : [],
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
                  <TableHead>Scoring and pass rule</TableHead>
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
                      <strong className="block text-slate-900">
                        {item.scoringMode === "RUBRIC" ? "Rubric" : "Direct marks"}
                      </strong>
                      <span className="text-xs text-slate-500">
                        Pass {item.passMarks} · {item.gradeScale.length} grade bands
                      </span>
                    </TableCell>
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
        className="max-w-5xl"
        title={form.id ? "Edit draft assessment" : "Add assessment"}
        description="Configure class-specific scoring, grading, moderation and result rules before marks entry opens."
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
            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:col-span-2">
              <p className="text-xs font-bold text-slate-700">Optional grading starter</p>
              <p className="text-xs text-slate-500">
                These are editable starting points. Board and university regulations must be
                confirmed before the assessment is opened.
              </p>
              <div className="flex flex-wrap gap-2">
                {(["SCHOOL", "PU", "DEGREE"] as const).map((key) => (
                  <Button
                    key={key}
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => applyPreset(key)}
                  >
                    {key === "SCHOOL" ? "School" : key === "PU" ? "PU college" : "Degree CBCS"}
                  </Button>
                ))}
              </div>
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
            <div className="space-y-1.5">
              <Label htmlFor="pass-marks">Pass marks</Label>
              <Input
                id="pass-marks"
                required
                type="text"
                inputMode="decimal"
                value={form.passMarks}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    passMarks: event.target.value.replace(/[^0-9.]/g, ""),
                  }))
                }
                placeholder="35"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="assessment-weightage">Assessment weightage (%)</Label>
              <Input
                id="assessment-weightage"
                required
                type="text"
                inputMode="decimal"
                value={form.weightage}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    weightage: event.target.value.replace(/[^0-9.]/g, ""),
                  }))
                }
                placeholder="100"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="scoring-mode">Scoring method</Label>
              <select
                id="scoring-mode"
                value={form.scoringMode}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    scoringMode: event.target.value as AssessmentScoringMode,
                  }))
                }
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              >
                <option value="MARKS">Direct marks</option>
                <option value="RUBRIC">Rubric criteria</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="decimal-places">Allowed decimals</Label>
              <select
                id="decimal-places"
                value={form.decimalPlaces}
                onChange={(event) =>
                  setForm((current) => ({ ...current, decimalPlaces: event.target.value }))
                }
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              >
                <option value="0">Whole numbers</option>
                <option value="1">One decimal</option>
                <option value="2">Two decimals</option>
              </select>
            </div>
            <label className="flex items-center gap-2 rounded-md border border-slate-200 p-3 text-sm font-semibold">
              <input
                type="checkbox"
                checked={form.commentsEnabled}
                onChange={(event) =>
                  setForm((current) => ({ ...current, commentsEnabled: event.target.checked }))
                }
              />
              Allow teacher comments
            </label>
            <label className="flex items-center gap-2 rounded-md border border-slate-200 p-3 text-sm font-semibold">
              <input
                type="checkbox"
                checked={form.moderationRequired}
                onChange={(event) =>
                  setForm((current) => ({ ...current, moderationRequired: event.target.checked }))
                }
              />
              Require HOD moderation
            </label>
          </div>

          {form.scoringMode === "RUBRIC" ? (
            <section className="space-y-3 rounded-lg border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Rubric criteria</h3>
                  <p className="text-xs text-slate-500">
                    Criterion maximums must total {form.maximumMarks || "the maximum marks"}.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      rubricCriteria: [
                        ...current.rubricCriteria,
                        {
                          id: `criterion_${crypto.randomUUID()}`,
                          name: "",
                          description: "",
                          maximumMarks: 0,
                        },
                      ],
                    }))
                  }
                >
                  Add criterion
                </Button>
              </div>
              {form.rubricCriteria.map((criterion, index) => (
                <div key={criterion.id} className="grid gap-2 md:grid-cols-[1fr_1.5fr_140px_auto]">
                  <Input
                    aria-label={`Criterion ${index + 1} name`}
                    required
                    value={criterion.name}
                    placeholder="Knowledge"
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        rubricCriteria: current.rubricCriteria.map((item) =>
                          item.id === criterion.id ? { ...item, name: event.target.value } : item,
                        ),
                      }))
                    }
                  />
                  <Input
                    aria-label={`Criterion ${index + 1} description`}
                    value={criterion.description ?? ""}
                    placeholder="What is evaluated"
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        rubricCriteria: current.rubricCriteria.map((item) =>
                          item.id === criterion.id
                            ? { ...item, description: event.target.value }
                            : item,
                        ),
                      }))
                    }
                  />
                  <Input
                    aria-label={`Criterion ${index + 1} maximum marks`}
                    required
                    inputMode="decimal"
                    value={criterion.maximumMarks || ""}
                    placeholder="Marks"
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        rubricCriteria: current.rubricCriteria.map((item) =>
                          item.id === criterion.id
                            ? {
                                ...item,
                                maximumMarks: Number(event.target.value.replace(/[^0-9.]/g, "")),
                              }
                            : item,
                        ),
                      }))
                    }
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        rubricCriteria: current.rubricCriteria.filter(
                          (item) => item.id !== criterion.id,
                        ),
                      }))
                    }
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </section>
          ) : null}

          <section className="space-y-3 rounded-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Grade scale</h3>
                <p className="text-xs text-slate-500">
                  Percentage ranges may differ by class, board, program or university.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    gradeScale: [
                      ...current.gradeScale,
                      {
                        code: "",
                        label: "",
                        minimumPercentage: 0,
                        maximumPercentage: 0,
                      },
                    ],
                  }))
                }
              >
                Add grade band
              </Button>
            </div>
            {form.gradeScale.map((band, index) => (
              <div key={index} className="grid gap-2 md:grid-cols-6">
                {(
                  [
                    ["code", "Code"],
                    ["label", "Label"],
                    ["minimumPercentage", "Minimum %"],
                    ["maximumPercentage", "Maximum %"],
                    ["gradePoint", "Grade point"],
                  ] as const
                ).map(([key, placeholder]) => (
                  <Input
                    key={key}
                    aria-label={`Grade band ${index + 1} ${placeholder}`}
                    value={band[key] ?? ""}
                    placeholder={placeholder}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        gradeScale: current.gradeScale.map((item, itemIndex) =>
                          itemIndex === index
                            ? {
                                ...item,
                                [key]:
                                  key === "code" || key === "label"
                                    ? event.target.value
                                    : event.target.value === ""
                                      ? undefined
                                      : Number(event.target.value.replace(/[^0-9.]/g, "")),
                              }
                            : item,
                        ),
                      }))
                    }
                  />
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      gradeScale: current.gradeScale.filter((_, itemIndex) => itemIndex !== index),
                    }))
                  }
                >
                  Remove
                </Button>
              </div>
            ))}
          </section>
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

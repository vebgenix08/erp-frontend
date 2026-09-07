import { ArrowLeft, ArrowRight, Check, Plus, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Modal } from "../../../shared/ui/modal";
import type { AcademicUnitType } from "../../tenant-settings/model/settings.types";
import { createClass, createProgram } from "../api/academic-structure.api";
import type { AcademicClass, Program } from "../model/academic-structure.types";
import { Button } from "../../../shared/ui/button";
import { Input } from "../../../shared/ui/input";
import { Label } from "../../../shared/ui/label";
import { Badge } from "../../../shared/ui/badge";
import { Card } from "../../../shared/ui/card";
import { Separator } from "../../../shared/ui/separator";
import { cn } from "../../../shared/ui/utils";

type PlanRow = { id: string; program: string; classes: string };

const SCHOOL_PLAN: PlanRow[] = [
  { id: "pre-primary", program: "Pre-Primary", classes: "Nursery, LKG, UKG" },
  {
    id: "primary",
    program: "Primary School",
    classes: "Class 1, Class 2, Class 3, Class 4, Class 5",
  },
  { id: "middle", program: "Middle School", classes: "Class 6, Class 7" },
  { id: "high", program: "High School", classes: "Class 8, Class 9, Class 10" },
];
const COLLEGE_PLAN: PlanRow[] = [
  { id: "pre-university", program: "Pre-University College", classes: "1st Year, 2nd Year" },
];
const DEGREE_SUGGESTIONS = ["B.Com", "B.Sc", "B.A", "BBA", "BCA"];
const DEGREE_CLASSES = "Semester 1, Semester 2, Semester 3, Semester 4, Semester 5, Semester 6";

function initialPlan(type: AcademicUnitType): PlanRow[] {
  if (type === "SCHOOL") return SCHOOL_PLAN.map((row) => ({ ...row }));
  if (type === "PU") return COLLEGE_PLAN.map((row) => ({ ...row }));
  return [{ id: crypto.randomUUID(), program: "B.Com", classes: DEGREE_CLASSES }];
}

export function AcademicStructurePlanner({
  campusId,
  campusName,
  academicUnitId,
  academicUnitType,
  programs,
  classes,
  onApplied,
}: {
  campusId: string;
  campusName: string;
  academicUnitId: string;
  academicUnitType: AcademicUnitType;
  programs: Program[];
  classes: AcademicClass[];
  onApplied: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [plan, setPlan] = useState<PlanRow[]>(() => initialPlan(academicUnitType));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const plannedClasses = useMemo(
    () =>
      plan.reduce(
        (total, row) => total + row.classes.split(",").filter((value) => value.trim()).length,
        0,
      ),
    [plan],
  );

  function show() {
    setPlan(initialPlan(academicUnitType));
    setStep(1);
    setError(null);
    setOpen(true);
  }

  function patch(id: string, value: Partial<PlanRow>) {
    setPlan((current) => current.map((row) => (row.id === id ? { ...row, ...value } : row)));
  }

  function addProgram(name = "") {
    setPlan((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        program: name,
        classes: academicUnitType === "DEGREE" ? DEGREE_CLASSES : "",
      },
    ]);
  }

  function continueFlow() {
    if (step === 1 && (!plan.length || plan.some((row) => !row.program.trim()))) {
      setError("Add a name for every level or program before continuing.");
      return;
    }
    if (step === 2 && plan.some((row) => !row.classes.split(",").some((value) => value.trim()))) {
      setError("Add at least one class, year, or semester for every program.");
      return;
    }
    setError(null);
    setStep((step + 1) as 2 | 3);
  }

  async function apply() {
    const rows = plan
      .map((row) => ({
        ...row,
        program: row.program.trim(),
        classNames: row.classes
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      }))
      .filter((row) => row.program);
    if (!rows.length || rows.some((row) => !row.classNames.length)) {
      setError("Each selected program needs a name and at least one class, year, or semester.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      for (const row of rows) {
        let program = programs.find(
          (item) => item.name.toLowerCase() === row.program.toLowerCase(),
        );
        if (!program) {
          program = await createProgram({
            campusId,
            academicUnitId,
            name: row.program,
            description: `Guided setup for ${campusName}`,
          });
        }
        const existing = classes
          .filter((item) => item.programId === program.id)
          .map((item) => item.name.toLowerCase());
        for (const className of row.classNames) {
          if (!existing.includes(className.toLowerCase())) {
            await createClass({ campusId, programId: program.id, name: className });
          }
        }
      }
      setOpen(false);
      onApplied();
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to apply academic structure");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={show}>
        <Sparkles size={15} /> Guided setup
      </Button>
      <Modal
        open={open}
        title={`${academicUnitType === "SCHOOL" ? "School" : academicUnitType === "PU" ? "PU college" : "Degree college"} structure plan`}
        description={`Review the suggested structure for ${campusName}. Edit every name before applying.`}
        onClose={() => !busy && setOpen(false)}
      >
        <div className="space-y-5 text-sm">
          {/* Progress Flow */}
          <div className="flex items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
            {[
              "Levels / programs",
              academicUnitType === "SCHOOL" ? "Classes" : "Years / semesters",
              "Review",
            ].map((label, index) => {
              const isActive = step === index + 1;
              const isComplete = step > index + 1;
              return (
                <div
                  key={label}
                  className={cn(
                    "flex items-center gap-2 text-xs font-semibold",
                    isActive
                      ? "text-accent-700"
                      : isComplete
                        ? "text-emerald-700"
                        : "text-slate-400",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full text-[10px] border",
                      isActive
                        ? "border-accent-600 bg-accent-50 text-accent-700"
                        : isComplete
                          ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-slate-50 text-slate-400",
                    )}
                  >
                    {isComplete ? <Check size={10} /> : index + 1}
                  </span>
                  <span className="hidden sm:inline">{label}</span>
                </div>
              );
            })}
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="text-center p-3 bg-slate-50 border-slate-200">
              <span className="text-[10px] text-slate-450 uppercase tracking-wider font-semibold block">
                Programs / levels
              </span>
              <strong className="block text-lg font-bold text-slate-800 mt-0.5">
                {plan.length}
              </strong>
            </Card>
            <Card className="text-center p-3 bg-slate-50 border-slate-200">
              <span className="text-[10px] text-slate-450 uppercase tracking-wider font-semibold block">
                Classes / semesters
              </span>
              <strong className="block text-lg font-bold text-slate-800 mt-0.5">
                {plannedClasses}
              </strong>
            </Card>
          </div>

          {/* Step 1: Program Configuration */}
          {step === 1 && (
            <div className="space-y-4">
              {academicUnitType === "DEGREE" && (
                <div className="space-y-1.5">
                  <span className="text-xs text-slate-400 font-semibold block">Suggestions</span>
                  <div className="flex flex-wrap gap-1.5">
                    {DEGREE_SUGGESTIONS.map((name) => (
                      <button
                        key={name}
                        type="button"
                        disabled={plan.some((row) => row.program === name)}
                        onClick={() => addProgram(name)}
                        className="text-xs bg-white border border-slate-200 hover:border-accent-400 hover:bg-accent-50/10 px-2.5 py-1 rounded-md transition-colors disabled:opacity-50"
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {plan.map((row, index) => (
                  <div
                    key={row.id}
                    className="flex gap-2.5 items-end p-3 bg-slate-50 border border-slate-200 rounded-md"
                  >
                    <span className="text-xs font-semibold text-slate-400 w-5 text-center">
                      {index + 1}
                    </span>
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">
                        {academicUnitType === "SCHOOL" ? "School level" : "Program"}
                      </Label>
                      <Input
                        value={row.program}
                        onChange={(e) => patch(row.id, { program: e.target.value })}
                        className="h-8 text-xs"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      title="Remove row"
                      onClick={() => setPlan((curr) => curr.filter((item) => item.id !== row.id))}
                      className="text-slate-400 hover:text-red-650 shrink-0"
                    >
                      🗑️
                    </Button>
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => addProgram()}
                className="w-full h-8"
              >
                <Plus size={14} /> Add another {academicUnitType === "SCHOOL" ? "level" : "program"}
              </Button>
            </div>
          )}

          {/* Step 2: Class Assignment */}
          {step === 2 && (
            <div className="space-y-3.5 max-h-72 overflow-y-auto pr-1">
              {plan.map((row) => (
                <div
                  key={row.id}
                  className="space-y-1.5 p-3.5 border border-slate-200 rounded-lg bg-slate-50/50"
                >
                  <div className="flex items-center justify-between">
                    <strong className="text-sm font-semibold text-slate-800">{row.program}</strong>
                    <Badge variant="secondary">
                      {academicUnitType === "SCHOOL"
                        ? "Classes"
                        : academicUnitType === "PU"
                          ? "Years"
                          : "Semesters"}
                    </Badge>
                  </div>
                  <textarea
                    rows={2}
                    value={row.classes}
                    onChange={(e) => patch(row.id, { classes: e.target.value })}
                    placeholder="Comma separated lists, e.g. Class 1, Class 2"
                    className="flex w-full rounded-md border border-slate-205 bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-accent-600 resize-none font-mono"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Step 3: Review Structure */}
          {step === 3 && (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {plan.map((row) => (
                <div
                  key={row.id}
                  className="p-3 border border-slate-150 rounded-lg bg-white space-y-1"
                >
                  <strong className="block text-sm text-slate-800 font-bold">{row.program}</strong>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {row.classes
                      .split(",")
                      .map((val) => val.trim())
                      .filter(Boolean)
                      .map((val) => (
                        <Badge
                          key={val}
                          variant="secondary"
                          className="font-mono text-[10px] font-normal"
                        >
                          {val}
                        </Badge>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700"
            >
              {error}
            </div>
          )}

          <Separator />

          {/* Actions */}
          <div className="flex justify-end gap-2">
            {step === 1 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => {
                  setError(null);
                  setStep((step - 1) as 1 | 2);
                }}
              >
                <ArrowLeft size={14} /> Back
              </Button>
            )}
            <Button
              disabled={busy}
              onClick={() => (step === 3 ? void apply() : continueFlow())}
              size="sm"
            >
              {busy ? "Applying..." : step === 3 ? "Apply structure" : "Continue"}
              {step !== 3 && <ArrowRight size={14} className="ml-1" />}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

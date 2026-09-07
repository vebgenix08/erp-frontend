import { ArrowRight, FolderTree, GraduationCap, Layers3, Plus, School } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Badge } from "../../../shared/ui/badge";
import { Button } from "../../../shared/ui/button";
import { Input } from "../../../shared/ui/input";
import { Label } from "../../../shared/ui/label";
import { Modal } from "../../../shared/ui/modal";
import { EmptyState, ErrorState, LoadingState } from "../../../shared/ui/page-state";
import { listCampusAcademicUnits } from "../../tenant-settings/api/settings.api";
import type { CampusAcademicUnit } from "../../tenant-settings/model/settings.types";
import { useSelectedCampus } from "../../tenant-settings/model/selected-campus-provider";
import {
  createClass,
  createProgram,
  createSection,
  listClasses,
  listPrograms,
  listSections,
} from "../api/academic-structure.api";
import type { AcademicClass, Program, Section } from "../model/academic-structure.types";
import { AcademicStructurePlanner } from "./academic-structure-planner";

type CreateTarget = "program" | "class" | "section";

const targetLabel = {
  program: "program or level",
  class: "class, year or semester",
  section: "section",
} satisfies Record<CreateTarget, string>;

export function AcademicStructureManagement() {
  const { selectedCampus, loading: campusLoading, error: campusError } = useSelectedCampus();
  const campusId = selectedCampus?.id ?? "";
  const [academicUnits, setAcademicUnits] = useState<CampusAcademicUnit[]>([]);
  const [academicUnitId, setAcademicUnitId] = useState("");
  const [programs, setPrograms] = useState<Program[]>([]);
  const [classes, setClasses] = useState<AcademicClass[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createTarget, setCreateTarget] = useState<CreateTarget | null>(null);
  const [programId, setProgramId] = useState("");
  const [classId, setClassId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const selectedAcademicUnit =
    academicUnits.find((unit) => unit.id === academicUnitId) ?? academicUnits[0];

  useEffect(() => {
    if (!campusId) {
      setAcademicUnits([]);
      setAcademicUnitId("");
      setLoading(false);
      return;
    }
    setError(null);
    void listCampusAcademicUnits(campusId)
      .then((records) => {
        const active = records.filter((record) => record.status === "ACTIVE");
        setAcademicUnits(active);
        setAcademicUnitId((current) =>
          active.some((record) => record.id === current) ? current : (active[0]?.id ?? ""),
        );
      })
      .catch((value) =>
        setError(value instanceof Error ? value.message : "Unable to load academic units"),
      );
  }, [campusId]);

  const load = useCallback(async () => {
    if (!campusId || !selectedAcademicUnit?.id) {
      setPrograms([]);
      setClasses([]);
      setSections([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [programRows, classRows, sectionRows] = await Promise.all([
        listPrograms(campusId, selectedAcademicUnit.id),
        listClasses(campusId),
        listSections(campusId),
      ]);
      const programIds = new Set(programRows.map((program) => program.id));
      const filteredClasses = classRows.filter((academicClass) =>
        programIds.has(academicClass.programId),
      );
      const classIds = new Set(filteredClasses.map((academicClass) => academicClass.id));
      setPrograms(programRows);
      setClasses(filteredClasses);
      setSections(sectionRows.filter((section) => classIds.has(section.classId)));
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to load academic structure");
    } finally {
      setLoading(false);
    }
  }, [campusId, selectedAcademicUnit?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = useMemo(
    () => ({ programs: programs.length, classes: classes.length, sections: sections.length }),
    [programs, classes, sections],
  );

  function openCreate(target: CreateTarget, selectedProgramId = "", selectedClassId = "") {
    setCreateTarget(target);
    setProgramId(selectedProgramId || programs[0]?.id || "");
    setClassId(selectedClassId);
    setName("");
    setDescription("");
    setError(null);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!createTarget || !selectedAcademicUnit) return;
    setBusy(true);
    setError(null);
    try {
      if (createTarget === "program") {
        await createProgram({
          campusId,
          academicUnitId: selectedAcademicUnit.id,
          name,
          ...(description.trim() ? { description: description.trim() } : {}),
        });
      } else if (createTarget === "class") {
        await createClass({
          campusId,
          programId,
          name,
          ...(description.trim() ? { description: description.trim() } : {}),
        });
      } else {
        const academicClass = classes.find((item) => item.id === classId);
        if (!academicClass) throw new Error("Select a class before creating a section");
        await createSection({
          campusId,
          programId: academicClass.programId,
          classId: academicClass.id,
          name,
          ...(description.trim() ? { description: description.trim() } : {}),
        });
      }
      setCreateTarget(null);
      await load();
    } catch (value) {
      setError(
        value instanceof Error ? value.message : `Unable to create ${targetLabel[createTarget]}`,
      );
    } finally {
      setBusy(false);
    }
  }

  if (campusLoading || loading) return <LoadingState label="Loading academic structure" />;
  if (campusError) return <ErrorState message={campusError} />;
  if (!selectedCampus) {
    return (
      <EmptyState
        title="Create a campus first"
        description="Academic setup belongs to an active campus."
      />
    );
  }
  if (!academicUnits.length) {
    return (
      <EmptyState
        title="Configure an academic unit first"
        description="Add a school, PU college or degree college unit under the selected campus."
      />
    );
  }

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Interactive Structure Tree</h2>
          <p className="mt-1 text-xs text-slate-500">
            Manage programs, classes and sections together for {selectedCampus.name}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Academic unit"
            value={selectedAcademicUnit?.id ?? ""}
            onChange={(event) => setAcademicUnitId(event.target.value)}
            className="h-9 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800"
          >
            {academicUnits.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>
          <AcademicStructurePlanner
            campusId={campusId}
            campusName={selectedCampus.name}
            academicUnitId={selectedAcademicUnit!.id}
            academicUnitType={selectedAcademicUnit!.type}
            programs={programs}
            classes={classes}
            onApplied={() => void load()}
          />
          <Button size="sm" onClick={() => openCreate("program")}>
            <Plus size={14} /> Add program
          </Button>
        </div>
      </header>

      {error ? (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700"
        >
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <Summary label="Programs / levels" value={totals.programs} icon={GraduationCap} />
        <Summary label="Classes / semesters" value={totals.classes} icon={School} />
        <Summary label="Sections" value={totals.sections} icon={Layers3} />
      </div>

      <div className="rounded-md border border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
          <FolderTree size={16} className="text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900">{selectedAcademicUnit?.name}</h3>
          <Badge variant="secondary">{selectedAcademicUnit?.type}</Badge>
        </div>

        {!programs.length ? (
          <div className="p-8">
            <EmptyState
              title="No academic structure"
              description="Use Guided setup or add the first program or school level."
            />
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {programs.map((program) => {
              const programClasses = classes.filter((item) => item.programId === program.id);
              return (
                <div key={program.id} className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-50 text-blue-700">
                        <GraduationCap size={16} />
                      </span>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{program.name}</p>
                        <p className="text-[11px] text-slate-500">
                          {programClasses.length} classes, years or semesters
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openCreate("class", program.id)}
                    >
                      <Plus size={13} /> Add class
                    </Button>
                  </div>

                  <div className="mt-3 space-y-2 pl-0 sm:pl-10">
                    {programClasses.map((academicClass) => {
                      const classSections = sections.filter(
                        (item) => item.classId === academicClass.id,
                      );
                      return (
                        <div
                          key={academicClass.id}
                          className="rounded-md border border-slate-200 bg-slate-50/50 p-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <School size={15} className="text-violet-600" />
                              <div>
                                <p className="text-xs font-bold text-slate-900">
                                  {academicClass.name}
                                </p>
                                <p className="text-[11px] text-slate-500">
                                  {classSections.length} sections
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openCreate("section", program.id, academicClass.id)}
                              >
                                <Plus size={13} /> Add section
                              </Button>
                              <Button asChild size="sm" variant="ghost">
                                <Link
                                  to={`/admin/academics/class-setup?classId=${academicClass.id}`}
                                >
                                  Open Class Setup <ArrowRight size={13} />
                                </Link>
                              </Button>
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {classSections.length ? (
                              classSections.map((section) => (
                                <Link
                                  key={section.id}
                                  to={`/admin/academics/class-setup?classId=${academicClass.id}&sectionId=${section.id}`}
                                  className="inline-flex items-center gap-1.5 rounded-md border border-violet-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-50"
                                >
                                  <Layers3 size={13} /> {section.name}
                                </Link>
                              ))
                            ) : (
                              <span className="text-[11px] text-slate-400">
                                No sections configured
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {!programClasses.length ? (
                      <p className="rounded-md border border-dashed border-slate-200 p-3 text-xs text-slate-500">
                        Add the first class, year or semester under {program.name}.
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        open={Boolean(createTarget)}
        title={createTarget ? `Add ${targetLabel[createTarget]}` : "Add academic record"}
        description="Reference codes are generated by the backend."
        onClose={() => !busy && setCreateTarget(null)}
      >
        <form onSubmit={(event) => void submit(event)} className="space-y-4">
          {createTarget === "class" ? (
            <FieldSelect
              label="Program or level"
              value={programId}
              onChange={setProgramId}
              options={programs}
            />
          ) : null}
          {createTarget === "section" ? (
            <FieldSelect
              label="Class, year or semester"
              value={classId}
              onChange={setClassId}
              options={classes.filter((item) => !programId || item.programId === programId)}
            />
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="academic-record-name">Name</Label>
            <Input
              id="academic-record-name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="academic-record-description">Description</Label>
            <textarea
              id="academic-record-description"
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-xs"
            />
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setCreateTarget(null)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}

function Summary({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof School;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-slate-200 bg-white p-3">
      <div>
        <p className="text-[11px] font-semibold text-slate-500">{label}</p>
        <p className="text-xl font-bold text-slate-900">{value}</p>
      </div>
      <Icon size={18} className="text-blue-600" />
    </div>
  );
}

function FieldSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ id: string; name: string }>;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <select
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs"
      >
        <option value="">Select {label.toLowerCase()}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </div>
  );
}

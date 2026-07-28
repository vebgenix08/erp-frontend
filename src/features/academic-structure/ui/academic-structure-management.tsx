import { BookOpen, GraduationCap, Layers3, Plus, School } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Modal } from "../../../shared/ui/modal";
import { EmptyState, ErrorState, LoadingState } from "../../../shared/ui/page-state";
import {
  createClass,
  createProgram,
  createSection,
  createSubject,
  listClasses,
  listPrograms,
  listSections,
  listSubjects,
} from "../api/academic-structure.api";
import type { AcademicClass, Program, Section, Subject, SubjectType } from "../model/academic-structure.types";
import { useSelectedCampus } from "../../tenant-settings/model/selected-campus-provider";
import { AcademicStructurePlanner } from "./academic-structure-planner";
import { Button } from "../../../shared/ui/button";
import { Input } from "../../../shared/ui/input";
import { Label } from "../../../shared/ui/label";
import { Badge } from "../../../shared/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../shared/ui/table";
import { Separator } from "../../../shared/ui/separator";
import { cn } from "../../../shared/ui/utils";

type Tab = "programs" | "classes" | "sections" | "subjects";

const tabs = [
  { key: "programs", label: "Programs", icon: GraduationCap },
  { key: "classes", label: "Classes", icon: School },
  { key: "sections", label: "Sections", icon: Layers3 },
  { key: "subjects", label: "Subjects", icon: BookOpen },
] as const;

const singular: Record<Tab, string> = {
  programs: "program",
  classes: "class",
  sections: "section",
  subjects: "subject",
};

const SUBJECT_SUGGESTIONS = {
  SCHOOL: [
    "English",
    "Kannada",
    "Hindi",
    "Mathematics",
    "Science",
    "Social Science",
    "Computer Science",
    "Physical Education",
  ],
  COLLEGE: [
    "English",
    "Kannada",
    "Physics",
    "Chemistry",
    "Mathematics",
    "Biology",
    "Computer Science",
    "Economics",
    "Business Studies",
    "Accountancy",
  ],
  DEGREE_COLLEGE: ["English", "Environmental Studies", "Constitution of India", "Computer Applications", "Physical Education"],
} as const;

export function AcademicStructureManagement() {
  const [tab, setTab] = useState<Tab>("programs");
  const { selectedCampus, loading: campusLoading, error: campusError } = useSelectedCampus();
  const campusId = selectedCampus?.id ?? "";

  const [programs, setPrograms] = useState<Program[]>([]);
  const [classes, setClasses] = useState<AcademicClass[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [programId, setProgramId] = useState("");
  const [classId, setClassId] = useState("");
  const [subjectType, setSubjectType] = useState<SubjectType>("THEORY");
  const [credits, setCredits] = useState("");

  const load = () => {
    if (!campusId) return;
    setLoading(true);
    setError(null);
    Promise.all([
      listPrograms(campusId),
      listClasses(campusId),
      listSections(campusId),
      listSubjects(campusId),
    ])
      .then(([p, c, s, u]) => {
        setPrograms(p);
        setClasses(c);
        setSections(s);
        setSubjects(u);
      })
      .catch((value) =>
        setError(value instanceof Error ? value.message : "Unable to load academic structure"),
      )
      .finally(() => setLoading(false));
  };

  useEffect(load, [campusId]);

  const activePrograms = programs.filter((item) => item.status === "ACTIVE");
  const availableClasses = classes.filter(
    (item) => item.status === "ACTIVE" && (!programId || item.programId === programId),
  );

  const rows = useMemo(
    () =>
      tab === "programs"
        ? programs
        : tab === "classes"
          ? classes
          : tab === "sections"
            ? sections
            : subjects,
    [tab, programs, classes, sections, subjects],
  );

  const programName = (value: string) => programs.find((item) => item.id === value)?.name ?? "—";
  const className = (value?: string) =>
    value ? classes.find((item) => item.id === value)?.name ?? "—" : "All classes";

  const count = (key: Tab) => {
    if (key === "programs") return programs.length;
    if (key === "classes") return classes.length;
    if (key === "sections") return sections.length;
    return subjects.length;
  };

  const language =
    selectedCampus?.campusType === "SCHOOL"
      ? {
          program: "school level",
          programs: "School levels",
          class: "class",
          classes: "Classes",
          subject: "subject",
          subjects: "Subjects",
        }
      : selectedCampus?.campusType === "DEGREE_COLLEGE"
        ? { program: "program", programs: "Programs", class: "semester", classes: "Semesters", subject: "course", subjects: "Courses" }
        : { program: "program", programs: "Programs", class: "year", classes: "Years", subject: "subject", subjects: "Subjects" };

  const labelText = (key: Tab) => {
    if (key === "programs") return language.programs;
    if (key === "classes") return language.classes;
    if (key === "subjects") return language.subjects;
    return "Sections";
  };

  const itemName = (key: Tab) => {
    if (key === "programs") return language.program;
    if (key === "classes") return language.class;
    if (key === "subjects") return language.subject;
    return "section";
  };

  function startCreate() {
    setName("");
    setDescription("");
    setProgramId(activePrograms[0]?.id ?? "");
    setClassId("");
    setSubjectType("THEORY");
    setCredits("");
    setOpen(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (
        tab === "subjects" &&
        credits &&
        (!Number.isFinite(Number(credits)) || Number(credits) < 0)
      ) {
        throw new Error("Credits or periods must be a valid non-negative value.");
      }
      if (tab === "programs") {
        const created = await createProgram({ campusId, name, ...(description ? { description } : {}) });
        setPrograms((value) => [...value, created]);
      }
      if (tab === "classes") {
        const created = await createClass({ campusId, programId, name, ...(description ? { description } : {}) });
        setClasses((value) => [...value, created]);
      }
      if (tab === "sections") {
        const created = await createSection({
          campusId,
          programId,
          classId,
          name,
          ...(description ? { description } : {}),
        });
        setSections((value) => [...value, created]);
      }
      if (tab === "subjects") {
        const names = [
          ...new Set(
            name
              .split(/[\n,]/)
              .map((value) => value.trim())
              .filter(Boolean),
          ),
        ];
        const existing = subjects
          .filter((item) => item.programId === programId && (item.classId ?? "") === classId)
          .map((item) => item.name.toLowerCase());
        const created: Subject[] = [];
        for (const subjectName of names) {
          if (!existing.includes(subjectName.toLowerCase())) {
            created.push(
              await createSubject({
                campusId,
                programId,
                name: subjectName,
                subjectType,
                ...(classId ? { classId } : {}),
                ...(credits ? { credits: Number(credits) } : {}),
              }),
            );
          }
        }
        setSubjects((value) => [...value, ...created]);
      }
      setOpen(false);
    } catch (value) {
      setError(value instanceof Error ? value.message : `Unable to create ${singular[tab]}`);
    } finally {
      setBusy(false);
    }
  }

  if (loading || campusLoading) return <LoadingState label="Loading academic structure" />;
  if (campusError) return <ErrorState message={campusError} />;
  if (!selectedCampus) {
    return (
      <EmptyState
        title="Create a campus first"
        description="Academic setup must belong to an active school or college campus."
      />
    );
  }
  if (error && !rows.length) return <ErrorState message={error} retry={load} />;

  const dependencyMissing = tab !== "programs" && !activePrograms.length;

  return (
    <section className="space-y-5">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Academic structure</h2>
          <p className="mt-1 text-sm text-slate-500">
            Configure {selectedCampus.name}'s {selectedCampus.campusType === "SCHOOL" ? "school" : "college"} curriculum. Change campus from the top bar.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AcademicStructurePlanner
            campusId={campusId}
            campusName={selectedCampus.name}
            campusType={selectedCampus.campusType}
            programs={programs}
            classes={classes}
            onApplied={load}
          />
          <Button size="sm" disabled={dependencyMissing} onClick={startCreate}>
            <Plus size={15} /> Add {tab === "subjects" ? language.subjects.toLowerCase() : itemName(tab)}
          </Button>
        </div>
      </header>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200" role="tablist">
        {tabs.map(({ key, icon: Icon }) => {
          const isActive = tab === key;
          return (
            <button
              key={key}
              role="tab"
              aria-selected={isActive}
              onClick={() => setTab(key)}
              className={cn(
                "flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-all outline-none",
                isActive
                  ? "border-accent-600 text-accent-700"
                  : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300",
              )}
            >
              <Icon size={15} className={isActive ? "text-accent-650" : "text-slate-400"} />
              <span>{labelText(key)}</span>
              <span
                className={cn(
                  "ml-1 rounded-full px-1.5 py-0.5 text-xs font-normal",
                  isActive ? "bg-accent-100 text-accent-700" : "bg-slate-100 text-slate-500",
                )}
              >
                {count(key)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {dependencyMissing ? (
        <EmptyState
          title="Create a program first"
          description="Classes, sections, and subjects must belong to an active program."
        />
      ) : rows.length ? (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Reference</TableHead>
                {tab !== "programs" && <TableHead>Program</TableHead>}
                {(tab === "sections" || tab === "subjects") && <TableHead>Class</TableHead>}
                {tab === "subjects" && <TableHead>Type</TableHead>}
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-semibold text-slate-900">{row.name}</TableCell>
                  <TableCell className="text-xs font-mono text-slate-500">{row.code}</TableCell>
                  {"programId" in row && (
                    <TableCell className="text-slate-650 text-sm">
                      {programName(row.programId)}
                    </TableCell>
                  )}
                  {"classId" in row && (tab === "sections" || tab === "subjects") && (
                    <TableCell className="text-slate-650 text-sm">
                      {className(row.classId)}
                    </TableCell>
                  )}
                  {"subjectType" in row && (
                    <TableCell className="text-slate-650 text-sm">
                      {row.subjectType.replaceAll("_", " ")}
                    </TableCell>
                  )}
                  <TableCell>
                    <Badge variant={row.status === "ACTIVE" ? "success" : "secondary"}>
                      {row.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState
          title={`No ${labelText(tab).toLowerCase()} configured`}
          description={`Add the first ${itemName(tab)} to continue academic setup.`}
        />
      )}

      {/* Add Modal */}
      <Modal
        open={open}
        title={`Add ${tab === "subjects" ? language.subjects.toLowerCase() : itemName(tab)}`}
        description={
          tab === "subjects"
            ? `Add several ${language.subjects.toLowerCase()} together. References are generated automatically.`
            : `This record belongs to ${selectedCampus?.name}. The reference code is generated automatically.`
        }
        onClose={() => setOpen(false)}
      >
        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          {tab !== "programs" && (
            <div className="space-y-1.5">
              <Label htmlFor="prog-sel">{language.program}</Label>
              <select
                id="prog-sel"
                required
                value={programId}
                onChange={(e) => {
                  setProgramId(e.target.value);
                  setClassId("");
                }}
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600"
              >
                {activePrograms.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(tab === "sections" || tab === "subjects") && (
            <div className="space-y-1.5">
              <Label htmlFor="class-sel">
                {language.class}
                {tab === "subjects" ? " (optional)" : ""}
              </Label>
              <select
                id="class-sel"
                required={tab === "sections"}
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600"
              >
                {tab === "subjects" ? (
                  <option value="">All {language.classes.toLowerCase()}</option>
                ) : (
                  <option value="">Select {language.class}</option>
                )}
                {availableClasses.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {tab === "subjects" ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="sub-names">
                  Subject names <small className="text-slate-400">one per line or separated by commas</small>
                </Label>
                <textarea
                  id="sub-names"
                  required
                  rows={4}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="English&#10;Mathematics&#10;Science"
                  className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600 resize-none"
                />
              </div>

              {/* Suggestions */}
              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">
                  Common {language.subjects.toLowerCase()}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {SUBJECT_SUGGESTIONS[selectedCampus.campusType].map((suggestion) => {
                    const chosen = name
                      .split(/[\n,]/)
                      .map((val) => val.trim())
                      .includes(suggestion);
                    return (
                      <button
                        type="button"
                        key={suggestion}
                        onClick={() => {
                          if (chosen) return;
                          setName((val) => (val.trim() ? `${val.trim()}\n${suggestion}` : suggestion));
                        }}
                        className={cn(
                          "rounded px-2.5 py-1 text-xs font-medium transition-colors border",
                          chosen
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100",
                        )}
                      >
                        {chosen ? "✓" : "+"} {suggestion}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="sub-type">Subject type</Label>
                  <select
                    id="sub-type"
                    value={subjectType}
                    onChange={(e) => setSubjectType(e.target.value as SubjectType)}
                    className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600"
                  >
                    <option value="THEORY">Theory</option>
                    <option value="PRACTICAL">Practical</option>
                    <option value="MIXED">Theory and practical</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sub-credits">
                    {selectedCampus.campusType === "SCHOOL" ? "Periods per week" : "Credits"}{" "}
                    <small className="text-slate-400">(optional)</small>
                  </Label>
                  <Input
                    id="sub-credits"
                    value={credits}
                    onChange={(e) => {
                      if (/^\d*(\.\d?)?$/.test(e.target.value)) setCredits(e.target.value);
                    }}
                    placeholder={selectedCampus.campusType === "SCHOOL" ? "Example: 5" : "Example: 3.5"}
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="field-name">Name</Label>
                <Input id="field-name" required value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="field-desc">Description</Label>
                <textarea
                  id="field-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600 resize-none"
                />
              </div>
            </>
          )}

          <Separator />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={busy}>
              {busy
                ? "Creating..."
                : tab === "subjects"
                  ? `Create ${name.split(/[\n,]/).filter((val) => val.trim()).length || ""} ${language.subjects.toLowerCase()}`
                  : "Create"}
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}

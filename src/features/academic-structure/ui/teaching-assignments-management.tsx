import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Plus, UserRoundCheck, X } from "lucide-react";
import { listEmployees } from "../../staff/api/staff.api";
import type { Employee } from "../../staff/model/staff.types";
import { useSelectedCampus } from "../../tenant-settings/model/selected-campus-provider";
import { useSelectedAcademicYear } from "../../tenant-settings/model/selected-academic-year-provider";
import { createTeachingAssignment, deactivateTeachingAssignment, listClasses, listPrograms, listSections, listSubjects, listTeachingAssignments } from "../api/academic-structure.api";
import type { AcademicClass, Program, Section, Subject, TeachingAssignment, TeachingAssignmentRole } from "../model/academic-structure.types";
import { Button } from "../../../shared/ui/button";
import { Badge } from "../../../shared/ui/badge";
import { EmptyState, ErrorState, LoadingState } from "../../../shared/ui/page-state";
import { Modal } from "../../../shared/ui/modal";
import { Label } from "../../../shared/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../shared/ui/table";

const initial = { employeeId: "", role: "SUBJECT_TEACHER" as TeachingAssignmentRole, programId: "", classId: "", sectionId: "", subjectId: "" };
export function TeachingAssignmentsManagement() {
  const { selectedCampus } = useSelectedCampus(); const { selectedAcademicYear } = useSelectedAcademicYear();
  const [rows, setRows] = useState<TeachingAssignment[]>([]); const [employees, setEmployees] = useState<Employee[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]); const [classes, setClasses] = useState<AcademicClass[]>([]);
  const [sections, setSections] = useState<Section[]>([]); const [subjects, setSubjects] = useState<Subject[]>([]);
  const [form, setForm] = useState(initial); const [open, setOpen] = useState(false); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!selectedCampus) return setLoading(false);
    setLoading(true); setError(null);
    try { const [assignments, staff, p, c, s, subjectsData] = await Promise.all([
      listTeachingAssignments({ campusId: selectedCampus.id, ...(selectedAcademicYear ? { academicYearId: selectedAcademicYear.id } : {}) }),
      listEmployees({ campusId: selectedCampus.id, status: "ACTIVE", staffCategory: "TEACHING" }), listPrograms(selectedCampus.id), listClasses(selectedCampus.id), listSections(selectedCampus.id), listSubjects(selectedCampus.id),
    ]); setRows(assignments); setEmployees(staff); setPrograms(p); setClasses(c); setSections(s); setSubjects(subjectsData);
    } catch (value) { setError(value instanceof Error ? value.message : "Unable to load teaching assignments"); } finally { setLoading(false); }
  }, [selectedAcademicYear, selectedCampus]);
  useEffect(() => { void load(); }, [load]);
  const availableClasses = useMemo(() => classes.filter((item) => item.programId === form.programId && item.status === "ACTIVE"), [classes, form.programId]);
  const availableSections = useMemo(() => sections.filter((item) => item.classId === form.classId && item.status === "ACTIVE"), [sections, form.classId]);
  const availableSubjects = useMemo(() => subjects.filter((item) => (!item.classId || item.classId === form.classId) && item.status === "ACTIVE"), [subjects, form.classId]);
  const save = async () => {
    if (!selectedCampus || !selectedAcademicYear) return setError("Select a campus and academic year first.");
    const employee = employees.find((item) => item.id === form.employeeId); if (!employee) return setError("Select a teaching employee.");
    try { setError(null); await createTeachingAssignment({ campusId: selectedCampus.id, academicYearId: selectedAcademicYear.id, employeeId: employee.id, employeeName: employee.fullName, role: form.role, programId: form.programId, classId: form.classId, sectionId: form.sectionId, ...(form.role === "SUBJECT_TEACHER" ? { subjectId: form.subjectId } : {}) }); setOpen(false); setForm(initial); await load(); }
    catch (value) { setError(value instanceof Error ? value.message : "Unable to save teaching assignment"); }
  };
  if (loading) return <LoadingState label="Loading teaching assignments"/>;
  return <section className="space-y-5">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold text-slate-900">Teaching assignments</h2><p className="text-sm text-slate-500">Assign subject teachers and one in-charge for each section in the selected academic year.</p></div><Button onClick={() => setOpen(true)}><Plus size={15}/>New assignment</Button></header>
    {error && <ErrorState message={error} retry={load}/>}
    {rows.length ? <div className="overflow-hidden rounded-lg border border-slate-200 bg-white"><Table><TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Responsibility</TableHead><TableHead>Class / section</TableHead><TableHead>Subject</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.id}><TableCell className="font-semibold">{row.employeeName}</TableCell><TableCell>{row.role === "SECTION_INCHARGE" ? "Section in-charge" : "Subject teacher"}</TableCell><TableCell>{classes.find((item) => item.id === row.classId)?.name ?? "-"} / {sections.find((item) => item.id === row.sectionId)?.name ?? "-"}</TableCell><TableCell>{subjects.find((item) => item.id === row.subjectId)?.name ?? "All section responsibilities"}</TableCell><TableCell><Badge variant={row.status === "ACTIVE" ? "success" : "secondary"}>{row.status}</Badge></TableCell><TableCell>{row.status === "ACTIVE" && <Button variant="ghost" size="icon-sm" title="Deactivate assignment" onClick={() => void deactivateTeachingAssignment(row.id).then(load).catch((value) => setError(value instanceof Error ? value.message : "Unable to deactivate"))}><X size={15}/></Button>}</TableCell></TableRow>)}</TableBody></Table></div> : <EmptyState title="No teaching assignments" description="Create assignments after employees, classes, sections and subjects are available."/>}
    <Modal open={open} title="New teaching assignment" description={`${selectedCampus?.name ?? "No campus"} · ${selectedAcademicYear?.name ?? "No academic year"}`} onClose={() => setOpen(false)}><div className="grid gap-4 sm:grid-cols-2">
      <Field label="Employee"><select value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} className="h-9 w-full rounded-md border border-slate-200 px-2"><option value="">Select employee</option>{employees.map((item) => <option key={item.id} value={item.id}>{item.fullName}</option>)}</select></Field>
      <Field label="Responsibility"><select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as TeachingAssignmentRole, subjectId: "" })} className="h-9 w-full rounded-md border border-slate-200 px-2"><option value="SUBJECT_TEACHER">Subject teacher</option><option value="SECTION_INCHARGE">Section in-charge</option></select></Field>
      <Field label="Program"><select value={form.programId} onChange={(e) => setForm({ ...form, programId: e.target.value, classId: "", sectionId: "", subjectId: "" })} className="h-9 w-full rounded-md border border-slate-200 px-2"><option value="">Select program</option>{programs.filter((i) => i.status === "ACTIVE").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
      <Field label="Class"><select value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value, sectionId: "", subjectId: "" })} className="h-9 w-full rounded-md border border-slate-200 px-2"><option value="">Select class</option>{availableClasses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
      <Field label="Section"><select value={form.sectionId} onChange={(e) => setForm({ ...form, sectionId: e.target.value })} className="h-9 w-full rounded-md border border-slate-200 px-2"><option value="">Select section</option>{availableSections.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
      {form.role === "SUBJECT_TEACHER" && <Field label="Subject"><select value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })} className="h-9 w-full rounded-md border border-slate-200 px-2"><option value="">Select subject</option>{availableSubjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>}
    </div><div className="mt-5 flex justify-end"><Button disabled={!form.employeeId || !form.programId || !form.classId || !form.sectionId || (form.role === "SUBJECT_TEACHER" && !form.subjectId)} onClick={() => void save()}><UserRoundCheck size={15}/>Save assignment</Button></div></Modal>
  </section>;
}
function Field({ label, children }: { label: string; children: ReactNode }) { return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>; }

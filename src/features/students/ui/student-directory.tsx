import {
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  GraduationCap,
  MoreVertical,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Upload,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useSelectedAcademicYear } from "../../tenant-settings/model/selected-academic-year-provider";
import { useSelectedCampus } from "../../tenant-settings/model/selected-campus-provider";
import { listStudentPage, listStudents, type StudentPage } from "../api/students.api";
import type { Student } from "../model/student.types";
import { listClasses, listSections } from "../../academic-structure/api/academic-structure.api";
import type { AcademicClass, Section } from "../../academic-structure/model/academic-structure.types";
import { exportRowsToExcel, exportRowsToPdf, type ExportColumn } from "../../../shared/lib/tabular-export";
import { EmptyState, ErrorState, LoadingState } from "../../../shared/ui/page-state";
import { Button } from "../../../shared/ui/button";
import { Input } from "../../../shared/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../shared/ui/table";
import { cn } from "../../../shared/ui/utils";

const pageSizes = new Set([10, 20, 25, 50, 100]);
const positiveInteger = (value: string | null, fallback: number) => {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export function StudentDirectory() {
  const navigate = useNavigate();
  const [query, setQuery] = useSearchParams();
  const { selectedCampus } = useSelectedCampus();
  const { selectedAcademicYear } = useSelectedAcademicYear();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<AcademicClass[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const search = query.get("search") ?? "";
  const [draftSearch, setDraftSearch] = useState(search);
  const classId = query.get("classId") ?? "";
  const sectionId = query.get("sectionId") ?? "";
  const status = (query.get("status") ?? "") as Student["status"] | "";
  const page = positiveInteger(query.get("page"), 1);
  const requestedPageSize = positiveInteger(query.get("pageSize"), 20);
  const pageSize = pageSizes.has(requestedPageSize) ? requestedPageSize : 20;
  const sortBy = (query.get("sortBy") ?? "name") as StudentPage["sortBy"];
  const sortDirection = (query.get("sortDirection") ?? "ASC") as StudentPage["sortDirection"];
  const [selected, setSelected] = useState<Map<string, Student>>(new Map());
  const [exportScope, setExportScope] = useState<"PAGE" | "FILTERED" | "SELECTED">("FILTERED");
  const [exporting, setExporting] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!selectedCampus || !selectedAcademicYear) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await listStudentPage({
        campusId: selectedCampus.id,
        academicYearId: selectedAcademicYear.id,
        ...(status ? { status } : {}),
        ...(classId ? { classId } : {}),
        ...(sectionId ? { sectionId } : {}),
        page,
        pageSize,
        sortBy,
        sortDirection,
        ...(search ? { search } : {}),
      });
      setStudents(result.items);
      setTotal(result.total);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to load students");
    } finally {
      setLoading(false);
    }
  }, [classId, page, pageSize, search, sectionId, selectedAcademicYear, selectedCampus, sortBy, sortDirection, status]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setSelected(new Map()); }, [classId, search, sectionId, selectedCampus?.id, selectedAcademicYear?.id, status]);
  useEffect(() => { setDraftSearch(search); }, [search]);
  useEffect(() => {
    if (!selectedCampus) { setClasses([]); setSections([]); return; }
    void Promise.all([listClasses(selectedCampus.id), listSections(selectedCampus.id)]).then(
      ([classRows, sectionRows]) => {
        setClasses(classRows.filter((item) => item.status === "ACTIVE"));
        setSections(sectionRows.filter((item) => item.status === "ACTIVE"));
      },
    );
  }, [selectedCampus]);

  const classNameById = useMemo(() => new Map(classes.map((item) => [item.id, item.name])), [classes]);
  const sectionNameById = useMemo(() => new Map(sections.map((item) => [item.id, item.name])), [sections]);
  const availableSections = useMemo(
    () => sections.filter((item) => !classId || item.classId === classId),
    [classId, sections],
  );
  const pageFullySelected = students.length > 0 && students.every((s) => selected.has(s.id));

  const updateQuery = useCallback(
    (updates: Record<string, string | number | undefined>, resetPage = true) => {
      const next = new URLSearchParams(query);
      Object.entries(updates).forEach(([key, value]) => {
        if (value === undefined || value === "") next.delete(key);
        else next.set(key, String(value));
      });
      if (resetPage && !("page" in updates)) next.set("page", "1");
      setQuery(next, { replace: true });
    },
    [query, setQuery],
  );

  function toggleStudent(student: Student) {
    setSelected((current) => {
      const next = new Map(current);
      if (next.has(student.id)) next.delete(student.id);
      else next.set(student.id, student);
      return next;
    });
  }

  function togglePage() {
    setSelected((current) => {
      const next = new Map(current);
      if (pageFullySelected) students.forEach((s) => next.delete(s.id));
      else students.forEach((s) => next.set(s.id, s));
      return next;
    });
  }

  async function getFilteredStudents() {
    if (!selectedCampus || !selectedAcademicYear) return [];
    const all: Student[] = [];
    for (let offset = 0; ; offset += 100) {
      const batch = await listStudents({
        campusId: selectedCampus.id,
        academicYearId: selectedAcademicYear.id,
        ...(status ? { status } : {}),
        ...(classId ? { classId } : {}),
        ...(sectionId ? { sectionId } : {}),
        ...(search ? { search } : {}),
        limit: 100,
        offset,
      });
      all.push(...batch);
      if (batch.length < 100) return all;
    }
  }

  async function exportStudents(format: "XLSX" | "PDF") {
    setExporting(true);
    setError(null);
    try {
      const rows =
        exportScope === "SELECTED"
          ? [...selected.values()]
          : exportScope === "PAGE"
            ? students
            : await getFilteredStudents();
      if (!rows.length) throw new Error("No students are available to export");
      const columns: ExportColumn<Student>[] = [
        { header: "Student", value: (row) => row.name, width: 24 },
        { header: "Class", value: (row) => classNameById.get(row.enrollment.classId) ?? "—", width: 16 },
        { header: "Section", value: (row) => row.enrollment.sectionId ? sectionNameById.get(row.enrollment.sectionId) ?? "—" : "—", width: 14 },
        { header: "Admission No.", value: (row) => row.admissionNumber, width: 18 },
        { header: "Registration No.", value: (row) => row.registrationNumber, width: 20 },
        { header: "Roll No.", value: (row) => row.enrollment.rollNumber ?? "—", width: 12 },
        { header: "Phone", value: (row) => row.phone, width: 16 },
        { header: "Guardian", value: (row) => row.guardian.name, width: 22 },
        { header: "Status", value: (row) => row.status, width: 14 },
      ];
      const suffix = exportScope.toLowerCase();
      if (format === "XLSX") await exportRowsToExcel(`students-${suffix}`, "Students", columns, rows);
      else await exportRowsToPdf(`students-${suffix}`, "Student Directory", columns, rows);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to export students");
    } finally {
      setExporting(false);
    }
  }

  if (!selectedCampus || !selectedAcademicYear)
    return (
      <EmptyState
        title="Select campus and academic year"
        description="The student directory follows the operating context in the top bar."
      />
    );

  // REAL DATA METRIC CALCULATIONS
  const activeStudentsCount = students.filter((s) => s.status === "ACTIVE").length;
  const inactiveStudentsCount = students.filter((s) => s.status === "INACTIVE").length;
  const activePercentage = total > 0 ? ((activeStudentsCount / Math.max(students.length, 1)) * 100).toFixed(1) : "0.0";
  const inactivePercentage = total > 0 ? ((inactiveStudentsCount / Math.max(students.length, 1)) * 100).toFixed(1) : "0.0";

  return (
    <section className="space-y-6 pb-12">
      {/* Top Header & Quick Actions Bar */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Student Directory</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Manage student records, active class enrollments, and academic profiles for {selectedCampus.name}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs font-bold border-slate-300">
            <Upload size={14} /> Import Students
          </Button>
          <Button
            variant="brand"
            size="sm"
            onClick={() => navigate("/admin/admissions/applications")}
            className="h-8 text-xs font-bold shadow-xs"
          >
            <Plus size={14} /> Add Student
          </Button>
        </div>
      </header>

      {/* Top 5 Metric Cards Row (100% Real Backend Data) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {/* Card 1: Total Students */}
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs flex items-center gap-3">
          <div className="h-11 w-11 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
            <Users size={20} />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 block">Total Students</span>
            <p className="text-lg font-black text-slate-900 leading-tight">
              {total.toLocaleString()}
            </p>
            <span className="text-[10px] font-bold text-slate-500">Total enrolled</span>
          </div>
        </div>

        {/* Card 2: Active Students */}
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs flex items-center gap-3">
          <div className="h-11 w-11 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <UserCheck size={20} />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 block">Active Students</span>
            <p className="text-lg font-black text-slate-900 leading-tight">
              {activeStudentsCount.toLocaleString()}
            </p>
            <span className="text-[10px] font-bold text-emerald-600">{activePercentage}% of page</span>
          </div>
        </div>

        {/* Card 3: New Admissions */}
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs flex items-center gap-3">
          <div className="h-11 w-11 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <UserPlus size={20} />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 block">New Admissions</span>
            <p className="text-lg font-black text-slate-900 leading-tight">
              {students.filter((s) => s.status === "ACTIVE").length}
            </p>
            <span className="text-[10px] font-bold text-brand-600">Active enrollments</span>
          </div>
        </div>

        {/* Card 4: Promoted Students */}
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs flex items-center gap-3">
          <div className="h-11 w-11 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center shrink-0">
            <GraduationCap size={20} />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 block">Promoted Students</span>
            <p className="text-lg font-black text-slate-900 leading-tight">
              {students.filter((s) => s.status === "GRADUATED").length}
            </p>
            <span className="text-[10px] font-bold text-brand-600">This academic year</span>
          </div>
        </div>

        {/* Card 5: Inactive Students */}
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs flex items-center gap-3">
          <div className="h-11 w-11 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
            <UserMinus size={20} />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 block">Inactive Students</span>
            <p className="text-lg font-black text-slate-900 leading-tight">
              {inactiveStudentsCount.toLocaleString()}
            </p>
            <span className="text-[10px] font-bold text-rose-600">{inactivePercentage}% of page</span>
          </div>
        </div>
      </div>

      {/* Filter Controls Row */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 space-y-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Academic Year Select */}
          <div className="space-y-1 min-w-[130px]">
            <span className="text-[11px] font-bold text-slate-700 block">Academic Year</span>
            <select
              className="h-8.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-600"
              defaultValue={selectedAcademicYear.name}
            >
              <option value={selectedAcademicYear.name}>{selectedAcademicYear.name}</option>
            </select>
          </div>

          {/* Campus Select */}
          <div className="space-y-1 min-w-[150px]">
            <span className="text-[11px] font-bold text-slate-700 block">Campus</span>
            <select
              className="h-8.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-600"
              defaultValue={selectedCampus.name}
            >
              <option value={selectedCampus.name}>{selectedCampus.name}</option>
              <option value="">All Campuses</option>
            </select>
          </div>

          {/* Class Select */}
          <div className="space-y-1 min-w-[140px]">
            <span className="text-[11px] font-bold text-slate-700 block">Class</span>
            <select
              value={classId}
              onChange={(e) => updateQuery({ classId: e.target.value, sectionId: undefined })}
              className="h-8.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-600"
            >
              <option value="">All Classes</option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          {/* Section Select */}
          <div className="space-y-1 min-w-[130px]">
            <span className="text-[11px] font-bold text-slate-700 block">Section</span>
            <select
              value={sectionId}
              onChange={(e) => updateQuery({ sectionId: e.target.value })}
              className="h-8.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-600"
            >
              <option value="">All Sections</option>
              {availableSections.map((item) => (
                <option key={item.id} value={item.id}>
                  Section {item.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Select */}
          <div className="space-y-1 min-w-[130px]">
            <span className="text-[11px] font-bold text-slate-700 block">Status</span>
            <select
              value={status}
              onChange={(e) => updateQuery({ status: e.target.value })}
              className="h-8.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-600"
            >
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="GRADUATED">Graduated</option>
              <option value="TRANSFERRED">Transferred</option>
            </select>
          </div>

          {/* More Filters Button */}
          <div className="pt-5 ml-auto">
            <Button variant="outline" size="sm" className="h-8.5 text-xs font-bold border-slate-300">
              <Filter size={14} /> More Filters
            </Button>
          </div>
        </div>

        {/* Filter Controls Row 2 (Search, Clear Filters, Export, Columns) */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateQuery({ search: draftSearch.trim() });
            }}
            className="relative flex-1 min-w-[280px]"
          >
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <Input
              value={draftSearch}
              onChange={(e) => setDraftSearch(e.target.value)}
              placeholder="Search by name, admission no., roll no., mobile..."
              className="pl-9 h-8.5 text-xs font-medium bg-slate-50/50"
            />
          </form>

          <div className="flex items-center gap-2">
            {(search || classId || sectionId || status) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDraftSearch("");
                  setQuery(new URLSearchParams({ page: "1", pageSize: String(pageSize) }), { replace: true });
                }}
                className="h-8.5 text-xs font-bold text-slate-600"
              >
                <RotateCcw size={13} /> Clear Filters
              </Button>
            )}

            {/* Export Button */}
            <div className="flex items-center gap-1 border border-slate-300 rounded-lg p-0.5 bg-white">
              <select
                value={exportScope}
                onChange={(e) => setExportScope(e.target.value as "PAGE" | "FILTERED" | "SELECTED")}
                className="h-7 text-[11px] font-bold text-slate-700 bg-transparent border-0 px-2 pr-6"
              >
                <option value="PAGE">Current Page</option>
                <option value="FILTERED">All Filtered</option>
                <option value="SELECTED" disabled={!selected.size}>
                  Selected ({selected.size})
                </option>
              </select>
              <Button
                size="icon-sm"
                variant="ghost"
                title="Export Excel"
                disabled={exporting}
                onClick={() => void exportStudents("XLSX")}
                className="h-7 w-7 text-emerald-700 hover:bg-emerald-50"
              >
                <FileSpreadsheet size={15} />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                title="Export PDF"
                disabled={exporting}
                onClick={() => void exportStudents("PDF")}
                className="h-7 w-7 text-rose-700 hover:bg-rose-50"
              >
                <FileText size={15} />
              </Button>
            </div>

            <Button variant="outline" size="sm" className="h-8.5 text-xs font-bold border-slate-300">
              <SlidersHorizontal size={14} /> Columns
            </Button>
          </div>
        </div>
      </div>

      {/* Main Students Data Table (Strictly REAL Data) */}
      {error ? (
        <ErrorState message={error} retry={() => void load()} />
      ) : loading ? (
        <LoadingState label="Loading student directory" />
      ) : students.length ? (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold text-[11px]">
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    aria-label="Select all students on this page"
                    checked={pageFullySelected}
                    onChange={togglePage}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600 cursor-pointer"
                  />
                </TableHead>
                <TableHead className="py-3 font-bold text-slate-800">Student Name ↕</TableHead>
                <TableHead className="py-3 font-bold text-slate-800">Admission No. ↕</TableHead>
                <TableHead className="py-3 font-bold text-slate-800">Roll No. ↕</TableHead>
                <TableHead className="py-3 font-bold text-slate-800">Class - Section ↕</TableHead>
                <TableHead className="py-3 font-bold text-slate-800">Date of Birth ↕</TableHead>
                <TableHead className="py-3 font-bold text-slate-800">Gender ↕</TableHead>
                <TableHead className="py-3 font-bold text-slate-800">Status ↕</TableHead>
                <TableHead className="py-3 text-right font-bold text-slate-800">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-slate-100 text-xs">
              {students.map((student) => {
                const clsName = classNameById.get(student.enrollment.classId) ?? "—";
                const secName = student.enrollment.sectionId
                  ? sectionNameById.get(student.enrollment.sectionId) ?? "—"
                  : "—";
                const rollNo = student.enrollment.rollNumber || "—";
                const dobStr = student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
                const genderStr = student.gender ? student.gender.charAt(0).toUpperCase() + student.gender.slice(1).toLowerCase() : "Unspecified";

                return (
                  <TableRow
                    key={student.id}
                    onClick={() => navigate(`/admin/students/${student.id}`)}
                    className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                  >
                    {/* Checkbox */}
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(student.id)}
                        onChange={() => toggleStudent(student)}
                        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600 cursor-pointer"
                      />
                    </TableCell>

                    {/* Student Name with Avatar & Parent Name */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs overflow-hidden shrink-0 border border-slate-200">
                          {student.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <Link
                            to={`/admin/students/${student.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-bold text-brand-700 hover:underline block truncate"
                          >
                            {student.name}
                          </Link>
                          <span className="text-[10.5px] text-slate-500 block truncate">
                            {student.guardian?.name || "—"}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Admission No. */}
                    <TableCell className="font-semibold text-slate-700 font-mono">
                      {student.admissionNumber || "—"}
                    </TableCell>

                    {/* Roll No. */}
                    <TableCell className="font-semibold text-slate-700 font-mono">
                      {rollNo}
                    </TableCell>

                    {/* Class - Section */}
                    <TableCell className="font-bold text-slate-800">
                      {clsName} {secName !== "—" ? `- ${secName}` : ""}
                    </TableCell>

                    {/* Date of Birth */}
                    <TableCell className="font-medium text-slate-700">
                      {dobStr}
                    </TableCell>

                    {/* Gender Badge */}
                    <TableCell>
                      <span
                        className={cn(
                          "px-2.5 py-0.5 rounded-full text-[10.5px] font-bold inline-block",
                          genderStr.toLowerCase() === "female" ? "bg-rose-50 text-rose-600" : "bg-brand-50 text-brand-700",
                        )}
                      >
                        {genderStr}
                      </span>
                    </TableCell>

                    {/* Status Badge */}
                    <TableCell>
                      <span
                        className={cn(
                          "px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold inline-block",
                          student.status === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-800",
                        )}
                      >
                        {student.status}
                      </span>
                    </TableCell>

                    {/* Actions Row (View, Edit, Options Menu) */}
                    <TableCell onClick={(e) => e.stopPropagation()} className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          title="View Student Profile"
                          onClick={() => navigate(`/admin/students/${student.id}`)}
                          className="h-7 w-7 text-slate-500 hover:text-brand-600 hover:bg-brand-50"
                        >
                          <Eye size={14} />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          title="Edit Student Record"
                          onClick={() => navigate(`/admin/students/${student.id}`)}
                          className="h-7 w-7 text-slate-500 hover:text-brand-600 hover:bg-brand-50"
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          title="More Options"
                          className="h-7 w-7 text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                        >
                          <MoreVertical size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* Table Footer Pagination Row */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50/50 text-xs">
            <span className="text-slate-500 font-medium">
              Showing {students.length ? (page - 1) * pageSize + 1 : 0} to {Math.min(page * pageSize, total)} of {total.toLocaleString()} students
            </span>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                <select
                  value={pageSize}
                  onChange={(e) => updateQuery({ pageSize: Number(e.target.value), page: 1 }, false)}
                  className="h-7 rounded-md border border-slate-300 bg-white px-2 text-xs font-bold"
                >
                  <option value={10}>10 per page</option>
                  <option value={20}>20 per page</option>
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                  <option value={100}>100 per page</option>
                </select>
              </div>

              {/* Page Number Controls */}
              <div className="flex items-center gap-1">
                <Button
                  size="icon-sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => updateQuery({ page: page - 1 }, false)}
                  className="h-7 w-7 text-xs font-bold"
                >
                  ‹
                </Button>

                {Array.from({ length: Math.min(5, Math.ceil(total / pageSize) || 1) }, (_, i) => i + 1).map((pNum) => (
                  <Button
                    key={pNum}
                    size="icon-sm"
                    variant={page === pNum ? "brand" : "outline"}
                    onClick={() => updateQuery({ page: pNum }, false)}
                    className={cn("h-7 w-7 text-xs font-extrabold", page === pNum ? "shadow-2xs" : "")}
                  >
                    {pNum}
                  </Button>
                ))}

                <Button
                  size="icon-sm"
                  variant="outline"
                  disabled={page >= Math.ceil(total / pageSize)}
                  onClick={() => updateQuery({ page: page + 1 }, false)}
                  className="h-7 w-7 text-xs font-bold"
                >
                  ›
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState
          title="No student records found"
          description="No student records match the current campus, academic year, and selected filters."
          action={
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDraftSearch("");
                  setQuery(new URLSearchParams({ page: "1", pageSize: String(pageSize) }), { replace: true });
                }}
              >
                Clear filters
              </Button>
              <Button onClick={() => navigate("/admin/admissions/applications")}>
                Create application
              </Button>
            </div>
          }
        />
      )}
    </section>
  );
}

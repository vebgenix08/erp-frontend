import {
  ChevronLeft,
  ChevronRight,
  Columns3,
  Eye,
  FileSpreadsheet,
  FileText,
  Plus,
  RotateCcw,
  Search,
  UserCheck,
  UserMinus,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useSelectedAcademicYear } from "../../tenant-settings/model/selected-academic-year-provider";
import { useSelectedCampus } from "../../tenant-settings/model/selected-campus-provider";
import { listStudentPage, listStudents, type StudentPage } from "../api/students.api";
import type { Student } from "../model/student.types";
import {
  directoryPageNumbers,
  normalizeStudentSort,
  normalizeStudentStatus,
} from "../model/student-directory";
import { listClasses, listSections } from "../../academic-structure/api/academic-structure.api";
import type {
  AcademicClass,
  Section,
} from "../../academic-structure/model/academic-structure.types";
import {
  exportRowsToExcel,
  exportRowsToPdf,
  type ExportColumn,
} from "../../../shared/lib/tabular-export";
import { loadColumnPreference, saveColumnPreference } from "../../../shared/lib/column-preferences";
import { EmptyState, ErrorState, LoadingState } from "../../../shared/ui/page-state";
import { Button } from "../../../shared/ui/button";
import { Input } from "../../../shared/ui/input";
import { ModernSelect } from "../../../shared/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../shared/ui/table";
import { cn } from "../../../shared/ui/utils";

const pageSizes = new Set([10, 20, 25, 50, 100]);
const positiveInteger = (value: string | null, fallback: number) => {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
};

type StudentColumnId =
  | "student"
  | "admissionNumber"
  | "rollNumber"
  | "classSection"
  | "dateOfBirth"
  | "gender"
  | "phone"
  | "guardian"
  | "status"
  | "updatedAt";

interface StudentColumn {
  id: StudentColumnId;
  label: string;
  width: number;
  sortField?: StudentPage["sortBy"];
  value: (student: Student) => string;
}

const defaultStudentColumns: StudentColumnId[] = [
  "student",
  "admissionNumber",
  "rollNumber",
  "classSection",
  "dateOfBirth",
  "gender",
  "status",
];
const allStudentColumns: StudentColumnId[] = [
  "student",
  "admissionNumber",
  "rollNumber",
  "classSection",
  "dateOfBirth",
  "gender",
  "phone",
  "guardian",
  "status",
  "updatedAt",
];
const studentColumnPreferenceKey = "vebgenix.student-directory.columns.v2";

const formatDate = (value?: string) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "-";

export function StudentDirectory() {
  const location = useLocation();
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
  const status = normalizeStudentStatus(query.get("status"));
  const page = positiveInteger(query.get("page"), 1);
  const requestedPageSize = positiveInteger(query.get("pageSize"), 20);
  const pageSize = pageSizes.has(requestedPageSize) ? requestedPageSize : 20;
  const sortBy = normalizeStudentSort(query.get("sortBy"));
  const sortDirection = query.get("sortDirection") === "DESC" ? "DESC" : "ASC";
  const [selected, setSelected] = useState<Map<string, Student>>(new Map());
  const [exportScope, setExportScope] = useState<"PAGE" | "FILTERED" | "SELECTED">("FILTERED");
  const [exporting, setExporting] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [selectedColumnIds, setSelectedColumnIds] = useState<StudentColumnId[]>(() =>
    loadColumnPreference(studentColumnPreferenceKey, defaultStudentColumns, allStudentColumns, [
      "student",
      "classSection",
    ]),
  );
  const [total, setTotal] = useState(0);
  const [overall, setOverall] = useState({ total: 0, active: 0, inactive: 0, missingSection: 0 });
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
      setOverall(result.overall);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to load students");
    } finally {
      setLoading(false);
    }
  }, [
    classId,
    page,
    pageSize,
    search,
    sectionId,
    selectedAcademicYear,
    selectedCampus,
    sortBy,
    sortDirection,
    status,
  ]);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    setSelected(new Map());
  }, [classId, search, sectionId, selectedCampus?.id, selectedAcademicYear?.id, status]);
  useEffect(() => {
    setDraftSearch(search);
  }, [search]);
  useEffect(() => {
    saveColumnPreference(studentColumnPreferenceKey, selectedColumnIds);
  }, [selectedColumnIds]);
  useEffect(() => {
    if (!selectedCampus) {
      setClasses([]);
      setSections([]);
      return;
    }
    void Promise.all([listClasses(selectedCampus.id), listSections(selectedCampus.id)])
      .then(([classRows, sectionRows]) => {
        setClasses(classRows.filter((item) => item.status === "ACTIVE"));
        setSections(sectionRows.filter((item) => item.status === "ACTIVE"));
      })
      .catch((value) =>
        setError(value instanceof Error ? value.message : "Unable to load class filters"),
      );
  }, [selectedCampus]);

  const classNameById = useMemo(
    () => new Map(classes.map((item) => [item.id, item.name])),
    [classes],
  );
  const sectionNameById = useMemo(
    () => new Map(sections.map((item) => [item.id, item.name])),
    [sections],
  );
  const availableSections = useMemo(
    () => sections.filter((item) => !classId || item.classId === classId),
    [classId, sections],
  );
  const columnDefinitions = useMemo<StudentColumn[]>(
    () => [
      { id: "student", label: "Student", width: 24, sortField: "name", value: (item) => item.name },
      {
        id: "admissionNumber",
        label: "Admission No.",
        width: 18,
        sortField: "admissionNumber",
        value: (item) => item.admissionNumber || "-",
      },
      {
        id: "rollNumber",
        label: "Roll No.",
        width: 12,
        value: (item) => item.enrollment.rollNumber || "-",
      },
      {
        id: "classSection",
        label: "Class - Section",
        width: 20,
        value: (item) => {
          const className = classNameById.get(item.enrollment.classId) ?? "-";
          const sectionName = item.enrollment.sectionId
            ? sectionNameById.get(item.enrollment.sectionId)
            : undefined;
          return sectionName ? `${className} - ${sectionName}` : className;
        },
      },
      {
        id: "dateOfBirth",
        label: "Date of Birth",
        width: 16,
        value: (item) => formatDate(item.dateOfBirth),
      },
      {
        id: "gender",
        label: "Gender",
        width: 12,
        value: (item) => (item.gender ? item.gender[0] + item.gender.slice(1).toLowerCase() : "-"),
      },
      { id: "phone", label: "Phone", width: 16, value: (item) => item.phone || "-" },
      { id: "guardian", label: "Guardian", width: 22, value: (item) => item.guardian?.name || "-" },
      { id: "status", label: "Status", width: 14, value: (item) => item.status },
      {
        id: "updatedAt",
        label: "Last Updated",
        width: 16,
        value: (item) => formatDate(item.updatedAt),
      },
    ],
    [classNameById, sectionNameById],
  );
  const visibleColumnIds = useMemo(() => new Set(selectedColumnIds), [selectedColumnIds]);
  const visibleColumns = useMemo(
    () => columnDefinitions.filter((column) => visibleColumnIds.has(column.id)),
    [columnDefinitions, visibleColumnIds],
  );
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageNumbers = useMemo(() => directoryPageNumbers(page, totalPages), [page, totalPages]);
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

  function toggleColumn(id: StudentColumnId) {
    setSelectedColumnIds((current) => {
      if (current.includes(id) && current.length === 1) return current;
      return current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    });
  }

  function toggleSort(field: StudentPage["sortBy"]) {
    updateQuery({
      sortBy: field,
      sortDirection: sortBy === field && sortDirection === "ASC" ? "DESC" : "ASC",
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
      const columns: ExportColumn<Student>[] = visibleColumns.map((column) => ({
        header: column.label,
        value: column.value,
        width: column.width,
      }));
      const suffix = exportScope.toLowerCase();
      if (format === "XLSX")
        await exportRowsToExcel(`students-${suffix}`, "Students", columns, rows);
      else await exportRowsToPdf(`students-${suffix}`, "Student Directory", columns, rows);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to export students");
    } finally {
      setExporting(false);
    }
  }

  function renderStudentCell(student: Student, column: StudentColumn) {
    if (column.id === "student") {
      return (
        <div className="flex min-w-[210px] items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-slate-200 bg-slate-900 text-xs font-bold text-white">
            {student.name.substring(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate font-bold text-brand-700">{student.name}</p>
            <p className="truncate text-[11px] text-slate-500">
              {student.guardian?.name || "No guardian recorded"}
            </p>
          </div>
        </div>
      );
    }
    if (column.id === "gender") {
      return (
        <span
          className={cn(
            "inline-block rounded-full px-2.5 py-0.5 text-[10.5px] font-bold",
            student.gender === "FEMALE" ? "bg-rose-50 text-rose-700" : "bg-brand-50 text-brand-700",
          )}
        >
          {column.value(student)}
        </span>
      );
    }
    if (column.id === "status") {
      return (
        <span
          className={cn(
            "inline-block rounded-full px-2.5 py-0.5 text-[10.5px] font-extrabold",
            student.status === "ACTIVE"
              ? "bg-emerald-100 text-emerald-800"
              : "bg-slate-100 text-slate-700",
          )}
        >
          {column.value(student)}
        </span>
      );
    }
    return (
      <span
        className={cn(
          "font-medium text-slate-700",
          (column.id === "admissionNumber" || column.id === "rollNumber") &&
            "font-mono font-semibold",
        )}
      >
        {column.value(student)}
      </span>
    );
  }

  if (!selectedCampus || !selectedAcademicYear)
    return (
      <EmptyState
        title="Select campus and academic year"
        description="The student directory follows the operating context in the top bar."
      />
    );

  return (
    <section className="space-y-6 pb-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Student Directory</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Manage student records, active class enrollments, and academic profiles for{" "}
            {selectedCampus.name}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="brand"
            size="sm"
            onClick={() => navigate("/admin/admissions/applications")}
            className="h-8 text-xs font-bold shadow-xs"
          >
            <Plus size={14} /> New Application
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs flex items-center gap-3">
          <div className="h-11 w-11 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
            <Users size={20} />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 block">Total Students</span>
            <p className="text-lg font-black text-slate-900 leading-tight">
              {overall.total.toLocaleString()}
            </p>
            <span className="text-[10px] font-bold text-slate-500">Overall enrolled</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs flex items-center gap-3">
          <div className="h-11 w-11 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <UserCheck size={20} />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 block">Active Students</span>
            <p className="text-lg font-black text-slate-900 leading-tight">
              {overall.active.toLocaleString()}
            </p>
            <span className="text-[10px] font-bold text-emerald-600">Overall active</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs flex items-center gap-3">
          <div className="h-11 w-11 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <Users size={20} />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 block">Records on Page</span>
            <p className="text-lg font-black text-slate-900 leading-tight">{students.length}</p>
            <span className="text-[10px] font-bold text-amber-700">
              Page {page} of {totalPages}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs flex items-center gap-3">
          <div className="h-11 w-11 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center shrink-0">
            <UserMinus size={20} />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 block">
              Inactive Students
            </span>
            <p className="text-lg font-black text-slate-900 leading-tight">
              {overall.inactive.toLocaleString()}
            </p>
            <span className="text-[10px] font-bold text-brand-600">Overall inactive</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs flex items-center gap-3">
          <div className="h-11 w-11 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
            <UserMinus size={20} />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 block">Missing Section</span>
            <p className="text-lg font-black text-slate-900 leading-tight">
              {overall.missingSection.toLocaleString()}
            </p>
            <span className="text-[10px] font-bold text-rose-600">Needs placement</span>
          </div>
        </div>
      </div>

      {/* Single-Line Unified Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Input (Flex 1) */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateQuery({ search: draftSearch.trim() });
            }}
            className="relative flex-1 min-w-[200px]"
          >
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <Input
              aria-label="Search students"
              value={draftSearch}
              onChange={(e) => setDraftSearch(e.target.value)}
              placeholder="Search name, admission no., PEN, mobile..."
              className="pl-8.5 h-9 text-xs font-semibold rounded-xl bg-slate-50/50 border-slate-200"
            />
          </form>

          {/* Class Select */}
          <ModernSelect
            aria-label="Class"
            value={classId}
            onValueChange={(val) => updateQuery({ classId: val, sectionId: undefined })}
            placeholder="All Classes"
            className="w-[140px]"
            options={[
              { label: "All Classes", value: "" },
              ...classes.map((item) => ({ label: item.name, value: item.id })),
            ]}
          />

          {/* Section Select */}
          <ModernSelect
            aria-label="Section"
            value={sectionId}
            onValueChange={(val) => updateQuery({ sectionId: val })}
            placeholder="All Sections"
            className="w-[130px]"
            options={[
              { label: "All Sections", value: "" },
              ...availableSections.map((item) => ({ label: item.name, value: item.id })),
            ]}
          />

          {/* Status Select */}
          <ModernSelect
            aria-label="Status"
            value={status}
            onValueChange={(val) => updateQuery({ status: val })}
            placeholder="All Statuses"
            className="w-[130px]"
            options={[
              { label: "All Statuses", value: "" },
              { label: "Active", value: "ACTIVE" },
              { label: "Inactive", value: "INACTIVE" },
              { label: "Graduated", value: "GRADUATED" },
              { label: "Transferred", value: "TRANSFERRED" },
            ]}
          />

          {/* Clear Filters Button */}
          {(search || classId || sectionId || status) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDraftSearch("");
                setQuery(new URLSearchParams({ page: "1", pageSize: String(pageSize) }), {
                  replace: true,
                });
              }}
              className="h-9 text-xs font-bold text-slate-600 rounded-xl"
            >
              <RotateCcw size={13} /> Clear
            </Button>
          )}

          {/* Scope & Export Actions */}
          <div className="flex items-center gap-1 border border-slate-200 rounded-xl p-0.5 bg-white shadow-2xs">
            <ModernSelect
              value={exportScope}
              onValueChange={(val) => setExportScope(val as "PAGE" | "FILTERED" | "SELECTED")}
              className="h-8 min-w-[90px] border-none shadow-none text-[11px] font-bold px-2"
              options={[
                { label: "Page", value: "PAGE" },
                { label: "Filtered", value: "FILTERED" },
                {
                  label: `Selected (${selected.size})`,
                  value: "SELECTED",
                  disabled: !selected.size,
                },
              ]}
            />
            <Button
              size="icon-sm"
              variant="ghost"
              title="Export Excel"
              disabled={exporting}
              onClick={() => void exportStudents("XLSX")}
              className="h-7 w-7 text-emerald-700 hover:bg-emerald-50 rounded-lg"
            >
              <FileSpreadsheet size={14} />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              title="Export PDF"
              disabled={exporting}
              onClick={() => void exportStudents("PDF")}
              className="h-7 w-7 text-rose-700 hover:bg-rose-50 rounded-lg"
            >
              <FileText size={14} />
            </Button>
          </div>

          {/* Columns Button */}
          <Button
            variant="outline"
            size="sm"
            aria-expanded={columnsOpen}
            onClick={() => setColumnsOpen((current) => !current)}
            className="h-9 text-xs font-bold border-slate-200 rounded-xl"
          >
            <Columns3 size={14} /> Columns ({visibleColumns.length})
          </Button>
        </div>
        {columnsOpen && (
          <div className="border-t border-slate-100 pt-3" aria-label="Student directory columns">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-slate-800">View and download columns</p>
                <p className="text-[11px] text-slate-500">
                  The table, Excel file and PDF use the same selected columns.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedColumnIds(columnDefinitions.map((column) => column.id))}
                  className="h-8 text-xs"
                >
                  Select all
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedColumnIds(defaultStudentColumns)}
                  className="h-8 text-xs"
                >
                  Compact view
                </Button>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {columnDefinitions.map((column) => (
                <label
                  key={column.id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={visibleColumnIds.has(column.id)}
                    onChange={() => toggleColumn(column.id)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  {column.label}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {error ? (
        <ErrorState message={error} retry={() => void load()} />
      ) : loading ? (
        <LoadingState label="Loading student directory" />
      ) : students.length ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <Table className="min-w-max">
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
                  {visibleColumns.map((column) => (
                    <TableHead
                      key={column.id}
                      className="whitespace-nowrap py-3 font-bold text-slate-800"
                    >
                      {column.sortField ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(column.sortField!)}
                          className="inline-flex items-center gap-1 hover:text-brand-700"
                        >
                          {column.label}
                          <span aria-hidden="true">
                            {sortBy === column.sortField
                              ? sortDirection === "ASC"
                                ? "↑"
                                : "↓"
                              : "↕"}
                          </span>
                        </button>
                      ) : (
                        column.label
                      )}
                    </TableHead>
                  ))}
                  <TableHead className="py-3 text-right font-bold text-slate-800">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody className="divide-y divide-slate-100 text-xs">
                {students.map((student) => (
                  <TableRow
                    key={student.id}
                    role="link"
                    tabIndex={0}
                    onClick={() =>
                      navigate(`/admin/students/${student.id}`, {
                        state: { from: `${location.pathname}${location.search}` },
                      })
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        navigate(`/admin/students/${student.id}`, {
                          state: { from: `${location.pathname}${location.search}` },
                        });
                      }
                    }}
                    className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                  >
                    <TableCell onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label={`Select ${student.name}`}
                        checked={selected.has(student.id)}
                        onChange={() => toggleStudent(student)}
                        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600 cursor-pointer"
                      />
                    </TableCell>
                    {visibleColumns.map((column) => (
                      <TableCell key={column.id} className="whitespace-nowrap">
                        {renderStudentCell(student, column)}
                      </TableCell>
                    ))}
                    <TableCell onClick={(event) => event.stopPropagation()} className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        title="View student profile"
                        onClick={() =>
                          navigate(`/admin/students/${student.id}`, {
                            state: { from: `${location.pathname}${location.search}` },
                          })
                        }
                        className="h-7 text-xs font-semibold text-brand-700"
                      >
                        <Eye size={14} /> View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Table Footer Pagination Row */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50/50 text-xs">
            <span className="text-slate-500 font-medium">
              Showing {students.length ? (page - 1) * pageSize + 1 : 0} to{" "}
              {Math.min(page * pageSize, total)} of {total.toLocaleString()} students
            </span>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                <select
                  value={pageSize}
                  onChange={(e) =>
                    updateQuery({ pageSize: Number(e.target.value), page: 1 }, false)
                  }
                  className="h-7 rounded-md border border-slate-300 bg-white px-2 text-xs font-bold"
                >
                  <option value={10}>10 per page</option>
                  <option value={20}>20 per page</option>
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                  <option value={100}>100 per page</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  aria-label="Previous page"
                  size="icon-sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => updateQuery({ page: page - 1 }, false)}
                  className="h-7 w-7 text-xs font-bold"
                >
                  <ChevronLeft size={14} />
                </Button>

                {pageNumbers.map((pNum) => (
                  <Button
                    key={pNum}
                    size="icon-sm"
                    variant={page === pNum ? "brand" : "outline"}
                    onClick={() => updateQuery({ page: pNum }, false)}
                    className={cn(
                      "h-7 w-7 text-xs font-extrabold",
                      page === pNum ? "shadow-2xs" : "",
                    )}
                  >
                    {pNum}
                  </Button>
                ))}

                <Button
                  aria-label="Next page"
                  size="icon-sm"
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => updateQuery({ page: page + 1 }, false)}
                  className="h-7 w-7 text-xs font-bold"
                >
                  <ChevronRight size={14} />
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
                  setQuery(new URLSearchParams({ page: "1", pageSize: String(pageSize) }), {
                    replace: true,
                  });
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

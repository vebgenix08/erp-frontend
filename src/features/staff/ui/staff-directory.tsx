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
  ShieldCheck,
  UserCheck,
  UserRound,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { exportRowsToExcel, exportRowsToPdf, type ExportColumn } from "../../../shared/lib/tabular-export";
import { Button } from "../../../shared/ui/button";
import { EmptyState, ErrorState, LoadingState } from "../../../shared/ui/page-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../shared/ui/table";
import { Badge } from "../../../shared/ui/badge";
import { cn } from "../../../shared/ui/utils";
import { useSelectedCampus } from "../../tenant-settings/model/selected-campus-provider";
import { listTenantTemplates } from "../../tenant-settings/api/settings.api";
import type { TenantTemplateField } from "../../tenant-settings/model/settings.types";
import { listEmployeePage } from "../api/staff.api";
import type { Employee, EmployeeLoginStatus, EmployeePage, EmployeeStatus, StaffCategory } from "../model/staff.types";

const pageSizes = new Set([10, 20, 25, 50, 100]);
const integer = (value: string | null, fallback: number) => {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
};
const label = (value: string) =>
  value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const selectClass =
  "h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all";

type StaffColumnId =
  | "employee"
  | "code"
  | "campus"
  | "category"
  | "staffType"
  | "designation"
  | "department"
  | "employment"
  | "phone"
  | "joiningDate"
  | "login"
  | "status"
  | "updatedAt"
  | `custom:${string}`;

interface StaffColumn {
  id: StaffColumnId;
  label: string;
  width: number;
  value: (employee: Employee) => string;
}

const formatDate = (value?: string) =>
  value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";

const displayValue = (value: unknown): string => {
  if (value === undefined || value === null || value === "") return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.map(displayValue).join(", ");
  if (typeof value === "object") {
    const document = value as Record<string, unknown>;
    if (typeof document.fileName === "string") return document.fileName;
    return "Recorded";
  }
  return String(value);
};

const defaultStaffColumns: StaffColumnId[] = [
  "employee",
  "code",
  "campus",
  "staffType",
  "designation",
  "department",
  "login",
  "status",
];

export function StaffDirectory() {
  const navigate = useNavigate();
  const [query, setQuery] = useSearchParams();
  const { campuses, selectedCampus } = useSelectedCampus();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [pageData, setPageData] = useState<Pick<EmployeePage,"page"|"pageSize"|"total"|"totalPages"|"summary">>({page:1,pageSize:20,total:0,totalPages:0,summary:{total:0,active:0,teaching:0,nonTeaching:0,loginReady:0,inviteIssues:0}});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Map<string, Employee>>(new Map());
  const [exporting, setExporting] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [selectedColumnIds, setSelectedColumnIds] = useState<StaffColumnId[]>(defaultStaffColumns);
  const [templateFields, setTemplateFields] = useState<TenantTemplateField[]>([]);

  const search = query.get("search") ?? "";
  const [draftSearch, setDraftSearch] = useState(search);
  const category = (query.get("category") ?? "") as StaffCategory | "";
  const status = (query.get("status") ?? "ACTIVE") as EmployeeStatus | "";
  const loginStatus = (query.get("loginStatus") ?? "") as EmployeeLoginStatus | "";

  const page = integer(query.get("page"), 1);
  const requestedSize = integer(query.get("pageSize"), 20);
  const pageSize = pageSizes.has(requestedSize) ? requestedSize : 20;
  const exportScope = (query.get("exportScope") ?? "FILTERED") as "PAGE" | "FILTERED" | "SELECTED";

  const updateQuery = useCallback(
    (updates: Record<string, string | number | undefined>, resetPage = true) => {
      const next = new URLSearchParams(query);
      Object.entries(updates).forEach(([key, value]) =>
        value === undefined || value === "" ? next.delete(key) : next.set(key, String(value))
      );
      if (resetPage && !("page" in updates)) next.set("page", "1");
      setQuery(next, { replace: true });
    },
    [query, setQuery]
  );

  const load = useCallback(async () => {
    if (!selectedCampus) {
      setEmployees([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await listEmployeePage({
        campusId: selectedCampus.id,
        ...(search ? { search } : {}),
        ...(category ? { staffCategory: category } : {}),
        ...(status ? { status } : {}),
        ...(loginStatus ? { loginStatus } : {}),
        page,
        pageSize,
        sortBy: "fullName",
        sortDirection: "ASC",
      });
      setEmployees(result.items);
      setPageData(result);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to load employees");
    } finally {
      setLoading(false);
    }
  }, [category, loginStatus, page, pageSize, search, selectedCampus, status]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void listTenantTemplates()
      .then((templates) => {
        const fields = templates
          .filter((template) => template.layout === "STAFF_ONBOARDING")
          .sort((left, right) => (right.publishedVersion ?? right.version) - (left.publishedVersion ?? left.version))[0]
          ?.fields.filter((field) => field.visible) ?? [];
        setTemplateFields(fields);
      })
      .catch(() => setTemplateFields([]));
  }, []);

  useEffect(() => setDraftSearch(search), [search]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (draftSearch.trim() !== search) updateQuery({ search: draftSearch.trim() });
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [draftSearch, search, updateQuery]);

  useEffect(() => setSelected(new Map()), [category, loginStatus, search, selectedCampus?.id, status]);

  const campusName = useCallback(
    (id: string) => campuses.find((item) => item.id === id)?.name ?? "Unavailable campus",
    [campuses]
  );

  const columnDefinitions = useMemo<StaffColumn[]>(() => {
    const base: StaffColumn[] = [
      { id: "employee", label: "Employee", width: 24, value: (item) => item.fullName },
      { id: "code", label: "Employee Code", width: 18, value: (item) => item.employeeCode },
      { id: "campus", label: "Campus", width: 24, value: (item) => campusName(item.primaryCampusId) },
      { id: "category", label: "Category", width: 16, value: (item) => label(item.staffCategory) },
      { id: "staffType", label: "Staff Type", width: 18, value: (item) => label(item.staffType) },
      { id: "designation", label: "Designation", width: 20, value: (item) => item.designation ?? "-" },
      { id: "department", label: "Department", width: 18, value: (item) => item.department ?? "-" },
      { id: "employment", label: "Employment", width: 16, value: (item) => label(item.employmentType) },
      { id: "phone", label: "Phone", width: 16, value: (item) => item.phone ?? "-" },
      { id: "joiningDate", label: "Joining Date", width: 16, value: (item) => formatDate(item.joiningDate) },
      { id: "login", label: "Login", width: 14, value: (item) => label(item.loginStatus) },
      { id: "status", label: "Status", width: 14, value: (item) => label(item.status) },
      { id: "updatedAt", label: "Last Updated", width: 18, value: (item) => formatDate(item.updatedAt) },
    ];
    const templateFieldByKey = new Map(templateFields.map((field) => [field.key, field]));
    const keys = [...new Set([
      ...templateFields
        .filter((field) => field.key.startsWith("staff_onboarding."))
        .map((field) => field.key),
      ...employees.flatMap((item) => Object.keys(item.customFields ?? {})),
    ])].sort((left, right) => {
      const leftOrder = templateFieldByKey.get(left)?.order ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = templateFieldByKey.get(right)?.order ?? Number.MAX_SAFE_INTEGER;
      return leftOrder - rightOrder || left.localeCompare(right);
    });
    return [
      ...base,
      ...keys.map<StaffColumn>((key) => ({
        id: `custom:${key}`,
        label: templateFieldByKey.get(key)?.label ?? label(key),
        width: 18,
        value: (item) => {
          const value = item.customFields?.[key];
          return templateFieldByKey.get(key)?.type === "date" && typeof value === "string"
            ? formatDate(value)
            : displayValue(value);
        },
      })),
    ];
  }, [campusName, employees, templateFields]);

  const visibleColumnIds = useMemo(
    () => new Set<StaffColumnId>(selectedColumnIds),
    [selectedColumnIds],
  );
  const visibleColumns = useMemo(
    () => columnDefinitions.filter((column) => visibleColumnIds.has(column.id)),
    [columnDefinitions, visibleColumnIds],
  );

  const toggleColumn = (id: StaffColumnId) => {
    const current = selectedColumnIds;
    if (current.includes(id) && current.length === 1) return;
    setSelectedColumnIds(current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const totalPages = Math.max(1, pageData.totalPages);
  const safePage = Math.min(pageData.page, totalPages);
  const visible = employees;
  const pageSelected = visible.length > 0 && visible.every((item) => selected.has(item.id));

  const counts = pageData.summary;

  const toggle = (employee: Employee) =>
    setSelected((current) => {
      const next = new Map(current);
      if (next.has(employee.id)) next.delete(employee.id);
      else next.set(employee.id, employee);
      return next;
    });

  const togglePage = () =>
    setSelected((current) => {
      const next = new Map(current);
      if (pageSelected) visible.forEach((item) => next.delete(item.id));
      else visible.forEach((item) => next.set(item.id, item));
      return next;
    });

  const exportStaff = async (format: "XLSX" | "PDF") => {
    setExporting(true);
    setError(null);
    try {
      let rows = exportScope === "SELECTED" ? [...selected.values()] : visible;
      if (exportScope === "FILTERED" && selectedCampus) {
        const first = await listEmployeePage({campusId:selectedCampus.id,...(search?{search}:{}),...(category?{staffCategory:category}:{}),...(status?{status}:{}),...(loginStatus?{loginStatus}:{}),page:1,pageSize:100,sortBy:"fullName",sortDirection:"ASC"});
        rows = [...first.items];
        for (let nextPage=2;nextPage<=first.totalPages;nextPage+=1) {
          const next = await listEmployeePage({campusId:selectedCampus.id,...(search?{search}:{}),...(category?{staffCategory:category}:{}),...(status?{status}:{}),...(loginStatus?{loginStatus}:{}),page:nextPage,pageSize:100,sortBy:"fullName",sortDirection:"ASC"});
          rows.push(...next.items);
        }
      }
      if (!rows.length) throw new Error("No employees are available to export");
      const columns: ExportColumn<Employee>[] = visibleColumns.map((column) => ({
        header: column.label,
        value: column.value,
        width: column.width,
      }));
      if (format === "XLSX") await exportRowsToExcel("staff-directory", "Staff", columns, rows);
      else await exportRowsToPdf("staff-directory", "Staff Directory", columns, rows);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to export employees");
    } finally {
      setExporting(false);
    }
  };

  const metrics = [
    { title: "Total Staff", value: counts.total, icon: Users, tone: "bg-blue-50 text-blue-600" },
    { title: "Active Staff", value: counts.active, icon: UserCheck, tone: "bg-emerald-50 text-emerald-600" },
    { title: "Teaching Staff", value: counts.teaching, icon: UserRound, tone: "bg-purple-50 text-purple-600" },
    { title: "Non-Teaching Staff", value: counts.nonTeaching, icon: Users, tone: "bg-amber-50 text-amber-600" },
    { title: "Login Ready", value: counts.loginReady, icon: ShieldCheck, tone: "bg-sky-50 text-sky-600" },
  ];

  const renderStaffCell = (employee: Employee, column: StaffColumn) => {
    if (column.id === "employee") {
      return (
        <div className="flex min-w-[220px] items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-600">
            <UserRound size={16} />
          </span>
          <div className="min-w-0">
            <p className="truncate font-bold text-slate-900">{employee.fullName}</p>
            <p className="truncate text-[11px] font-normal text-slate-500">{employee.email ?? "No email recorded"}</p>
          </div>
        </div>
      );
    }
    if (column.id === "login") {
      return <Badge variant={employee.loginStatus === "ACTIVE" ? "success" : employee.loginStatus === "FAILED" ? "destructive" : "secondary"}>{column.value(employee)}</Badge>;
    }
    if (column.id === "status") {
      return <Badge variant={employee.status === "ACTIVE" ? "success" : "secondary"}>{column.value(employee)}</Badge>;
    }
    return <span className={column.id === "code" ? "font-mono font-bold text-slate-700" : "font-medium text-slate-700"}>{column.value(employee)}</span>;
  };

  if (!selectedCampus)
    return (
      <EmptyState
        title="Select a campus"
        description="The staff directory follows the operating campus selected in the top bar."
      />
    );

  if (loading) return <LoadingState label="Loading staff directory" />;
  if (error && !employees.length) return <ErrorState message={error} retry={() => void load()} />;

  return (
    <section className="space-y-5 pb-12 font-sans text-slate-900">
      {/* Top Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Staff Directory</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Manage employee records, campus assignments and login readiness for {selectedCampus.name}.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => navigate("/admin/staff/new")}
          className="h-9 px-4 text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
        >
          <Plus size={15} className="mr-1" /> Add Employee
        </Button>
      </header>

      {error && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-700 shadow-xs">
          {error}
        </div>
      )}

      {/* KPI Top Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {metrics.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-1"
            >
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {item.title}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-slate-900">
                  {item.value.toLocaleString()}
                </span>
                <div className={cn("h-9 w-9 rounded-full flex items-center justify-center shrink-0", item.tone)}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter Toolbar Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="text-[11px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">
              Staff Category
            </label>
            <select
              aria-label="Staff category"
              value={category}
              onChange={(e) => updateQuery({ category: e.target.value })}
              className={selectClass}
            >
              <option value="">All Categories</option>
              <option value="TEACHING">Teaching</option>
              <option value="NON_TEACHING">Non-Teaching</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">
              Employment Status
            </label>
            <select
              aria-label="Employment status"
              value={status}
              onChange={(e) => updateQuery({ status: e.target.value })}
              className={selectClass}
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="ENDED">Ended</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">
              Login Status
            </label>
            <select
              aria-label="Login status"
              value={loginStatus}
              onChange={(e) => updateQuery({ loginStatus: e.target.value })}
              className={selectClass}
            >
              <option value="">All Login States</option>
              <option value="ACTIVE">Active</option>
              <option value="INVITED">Invited</option>
              <option value="FAILED">Failed</option>
              <option value="NONE">Not Enabled</option>
              <option value="DISABLED">Disabled</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">
              Campus
            </label>
            <input
              value={selectedCampus.name}
              readOnly
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-600"
            />
          </div>
        </div>

        {/* Search Bar & Export Actions */}
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <form
            className="relative min-w-[260px] flex-1"
            onSubmit={(e) => {
              e.preventDefault();
              updateQuery({ search: draftSearch.trim() });
            }}
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              aria-label="Search employees"
              value={draftSearch}
              onChange={(e) => setDraftSearch(e.target.value)}
              placeholder="Search name, code, email, phone or designation..."
              className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </form>

          {(search || category || status || loginStatus) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDraftSearch("");
                setQuery(new URLSearchParams({ page: "1", pageSize: String(pageSize), status: "ACTIVE" }), { replace: true });
              }}
              className="h-9 text-xs font-semibold border-slate-200 text-slate-700"
            >
              <RotateCcw size={13} className="mr-1" /> Clear
            </Button>
          )}

          <select
            aria-label="Export scope"
            value={exportScope}
            onChange={(e) => updateQuery({ exportScope: e.target.value }, false)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 outline-none"
          >
            <option value="FILTERED">Filtered</option>
            <option value="PAGE">Current Page</option>
            <option value="SELECTED" disabled={!selected.size}>Selected ({selected.size})</option>
          </select>

          <Button
            variant="outline"
            size="sm"
            disabled={exporting}
            onClick={() => void exportStaff("XLSX")}
            className="h-9 text-xs font-semibold border-slate-200 text-slate-700"
          >
            <FileSpreadsheet size={14} className="mr-1" /> Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={exporting}
            onClick={() => void exportStaff("PDF")}
            className="h-9 text-xs font-semibold border-slate-200 text-slate-700"
          >
            <FileText size={14} className="mr-1" /> PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            aria-expanded={columnsOpen}
            onClick={() => setColumnsOpen((current) => !current)}
            className="h-9 text-xs font-semibold border-slate-200 text-slate-700"
          >
            <Columns3 size={14} className="mr-1" /> Columns ({visibleColumns.length})
          </Button>
        </div>
        {columnsOpen && (
          <div className="border-t border-slate-100 pt-3" aria-label="Staff directory columns">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-slate-800">View and download columns</p>
                <p className="text-[11px] text-slate-500">The same selected columns are used in the table, Excel, and PDF.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedColumnIds(columnDefinitions.map((column) => column.id))} className="h-8 text-xs">
                  Select all
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedColumnIds(defaultStaffColumns)}
                  className="h-8 text-xs"
                >
                  Compact view
                </Button>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {columnDefinitions.map((column) => (
                <label key={column.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
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

      {/* Main Employee Table */}
      {visible.length ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <Table className="min-w-max">
              <TableHeader className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-xs">
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      aria-label="Select current page"
                      type="checkbox"
                      checked={pageSelected}
                      onChange={togglePage}
                      className="rounded border-slate-300"
                    />
                  </TableHead>
                  {visibleColumns.map((column) => <TableHead key={column.id} className="whitespace-nowrap">{column.label}</TableHead>)}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-100 text-xs">
                {visible.map((employee) => (
                  <TableRow
                    key={employee.id}
                    role="link"
                    tabIndex={0}
                    className="cursor-pointer hover:bg-slate-50/60 transition-all"
                    onClick={() => navigate(`/admin/staff/${employee.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") navigate(`/admin/staff/${employee.id}`);
                    }}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <input
                        aria-label={`Select ${employee.fullName}`}
                        type="checkbox"
                        checked={selected.has(employee.id)}
                        onChange={() => toggle(employee)}
                        className="rounded border-slate-300"
                      />
                    </TableCell>
                    {visibleColumns.map((column) => <TableCell key={column.id} className="whitespace-nowrap">{renderStaffCell(employee, column)}</TableCell>)}
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/admin/staff/${employee.id}`)}
                        className="h-7 text-xs font-semibold text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        <Eye className="h-3 w-3 mr-1" /> View Profile
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/50 px-4 py-3 text-xs">
            <span className="text-slate-500 font-medium">
              Showing {pageData.total ? (safePage - 1) * pageSize + 1 : 0}–
              {Math.min(safePage * pageSize, pageData.total)} of {pageData.total.toLocaleString()} staff members
            </span>
            <div className="flex items-center gap-2">
              <select
                aria-label="Rows per page"
                value={pageSize}
                onChange={(e) => updateQuery({ pageSize: Number(e.target.value), page: 1 }, false)}
                className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none"
              >
                <option value={10}>10 per page</option>
                <option value={20}>20 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>
              <Button
                size="sm"
                variant="outline"
                disabled={safePage <= 1}
                onClick={() => updateQuery({ page: safePage - 1 }, false)}
                className="h-8 text-xs"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-0.5" /> Previous
              </Button>
              <span className="font-semibold text-slate-700">
                Page {safePage} of {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={safePage >= totalPages}
                onClick={() => updateQuery({ page: safePage + 1 }, false)}
                className="h-8 text-xs"
              >
                Next <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState
          title="No employees found"
          description="No employees match the selected campus and filters."
          action={
            <Button onClick={() => navigate("/admin/staff/new")}>
              <Plus size={15} /> Add Employee
            </Button>
          }
        />
      )}
    </section>
  );
}

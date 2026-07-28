import { Plus, Search, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSelectedCampus } from "../../tenant-settings/model/selected-campus-provider";
import { EmptyState, ErrorState, LoadingState } from "../../../shared/ui/page-state";
import { listEmployees } from "../api/staff.api";
import type { Employee, StaffCategory } from "../model/staff.types";
import { Button } from "../../../shared/ui/button";
import { Input } from "../../../shared/ui/input";
import { Badge } from "../../../shared/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../shared/ui/table";

const label = (value: string) =>
  value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const loginStatusVariant = (status: string) => {
  switch (status.toUpperCase()) {
    case "ACTIVE": return "success";
    case "INVITED": return "default";
    case "DISABLED": return "destructive";
    default: return "secondary";
  }
};

const employeeStatusVariant = (status: string) => {
  switch (status.toUpperCase()) {
    case "ACTIVE": return "success";
    case "INACTIVE": return "secondary";
    case "TERMINATED": return "destructive";
    default: return "secondary";
  }
};

export function StaffDirectory() {
  const { campuses, selectedCampus } = useSelectedCampus();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<StaffCategory | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setEmployees(
        await listEmployees({
          ...(selectedCampus ? { campusId: selectedCampus.id } : {}),
          ...(category ? { staffCategory: category } : {}),
        }),
      );
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to load employees");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCampus?.id, category]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return employees.filter(
      (employee) =>
        !query ||
        [employee.fullName, employee.email, employee.phone, employee.employeeCode, employee.designation]
          .some((value) => value?.toLowerCase().includes(query)),
    );
  }, [employees, search]);

  const campusName = (id: string) =>
    campuses.find((campus) => campus.id === id)?.name ?? "Unavailable campus";

  if (loading) return <LoadingState label="Loading employee directory" />;
  if (error && !employees.length)
    return <ErrorState message={error} retry={() => void load()} />;

  return (
    <section className="space-y-5">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Staff directory</h2>
          <p className="mt-1 text-sm text-slate-500">
            Employee records, campus assignments and login readiness in one tenant-owned directory.
          </p>
        </div>
        <Button asChild size="sm" variant="brand" className="h-8 text-xs font-bold">
          <Link to="/admin/staff/new">
            <Plus size={14} />
            Add employee
          </Link>
        </Button>
      </header>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <Input
            aria-label="Search employees"
            placeholder="Search name, email or employee code"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          aria-label="Filter staff category"
          value={category}
          onChange={(e) => setCategory(e.target.value as StaffCategory | "")}
          className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-600"
        >
          <option value="">All staff</option>
          <option value="TEACHING">Teaching</option>
          <option value="NON_TEACHING">Non-teaching</option>
        </select>
        <span className="text-sm text-slate-500">{visible.length} employees</span>
      </div>

      {/* Table */}
      {visible.length ? (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Campus</TableHead>
                <TableHead>Responsibility</TableHead>
                <TableHead>Login</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell>
                    <Link
                      to={`/admin/staff/${employee.id}`}
                      className="flex items-center gap-3 min-w-0"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                        <UserRound size={15} />
                      </span>
                      <span className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate hover:text-accent-600 transition-colors">
                          {employee.fullName}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {employee.employeeCode}
                          {employee.email ? ` · ${employee.email}` : ""}
                        </p>
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="text-slate-600">{campusName(employee.primaryCampusId)}</TableCell>
                  <TableCell>
                    <p className="text-sm text-slate-700">{label(employee.staffType)}</p>
                    <p className="text-xs text-slate-500">
                      {employee.department || label(employee.staffCategory)}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={loginStatusVariant(employee.loginStatus)}>
                      {label(employee.loginStatus)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={employeeStatusVariant(employee.status)}>
                      {label(employee.status)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState
          title="No employees found"
          description="Add the first employee for this campus or change the filters."
          action={
            <Button asChild size="sm">
              <Link to="/admin/staff/new">
                <Plus size={15} /> Add employee
              </Link>
            </Button>
          }
        />
      )}
    </section>
  );
}

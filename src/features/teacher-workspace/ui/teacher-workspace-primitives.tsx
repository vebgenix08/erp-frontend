import {
  CheckCircle2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Download,
  FileWarning,
  FilterX,
  Printer,
  Search,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { cn } from "../../../shared/ui/utils";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

export function WorkspacePageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold text-slate-950">{title}</h1>
        <p className="mt-1 max-w-4xl text-sm font-medium text-slate-500">{description}</p>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function WorkspaceButton({
  children,
  icon: Icon,
  variant = "secondary",
  onClick,
  disabled,
  type = "button",
}: {
  children: ReactNode;
  icon?: LucideIcon;
  variant?: "primary" | "secondary" | "danger";
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border px-3.5 text-xs font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "border-slate-900 bg-slate-900 text-white hover:bg-slate-800",
        variant === "secondary" &&
          "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
        variant === "danger" && "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
      )}
    >
      {Icon ? <Icon size={15} aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

export function WorkspaceSurface({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-lg border border-slate-200 bg-white", className)}>
      {children}
    </section>
  );
}

export function WorkspaceSectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-sm font-extrabold text-slate-900">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-xs font-medium text-slate-500">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function WorkspaceKpi({
  label,
  value,
  detail,
  icon: Icon,
  tone = "navy",
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: LucideIcon;
  tone?: "navy" | "blue" | "green" | "amber" | "rose";
}) {
  const colors = {
    navy: "bg-blue-50 text-slate-900",
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
  } as const;
  return (
    <WorkspaceSurface className="grid min-h-28 grid-cols-[minmax(0,1fr)_42px] gap-3 p-4">
      <div className="min-w-0">
        <p className="text-[11px] font-extrabold uppercase text-slate-500">{label}</p>
        <strong className="mt-2 block text-2xl font-extrabold text-slate-950">{value}</strong>
        <span className="mt-1 block truncate text-xs font-medium text-slate-500">{detail}</span>
      </div>
      <span className={cn("grid h-10 w-10 place-items-center rounded-md", colors[tone])}>
        <Icon size={18} aria-hidden="true" />
      </span>
    </WorkspaceSurface>
  );
}

export function WorkspaceStatus({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "success" | "warning" | "danger" | "info" | "neutral";
}) {
  const colors = {
    success: "border-blue-200 bg-blue-50 text-blue-950",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
    danger: "border-rose-200 bg-rose-50 text-rose-700",
    info: "border-blue-200 bg-blue-50 text-blue-700",
    neutral: "border-slate-200 bg-slate-50 text-slate-600",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-1 text-[10px] font-extrabold",
        colors[tone],
      )}
    >
      {children}
    </span>
  );
}

export function WorkspaceAlert({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "success" | "danger" | "info";
}) {
  const colors = {
    success: "border-blue-200 bg-blue-50 text-blue-950",
    danger: "border-rose-200 bg-rose-50 text-rose-800",
    info: "border-blue-200 bg-blue-50 text-blue-800",
  } as const;
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-md border px-4 py-3 text-xs font-semibold",
        colors[tone],
      )}
    >
      <CheckCircle2 size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div className="leading-5">{children}</div>
    </div>
  );
}

export interface WorkspaceTableColumn<Row extends object> {
  key: keyof Row & string;
  label: string;
  render?: (row: Row) => ReactNode;
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export function WorkspaceDataTable<Row extends { id: string }>({
  rows,
  columns,
  downloadName,
  onOpen,
}: {
  rows: Row[];
  columns: WorkspaceTableColumn<Row>[];
  downloadName: string;
  onOpen?: (row: Row) => void;
}) {
  const signature = columns.map((column) => column.key).join("|");
  const columnKeys = useMemo(() => signature.split("|"), [signature]);
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState<string[]>(columns.map((column) => column.key));
  const [sort, setSort] = useState<{ key: string; descending: boolean } | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setVisible(columnKeys);
    setSelected([]);
    setPage(1);
    setSort(null);
  }, [columnKeys, signature]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const matches = !normalized
      ? rows
      : rows.filter((row) =>
          Object.values(row).some((value) =>
            String(value ?? "")
              .toLowerCase()
              .includes(normalized),
          ),
        );
    if (!sort) return matches;
    return [...matches].sort((a, b) => {
      const left = a[sort.key as keyof Row];
      const right = b[sort.key as keyof Row];
      // Missing values stay last in either direction.
      if (left == null || left === "") return right == null || right === "" ? 0 : 1;
      if (right == null || right === "") return -1;
      const order =
        typeof left === "number" && typeof right === "number"
          ? left - right
          : String(left).localeCompare(String(right), undefined, {
              numeric: true,
              sensitivity: "base",
            });
      return sort.descending ? -order : order;
    });
  }, [query, rows, sort]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const displayedColumns = columns.filter((column) => visible.includes(column.key));
  const allSelected = pageRows.length > 0 && pageRows.every((row) => selected.includes(row.id));
  const selectedRows = filtered.filter((row) => selected.includes(row.id));
  const exportRows = selectedRows.length ? selectedRows : filtered;

  const downloadCsv = () => {
    const content = [
      displayedColumns.map((column) => csvCell(column.label)).join(","),
      ...exportRows.map((row) =>
        displayedColumns.map((column) => csvCell(row[column.key])).join(","),
      ),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${downloadName}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/70 p-3">
        <label className="flex min-h-10 min-w-52 flex-1 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-slate-500">
          <Search size={15} aria-hidden="true" />
          <span className="sr-only">Search records</span>
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Search records"
            className="min-w-0 flex-1 border-0 bg-transparent text-xs font-semibold text-slate-800 outline-none"
          />
        </label>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">
            <Columns3 size={15} aria-hidden="true" /> Columns
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={6}
              className="z-[90] w-64 rounded-md border border-slate-200 bg-white p-3 shadow-xl"
            >
              <strong className="block pb-2 text-xs font-extrabold text-slate-900">
                Visible columns
              </strong>
              <div className="max-h-64 space-y-1 overflow-y-auto">
                {columns.map((column) => (
                  <DropdownMenu.CheckboxItem
                    key={column.key}
                    checked={visible.includes(column.key)}
                    disabled={visible.length === 1 && visible.includes(column.key)}
                    onSelect={(event) => event.preventDefault()}
                    onCheckedChange={() =>
                      setVisible((current) =>
                        current.includes(column.key)
                          ? current.filter((key) => key !== column.key)
                          : [...current, column.key],
                      )
                    }
                    className="flex min-h-11 cursor-pointer items-center gap-2 rounded px-2 text-xs font-semibold text-slate-600 outline-none data-[highlighted]:bg-slate-100 data-[disabled]:opacity-50"
                  >
                    <span aria-hidden="true" className="w-4">
                      {visible.includes(column.key) ? "✓" : ""}
                    </span>
                    {column.label}
                  </DropdownMenu.CheckboxItem>
                ))}
              </div>
              <DropdownMenu.Item
                onClick={() => setVisible(columns.map((column) => column.key))}
                className="mt-2 w-full rounded bg-blue-50 py-2 text-xs font-bold text-blue-950 hover:bg-blue-100"
              >
                Show all
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
        <WorkspaceButton icon={Download} onClick={downloadCsv}>
          {selectedRows.length ? `Download Selected (${selectedRows.length})` : "Download CSV"}
        </WorkspaceButton>
        <WorkspaceButton icon={Printer} onClick={() => window.print()}>
          Print / PDF
        </WorkspaceButton>
        {query ? (
          <WorkspaceButton icon={FilterX} onClick={() => setQuery("")}>
            Reset
          </WorkspaceButton>
        ) : null}
      </div>
      <div
        className="max-h-[65vh] overflow-auto print:max-h-none print:overflow-visible"
        tabIndex={0}
        role="region"
        aria-label="Records table"
      >
        <table className="w-full min-w-[760px] border-collapse">
          <thead className="sticky top-0 z-10 bg-slate-50">
            <tr className="border-b border-slate-200 bg-slate-50 text-left">
              <th className="w-12 px-3 py-3">
                <input
                  aria-label="Select current page"
                  type="checkbox"
                  checked={allSelected}
                  onChange={() =>
                    setSelected((current) =>
                      allSelected
                        ? current.filter((id) => !pageRows.some((row) => row.id === id))
                        : [...new Set([...current, ...pageRows.map((row) => row.id)])],
                    )
                  }
                  className="accent-slate-900"
                />
              </th>
              {displayedColumns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={
                    sort?.key === column.key
                      ? sort.descending
                        ? "descending"
                        : "ascending"
                      : "none"
                  }
                  className="whitespace-nowrap px-3 py-3 text-[10px] font-extrabold uppercase text-slate-500"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSort((current) => ({
                        key: column.key,
                        descending: current?.key === column.key && !current.descending,
                      }));
                      setPage(1);
                    }}
                    className="inline-flex min-h-11 items-center gap-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
                  >
                    {column.label}
                    {sort?.key === column.key ? (
                      sort.descending ? (
                        <ArrowDown size={13} aria-hidden="true" />
                      ) : (
                        <ArrowUp size={13} aria-hidden="true" />
                      )
                    ) : (
                      <ArrowUpDown size={13} aria-hidden="true" />
                    )}
                  </button>
                </th>
              ))}
              {onOpen ? (
                <th className="px-3 py-3 text-[10px] font-extrabold uppercase text-slate-500">
                  Action
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {pageRows.length ? (
              pageRows.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    "border-b border-slate-100 last:border-0 hover:bg-blue-50/50",
                    onOpen && "cursor-pointer",
                  )}
                  onClick={(event) => {
                    if (onOpen && !(event.target as HTMLElement).closest("button,input,a"))
                      onOpen(row);
                  }}
                >
                  <td className="px-3 py-3">
                    <input
                      aria-label={`Select ${row.id}`}
                      type="checkbox"
                      checked={selected.includes(row.id)}
                      onChange={() =>
                        setSelected((current) =>
                          current.includes(row.id)
                            ? current.filter((id) => id !== row.id)
                            : [...current, row.id],
                        )
                      }
                      className="accent-slate-900"
                    />
                  </td>
                  {displayedColumns.map((column) => (
                    <td key={column.key} className="px-3 py-3 text-xs font-semibold text-slate-700">
                      {column.render ? column.render(row) : String(row[column.key] ?? "—")}
                    </td>
                  ))}
                  {onOpen ? (
                    <td className="px-3 py-3">
                      <button
                        onClick={() => onOpen(row)}
                        className="text-xs font-extrabold text-blue-950 hover:underline"
                      >
                        View details
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={displayedColumns.length + 2} className="px-4 py-12">
                  <div className="grid place-items-center gap-2 text-center">
                    <FileWarning size={24} className="text-slate-400" />
                    <strong className="text-sm text-slate-800">
                      {query.trim() ? "No matching records" : "No records available"}
                    </strong>
                    <span className="text-xs text-slate-500">
                      {query.trim()
                        ? "Change or reset the current search."
                        : "Records will appear here when they are available for this scope."}
                    </span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 text-xs font-semibold text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <span>
          {selectedRows.length ? `${selectedRows.length} selected · ` : ""}Showing{" "}
          {filtered.length ? (currentPage - 1) * pageSize + 1 : 0}-
          {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length}
        </span>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2">
            Rows{" "}
            <select
              aria-label="Rows per page"
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              className="h-11 rounded border border-slate-200 bg-white px-2"
            >
              <option>5</option>
              <option>10</option>
              <option>25</option>
              <option>50</option>
            </select>
          </label>
          <button
            aria-label="Previous page"
            disabled={currentPage === 1}
            onClick={() => setPage(Math.max(1, currentPage - 1))}
            className="grid h-11 w-11 place-items-center rounded border border-slate-200 disabled:opacity-40"
          >
            <ChevronLeft size={15} />
          </button>
          <strong className="min-w-12 text-center text-slate-700">
            {currentPage} / {totalPages}
          </strong>
          <button
            aria-label="Next page"
            disabled={currentPage === totalPages}
            onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
            className="grid h-11 w-11 place-items-center rounded border border-slate-200 disabled:opacity-40"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function WorkspaceDialog({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm"
    >
      <div className="max-h-[88vh] w-full max-w-4xl overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <h2 className="text-base font-extrabold text-slate-950">{title}</h2>
          <button
            aria-label="Close dialog"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded hover:bg-slate-100"
          >
            <X size={17} />
          </button>
        </div>
        <div className="p-5">{children}</div>
        <div className="sticky bottom-0 flex justify-end border-t border-slate-200 bg-white px-5 py-3">
          <WorkspaceButton onClick={onClose}>Done</WorkspaceButton>
        </div>
      </div>
    </div>
  );
}

export function WorkspaceDetails({ rows }: { rows: Array<[string, ReactNode]> }) {
  return (
    <div className="grid overflow-hidden rounded-md border border-slate-200 sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="border-b border-slate-100 p-4 last:border-0 sm:border-r sm:nth-[2n]:border-r-0"
        >
          <span className="text-[10px] font-extrabold uppercase text-slate-400">{label}</span>
          <strong className="mt-1.5 block text-sm font-bold text-slate-900">{value}</strong>
        </div>
      ))}
    </div>
  );
}

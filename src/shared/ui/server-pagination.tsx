import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from "lucide-react";
import { Button } from "./button";
import { ModernSelect } from "./select";

interface ServerPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export function ServerPagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: ServerPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  const startPage = Math.max(1, Math.min(page - 2, totalPages - 4));
  const pages = Array.from(
    { length: Math.min(5, totalPages) },
    (_, index) => startPage + index,
  ).filter((value) => value <= totalPages);

  return (
    <footer className="flex flex-col gap-3 border-t border-slate-200 bg-white px-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-4">
      <span className="text-slate-600">
        Showing{" "}
        <strong>
          {first}–{last}
        </strong>{" "}
        of <strong>{total}</strong> records
      </span>
      <div className="flex w-full flex-wrap items-center justify-between gap-2 sm:w-auto sm:justify-end">
        <div className="flex items-center gap-2 text-slate-600 text-xs font-semibold">
          <span>Rows</span>
          <ModernSelect
            aria-label="Rows per page"
            value={String(pageSize)}
            onValueChange={(val) => onPageSizeChange(Number(val))}
            className="min-h-11 min-w-[70px] text-xs font-bold"
            options={[
              { label: "10", value: "10" },
              { label: "25", value: "25" },
              { label: "50", value: "50" },
              { label: "100", value: "100" },
            ]}
          />
        </div>
        <Button
          variant="outline"
          size="icon-sm"
          className="min-h-11 min-w-11"
          disabled={page <= 1}
          onClick={() => onPageChange(1)}
          aria-label="First page"
        >
          <ChevronsLeft />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          className="min-h-11 min-w-11"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft />
        </Button>
        <span className="text-xs font-bold text-slate-700 sm:hidden">
          {page} / {totalPages}
        </span>
        {pages.map((value) => (
          <Button
            key={value}
            variant={value === page ? "default" : "outline"}
            size="sm"
            className="hidden min-h-11 min-w-11 sm:inline-flex"
            onClick={() => onPageChange(value)}
            aria-label={`Page ${value}`}
          >
            {value}
          </Button>
        ))}
        <Button
          variant="outline"
          size="icon-sm"
          className="min-h-11 min-w-11"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          className="min-h-11 min-w-11"
          disabled={page >= totalPages}
          onClick={() => onPageChange(totalPages)}
          aria-label="Last page"
        >
          <ChevronsRight />
        </Button>
      </div>
    </footer>
  );
}

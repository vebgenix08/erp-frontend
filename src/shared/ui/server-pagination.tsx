import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from "lucide-react";
import { Button } from "./button";

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
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3 text-sm">
      <span className="text-slate-600">
        Showing <strong>{first}–{last}</strong> of <strong>{total}</strong> records
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-slate-600">
          Rows
          <select
            aria-label="Rows per page"
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="h-9 rounded border border-slate-300 bg-white px-2 text-sm"
          >
            {[10, 25, 50, 100].map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </label>
        <Button variant="outline" size="icon-sm" disabled={page <= 1} onClick={() => onPageChange(1)} aria-label="First page"><ChevronsLeft /></Button>
        <Button variant="outline" size="icon-sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Previous page"><ChevronLeft /></Button>
        {pages.map((value) => (
          <Button key={value} variant={value === page ? "default" : "outline"} size="sm" onClick={() => onPageChange(value)} aria-label={`Page ${value}`}>{value}</Button>
        ))}
        <Button variant="outline" size="icon-sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} aria-label="Next page"><ChevronRight /></Button>
        <Button variant="outline" size="icon-sm" disabled={page >= totalPages} onClick={() => onPageChange(totalPages)} aria-label="Last page"><ChevronsRight /></Button>
      </div>
    </footer>
  );
}

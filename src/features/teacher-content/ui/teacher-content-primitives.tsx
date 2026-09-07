import type { ReactNode } from "react";
import { Button } from "../../../shared/ui/button";
import { assignmentLabel, type TeacherAssignmentOption } from "../model/teacher-content.utils";

export function ContentFilters({
  assignments,
  assignmentId,
  status,
  statuses,
  onAssignment,
  onStatus,
}: {
  assignments: TeacherAssignmentOption[];
  assignmentId: string;
  status: string;
  statuses: Array<{ value: string; label: string }>;
  onAssignment: (value: string) => void;
  onStatus: (value: string) => void;
}) {
  return (
    <div className="grid gap-3 border-b border-slate-200 bg-slate-50/60 p-4 md:grid-cols-2">
      <label>
        <span className="mb-1.5 block text-xs font-bold text-slate-600">
          Assigned class and subject
        </span>
        <select
          value={assignmentId}
          onChange={(event) => onAssignment(event.target.value)}
          className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
        >
          <option value="">All assigned classes and subjects</option>
          {assignments.map((item) => (
            <option key={item.id} value={item.subjectOfferingId}>
              {assignmentLabel(item)}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="mb-1.5 block text-xs font-bold text-slate-600">Status</span>
        <select
          value={status}
          onChange={(event) => onStatus(event.target.value)}
          className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
        >
          {statuses.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export function ContentPagination({
  noun,
  page,
  totalPages,
  total,
  loading,
  onPage,
}: {
  noun: string;
  page: number;
  totalPages: number;
  total: number;
  loading: boolean;
  onPage: (page: number) => void;
}) {
  const label = total === 1 ? noun : noun.endsWith("y") ? `${noun.slice(0, -1)}ies` : `${noun}s`;
  return (
    <div className="flex flex-col gap-2 border-t border-slate-200 px-4 py-3 text-xs font-semibold text-slate-600 sm:flex-row sm:items-center sm:justify-between">
      <span>
        {total} {label}
      </span>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={page <= 1 || loading}
          onClick={() => onPage(page - 1)}
        >
          Previous
        </Button>
        <span>
          Page {page} of {totalPages}
        </span>
        <Button
          size="sm"
          variant="outline"
          disabled={page >= totalPages || loading}
          onClick={() => onPage(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-xs font-bold text-slate-700">
        {label}
      </label>
      {children}
    </div>
  );
}

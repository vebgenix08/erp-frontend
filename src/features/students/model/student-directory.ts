import type { StudentPage } from "../api/students.api";
import type { Student } from "./student.types";

const statuses = new Set<Student["status"]>(["ACTIVE", "INACTIVE", "GRADUATED", "TRANSFERRED"]);
const sortFields = new Set<StudentPage["sortBy"]>(["name", "admissionNumber", "registrationNumber", "createdAt"]);

export function normalizeStudentStatus(value: string | null): Student["status"] | "" {
  return value && statuses.has(value as Student["status"]) ? value as Student["status"] : "";
}

export function normalizeStudentSort(value: string | null): StudentPage["sortBy"] {
  return value && sortFields.has(value as StudentPage["sortBy"])
    ? value as StudentPage["sortBy"]
    : "name";
}

export function directoryPageNumbers(page: number, totalPages: number, windowSize = 5): number[] {
  const safeTotal = Math.max(1, totalPages);
  const safePage = Math.min(Math.max(1, page), safeTotal);
  const start = Math.max(1, Math.min(safePage - Math.floor(windowSize / 2), safeTotal - windowSize + 1));
  const end = Math.min(safeTotal, start + windowSize - 1);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

import { describe, expect, it } from "vitest";
import { directoryPageNumbers, normalizeStudentSort, normalizeStudentStatus } from "./student-directory";

describe("student directory state", () => {
  it("rejects unsupported status and sort query values", () => {
    expect(normalizeStudentStatus("ACTIVE")).toBe("ACTIVE");
    expect(normalizeStudentStatus("DELETED")).toBe("");
    expect(normalizeStudentSort("admissionNumber")).toBe("admissionNumber");
    expect(normalizeStudentSort("rollNumber")).toBe("name");
  });

  it("keeps the pagination window around the current page", () => {
    expect(directoryPageNumbers(1, 12)).toEqual([1, 2, 3, 4, 5]);
    expect(directoryPageNumbers(7, 12)).toEqual([5, 6, 7, 8, 9]);
    expect(directoryPageNumbers(12, 12)).toEqual([8, 9, 10, 11, 12]);
    expect(directoryPageNumbers(1, 2)).toEqual([1, 2]);
  });
});

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DepartmentTimetableGrid } from "./department-timetable-grid";

describe("department section timetable", () => {
  afterEach(cleanup);
  it("renders all subject teachers in real period order, including breaks and unallocated slots", () => {
    render(
      <DepartmentTimetableGrid
        timetable={{
          sectionId: "section-a",
          className: "Class 1",
          sectionName: "A",
          status: "PUBLISHED",
          entryCount: 2,
          conflictCount: 0,
          workingDays: ["MONDAY", "TUESDAY"],
          slots: [
            {
              id: "p2",
              sequence: 3,
              label: "Period 2",
              startTime: "10:00",
              endTime: "10:45",
              slotType: "TEACHING",
            },
            {
              id: "break",
              sequence: 2,
              label: "Break",
              startTime: "09:45",
              endTime: "10:00",
              slotType: "BREAK",
            },
            {
              id: "p1",
              sequence: 1,
              label: "Period 1",
              startTime: "09:00",
              endTime: "09:45",
              slotType: "TEACHING",
            },
          ],
          entries: [
            {
              id: "math",
              subjectName: "Mathematics",
              teacherNames: ["Ananya Rao"],
              teacherEmployeeIds: ["employee-ananya"],
              dayOfWeek: "MONDAY",
              periodSlotIds: ["p1"],
            },
            {
              id: "english",
              subjectName: "English",
              teacherNames: ["Priya Nair"],
              teacherEmployeeIds: ["employee-priya"],
              dayOfWeek: "MONDAY",
              periodSlotIds: ["p2"],
            },
          ],
        }}
      />,
    );
    const rows = within(screen.getByRole("table")).getAllByRole("row");
    expect(rows[1]?.textContent).toContain("Period 1");
    expect(rows[1]?.textContent).toContain("Mathematics");
    expect(rows[2]?.textContent).toContain("Break");
    expect(rows[3]?.textContent).toContain("English");
    expect(screen.getByText("Ananya Rao")).toBeTruthy();
    expect(screen.getByText("Priya Nair")).toBeTruthy();
    expect(screen.getAllByText("Unallocated")).toHaveLength(2);
    expect(screen.getByRole("columnheader", { name: "SAT" })).toBeTruthy();
    expect(screen.getAllByText("Non-working day").length).toBeGreaterThan(0);
    const breakRow = screen.getAllByText("Break")[0]?.closest("tr");
    expect(breakRow?.querySelector('td[colspan="2"]')).toBeTruthy();
  });
  it("renders Saturday with its own shorter period times", () => {
    render(
      <DepartmentTimetableGrid
        timetable={{
          sectionId: "section-a",
          className: "Class 1",
          sectionName: "A",
          status: "PUBLISHED",
          entryCount: 2,
          conflictCount: 0,
          workingDays: ["MONDAY", "SATURDAY"],
          slots: [
            {
              id: "weekday-p1",
              sequence: 1,
              label: "Period 1",
              startTime: "08:30",
              endTime: "09:15",
              slotType: "TEACHING",
              applicableDays: ["MONDAY"],
            },
            {
              id: "saturday-p1",
              sequence: 1,
              label: "Period 1",
              startTime: "08:00",
              endTime: "08:40",
              slotType: "TEACHING",
              applicableDays: ["SATURDAY"],
            },
          ],
          entries: [
            {
              id: "weekday-math",
              subjectName: "Mathematics",
              teacherNames: ["Ananya Rao"],
              teacherEmployeeIds: ["employee-ananya"],
              dayOfWeek: "MONDAY",
              periodSlotIds: ["weekday-p1"],
            },
            {
              id: "saturday-sport",
              subjectName: "Physical Education",
              teacherNames: ["Priya Nair"],
              teacherEmployeeIds: ["employee-priya"],
              dayOfWeek: "SATURDAY",
              periodSlotIds: ["saturday-p1"],
            },
          ],
        }}
      />,
    );
    expect(screen.getByRole("columnheader", { name: "SAT" })).toBeTruthy();
    expect(screen.getByText("Times vary by day")).toBeTruthy();
    expect(screen.getByText("08:00 - 08:40")).toBeTruthy();
    expect(screen.getByText("Physical Education")).toBeTruthy();
  });
  it("does not invent periods when configuration is missing", () => {
    render(<DepartmentTimetableGrid timetable={null} />);
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByText("No configured timetable for this section.")).toBeTruthy();
  });
});

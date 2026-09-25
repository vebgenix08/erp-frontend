import { describe, expect, it } from "vitest";
import {
  findTeacherPage,
  getVisibleTeacherNavigation,
  teacherWorkspacePages,
} from "./teacher-workspace.config";
import type { TeacherWorkspaceCapabilities } from "./teacher-workspace.types";

function capabilities(
  input: Partial<{
    hasTeachingAssignments: boolean;
    responsibilityTypes: string[];
    roleCodes: string[];
  }> = {},
): TeacherWorkspaceCapabilities {
  return {
    hasEmployee: true,
    hasTeachingAssignments: input.hasTeachingAssignments ?? false,
    responsibilityTypes: new Set(input.responsibilityTypes ?? []),
    roleCodes: new Set(input.roleCodes ?? ["TEACHER"]),
  };
}

function visiblePageIds(input: TeacherWorkspaceCapabilities) {
  return getVisibleTeacherNavigation(input).flatMap((group) => group.pages.map((page) => page.id));
}

describe("teacher workspace navigation", () => {
  it("registers one canonical list of unique Teacher Workspace pages", () => {
    expect(teacherWorkspacePages.length).toBeGreaterThan(0);
    expect(new Set(teacherWorkspacePages.map((page) => page.id)).size).toBe(
      teacherWorkspacePages.length,
    );
    expect(new Set(teacherWorkspacePages.map((page) => page.slug)).size).toBe(
      teacherWorkspacePages.length,
    );
    expect(findTeacherPage("unknown-route").id).toBe("dashboard");
  });

  it("shows only employee-level pages before teaching or responsibility assignment", () => {
    expect(visiblePageIds(capabilities())).toEqual(["dashboard", "profile"]);
  });

  it("shows no workspace navigation without an authoritative employee record", () => {
    expect(visiblePageIds({ ...capabilities(), hasEmployee: false })).toEqual([]);
  });

  it("adds the complete My Teaching section only after an active teaching assignment exists", () => {
    const ids = visiblePageIds(capabilities({ hasTeachingAssignments: true }));
    for (const required of [
      "schedule",
      "classes",
      "attendance",
      "marks_entry",
      "lesson_plans",
      "academic_reports",
      "workload",
    ]) {
      expect(ids).toContain(required);
    }
    expect(findTeacherPage("class-workspace").id).toBe("class_workspace");
    expect(ids).not.toContain("class_workspace");
    expect(ids).not.toContain("section_workspace");
    expect(ids).not.toContain("dept_overview");
  });

  it("combines teaching, section, mentoring, department, coordination and leadership capabilities", () => {
    const ids = visiblePageIds(
      capabilities({
        hasTeachingAssignments: true,
        responsibilityTypes: ["CLASS_TEACHER", "MENTOR", "HOD", "PROGRAM_COORDINATOR"],
        roleCodes: ["TEACHER", "PRINCIPAL"],
      }),
    );
    for (const required of [
      "classes",
      "section_workspace",
      "mentoring",
      "dept_overview",
      "dept_gradebook",
      "coord_overview",
      "leadership_dashboard",
      "leadership_faculty",
      "profile",
    ]) {
      expect(ids).toContain(required);
    }
  });

  it("does not unlock scoped department or coordinator pages from a role code alone", () => {
    const ids = visiblePageIds(capabilities({ roleCodes: ["HOD", "ACADEMIC_COORDINATOR"] }));
    expect(ids).not.toContain("dept_overview");
    expect(ids).not.toContain("coord_overview");
  });

  it("replaces the generic dashboard with the appropriate scoped dashboard", () => {
    expect(visiblePageIds(capabilities({ responsibilityTypes: ["HOD"] }))).toContain(
      "dept_overview",
    );
    expect(visiblePageIds(capabilities({ responsibilityTypes: ["HOD"] }))).not.toContain(
      "dashboard",
    );
    expect(
      visiblePageIds(capabilities({ responsibilityTypes: ["PROGRAM_COORDINATOR"] })),
    ).toContain("coord_overview");
    expect(
      visiblePageIds(capabilities({ responsibilityTypes: ["PROGRAM_COORDINATOR"] })),
    ).not.toContain("dashboard");
    expect(visiblePageIds(capabilities({ roleCodes: ["PRINCIPAL"] }))).toContain(
      "leadership_dashboard",
    );
    expect(visiblePageIds(capabilities({ roleCodes: ["PRINCIPAL"] }))).not.toContain("dashboard");
  });

  it("gives scoped dashboards distinct navigation labels", () => {
    const labels = getVisibleTeacherNavigation(
      capabilities({
        responsibilityTypes: ["HOD", "PROGRAM_COORDINATOR"],
        roleCodes: ["PRINCIPAL"],
      }),
    ).flatMap((group) => group.pages.map((page) => page.label));
    expect(labels).toContain("Department Overview");
    expect(labels).toContain("Academic Operations Overview");
    expect(labels).toContain("Leadership Overview");
    expect(labels.filter((label) => label === "Dashboard")).toHaveLength(0);
  });

  it("uses canonical route slugs and resolves legacy links", () => {
    expect(findTeacherPage("dept-overview").slug).toBe("department-overview");
    expect(findTeacherPage("department-overview").id).toBe("dept_overview");
    expect(findTeacherPage("attendance-timetable-mon").slug).toBe("attendance-timetable");
    expect(findTeacherPage("marks-entry").slug).toBe("marks-register");
  });

  it("keeps legacy teaching coverage routes available without duplicating HOD navigation", () => {
    const ids = visiblePageIds(capabilities({ responsibilityTypes: ["HOD"] }));
    expect(ids).not.toContain("dept_coverage");
    expect(findTeacherPage("dept-coverage").id).toBe("dept_coverage");
  });

  it("contains the approved marks, report and responsibility workspaces", () => {
    const pageIds = new Set(teacherWorkspacePages.map((page) => page.id));
    for (const required of [
      "marks_entry",
      "marks_history",
      "academic_reports",
      "mentoring",
      "section_workspace",
      "dept_workload",
      "dept_gradebook",
      "coord_timetable",
      "leadership_faculty",
      "leadership_reports",
    ]) {
      expect(pageIds.has(required)).toBe(true);
    }
    expect(
      [...pageIds].filter((id) => id.startsWith("mentoring") || id.startsWith("mentee")),
    ).toEqual(["mentoring"]);
  });
});

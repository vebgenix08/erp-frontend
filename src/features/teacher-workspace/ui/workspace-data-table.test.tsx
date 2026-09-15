import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { WorkspaceDataTable } from "./teacher-workspace-primitives";

afterEach(cleanup);
const columns = [
  { key: "name" as const, label: "Name" },
  { key: "periods" as const, label: "Periods" },
];
const rows = [
  { id: "1", name: "Teacher 10", periods: 10 },
  { id: "2", name: "Teacher 2", periods: 2 },
];
const names = () =>
  screen
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getAllByRole("cell")[1]?.textContent);

describe("WorkspaceDataTable", () => {
  it("sorts numbers and natural text in both directions without changing source rows", () => {
    render(<WorkspaceDataTable rows={rows} columns={columns} downloadName="faculty" />);
    fireEvent.click(screen.getByRole("button", { name: "Periods" }));
    expect(names()).toEqual(["Teacher 2", "Teacher 10"]);
    expect(screen.getByRole("columnheader", { name: "Periods" })).toHaveAttribute(
      "aria-sort",
      "ascending",
    );
    fireEvent.click(screen.getByRole("button", { name: "Periods" }));
    expect(names()).toEqual(["Teacher 10", "Teacher 2"]);
    fireEvent.click(screen.getByRole("button", { name: "Name" }));
    expect(names()).toEqual(["Teacher 2", "Teacher 10"]);
    expect(rows[0]?.periods).toBe(10);
  });

  it("preserves the page when parents recreate equivalent column definitions", () => {
    const manyRows = Array.from({ length: 15 }, (_, i) => ({
      id: String(i),
      name: `Teacher ${i}`,
      periods: i,
    }));
    const { rerender } = render(
      <WorkspaceDataTable rows={manyRows} columns={[...columns]} downloadName="faculty" />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    rerender(<WorkspaceDataTable rows={manyRows} columns={[...columns]} downloadName="faculty" />);
    expect(screen.getByText("Teacher 10")).toBeInTheDocument();
    expect(screen.queryByText("Teacher 0")).not.toBeInTheDocument();
  });

  it("distinguishes empty data from a search with no matches", () => {
    render(<WorkspaceDataTable rows={[]} columns={columns} downloadName="faculty" />);
    expect(screen.getByText("No records available")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Search records" }), {
      target: { value: "missing" },
    });
    expect(screen.getByText("No matching records")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByText("No records available")).toBeInTheDocument();
  });
});

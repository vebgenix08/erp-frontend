import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TimingConfiguration } from "./timing-configuration";

describe("working-day timing configuration", () => {
  afterEach(cleanup);

  it("creates a usable 45-minute period instead of a zero-length row", async () => {
    const user = userEvent.setup();
    render(
      <TimingConfiguration
        academicUnitId="unit-school"
        academicYearStart="2026-04-01"
        academicYearEnd="2027-03-31"
        periodSets={[]}
        slots={[]}
        busy={false}
        onSave={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Configure timings" }));
    await user.click(screen.getByRole("button", { name: "Add period or break" }));

    const rows = within(screen.getByRole("table")).getAllByRole("row");
    const inputs = rows.at(-1)!.querySelectorAll("input");
    expect(inputs[1]).toHaveValue("14:00");
    expect(inputs[2]).toHaveValue("14:45");
  });

  it("submits a Saturday-only schedule without empty slot day lists", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <TimingConfiguration
        academicUnitId="unit-school"
        academicYearStart="2026-04-01"
        academicYearEnd="2027-03-31"
        periodSets={[]}
        slots={[]}
        busy={false}
        onSave={onSave}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Configure timings" }));
    for (const day of ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"])
      await user.click(screen.getByRole("checkbox", { name: day }));
    await user.click(screen.getByRole("checkbox", { name: /Saturday uses different timings/ }));
    await user.click(screen.getByRole("button", { name: "Save timings" }));

    expect(onSave).toHaveBeenCalledOnce();
    const submitted = onSave.mock.calls[0]![0];
    expect(submitted.applicableDays).toEqual(["SATURDAY"]);
    expect(submitted.slots.length).toBeGreaterThan(0);
    expect(
      submitted.slots.every(
        (slot: { applicableDays?: string[] }) =>
          slot.applicableDays?.length === 1 && slot.applicableDays[0] === "SATURDAY",
      ),
    ).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { serializePeriodSetInput, serializeTimetableConstraintInput } from "./academic-planning.api";

describe("serializeTimetableConstraintInput", () => {
  it("serializes timetable constraint parameters for the AppSync AWSJSON scalar", () => {
    expect(serializeTimetableConstraintInput({
      constraintType: "MAX_PERIODS_PER_DAY",
      parameters: { maximum: 7 },
    })).toEqual({
      constraintType: "MAX_PERIODS_PER_DAY",
      parameters: "{\"maximum\":7}",
    });
  });

  it("does not double-encode an already serialized parameters value", () => {
    expect(serializeTimetableConstraintInput({
      parameters: "{\"maximum\":3}",
    }).parameters).toBe("{\"maximum\":3}");
  });
});

describe("serializePeriodSetInput", () => {
  it("serializes timetable preferences for the AppSync AWSJSON scalar", () => {
    expect(
      serializePeriodSetInput({
        name: "Class 10 - Section A",
        preferences: { allowDoublePeriods: false },
      }),
    ).toEqual({
      name: "Class 10 - Section A",
      preferences: "{\"allowDoublePeriods\":false}",
    });
  });

  it("does not add preferences when they were not supplied", () => {
    expect(serializePeriodSetInput({ name: "Regular" })).toEqual({ name: "Regular" });
  });
});

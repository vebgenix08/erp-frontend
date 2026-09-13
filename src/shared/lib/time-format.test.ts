import { describe, expect, it } from "vitest";
import { formatClockTime } from "./time-format";

describe("formatClockTime", () => {
  it.each([
    ["00:00", "12:00 AM"],
    ["09:05", "9:05 AM"],
    ["12:30", "12:30 PM"],
    ["13:15", "1:15 PM"],
    ["23:59", "11:59 PM"],
  ])("formats %s as %s", (value, expected) => {
    expect(formatClockTime(value)).toBe(expected);
  });

  it("leaves an invalid API value unchanged", () => {
    expect(formatClockTime("pending")).toBe("pending");
  });
});

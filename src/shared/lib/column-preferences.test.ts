// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import { loadColumnPreference, saveColumnPreference } from "./column-preferences";

const key = "directory.columns.test";
const defaults = ["name", "status"] as const;

describe("column preferences", () => {
  beforeEach(() => window.localStorage.clear());

  it("uses defaults when no preference has been stored", () => {
    expect(loadColumnPreference(key, defaults)).toEqual(defaults);
  });

  it("saves and restores the selected columns in order", () => {
    saveColumnPreference(key, ["status", "phone"]);

    expect(loadColumnPreference(key, defaults)).toEqual(["status", "phone"]);
  });

  it("falls back when stored data is corrupt or empty", () => {
    window.localStorage.setItem(key, "not-json");
    expect(loadColumnPreference(key, defaults)).toEqual(defaults);

    window.localStorage.setItem(key, "[]");
    expect(loadColumnPreference(key, defaults)).toEqual(defaults);
  });

  it("drops removed columns and restores mandatory columns", () => {
    window.localStorage.setItem(key, JSON.stringify(["phone", "removed"]));

    expect(loadColumnPreference(key, defaults, ["name", "status", "phone"], ["name"])).toEqual([
      "phone",
      "name",
    ]);
  });
});

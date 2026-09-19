import { describe, expect, it } from "vitest";
import { calculateSquareCrop } from "./image-crop";

describe("calculateSquareCrop", () => {
  it("centres a square crop by default", () => {
    expect(calculateSquareCrop(1200, 800, { zoom: 1, offsetX: 0, offsetY: 0 })).toEqual({
      x: 200,
      y: 0,
      size: 800,
    });
  });

  it("supports zoom and bounded repositioning", () => {
    expect(calculateSquareCrop(1000, 800, { zoom: 2, offsetX: 100, offsetY: -100 })).toEqual({
      x: 600,
      y: 0,
      size: 400,
    });
    expect(calculateSquareCrop(1000, 800, { zoom: 99, offsetX: -999, offsetY: 999 })).toEqual({
      x: 0,
      y: 800 - 800 / 3,
      size: 800 / 3,
    });
  });
});

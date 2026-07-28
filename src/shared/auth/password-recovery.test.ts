import { describe, expect, it } from "vitest";
import { validateNewPassword } from "./password-recovery";

describe("password recovery validation", () => {
  it("validates the complete password policy before Cognito confirmation", () => {
    expect(validateNewPassword("short")).toMatch(/12 characters/);
    expect(validateNewPassword("lowercase123!")).toMatch(/uppercase/);
    expect(validateNewPassword("UPPERCASE123!")).toMatch(/lowercase/);
    expect(validateNewPassword("NoNumberHere!")).toMatch(/number/);
    expect(validateNewPassword("NoSpecial1234")).toMatch(/special/);
    expect(validateNewPassword("Valid@1234567")).toBeNull();
  });
});

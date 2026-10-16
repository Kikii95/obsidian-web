import { describe, expect, it } from "vitest";
import { enRem, REM_PX } from "./unites";

describe("enRem", () => {
  it("convertit un réglage en px en rem sur la base du navigateur", () => {
    expect(enRem(REM_PX)).toBe("1rem");
    expect(enRem(1050)).toBe("65.625rem");
    expect(enRem(800)).toBe("50rem");
  });
});

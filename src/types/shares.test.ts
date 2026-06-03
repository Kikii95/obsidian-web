import { describe, it, expect } from "vitest";
import { EXPIRATION_OPTIONS, getExpirationMs } from "./shares";

describe("getExpirationMs", () => {
  it("resolves finite durations to their millisecond value", () => {
    expect(getExpirationMs("1h")).toBe(60 * 60 * 1000);
    expect(getExpirationMs("1d")).toBe(24 * 60 * 60 * 1000);
    expect(getExpirationMs("1w")).toBe(7 * 24 * 60 * 60 * 1000);
    expect(getExpirationMs("1m")).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it("returns null for permanent shares", () => {
    expect(getExpirationMs("never")).toBeNull();
  });

  it("falls back to one week for unknown values", () => {
    // @ts-expect-error - testing runtime safety against invalid input
    expect(getExpirationMs("bogus")).toBe(7 * 24 * 60 * 60 * 1000);
  });
});

describe("EXPIRATION_OPTIONS", () => {
  it("exposes a permanent option with a null duration", () => {
    const never = EXPIRATION_OPTIONS.find((o) => o.value === "never");
    expect(never).toBeDefined();
    expect(never?.ms).toBeNull();
    expect(never?.label).toBe("Illimité");
  });
});

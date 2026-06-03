import { describe, it, expect } from "vitest";
import { isValidObsidianTag } from "./obsidian-tags";

describe("isValidObsidianTag", () => {
  it("rejects 6-digit hex color codes (incl. ones with A-F letters)", () => {
    for (const hex of ["002253", "F86632", "F6B049", "FF972E", "FF633D", "FF8633"]) {
      expect(isValidObsidianTag(hex)).toBe(false);
    }
  });

  it("rejects 8-digit hex colors (with alpha)", () => {
    expect(isValidObsidianTag("FF972E80")).toBe(false);
  });

  it("rejects purely numeric tokens", () => {
    expect(isValidObsidianTag("1984")).toBe(false);
    expect(isValidObsidianTag("42")).toBe(false);
  });

  it("accepts real tags", () => {
    for (const tag of ["project", "todo", "2024-recap", "work/urgent", "v2", "fff"]) {
      expect(isValidObsidianTag(tag)).toBe(true);
    }
  });
});

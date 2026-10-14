import { describe, expect, it } from "vitest";
import { CAVALIER_COUNT, cavalierIndex } from "./cavalier";

describe("cavalierIndex", () => {
  it("reste dans la palette fermée", () => {
    for (const tag of ["liens", "journal", "idée", "", "a/b/c", "Projet-2026"]) {
      const i = cavalierIndex(tag);
      expect(i).toBeGreaterThanOrEqual(1);
      expect(i).toBeLessThanOrEqual(CAVALIER_COUNT);
    }
  });

  it("est stable et ignore le #, la casse et les espaces", () => {
    expect(cavalierIndex("#Liens ")).toBe(cavalierIndex("liens"));
  });

  it("répartit des étiquettes différentes sur plusieurs couleurs", () => {
    const couleurs = new Set(["liens", "journal", "idée", "projet", "lecture", "obsidian", "jardin"].map(cavalierIndex));
    expect(couleurs.size).toBeGreaterThan(2);
  });
});

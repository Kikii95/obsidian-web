import { describe, expect, it } from "vitest";
import { deriveNoteDate, recency, timeExtent } from "./temporal";
import type { GraphNode } from "./types";

function node(id: string, date?: number): GraphNode {
  return {
    id,
    name: id,
    path: `${id}.md`,
    linkCount: 0,
    degree: 0,
    tags: [],
    folder: "",
    date,
    cluster: "",
    clusterIndex: 0,
    kind: "note",
  };
}

describe("deriveNoteDate", () => {
  it("parses an ISO date string", () => {
    const ms = deriveNoteDate({ created: "2026-07-01" });
    expect(ms).toBe(Date.parse("2026-07-01"));
  });

  it("prefers 'updated' over 'created'", () => {
    const ms = deriveNoteDate({ created: "2020-01-01", updated: "2026-01-01" });
    expect(ms).toBe(Date.parse("2026-01-01"));
  });

  it("scales unix seconds up to milliseconds", () => {
    expect(deriveNoteDate({ mtime: 1_700_000_000 })).toBe(1_700_000_000_000);
  });

  it("keeps millisecond timestamps as-is", () => {
    expect(deriveNoteDate({ mtime: 1_700_000_000_000 })).toBe(1_700_000_000_000);
  });

  it("returns undefined for missing or unparseable dates", () => {
    expect(deriveNoteDate({})).toBeUndefined();
    expect(deriveNoteDate({ date: "not a date" })).toBeUndefined();
    expect(deriveNoteDate({ date: true })).toBeUndefined();
  });
});

describe("timeExtent", () => {
  it("reports span and coverage over note nodes only", () => {
    const extent = timeExtent([node("a", 100), node("b", 300), node("c")]);
    expect(extent.min).toBe(100);
    expect(extent.max).toBe(300);
    expect(extent.dated).toBe(2);
    expect(extent.total).toBe(3);
  });

  it("returns a zero span when nothing is dated", () => {
    expect(timeExtent([node("a"), node("b")])).toEqual({
      min: 0,
      max: 0,
      dated: 0,
      total: 2,
    });
  });
});

describe("recency", () => {
  const extent = { min: 0, max: 100, dated: 2, total: 2 };

  it("maps oldest to 0 and newest to 1", () => {
    expect(recency(0, extent)).toBe(0);
    expect(recency(100, extent)).toBe(1);
    expect(recency(50, extent)).toBeCloseTo(0.5);
  });

  it("clamps out-of-range values and handles a degenerate span", () => {
    expect(recency(-10, extent)).toBe(0);
    expect(recency(200, extent)).toBe(1);
    expect(recency(5, { min: 5, max: 5, dated: 1, total: 1 })).toBe(1);
  });
});

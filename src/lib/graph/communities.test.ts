import { describe, expect, it } from "vitest";
import { detectCommunities } from "./communities";
import type { GraphLink, GraphNode } from "./types";

function node(id: string): GraphNode {
  return {
    id,
    name: id,
    path: `${id}.md`,
    linkCount: 0,
    degree: 0,
    tags: [],
    folder: "",
    cluster: "",
    clusterIndex: 0,
    kind: "note",
  };
}

function link(source: string, target: string): GraphLink {
  return { source, target, weight: 1, bidirectional: false, kind: "note" };
}

describe("detectCommunities", () => {
  it("splits two disconnected triangles into two groups", () => {
    const nodes = ["a", "b", "c", "x", "y", "z"].map(node);
    const links = [
      link("a", "b"), link("b", "c"), link("c", "a"),
      link("x", "y"), link("y", "z"), link("z", "x"),
    ];
    const labels = detectCommunities(nodes, links);
    expect(labels.get("a")).toBe(labels.get("b"));
    expect(labels.get("a")).toBe(labels.get("c"));
    expect(labels.get("x")).toBe(labels.get("y"));
    expect(labels.get("a")).not.toBe(labels.get("x"));
  });

  it("is deterministic across runs", () => {
    const nodes = ["a", "b", "c", "d"].map(node);
    const links = [link("a", "b"), link("b", "c"), link("c", "d")];
    expect(detectCommunities(nodes, links)).toEqual(detectCommunities(nodes, links));
  });
});

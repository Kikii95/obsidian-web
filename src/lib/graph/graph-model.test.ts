import { describe, expect, it } from "vitest";
import {
  buildEdgeArrays,
  buildIndexMap,
  buildSizes,
  neighborsAtDepth,
  neighborsOf,
  shortestPath,
  sizeForDegree,
} from "./graph-model";
import { NODE_SIZE_MAX, NODE_SIZE_MIN } from "./constants";
import type { GraphLink, GraphNode } from "./types";

function node(id: string, degree: number): GraphNode {
  return {
    id,
    name: id,
    path: `${id}.md`,
    linkCount: degree,
    degree,
    tags: [],
    folder: "",
    cluster: "",
    clusterIndex: 0,
    kind: "note",
  };
}

function link(source: string, target: string, weight = 1): GraphLink {
  return { source, target, weight, bidirectional: false, kind: "note" };
}

describe("sizeForDegree", () => {
  it("clamps to the configured bounds and scales", () => {
    expect(sizeForDegree(0)).toBeGreaterThanOrEqual(NODE_SIZE_MIN);
    expect(sizeForDegree(100000)).toBeLessThanOrEqual(NODE_SIZE_MAX);
    expect(sizeForDegree(4, 2)).toBeCloseTo(sizeForDegree(4) * 2);
  });
});

describe("buildEdgeArrays", () => {
  it("packs indices and drops links to unknown nodes", () => {
    const nodes = [node("A", 1), node("B", 1)];
    const indexOf = buildIndexMap(nodes);
    const { source, target, weight } = buildEdgeArrays(
      [link("A", "B", 3), link("A", "ghost")],
      indexOf
    );
    expect(Array.from(source)).toEqual([0]);
    expect(Array.from(target)).toEqual([1]);
    expect(Array.from(weight)).toEqual([3]);
  });
});

describe("buildSizes", () => {
  it("returns one size per node", () => {
    const sizes = buildSizes([node("A", 0), node("B", 5)]);
    expect(sizes).toHaveLength(2);
    expect(sizes[1]).toBeGreaterThan(sizes[0]);
  });
});

describe("neighborsOf", () => {
  const links = [link("A", "B"), link("A", "C"), link("D", "E")];

  it("includes the node itself and both link directions", () => {
    expect(neighborsOf("A", links)).toEqual(new Set(["A", "B", "C"]));
    expect(neighborsOf("E", links)).toEqual(new Set(["E", "D"]));
  });

  it("returns just the node when it has no links", () => {
    expect(neighborsOf("Z", links)).toEqual(new Set(["Z"]));
  });
});

describe("neighborsAtDepth", () => {
  const links = [link("A", "B"), link("B", "C"), link("C", "D"), link("X", "Y")];

  it("returns only the node itself at depth 0", () => {
    expect(neighborsAtDepth("A", links, 0)).toEqual(new Set(["A"]));
  });

  it("collects direct neighbours at depth 1", () => {
    expect(neighborsAtDepth("B", links, 1)).toEqual(new Set(["B", "A", "C"]));
  });

  it("expands transitively with depth and stops at the component boundary", () => {
    expect(neighborsAtDepth("A", links, 2)).toEqual(new Set(["A", "B", "C"]));
    expect(neighborsAtDepth("A", links, 10)).toEqual(new Set(["A", "B", "C", "D"]));
    expect(neighborsAtDepth("A", links, 10).has("X")).toBe(false);
  });
});

describe("shortestPath", () => {
  const links = [link("A", "B"), link("B", "C"), link("A", "D"), link("D", "C")];

  it("returns the ordered shortest path between two nodes", () => {
    const path = shortestPath("A", "C", links);
    expect(path[0]).toBe("A");
    expect(path[path.length - 1]).toBe("C");
    expect(path).toHaveLength(3);
  });

  it("returns a single node when source equals target", () => {
    expect(shortestPath("A", "A", links)).toEqual(["A"]);
  });

  it("returns an empty path for disconnected nodes", () => {
    expect(shortestPath("A", "Z", [...links, link("Y", "Z")])).toEqual([]);
  });
});

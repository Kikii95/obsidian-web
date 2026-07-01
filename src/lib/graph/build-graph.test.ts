import { describe, expect, it } from "vitest";
import type { VaultIndexEntry } from "@/lib/db/schema";
import { buildGraph } from "./build-graph";
import { deriveNodeId } from "./resolve";
import { dedupeAndWeightLinks } from "./edges";
import { deriveFolder, deriveMeta } from "./cluster";
import { capByDegree, extractNeighborhood } from "./neighborhood";
import type { GraphBuildOptions, GraphData } from "./types";

type Wikilink = { target: string; display?: string; isEmbed: boolean };

function entry(
  filePath: string,
  opts: { tags?: string[]; wikilinks?: Wikilink[]; frontmatter?: Record<string, unknown> } = {}
): VaultIndexEntry {
  const fileName = filePath.split("/").pop() ?? filePath;
  return {
    id: filePath,
    userId: "u",
    owner: "o",
    repo: "r",
    branch: "main",
    filePath,
    fileName,
    fileSha: "sha",
    tags: opts.tags ?? [],
    wikilinks: opts.wikilinks ?? [],
    frontmatter: opts.frontmatter ?? {},
    isPrivate: false,
    indexedAt: new Date(0),
    updatedAt: new Date(0),
  };
}

function link(target: string, isEmbed = false): Wikilink {
  return { target, isEmbed };
}

const OPTS: GraphBuildOptions = {
  includeOrphans: true,
  clusterBy: "folder",
  tagNodes: false,
  ghosts: false,
  maxNodes: 10_000,
};

function build(entries: VaultIndexEntry[], overrides: Partial<GraphBuildOptions> = {}): GraphData {
  return buildGraph(entries, { ...OPTS, ...overrides });
}

describe("deriveNodeId", () => {
  it("strips only the trailing .md", () => {
    expect(deriveNodeId("x.md")).toBe("x");
    expect(deriveNodeId("a.mdx.md")).toBe("a.mdx");
    expect(deriveNodeId("notes.md/file.md")).toBe("notes.md/file");
  });
});

describe("buildGraph resolution", () => {
  it("links resolved wikilinks and skips embeds", () => {
    const graph = build([
      entry("A.md", { wikilinks: [link("B"), link("Img", true)] }),
      entry("B.md"),
    ]);
    expect(graph.links).toHaveLength(1);
    expect(graph.links[0]).toMatchObject({ source: "A", target: "B", weight: 1 });
  });

  it("resolves case-insensitively, across folders, ignoring anchors", () => {
    const graph = build([
      entry("folder/A.md", { wikilinks: [link("b#section")] }),
      entry("sub/B.md"),
    ]);
    expect(graph.links).toHaveLength(1);
    expect(graph.links[0]).toMatchObject({ source: "folder/A", target: "sub/B" });
  });

  it("prefers the shorter path on ambiguous names", () => {
    const graph = build([
      entry("A.md", { wikilinks: [link("B")] }),
      entry("B.md"),
      entry("deep/nested/B.md"),
    ]);
    expect(graph.links).toHaveLength(1);
    expect(graph.links[0].target).toBe("B");
  });

  it("drops unresolved links unless ghosts are enabled", () => {
    const noGhost = build([entry("A.md", { wikilinks: [link("Nope")] })]);
    expect(noGhost.links).toHaveLength(0);
    expect(noGhost.nodes.some((n) => n.kind === "ghost")).toBe(false);

    const withGhost = build([entry("A.md", { wikilinks: [link("Nope")] })], { ghosts: true });
    expect(withGhost.links).toHaveLength(1);
    expect(withGhost.nodes.some((n) => n.id === "ghost:Nope" && n.kind === "ghost")).toBe(true);
  });
});

describe("dedupeAndWeightLinks", () => {
  it("weights duplicates, merges reciprocals, drops self-links", () => {
    expect(dedupeAndWeightLinks([{ source: "A", target: "B" }, { source: "A", target: "B" }])).toEqual([
      { source: "A", target: "B", weight: 2, bidirectional: false, kind: "note" },
    ]);
    const reciprocal = dedupeAndWeightLinks([
      { source: "A", target: "B" },
      { source: "B", target: "A" },
    ]);
    expect(reciprocal).toHaveLength(1);
    expect(reciprocal[0]).toMatchObject({ weight: 2, bidirectional: true });
    expect(dedupeAndWeightLinks([{ source: "A", target: "A" }])).toEqual([]);
  });
});

describe("degree, orphans, meta, folders", () => {
  it("computes degree and filters orphans", () => {
    const withOrphans = build([
      entry("A.md", { wikilinks: [link("B")] }),
      entry("B.md"),
      entry("C.md"),
    ]);
    expect(withOrphans.totalNotes).toBe(3);
    expect(withOrphans.connectedNotes).toBe(2);
    expect(withOrphans.orphanNotes).toBe(1);
    expect(withOrphans.nodes.find((n) => n.id === "A")?.degree).toBe(1);

    const noOrphans = build(
      [entry("A.md", { wikilinks: [link("B")] }), entry("B.md"), entry("C.md")],
      { includeOrphans: false }
    );
    expect(noOrphans.nodes.some((n) => n.id === "C")).toBe(false);
  });

  it("derives folder and narrows frontmatter meta", () => {
    expect(deriveFolder("x/y/z.md")).toBe("x/y");
    expect(deriveFolder("root.md")).toBe("");
    expect(deriveMeta({ type: "note", status: "done" })).toEqual({ type: "note", status: "done" });
    expect(deriveMeta({ type: 123, status: null })).toEqual({ type: undefined, status: undefined });
  });
});

describe("clustering", () => {
  it("assigns stable folder clusters ordered by size", () => {
    const graph = build([
      entry("a/one.md"),
      entry("a/two.md"),
      entry("b/three.md"),
    ]);
    const a = graph.clusters.find((c) => c.id === "a");
    const b = graph.clusters.find((c) => c.id === "b");
    expect(a?.index).toBe(0);
    expect(a?.size).toBe(2);
    expect(b?.index).toBe(1);
    expect(graph.nodes.find((n) => n.id === "a/one")?.clusterIndex).toBe(0);
  });

  it("clusters by dominant tag when requested", () => {
    const graph = build(
      [entry("one.md", { tags: ["x"] }), entry("two.md", { tags: ["x", "y"] })],
      { clusterBy: "tag" }
    );
    expect(graph.nodes.every((n) => n.cluster === "x")).toBe(true);
  });
});

describe("tag nodes", () => {
  it("adds tag hubs only above the minimum count", () => {
    const graph = build(
      [
        entry("a.md", { tags: ["keep"] }),
        entry("b.md", { tags: ["keep"] }),
        entry("c.md", { tags: ["keep", "drop"] }),
      ],
      { tagNodes: true }
    );
    expect(graph.nodes.some((n) => n.id === "tag:keep")).toBe(true);
    expect(graph.nodes.some((n) => n.id === "tag:drop")).toBe(false);
    expect(graph.links.some((l) => l.kind === "tag" && l.target === "tag:keep")).toBe(true);
  });
});

describe("neighborhood and cap", () => {
  const graph = build([
    entry("A.md", { wikilinks: [link("B")] }),
    entry("B.md", { wikilinks: [link("C")] }),
    entry("C.md", { wikilinks: [link("D")] }),
    entry("D.md"),
  ]);

  it("extracts a BFS neighbourhood", () => {
    const hood = extractNeighborhood(graph, "A", 1);
    const ids = hood.nodes.map((n) => n.id).sort();
    expect(ids).toEqual(["A", "B"]);
    expect(hood.truncated).toBe(true);
  });

  it("caps by degree and flags truncation", () => {
    const capped = capByDegree(graph, 2);
    expect(capped.nodes).toHaveLength(2);
    expect(capped.truncated).toBe(true);
  });
});

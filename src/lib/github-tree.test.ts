import { describe, expect, it } from "vitest";
import type { Octokit } from "@octokit/rest";
import { toVaultFiles, walkTreeByDirectory, type RawTreeEntry } from "./github-tree";

interface FakeNode {
  path: string;
  type: "blob" | "tree";
  sha: string;
}

function fakeOctokit(trees: Record<string, FakeNode[]>): Octokit {
  return {
    git: {
      getTree: async ({ tree_sha }: { tree_sha: string }) => ({
        data: { tree: trees[tree_sha] ?? [] },
      }),
    },
  } as unknown as Octokit;
}

describe("walkTreeByDirectory (truncation fallback)", () => {
  const octokit = fakeOctokit({
    root: [
      { path: "Notes", type: "tree", sha: "notes" },
      { path: "readme.md", type: "blob", sha: "r1" },
      { path: "node_modules", type: "tree", sha: "nm" },
    ],
    notes: [
      { path: "a.md", type: "blob", sha: "a1" },
      { path: "sub", type: "tree", sha: "sub" },
    ],
    sub: [{ path: "b.md", type: "blob", sha: "b1" }],
    nm: [{ path: "pkg.md", type: "blob", sha: "x1" }],
  });

  it("recurses every directory and builds full paths", async () => {
    const entries = await walkTreeByDirectory(octokit, "o", "r", "root");
    const paths = entries.map((e) => e.path);
    expect(paths).toContain("readme.md");
    expect(paths).toContain("Notes/a.md");
    expect(paths).toContain("Notes/sub/b.md");
  });

  it("never descends into node_modules", async () => {
    const entries = await walkTreeByDirectory(octokit, "o", "r", "root");
    expect(entries.map((e) => e.path)).not.toContain("node_modules/pkg.md");
  });
});

describe("toVaultFiles", () => {
  const entries: RawTreeEntry[] = [
    { path: "a.md", type: "blob", sha: "a1" },
    { path: "Folder", type: "tree", sha: "f1" },
    { path: "Folder/b.md", type: "blob", sha: "b1" },
    { path: ".obsidian/app.json", type: "blob", sha: "o1" },
    { path: "node_modules/pkg/x.md", type: "blob", sha: "n1" },
  ];

  it("drops hidden and node_modules paths, maps blob/tree", () => {
    const files = toVaultFiles(entries, undefined, false);
    const paths = files.map((f) => f.path);
    expect(paths).toEqual(["a.md", "Folder", "Folder/b.md"]);
    expect(files.find((f) => f.path === "Folder")?.type).toBe("dir");
    expect(files.find((f) => f.path === "a.md")?.type).toBe("file");
  });

  it("scopes to rootPath and strips its prefix", () => {
    const scoped: RawTreeEntry[] = [
      { path: "vault/note.md", type: "blob", sha: "v1" },
      { path: "outside.md", type: "blob", sha: "o1" },
    ];
    const files = toVaultFiles(scoped, "vault", false);
    expect(files.map((f) => f.path)).toEqual(["note.md"]);
  });
});

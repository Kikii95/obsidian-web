import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import type { Octokit } from "@octokit/rest";
import {
  createOctokit,
  getVaultConfig,
  getFullVaultTree,
  getFileContent,
  type VaultConfig,
} from "@/lib/github";

const COMMIT_PAGES = 4;
const TASK_CAP = 50;
const PROJECT_CAP = 30;

function corsHeaders(origin: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": process.env.VAULT_FEED_ORIGIN || origin || "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, content-type",
    Vary: "Origin",
  };
}

function bearerOk(request: NextRequest): boolean {
  const secret = process.env.VAULT_FEED_SECRET || "";
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const a = Buffer.from(token);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

function buildProjects(tree: Awaited<ReturnType<typeof getFullVaultTree>>, root: string) {
  const counts = new Map<string, { category: string; notes: number }>();
  for (const file of tree) {
    if (file.type !== "file" || !file.path.startsWith(root + "/")) continue;
    const rel = file.path.slice(root.length + 1).split("/");
    if (rel.length < 3) continue;
    const [category, name] = rel;
    const key = `${category}/${name}`;
    const entry = counts.get(key) || { category, notes: 0 };
    if (file.path.endsWith(".md")) entry.notes += 1;
    counts.set(key, entry);
  }
  return [...counts.entries()]
    .map(([key, v]) => ({ name: key.split("/")[1], category: v.category, path: `${root}/${key}`, notes: v.notes }))
    .sort((a, b) => b.notes - a.notes)
    .slice(0, PROJECT_CAP);
}

async function buildTasks(octokit: Octokit, config: VaultConfig) {
  const path = process.env.VAULT_FEED_TASKS_PATH;
  if (!path) return [];
  try {
    const { content } = await getFileContent(octokit, path, config);
    return content
      .split("\n")
      .map((line) => line.match(/^\s*- \[ \] (.+)$/))
      .filter((m): m is RegExpMatchArray => m !== null)
      .map((m) => ({ text: m[1].trim() }))
      .slice(0, TASK_CAP);
  } catch {
    return [];
  }
}

async function buildActivity(octokit: Octokit, config: VaultConfig) {
  const { owner, repo, branch } = config;
  const activity: Record<string, number> = {};
  for (let page = 1; page <= COMMIT_PAGES; page++) {
    const { data } = await octokit.repos.listCommits({ owner, repo, sha: branch, per_page: 100, page });
    for (const commit of data) {
      const iso = (commit.commit.author?.date || commit.commit.committer?.date || "").slice(0, 10);
      if (iso) activity[iso] = (activity[iso] || 0) + 1;
    }
    if (data.length < 100) break;
  }
  return activity;
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request.headers.get("origin")) });
}

export async function GET(request: NextRequest) {
  const headers = corsHeaders(request.headers.get("origin"));

  if (!process.env.VAULT_FEED_SECRET || !process.env.VAULT_FEED_TOKEN) {
    return NextResponse.json({ error: "vault-feed disabled" }, { status: 503, headers });
  }
  if (!bearerOk(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers });
  }

  try {
    const octokit = createOctokit(process.env.VAULT_FEED_TOKEN);
    const config = getVaultConfig();
    const root = process.env.VAULT_FEED_PROJECTS_ROOT || "Projects";

    const tree = await getFullVaultTree(octokit, false, config);
    const [tasks, activity] = await Promise.all([buildTasks(octokit, config), buildActivity(octokit, config)]);
    const projects = buildProjects(tree, root);

    return NextResponse.json({ tasks, projects, activity, generatedAt: new Date().toISOString() }, { headers });
  } catch (error) {
    console.error("Error building vault feed:", error);
    return NextResponse.json({ error: "vault-feed failed" }, { status: 500, headers });
  }
}

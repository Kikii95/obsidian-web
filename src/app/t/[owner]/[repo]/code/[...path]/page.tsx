"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertCircle, Loader2, Clock, FileCode, Copy, Check, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UniversalLayout, SidebarHeader } from "@/components/layout";
import type { VaultFile } from "@/types";
import type { RateLimitInfo } from "@/lib/github";
import { getFileExtension } from "@/lib/file-types";

interface CodeData {
  path: string;
  content: string;
  sha: string;
}

interface RepoInfo {
  name: string;
  owner: string;
  branch: string;
  defaultBranch: string;
  description: string | null;
  stars: number;
  isPrivate: boolean;
}

// Map file extensions to highlight.js language names
const LANG_MAP: Record<string, string> = {
  ".c": "c",
  ".cpp": "cpp",
  ".cc": "cpp",
  ".cxx": "cpp",
  ".h": "c",
  ".hpp": "cpp",
  ".hxx": "cpp",
  ".js": "javascript",
  ".jsx": "javascript",
  ".ts": "typescript",
  ".tsx": "typescript",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".py": "python",
  ".pyw": "python",
  ".java": "java",
  ".kt": "kotlin",
  ".kts": "kotlin",
  ".go": "go",
  ".rs": "rust",
  ".cs": "csharp",
  ".fs": "fsharp",
  ".rb": "ruby",
  ".php": "php",
  ".pl": "perl",
  ".swift": "swift",
  ".m": "objectivec",
  ".mm": "objectivec",
  ".sh": "bash",
  ".bash": "bash",
  ".zsh": "bash",
  ".fish": "fish",
  ".ps1": "powershell",
  ".bat": "dos",
  ".cmd": "dos",
  ".html": "html",
  ".htm": "html",
  ".css": "css",
  ".scss": "scss",
  ".sass": "scss",
  ".less": "less",
  ".json": "json",
  ".yaml": "yaml",
  ".yml": "yaml",
  ".toml": "toml",
  ".xml": "xml",
  ".ini": "ini",
  ".conf": "nginx",
  ".sql": "sql",
  ".lua": "lua",
  ".dart": "dart",
  ".mk": "makefile",
  ".cmake": "cmake",
};

export default function TempVaultCodePage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const owner = params.owner as string;
  const repo = params.repo as string;
  const pathSegments = params.path as string[];
  const relativePath = pathSegments.map(decodeURIComponent).join("/");
  const branch = searchParams.get("branch") || undefined;
  const rootPath = searchParams.get("root") || undefined;

  const [code, setCode] = useState<CodeData | null>(null);
  const [tree, setTree] = useState<VaultFile[]>([]);
  const [repoInfo, setRepoInfo] = useState<RepoInfo | null>(null);
  const [rateLimit, setRateLimit] = useState<RateLimitInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const queryParams = new URLSearchParams();
        if (branch) queryParams.set("branch", branch);
        if (rootPath) queryParams.set("root", rootPath);
        const queryString = queryParams.toString() ? `?${queryParams}` : "";

        // Fetch tree for sidebar
        const treeRes = await fetch(
          `/api/temp/${owner}/${repo}/tree${queryString}`,
          { credentials: "include" }
        );
        if (treeRes.ok) {
          const treeData = await treeRes.json();
          setTree(treeData.tree);
          setRepoInfo(treeData.repoInfo);
          setRateLimit(treeData.rateLimit);
        }

        // Fetch code content
        queryParams.set("path", relativePath);

        const codeRes = await fetch(
          `/api/temp/${owner}/${repo}/file?${queryParams}`,
          { credentials: "include" }
        );

        if (!codeRes.ok) {
          const data = await codeRes.json();
          if (codeRes.status === 429) {
            setIsRateLimited(true);
            setRateLimit(data.rateLimit);
          }
          throw new Error(data.error || "File not found");
        }

        const codeData = await codeRes.json();
        setCode({
          path: codeData.path,
          content: codeData.content,
          sha: codeData.sha,
        });
        setRateLimit(codeData.rateLimit);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [owner, repo, relativePath, branch, rootPath]);

  // Copy to clipboard
  const handleCopy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Build back URL
  const getBackUrl = () => {
    const parts = relativePath.split("/");
    parts.pop();
    const parentPath = parts.join("/");

    const queryParams = new URLSearchParams();
    if (parentPath) queryParams.set("path", parentPath);
    if (branch) queryParams.set("branch", branch);
    if (rootPath) queryParams.set("root", rootPath);

    return `/t/${owner}/${repo}${queryParams.toString() ? `?${queryParams}` : ""}`;
  };

  // Get language for highlighting
  const getLanguage = () => {
    const ext = getFileExtension(relativePath);
    return LANG_MAP[ext] || "plaintext";
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">Loading file...</p>
        </div>
      </div>
    );
  }

  // Rate limit error
  if (isRateLimited) {
    const resetTime = rateLimit?.reset
      ? new Date(rateLimit.reset * 1000).toLocaleTimeString()
      : "soon";

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <Clock className="h-16 w-16 mx-auto text-amber-500 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Rate Limit Exceeded</h1>
          <p className="text-muted-foreground mb-4">
            GitHub API rate limit reached.
          </p>
          <p className="text-sm text-muted-foreground">
            Resets at <strong>{resetTime}</strong>
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="h-16 w-16 mx-auto text-destructive mb-4" />
          <h1 className="text-2xl font-bold mb-2">File Not Found</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button asChild variant="outline">
            <Link href={getBackUrl()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!code || !repoInfo) return null;

  const fileName = relativePath.split("/").pop() || relativePath;
  const language = getLanguage();
  const lineCount = code.content.split("\n").length;

  return (
    <UniversalLayout
      mode="temp"
      tree={tree}
      currentPath={relativePath}
      metadata={{
        owner,
        repo,
        branch: repoInfo.branch,
        defaultBranch: repoInfo.defaultBranch,
        description: repoInfo.description,
        stars: repoInfo.stars,
        isPrivate: repoInfo.isPrivate ?? false,
        rateLimit,
      }}
      permissions={{
        canEdit: false,
        canCreate: false,
        canDelete: false,
        canCopy: false,
        canExport: false,
        canShare: false,
        isAuthenticated: false,
      }}
      sidebarHeader={
        <SidebarHeader
          title={`${owner}/${repo}`}
          icon={<Github className="h-5 w-5" />}
        />
      }
      showSidebar={tree.length > 0}
    >
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        {/* Back button */}
        <div className="mb-6">
          <Button asChild variant="ghost" size="sm">
            <Link href={getBackUrl()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        </div>

        {/* File header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <FileCode className="h-6 w-6 text-orange-500" />
            <h1 className="text-2xl font-bold">{fileName}</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {lineCount} lines • {language}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="gap-2"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
        </div>

        {/* Code content */}
        <div className="rounded-lg border border-border overflow-hidden bg-muted/30">
          <pre className="overflow-x-auto p-4 text-sm leading-relaxed">
            <code className={`language-${language} hljs`}>
              {code.content.split("\n").map((line, i) => (
                <div key={i} className="flex">
                  <span className="select-none text-muted-foreground w-12 text-right pr-4 shrink-0">
                    {i + 1}
                  </span>
                  <span className="flex-1">{line || " "}</span>
                </div>
              ))}
            </code>
          </pre>
        </div>
      </div>
    </UniversalLayout>
  );
}

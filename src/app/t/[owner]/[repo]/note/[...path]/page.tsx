"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertCircle, Loader2, Clock, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UniversalLayout, SidebarHeader } from "@/components/layout";
import { MarkdownRenderer } from "@/components/viewer/markdown-renderer";
import type { VaultFile } from "@/types";
import type { RateLimitInfo } from "@/lib/github";

interface NoteData {
  path: string;
  content: string;
  frontmatter: Record<string, unknown>;
  wikilinks: string[];
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

export default function TempVaultNotePage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const owner = params.owner as string;
  const repo = params.repo as string;
  const pathSegments = params.path as string[];
  const relativePath = pathSegments.map(decodeURIComponent).join("/");
  const branch = searchParams.get("branch") || undefined;
  const rootPath = searchParams.get("root") || undefined;

  const [note, setNote] = useState<NoteData | null>(null);
  const [tree, setTree] = useState<VaultFile[]>([]);
  const [repoInfo, setRepoInfo] = useState<RepoInfo | null>(null);
  const [rateLimit, setRateLimit] = useState<RateLimitInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

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
          `/api/temp/${owner}/${repo}/tree${queryString}`
        );
        if (treeRes.ok) {
          const treeData = await treeRes.json();
          setTree(treeData.tree);
          setRepoInfo(treeData.repoInfo);
          setRateLimit(treeData.rateLimit);
        }

        // Fetch note content
        const filePath = `${relativePath}.md`;
        queryParams.set("path", filePath);

        const noteRes = await fetch(
          `/api/temp/${owner}/${repo}/file?${queryParams}`
        );

        if (!noteRes.ok) {
          const data = await noteRes.json();
          if (noteRes.status === 429) {
            setIsRateLimited(true);
            setRateLimit(data.rateLimit);
          }
          throw new Error(data.error || "Note not found");
        }

        const noteData = await noteRes.json();
        setNote({
          path: noteData.path,
          content: noteData.content,
          frontmatter: noteData.frontmatter || {},
          wikilinks: noteData.wikilinks || [],
        });
        setRateLimit(noteData.rateLimit);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [owner, repo, relativePath, branch, rootPath]);

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

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">Loading note...</p>
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
          <h1 className="text-2xl font-bold mb-2">Note Not Found</h1>
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

  if (!note || !repoInfo) return null;

  const noteName = relativePath.split("/").pop() || relativePath;

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
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        {/* Back button */}
        <div className="mb-6">
          <Button asChild variant="ghost" size="sm">
            <Link href={getBackUrl()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        </div>

        {/* Note header */}
        <h1 className="text-3xl font-bold mb-6">{noteName}</h1>

        {/* Frontmatter tags */}
        {Array.isArray(note.frontmatter.tags) &&
          note.frontmatter.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {(note.frontmatter.tags as string[]).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-primary/10 text-primary text-sm rounded-full"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

        {/* Note content */}
        <div
          ref={contentRef}
          className="prose prose-neutral dark:prose-invert max-w-none"
        >
          <MarkdownRenderer
            content={note.content}
            currentPath={`${relativePath}.md`}
            isShareViewer={true}
          />
        </div>
      </div>
    </UniversalLayout>
  );
}

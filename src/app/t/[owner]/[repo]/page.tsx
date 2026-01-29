"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Folder,
  FileText,
  Image,
  Film,
  File,
  ChevronRight,
  Loader2,
  AlertCircle,
  Clock,
  Github,
} from "lucide-react";
import { UniversalLayout, SidebarHeader } from "@/components/layout/universal-layout";
import { getFileType, isViewableFile } from "@/lib/file-types";
import { cn } from "@/lib/utils";
import type { VaultFile } from "@/types";
import type { RateLimitInfo } from "@/lib/github";

interface RepoInfo {
  name: string;
  owner: string;
  branch: string;
  defaultBranch: string;
  description: string | null;
  stars: number;
  isPrivate: boolean;
}

export default function TempVaultPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const owner = params.owner as string;
  const repo = params.repo as string;
  const subPath = searchParams.get("path") || "";
  const branch = searchParams.get("branch") || undefined;
  const rootPath = searchParams.get("root") || undefined;

  const [tree, setTree] = useState<VaultFile[]>([]);
  const [repoInfo, setRepoInfo] = useState<RepoInfo | null>(null);
  const [rateLimit, setRateLimit] = useState<RateLimitInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [isApiAuthenticated, setIsApiAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const fetchTree = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (branch) params.set("branch", branch);
        if (rootPath) params.set("root", rootPath);

        const res = await fetch(
          `/api/temp/${owner}/${repo}/tree${params.toString() ? `?${params}` : ""}`,
          { credentials: "include" }
        );

        if (!res.ok) {
          const data = await res.json();
          if (res.status === 429) {
            setIsRateLimited(true);
            setRateLimit(data.rateLimit);
            setIsApiAuthenticated(data.isAuthenticated ?? false);
            console.log("[TempVault] Rate limit error, auth:", data.isAuthenticated);
          }
          throw new Error(data.error || "Failed to fetch repository");
        }

        const data = await res.json();
        setTree(data.tree);
        setRepoInfo(data.repoInfo);
        setRateLimit(data.rateLimit);
        setIsApiAuthenticated(data.isAuthenticated ?? false);
        console.log("[TempVault] API Response auth:", data.isAuthenticated, "rateLimit:", data.rateLimit);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchTree();
  }, [owner, repo, branch, rootPath]);

  // Get current folder content based on subPath
  const currentContent = useMemo(() => {
    if (!subPath) return tree;

    const findFolder = (files: VaultFile[], path: string[]): VaultFile[] | null => {
      if (path.length === 0) return files;

      const [current, ...rest] = path;
      const folder = files.find((f) => f.type === "dir" && f.name === current);

      if (!folder) return null;
      if (rest.length === 0) return folder.children || [];
      return findFolder(folder.children || [], rest);
    };

    return findFolder(tree, subPath.split("/"));
  }, [tree, subPath]);

  // Sort content: dirs first, then alphabetically
  const sortedContent = useMemo(() => {
    if (!currentContent) return [];
    return [...currentContent]
      .filter((f) => f.type === "dir" || isViewableFile(f.name))
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }, [currentContent]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">Loading repository...</p>
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
            {rateLimit?.limit === 60
              ? " Anonymous access is limited to 60 requests per hour."
              : " Please wait for the limit to reset."}
          </p>
          <p className="text-sm text-muted-foreground">
            Rate limit resets at <strong>{resetTime}</strong>
          </p>
          <p className="text-xs text-muted-foreground mt-4 font-mono">
            Debug: API saw auth = {String(isApiAuthenticated)}, limit = {rateLimit?.limit}
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
          <h1 className="text-2xl font-bold mb-2">Repository Not Found</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <p className="text-sm text-muted-foreground">
            Make sure the repository exists and is public.
          </p>
        </div>
      </div>
    );
  }

  if (!repoInfo) return null;

  return (
    <UniversalLayout
      mode="temp"
      tree={tree}
      currentPath={subPath}
      metadata={{
        owner,
        repo,
        branch: repoInfo.branch,
        defaultBranch: repoInfo.defaultBranch,
        description: repoInfo.description,
        stars: repoInfo.stars,
        isPrivate: repoInfo.isPrivate,
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
    >
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        {/* Stats */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-muted-foreground">
            {sortedContent.filter((f) => f.type === "dir").length} folder(s) ·{" "}
            {sortedContent.filter((f) => f.type === "file").length} file(s)
          </p>
        </div>

        {/* Content Grid */}
        {sortedContent.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-lg">
            <Folder className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">This folder is empty</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {sortedContent.map((item) => (
              <TempVaultItem
                key={item.path}
                item={item}
                owner={owner}
                repo={repo}
                branch={repoInfo.branch}
                rootPath={rootPath}
              />
            ))}
          </div>
        )}
      </div>
    </UniversalLayout>
  );
}

// Individual item component
function TempVaultItem({
  item,
  owner,
  repo,
  branch,
  rootPath,
}: {
  item: VaultFile;
  owner: string;
  repo: string;
  branch: string;
  rootPath?: string;
}) {
  const isDirectory = item.type === "dir";
  const fileType = getFileType(item.name);

  const getHref = () => {
    const basePath = `/t/${owner}/${repo}`;
    const params = new URLSearchParams();
    if (branch) params.set("branch", branch);
    if (rootPath) params.set("root", rootPath);

    if (isDirectory) {
      params.set("path", item.path);
      return `${basePath}?${params}`;
    }

    const pathWithoutExt = item.path
      .replace(/\.md$/, "")
      .replace(/\.(png|jpg|jpeg|gif|svg|webp|bmp|ico)$/i, "")
      .replace(/\.pdf$/, "")
      .replace(/\.(mp4|webm|mov)$/i, "");

    const queryString = params.toString() ? `?${params}` : "";

    if (fileType === "markdown") {
      return `${basePath}/note/${encodeURIComponent(pathWithoutExt)}${queryString}`;
    }

    if (fileType === "image" || fileType === "pdf" || fileType === "video") {
      return `${basePath}/file/${encodeURIComponent(pathWithoutExt)}${queryString}`;
    }

    return "#";
  };

  const getIcon = () => {
    if (isDirectory) {
      return <Folder className="h-5 w-5 text-amber-500" />;
    }
    switch (fileType) {
      case "image":
        return <Image className="h-5 w-5 text-emerald-500" />;
      case "pdf":
        return <FileText className="h-5 w-5 text-red-500" />;
      case "video":
        return <Film className="h-5 w-5 text-purple-500" />;
      case "markdown":
        return <FileText className="h-5 w-5 text-blue-500" />;
      default:
        return <File className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const displayName = (() => {
    if (isDirectory) return item.name;
    if (fileType === "markdown") return item.name.replace(/\.md$/, "");
    return item.name;
  })();

  const childCount =
    isDirectory && item.children
      ? item.children.filter((c) => c.type === "dir" || isViewableFile(c.name))
          .length
      : 0;

  return (
    <Link
      href={getHref()}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border border-border/50",
        "hover:bg-muted/50 hover:border-border transition-all",
        "group"
      )}
    >
      <div
        className={cn(
          "p-2 rounded-lg transition-colors",
          isDirectory ? "bg-amber-500/10 group-hover:bg-amber-500/20" : "bg-muted/50"
        )}
      >
        {getIcon()}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{displayName}</p>
        {isDirectory && (
          <p className="text-xs text-muted-foreground">
            {childCount} item{childCount !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}

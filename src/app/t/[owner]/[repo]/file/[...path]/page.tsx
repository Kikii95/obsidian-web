"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, AlertCircle, Loader2, Clock, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TempVaultHeader } from "@/components/temp/temp-vault-header";
import { TempVaultSidebar } from "@/components/temp/temp-vault-sidebar";
import type { VaultFile } from "@/types";
import type { RateLimitInfo } from "@/lib/github";

interface FileData {
  path: string;
  content: string; // base64 for binary
  mimeType: string;
  fileType: string;
}

interface RepoInfo {
  name: string;
  owner: string;
  branch: string;
  defaultBranch: string;
  description: string | null;
  stars: number;
}

export default function TempVaultFilePage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const owner = params.owner as string;
  const repo = params.repo as string;
  const pathSegments = params.path as string[];
  const relativePath = pathSegments.map(decodeURIComponent).join("/");
  const branch = searchParams.get("branch") || undefined;
  const rootPath = searchParams.get("root") || undefined;

  const [file, setFile] = useState<FileData | null>(null);
  const [tree, setTree] = useState<VaultFile[]>([]);
  const [repoInfo, setRepoInfo] = useState<RepoInfo | null>(null);
  const [rateLimit, setRateLimit] = useState<RateLimitInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);

  // Try to detect file extension
  const getFileExtension = () => {
    // Check common image extensions
    for (const ext of [".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".bmp"]) {
      const testPath = `${relativePath}${ext}`;
      return { ext, path: testPath, type: "image" };
    }
    return { ext: ".png", path: `${relativePath}.png`, type: "image" };
  };

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

        // Try multiple file extensions
        const extensions = [".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".pdf", ".mp4", ".webm"];
        let fileData = null;
        let lastError = null;

        for (const ext of extensions) {
          const filePath = `${relativePath}${ext}`;
          queryParams.set("path", filePath);

          const fileRes = await fetch(
            `/api/temp/${owner}/${repo}/file?${queryParams}`
          );

          if (fileRes.ok) {
            fileData = await fileRes.json();
            break;
          } else if (fileRes.status === 429) {
            const data = await fileRes.json();
            setIsRateLimited(true);
            setRateLimit(data.rateLimit);
            throw new Error("Rate limit exceeded");
          } else {
            lastError = (await fileRes.json()).error;
          }
        }

        if (!fileData) {
          throw new Error(lastError || "File not found");
        }

        setFile({
          path: fileData.path,
          content: fileData.content,
          mimeType: fileData.mimeType,
          fileType: fileData.fileType,
        });
        setRateLimit(fileData.rateLimit);
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

  // Download file
  const handleDownload = () => {
    if (!file) return;
    const link = document.createElement("a");
    link.href = `data:${file.mimeType};base64,${file.content}`;
    link.download = file.path.split("/").pop() || "file";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  if (!file || !repoInfo) return null;

  const fileName = file.path.split("/").pop() || "file";

  return (
    <>
      {tree.length > 0 && (
        <TempVaultSidebar
          owner={owner}
          repo={repo}
          tree={tree}
          branch={repoInfo.branch}
          rootPath={rootPath}
        />
      )}

      <TempVaultHeader
        owner={owner}
        repo={repo}
        branch={repoInfo.branch}
        description={repoInfo.description}
        stars={repoInfo.stars}
        rateLimit={rateLimit}
        currentPath={relativePath}
      />

      <main className="max-w-4xl mx-auto p-4 md:p-8">
        {/* Back button + actions */}
        <div className="flex items-center justify-between mb-6">
          <Button asChild variant="ghost" size="sm">
            <Link href={getBackUrl()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>

          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>

        {/* File name */}
        <h1 className="text-2xl font-bold mb-6">{fileName}</h1>

        {/* File preview */}
        <div className="border border-border rounded-lg overflow-hidden bg-muted/30">
          {file.fileType === "image" && (
            <div className="flex items-center justify-center p-4">
              <img
                src={`data:${file.mimeType};base64,${file.content}`}
                alt={fileName}
                className="max-w-full max-h-[70vh] object-contain rounded"
              />
            </div>
          )}

          {file.fileType === "pdf" && (
            <iframe
              src={`data:${file.mimeType};base64,${file.content}`}
              className="w-full h-[80vh]"
              title={fileName}
            />
          )}

          {file.fileType === "video" && (
            <video
              src={`data:${file.mimeType};base64,${file.content}`}
              controls
              className="w-full max-h-[70vh]"
            />
          )}
        </div>
      </main>
    </>
  );
}

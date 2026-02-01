"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VersionTimeline, type CommitInfo } from "@/components/note/version-timeline";
import { VersionDiff, VersionDiffSideBySide } from "@/components/note/version-diff";
import { MarkdownRenderer } from "@/components/viewer/markdown-renderer";
import { ArrowLeft, GitCompare, Eye, Columns, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ViewMode = "preview" | "diff" | "side-by-side";

export default function NoteHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string[];
  const notePath = slug.join("/");
  const filePath = `${notePath}.md`;

  // State
  const [commits, setCommits] = useState<CommitInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected versions
  const [selectedSha, setSelectedSha] = useState<string | null>(null);
  const [compareSha, setCompareSha] = useState<string | null>(null);

  // Content
  const [selectedContent, setSelectedContent] = useState<string | null>(null);
  const [compareContent, setCompareContent] = useState<string | null>(null);
  const [currentContent, setCurrentContent] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>("preview");
  const [isCompareMode, setIsCompareMode] = useState(false);

  // Fetch commits
  useEffect(() => {
    async function fetchHistory() {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/github/history?path=${encodeURIComponent(filePath)}`);
        if (!res.ok) throw new Error("Erreur lors du chargement");

        const data = await res.json();
        setCommits(data.history || []);

        // Auto-select first commit
        if (data.history?.length > 0) {
          setSelectedSha(data.history[0].sha);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        setIsLoading(false);
      }
    }

    fetchHistory();
  }, [filePath]);

  // Fetch content at specific SHA
  const fetchContentAt = useCallback(async (sha: string): Promise<string | null> => {
    try {
      const res = await fetch(
        `/api/github/history/content?path=${encodeURIComponent(filePath)}&sha=${sha}`
      );
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error("Erreur");
      }
      const data = await res.json();
      return data.content;
    } catch {
      return null;
    }
  }, [filePath]);

  // Fetch selected content
  useEffect(() => {
    if (!selectedSha) return;

    setLoadingContent(true);
    fetchContentAt(selectedSha).then((content) => {
      setSelectedContent(content);
      setLoadingContent(false);
    });
  }, [selectedSha, fetchContentAt]);

  // Fetch compare content
  useEffect(() => {
    if (!compareSha) {
      setCompareContent(null);
      return;
    }

    fetchContentAt(compareSha).then(setCompareContent);
  }, [compareSha, fetchContentAt]);

  // Fetch current content (for diff with latest)
  useEffect(() => {
    if (commits.length > 0) {
      fetchContentAt(commits[0].sha).then(setCurrentContent);
    }
  }, [commits, fetchContentAt]);

  const noteName = slug[slug.length - 1];

  // Selected commit info
  const selectedCommit = commits.find((c) => c.sha === selectedSha);
  const compareCommit = commits.find((c) => c.sha === compareSha);

  // Toggle compare mode
  const handleToggleCompare = () => {
    const newCompareMode = !isCompareMode;
    setIsCompareMode(newCompareMode);
    if (!newCompareMode) {
      // Exiting compare mode - clear compare selection
      setCompareSha(null);
    }
    // Note: No auto-selection - user must click "Comparer" on desired commit
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/20 shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/note/${notePath}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Link>
          </Button>
          <span className="text-muted-foreground">|</span>
          <h1 className="text-lg font-semibold truncate">{noteName}</h1>
          <span className="text-muted-foreground text-sm">
            — Historique ({commits.length} versions)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={isCompareMode ? "default" : "outline"}
            size="sm"
            onClick={handleToggleCompare}
          >
            <GitCompare className="h-4 w-4 mr-2" />
            Comparer
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex min-h-0">
        {/* Timeline sidebar */}
        <div className="w-80 border-r bg-muted/10 shrink-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <AlertCircle className="h-10 w-10 text-destructive mb-3" />
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          ) : (
            <VersionTimeline
              commits={commits}
              selectedCommit={selectedSha || undefined}
              compareCommit={compareSha || undefined}
              onSelectCommit={setSelectedSha}
              onCompareSelect={isCompareMode ? setCompareSha : undefined}
              isCompareMode={isCompareMode}
              className="h-full"
            />
          )}
        </div>

        {/* Content area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* View mode tabs */}
          <Tabs
            value={viewMode}
            onValueChange={(v) => setViewMode(v as ViewMode)}
            className="flex-1 flex flex-col"
          >
            <div className="px-4 py-2 border-b bg-muted/10 shrink-0">
              <TabsList>
                <TabsTrigger value="preview" className="gap-2">
                  <Eye className="h-4 w-4" />
                  Aperçu
                </TabsTrigger>
                <TabsTrigger value="diff" className="gap-2" disabled={!isCompareMode && !currentContent}>
                  <GitCompare className="h-4 w-4" />
                  Diff
                </TabsTrigger>
                <TabsTrigger value="side-by-side" className="gap-2" disabled={!isCompareMode && !currentContent}>
                  <Columns className="h-4 w-4" />
                  Côte à côte
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 min-h-0">
              <TabsContent value="preview" className="h-full m-0">
                {loadingContent ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : selectedContent ? (
                  <div className="h-full overflow-auto p-6">
                    <div className="prose prose-invert max-w-none">
                      <MarkdownRenderer content={selectedContent} currentPath={notePath} />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Sélectionnez une version
                  </div>
                )}
              </TabsContent>

              <TabsContent value="diff" className="h-full m-0">
                {isCompareMode && selectedContent && compareContent ? (
                  <VersionDiff
                    oldContent={compareContent}
                    newContent={selectedContent}
                    oldLabel={compareCommit?.sha.slice(0, 7)}
                    newLabel={selectedCommit?.sha.slice(0, 7)}
                    className="h-full"
                  />
                ) : isCompareMode && selectedContent && !compareSha ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
                    <GitCompare className="h-12 w-12 opacity-50" />
                    <div className="text-center">
                      <p className="font-medium">Mode comparaison activé</p>
                      <p className="text-sm mt-1">
                        Version de base : <code className="bg-primary/20 px-1.5 rounded">{selectedCommit?.sha.slice(0, 7)}</code>
                      </p>
                      <p className="text-sm mt-2 text-muted-foreground/80">
                        Cliquez sur &quot;Comparer&quot; sur une autre version dans la timeline
                      </p>
                    </div>
                  </div>
                ) : selectedContent && currentContent ? (
                  <VersionDiff
                    oldContent={selectedContent}
                    newContent={currentContent}
                    oldLabel={selectedCommit?.sha.slice(0, 7)}
                    newLabel="Actuel"
                    className="h-full"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Sélectionnez deux versions à comparer
                  </div>
                )}
              </TabsContent>

              <TabsContent value="side-by-side" className="h-full m-0">
                {isCompareMode && selectedContent && compareContent ? (
                  <VersionDiffSideBySide
                    oldContent={compareContent}
                    newContent={selectedContent}
                    oldLabel={compareCommit?.sha.slice(0, 7)}
                    newLabel={selectedCommit?.sha.slice(0, 7)}
                    className="h-full"
                  />
                ) : isCompareMode && selectedContent && !compareSha ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
                    <Columns className="h-12 w-12 opacity-50" />
                    <div className="text-center">
                      <p className="font-medium">Mode comparaison activé</p>
                      <p className="text-sm mt-1">
                        Version de base : <code className="bg-primary/20 px-1.5 rounded">{selectedCommit?.sha.slice(0, 7)}</code>
                      </p>
                      <p className="text-sm mt-2 text-muted-foreground/80">
                        Cliquez sur &quot;Comparer&quot; sur une autre version dans la timeline
                      </p>
                    </div>
                  </div>
                ) : selectedContent && currentContent ? (
                  <VersionDiffSideBySide
                    oldContent={selectedContent}
                    newContent={currentContent}
                    oldLabel={selectedCommit?.sha.slice(0, 7)}
                    newLabel="Actuel"
                    className="h-full"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Sélectionnez deux versions à comparer
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

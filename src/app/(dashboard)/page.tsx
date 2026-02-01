"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  FolderOpen,
  Sparkles,
  Network,
  Loader2,
  FileText,
  Link2,
  FolderTree,
  Image,
  FileType,
  LayoutDashboard,
  Lock,
  Unlink,
  Plus,
  Search,
  Pin,
  PinOff,
  ChevronRight,
  Settings,
  History,
} from "lucide-react";
import { githubClient } from "@/services/github-client";
import { useVaultStore } from "@/lib/store";
import { usePinnedStore } from "@/lib/pinned-store";
import { useSettingsStore } from "@/lib/settings-store";
import { useSessionStateStore } from "@/lib/session-state-store";
import { useVaultIndex } from "@/hooks/use-vault-index";
import { CreateNoteDialog } from "@/components/notes/create-note-dialog";
import { getFileType } from "@/lib/file-types";
import { getFolderIcon } from "@/data/folder-icons";
import type { VaultFile } from "@/types";

// Lazy load mini graph
const MiniGraph = dynamic(() => import("@/components/dashboard/mini-graph"), {
  loading: () => (
    <div className="h-full flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  ),
  ssr: false,
});

// Lazy load activity heatmap
const ActivityHeatmap = dynamic(
  () => import("@/components/dashboard/activity-heatmap"),
  {
    loading: () => (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    ),
    ssr: false,
  }
);

// Lazy load community feedback
const CommunityFeedback = dynamic(
  () => import("@/components/dashboard/community-feedback").then((mod) => mod.CommunityFeedback),
  {
    loading: () => (
      <div className="h-full flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    ),
    ssr: false,
  }
);

interface VaultStats {
  notes: number;
  folders: number;
  links: number;
  images: number;
  pdfs: number;
  canvases: number;
  privateNotes: number;
  orphanNotes: number;
  loading: boolean;
}

interface RecentNote {
  path: string;
  name: string;
  type: string;
}

// Count all items recursively with detailed stats
function countItems(items: VaultFile[]): Omit<VaultStats, "links" | "orphanNotes" | "loading"> {
  let notes = 0;
  let folders = 0;
  let images = 0;
  let pdfs = 0;
  let canvases = 0;
  let privateNotes = 0;

  function traverse(files: VaultFile[], inPrivate = false) {
    for (const item of files) {
      if (item.type === "dir") {
        folders++;
        const isPrivateFolder = item.name.startsWith("_private") || inPrivate;
        if (item.children) {
          traverse(item.children, isPrivateFolder);
        }
      } else {
        const fileType = getFileType(item.name);
        if (fileType === "markdown") {
          notes++;
          if (inPrivate || item.isLocked) privateNotes++;
        } else if (fileType === "image") {
          images++;
        } else if (fileType === "pdf") {
          pdfs++;
        } else if (fileType === "canvas") {
          canvases++;
        }
      }
    }
  }

  traverse(items);
  return { notes, folders, images, pdfs, canvases, privateNotes };
}

// Get recent notes from tree (flatten and sort by name for now)
function getRecentNotes(items: VaultFile[], limit: number): RecentNote[] {
  const notes: RecentNote[] = [];

  function traverse(files: VaultFile[]) {
    for (const item of files) {
      if (item.type === "dir" && item.children) {
        traverse(item.children);
      } else if (item.type === "file") {
        const fileType = getFileType(item.name);
        if (fileType === "markdown") {
          notes.push({
            path: item.path,
            name: item.name.replace(/\.md$/, ""),
            type: fileType,
          });
        }
      }
    }
  }

  traverse(items);
  // For now, return last N notes (in real scenario, would sort by modification date)
  return notes.slice(-limit).reverse();
}

export default function HomePage() {
  const { data: session } = useSession();
  const { tree } = useVaultStore();
  const { pinnedNotes, unpinNote } = usePinnedStore();
  const { settings } = useSettingsStore();
  const { lastOpenedNotePath } = useSessionStateStore();
  const { status: indexStatus, fetchStatus: fetchIndexStatus, startIndexing } = useVaultIndex();

  const [stats, setStats] = useState<VaultStats>({
    notes: 0,
    folders: 0,
    links: 0,
    images: 0,
    pdfs: 0,
    canvases: 0,
    privateNotes: 0,
    orphanNotes: 0,
    loading: true,
  });

  const [graphData, setGraphData] = useState<{
    nodes: Array<{ id: string; name: string; path: string }>;
    links: Array<{ source: string; target: string }>;
  } | null>(null);

  // Fetch only graph data (tree is already fetched by VaultSidebar in layout)
  const fetchGraphData = useCallback(async () => {
    try {
      const graph = await githubClient.getGraph(true); // Include orphans to get accurate stats
      setGraphData(graph);

      // Use orphanNotes from API response
      const orphanCount = (graph as { orphanNotes?: number }).orphanNotes || 0;

      setStats((prev) => ({
        ...prev,
        links: graph.links?.length || 0,
        orphanNotes: orphanCount,
        loading: false,
      }));
    } catch {
      setStats((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  // Calculate stats when tree is available (from sidebar)
  useEffect(() => {
    if (tree.length > 0) {
      const counts = countItems(tree);
      setStats((prev) => ({
        ...prev,
        ...counts,
      }));
    }
  }, [tree]);

  // Fetch graph data on mount
  useEffect(() => {
    fetchGraphData();
  }, [fetchGraphData]);

  // Auto-refresh index if enabled and index is old
  useEffect(() => {
    const checkAutoRefresh = async () => {
      // Skip if auto-refresh disabled
      if (!settings.autoRefreshIndex) return;

      // Fetch current index status
      await fetchIndexStatus();
    };

    checkAutoRefresh();
  }, [settings.autoRefreshIndex, fetchIndexStatus]);

  // Trigger auto-refresh when we have index status
  useEffect(() => {
    if (!settings.autoRefreshIndex) return;
    if (!indexStatus) return;

    // Check if index exists and is old enough to refresh
    if (indexStatus.status === "completed" && indexStatus.completedAt) {
      const lastIndexDate = new Date(indexStatus.completedAt);
      const daysSinceIndex = (Date.now() - lastIndexDate.getTime()) / (1000 * 60 * 60 * 24);
      const intervalDays = settings.autoRefreshIntervalDays ?? 7;

      if (daysSinceIndex >= intervalDays) {
        // Index is older than threshold, trigger refresh
        startIndexing(false);
      }
    }
  }, [indexStatus, settings.autoRefreshIndex, settings.autoRefreshIntervalDays, startIndexing]);

  // Get recent notes based on settings
  const recentNotes = useMemo(() => {
    if (tree.length === 0) return [];
    return getRecentNotes(tree, settings.recentNotesCount);
  }, [tree, settings.recentNotesCount]);

  // Build file URL based on type
  const getFileUrl = (path: string, itemType?: "note" | "folder") => {
    // Folders go to folder explorer
    if (itemType === "folder") {
      const encodedPath = path.split("/").map(encodeURIComponent).join("/");
      return `/folder/${encodedPath}`;
    }

    const fileType = getFileType(path);
    const cleanPath = path
      .replace(/\.md$/, "")
      .replace(/\.canvas$/, "")
      .replace(/\.pdf$/, "")
      .replace(/\.(png|jpg|jpeg|gif|svg|webp|bmp|ico)$/i, "");
    const encodedPath = cleanPath.split("/").map(encodeURIComponent).join("/");

    if (fileType === "image" || fileType === "pdf") {
      return `/file/${encodedPath}`;
    }
    if (fileType === "canvas") {
      return `/canvas/${encodedPath}`;
    }
    return `/note/${encodedPath}`;
  };

  // Get icon component based on file type
  const getFileIcon = (path: string, itemType?: "note" | "folder") => {
    // Folders get folder icon - check for custom icon
    if (itemType === "folder") {
      const customIconId = settings.folderIcons?.[path];
      if (customIconId && customIconId !== "default") {
        const iconData = getFolderIcon(customIconId);
        if (iconData) {
          const Icon = iconData.icon;
          return <Icon className={`h-4 w-4 shrink-0 ${iconData.color || "text-primary/70"}`} />;
        }
      }
      return <FolderOpen className="h-4 w-4 text-primary/70 shrink-0" />;
    }

    const fileType = getFileType(path);
    switch (fileType) {
      case "image":
        return <Image className="h-4 w-4 text-emerald-500 shrink-0" />;
      case "pdf":
        return <FileText className="h-4 w-4 text-red-500 shrink-0" />;
      case "canvas":
        return <LayoutDashboard className="h-4 w-4 text-purple-500 shrink-0" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground shrink-0" />;
    }
  };

  // Layout-specific classes
  const layout = settings.dashboardLayout ?? "spacious";
  const isCompact = layout === "compact";
  const isMinimal = layout === "minimal";
  const containerClass = isCompact ? "p-2 md:p-4" : "p-4 md:p-6";
  const gapClass = isCompact ? "gap-3" : "gap-4";
  const mbClass = isCompact ? "mb-4" : "mb-6";

  return (
    <div className={`container mx-auto ${containerClass} max-w-6xl`}>
      {/* Welcome */}
      <div className={mbClass}>
        <h1 className={`${isCompact ? "text-xl md:text-2xl" : "text-2xl md:text-3xl"} font-bold mb-1`}>
          Bienvenue, {session?.user?.name?.split(" ")[0]}
        </h1>
        {!isMinimal && (
          <p className="text-muted-foreground text-sm">
            Ton vault Obsidian est prêt à être exploré.
          </p>
        )}
      </div>

      {/* Continue where you left off */}
      {lastOpenedNotePath && (
        <Card className={`${mbClass} border-primary/30 bg-primary/5`}>
          <CardContent className="py-3 px-4">
            <Link
              href={getFileUrl(lastOpenedNotePath + ".md")}
              className="flex items-center gap-3 group"
            >
              <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <History className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Reprendre où vous en étiez</p>
                <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                  {lastOpenedNotePath.split("/").pop() || lastOpenedNotePath}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Main Grid */}
      <div className={`grid lg:grid-cols-3 ${gapClass} ${mbClass}`}>
        {/* Stats Card - Takes 2 columns */}
        <Card className="lg:col-span-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-primary" />
                Statistiques du Vault
              </CardTitle>
              <Badge variant="outline" className="border-green-500/50 text-green-500">
                Connecté
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatItem
                icon={FileText}
                value={stats.notes}
                label="Notes"
                loading={stats.loading}
                color="text-blue-500"
              />
              <StatItem
                icon={FolderTree}
                value={stats.folders}
                label="Dossiers"
                loading={stats.loading}
                color="text-amber-500"
              />
              <StatItem
                icon={Link2}
                value={stats.links}
                label="Liens"
                loading={stats.loading}
                color="text-purple-500"
              />
              <StatItem
                icon={Unlink}
                value={stats.orphanNotes}
                label="Orphelines"
                loading={stats.loading}
                color="text-orange-500"
              />
              <StatItem
                icon={Image}
                value={stats.images}
                label="Images"
                loading={stats.loading}
                color="text-emerald-500"
              />
              <StatItem
                icon={FileType}
                value={stats.pdfs}
                label="PDFs"
                loading={stats.loading}
                color="text-red-500"
              />
              <StatItem
                icon={LayoutDashboard}
                value={stats.canvases}
                label="Canvas"
                loading={stats.loading}
                color="text-violet-500"
              />
              <StatItem
                icon={Lock}
                value={stats.privateNotes}
                label="Privées"
                loading={stats.loading}
                color="text-amber-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Actions Rapides</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <CreateNoteDialog
              trigger={
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Plus className="h-4 w-4" />
                  Nouvelle Note
                </Button>
              }
            />
            <Button variant="outline" className="w-full justify-start gap-2" asChild>
              <Link href="/folder">
                <FolderOpen className="h-4 w-4" />
                Explorer le Vault
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2" asChild>
              <Link href="/graph">
                <Network className="h-4 w-4" />
                Graph View
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2" asChild>
              <Link href="/settings">
                <Settings className="h-4 w-4" />
                Paramètres
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Second Row */}
      <div className={`grid lg:grid-cols-2 ${gapClass} ${mbClass}`}>
        {/* Pinned Items */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Pin className="h-4 w-4 text-primary" />
              Épinglés
            </CardTitle>
            <CardDescription>
              {pinnedNotes.length === 0
                ? "Épinglez des notes ou dossiers pour un accès rapide"
                : `${pinnedNotes.length} élément${pinnedNotes.length > 1 ? "s" : ""} épinglé${pinnedNotes.length > 1 ? "s" : ""}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pinnedNotes.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                <Pin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Aucun élément épinglé</p>
                <p className="text-xs mt-1">
                  Utilisez 📌 sur une note ou un dossier
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {pinnedNotes.map((note) => {
                  const isFolder = note.type === "folder";
                  const folder = note.path.includes("/")
                    ? note.path.substring(0, note.path.lastIndexOf("/"))
                    : "";
                  return (
                    <div
                      key={note.path}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 group"
                    >
                      {getFileIcon(note.path, note.type)}
                      <Link
                        href={getFileUrl(note.path, note.type)}
                        className="flex-1 min-w-0 hover:text-primary"
                      >
                        <span className="text-sm block truncate">{note.name}</span>
                        {folder && !isFolder && (
                          <span className="text-xs text-muted-foreground truncate block">
                            {folder}
                          </span>
                        )}
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                        onClick={() => unpinNote(note.path)}
                      >
                        <PinOff className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Notes */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BookOpen className="h-4 w-4 text-primary" />
                Notes Récentes
              </CardTitle>
              <Link href="/settings" className="text-xs text-muted-foreground hover:text-primary">
                {settings.recentNotesCount} affichées
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentNotes.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                Chargement...
              </div>
            ) : (
              <div className="space-y-1">
                {recentNotes.map((note) => {
                  const folder = note.path.includes("/")
                    ? note.path.substring(0, note.path.lastIndexOf("/"))
                    : "";
                  return (
                    <Link
                      key={note.path}
                      href={getFileUrl(note.path)}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 group"
                    >
                      {getFileIcon(note.path)}
                      <div className="flex-1 min-w-0 group-hover:text-primary">
                        <span className="text-sm block truncate">{note.name}</span>
                        {folder && (
                          <span className="text-xs text-muted-foreground truncate block">
                            {folder}
                          </span>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Graph & Activity - Dynamic grid based on visibility (hidden in minimal mode) */}
      {!isMinimal && (settings.showMiniGraph || (settings.showActivityHeatmap ?? true)) && (
        <div className={`grid grid-cols-1 ${settings.showMiniGraph && (settings.showActivityHeatmap ?? true) ? "md:grid-cols-2" : ""} ${gapClass} ${mbClass}`}>
          {/* Mini Graph Card */}
          {settings.showMiniGraph && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Network className="h-4 w-4 text-primary" />
                    Graph
                  </CardTitle>
                  <Button variant="ghost" size="sm" asChild className="h-6 px-2">
                    <Link href="/graph" className="text-xs">
                      Voir →
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="aspect-square rounded-lg overflow-hidden border border-border/50 bg-muted/20">
                  {graphData ? (
                    <MiniGraph
                      nodes={graphData.nodes}
                      links={graphData.links}
                      forceStrength={settings.graphForceStrength}
                      linkDistance={settings.graphLinkDistance}
                      gravityStrength={settings.graphGravityStrength ?? 0.1}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Activity Heatmap Card */}
          {(settings.showActivityHeatmap ?? true) && (
            <Card>
              <CardContent className="p-0">
                <div className="aspect-square rounded-lg overflow-hidden">
                  <ActivityHeatmap />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Community Feedback - Last card */}
      {(settings.showCommunityFeedback ?? true) && (
        <div className={mbClass}>
          <CommunityFeedback />
        </div>
      )}
    </div>
  );
}

// Stat item component
function StatItem({
  icon: Icon,
  value,
  label,
  loading,
  color,
}: {
  icon: React.ElementType;
  value: number;
  label: string;
  loading: boolean;
  color: string;
}) {
  return (
    <div className="text-center p-3 rounded-lg bg-muted/50">
      <Icon className={`h-4 w-4 mx-auto mb-1 ${color}`} />
      <div className="text-xl font-bold">
        {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : value}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

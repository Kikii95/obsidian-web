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
} from "lucide-react";
import { githubClient } from "@/services/github-client";
import { useVaultStore } from "@/lib/store";
import { usePinnedStore } from "@/lib/pinned-store";
import { useSettingsStore } from "@/lib/settings-store";
import { CreateNoteDialog } from "@/components/notes/create-note-dialog";
import { getFileType } from "@/lib/file-types";
import type { VaultFile } from "@/types";

// Lazy load mini graph
const MiniGraph = dynamic(() => import("@/components/dashboard/mini-graph"), {
  loading: () => (
    <div className="h-[200px] flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  ),
  ssr: false,
});

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
  const { tree, setTree, setTreeLoading } = useVaultStore();
  const { pinnedNotes, unpinNote } = usePinnedStore();
  const { settings } = useSettingsStore();

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

  const fetchData = useCallback(async () => {
    try {
      setTreeLoading(true);

      const [treeData, graph] = await Promise.all([
        githubClient.getTree(),
        githubClient.getGraph(),
      ]);

      setTree(treeData);
      setGraphData(graph);

      const counts = countItems(treeData);

      // Calculate orphan notes (nodes without links)
      const linkedNodes = new Set<string>();
      graph.links?.forEach((link: { source: string; target: string }) => {
        linkedNodes.add(link.source);
        linkedNodes.add(link.target);
      });
      const orphanNotes = (graph.nodes?.length || 0) - linkedNodes.size;

      setStats({
        ...counts,
        links: graph.links?.length || 0,
        orphanNotes: Math.max(0, orphanNotes),
        loading: false,
      });
    } catch {
      setStats((prev) => ({ ...prev, loading: false }));
    } finally {
      setTreeLoading(false);
    }
  }, [setTree, setTreeLoading]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Get recent notes based on settings
  const recentNotes = useMemo(() => {
    if (tree.length === 0) return [];
    return getRecentNotes(tree, settings.recentNotesCount);
  }, [tree, settings.recentNotesCount]);

  // Build note URL
  const getNoteUrl = (path: string) => {
    const cleanPath = path.replace(/\.md$/, "");
    return `/note/${cleanPath.split("/").map(encodeURIComponent).join("/")}`;
  };

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-6xl">
      {/* Welcome */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-1">
          Bienvenue, {session?.user?.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-muted-foreground text-sm">
          Ton vault Obsidian est prêt à être exploré.
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
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
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        {/* Pinned Notes */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Pin className="h-4 w-4 text-primary" />
              Notes Épinglées
            </CardTitle>
            <CardDescription>
              {pinnedNotes.length === 0
                ? "Épinglez des notes pour un accès rapide"
                : `${pinnedNotes.length} note${pinnedNotes.length > 1 ? "s" : ""} épinglée${pinnedNotes.length > 1 ? "s" : ""}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pinnedNotes.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                <Pin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Aucune note épinglée</p>
                <p className="text-xs mt-1">
                  Utilisez le bouton 📌 dans une note pour l'épingler
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {pinnedNotes.map((note) => (
                  <div
                    key={note.path}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 group"
                  >
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Link
                      href={getNoteUrl(note.path)}
                      className="flex-1 text-sm truncate hover:text-primary"
                    >
                      {note.name}
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={() => unpinNote(note.path)}
                    >
                      <PinOff className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
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
                {recentNotes.map((note) => (
                  <Link
                    key={note.path}
                    href={getNoteUrl(note.path)}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 group"
                  >
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="flex-1 text-sm truncate group-hover:text-primary">
                      {note.name}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mini Graph */}
      {settings.showMiniGraph && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Network className="h-4 w-4 text-primary" />
                Aperçu du Graph
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/graph" className="text-xs">
                  Voir complet →
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] rounded-lg overflow-hidden border border-border/50 bg-muted/20">
              {graphData ? (
                <MiniGraph nodes={graphData.nodes} links={graphData.links} />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
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

"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, FolderOpen, Sparkles, Network, CheckCircle2, Loader2 } from "lucide-react";
import { githubClient } from "@/services/github-client";
import type { VaultFile } from "@/types";

interface VaultStats {
  notes: number;
  folders: number;
  links: number;
  loading: boolean;
}

// Count notes and folders recursively
function countItems(items: VaultFile[]): { notes: number; folders: number } {
  let notes = 0;
  let folders = 0;
  for (const item of items) {
    if (item.type === "file") notes++;
    else if (item.type === "dir") {
      folders++;
      if (item.children) {
        const sub = countItems(item.children);
        notes += sub.notes;
        folders += sub.folders;
      }
    }
  }
  return { notes, folders };
}

export default function HomePage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<VaultStats>({
    notes: 0,
    folders: 0,
    links: 0,
    loading: true,
  });

  const fetchStats = useCallback(async () => {
    try {
      // Parallel fetch: tree + graph simultaneously (-200ms latency)
      const [tree, graph] = await Promise.all([
        githubClient.getTree(),
        githubClient.getGraph(),
      ]);

      const counts = countItems(tree);

      setStats({
        notes: counts.notes,
        folders: counts.folders,
        links: graph.links?.length || 0,
        loading: false,
      });
    } catch {
      setStats(prev => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Bienvenue, {session?.user?.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-muted-foreground">
          Ton vault Obsidian est prêt à être exploré.
        </p>
      </div>

      {/* Status Card */}
      <Card className="mb-8 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              État du Vault
            </CardTitle>
            <Badge variant="outline" className="border-green-500/50 text-green-500">
              Connecté
            </Badge>
          </div>
          <CardDescription>
            Repo: {process.env.NEXT_PUBLIC_GITHUB_REPO_NAME || "obsidian-vault"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-primary">
                {stats.loading ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : stats.notes}
              </div>
              <div className="text-xs text-muted-foreground">Notes</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-primary">
                {stats.loading ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : stats.folders}
              </div>
              <div className="text-xs text-muted-foreground">Dossiers</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-primary">
                {stats.loading ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : stats.links}
              </div>
              <div className="text-xs text-muted-foreground">Liens</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-primary">
                {stats.loading ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : stats.notes > 0 ? Math.floor(stats.notes * 0.3) : 0}
              </div>
              <div className="text-xs text-muted-foreground">Tags (estimé)</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <Link href="/" className="block">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer group h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FolderOpen className="h-5 w-5 text-primary group-hover:text-primary/80" />
                Explorer le Vault
              </CardTitle>
              <CardDescription>
                Parcourir tes notes via la sidebar
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/graph" className="block">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer group h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Network className="h-5 w-5 text-primary group-hover:text-primary/80" />
                Graph View
              </CardTitle>
              <CardDescription>
                Visualiser les liens entre notes
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Card className="hover:border-primary/50 transition-colors cursor-pointer group h-full opacity-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="h-5 w-5 text-muted-foreground" />
              Notes Récentes
            </CardTitle>
            <CardDescription>
              Bientôt disponible
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Features Status */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Features Implémentées
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">✓ Sidebar Navigation</Badge>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">✓ Wikilinks</Badge>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">✓ Éditeur Markdown</Badge>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">✓ Graph View</Badge>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">✓ Mode Offline</Badge>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">✓ Notes Privées</Badge>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">✓ PWA iOS</Badge>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">✓ 12 Thèmes</Badge>
            <Badge variant="secondary" className="opacity-60">◌ Recherche</Badge>
            <Badge variant="secondary" className="opacity-60">◌ Création Notes</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

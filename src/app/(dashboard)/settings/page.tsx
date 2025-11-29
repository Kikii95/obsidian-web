"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Palette, Database, Trash2, RefreshCw, HardDrive, Info } from "lucide-react";
import Link from "next/link";
import { useTheme, themes, type Theme } from "@/hooks/use-theme";
import { getCacheStats, clearNotesCache, getAllCachedNotes } from "@/lib/note-cache";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [cacheStats, setCacheStats] = useState<{ count: number; oldestDate: Date | null }>({
    count: 0,
    oldestDate: null,
  });
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    loadCacheStats();
  }, []);

  const loadCacheStats = async () => {
    const stats = await getCacheStats();
    setCacheStats(stats);
  };

  const handleClearCache = async () => {
    setIsClearing(true);
    await clearNotesCache();
    await loadCacheStats();
    setIsClearing(false);
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      {/* Back button */}
      <Button variant="ghost" size="sm" asChild className="mb-6">
        <Link href="/">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Link>
      </Button>

      <h1 className="text-2xl font-bold mb-6">Paramètres</h1>

      {/* Theme Settings */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Thème
          </CardTitle>
          <CardDescription>Personnalise l'apparence de l'application</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`
                  flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all
                  hover:scale-105
                  ${theme === t.id
                    ? "border-primary bg-primary/10"
                    : "border-transparent bg-muted/50 hover:border-muted-foreground/30"
                  }
                `}
              >
                <span className="text-2xl">{t.emoji}</span>
                <span className="text-xs font-medium">{t.name}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cache Settings */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Cache Offline
          </CardTitle>
          <CardDescription>Gère les notes sauvegardées localement</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Cache Stats */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <HardDrive className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">{cacheStats.count} notes en cache</p>
                {cacheStats.oldestDate && (
                  <p className="text-sm text-muted-foreground">
                    Plus ancienne : {cacheStats.oldestDate.toLocaleDateString("fr-FR")}
                  </p>
                )}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={loadCacheStats}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Clear Cache */}
          <Button
            variant="destructive"
            className="w-full"
            onClick={handleClearCache}
            disabled={isClearing || cacheStats.count === 0}
          >
            {isClearing ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            {isClearing ? "Suppression..." : "Vider le cache"}
          </Button>
        </CardContent>
      </Card>

      {/* App Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            À propos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Version</span>
            <Badge variant="outline">1.0.0</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Repo</span>
            <a
              href="https://github.com/Kikii95/obsidian-web"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline text-sm"
            >
              Kikii95/obsidian-web
            </a>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Stack</span>
            <span className="text-sm">Next.js 16 + TypeScript</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

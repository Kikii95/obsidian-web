"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Palette,
  Database,
  Trash2,
  RefreshCw,
  HardDrive,
  Info,
  LayoutDashboard,
  PanelLeft,
  Lock,
  Network,
  FolderTree,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { useTheme, themes } from "@/hooks/use-theme";
import { getCacheStats, clearNotesCache } from "@/lib/note-cache";
import { useSettingsStore, type UserSettings } from "@/lib/settings-store";
import { useVaultStore } from "@/lib/store";
import type { VaultFile } from "@/types";

// Get top-level folder names from tree
function getTopLevelFolders(files: VaultFile[]): string[] {
  return files
    .filter((f) => f.type === "dir")
    .map((f) => f.name)
    .sort();
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { settings, updateSettings, resetSettings } = useSettingsStore();
  const { tree } = useVaultStore();

  const [cacheStats, setCacheStats] = useState<{
    count: number;
    oldestDate: Date | null;
  }>({
    count: 0,
    oldestDate: null,
  });
  const [isClearing, setIsClearing] = useState(false);

  // Get top-level folders only (cleaner UI)
  const topLevelFolders = getTopLevelFolders(tree);

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

  const handleDefaultFolderChange = (folder: string) => {
    const current = settings.defaultExpandedFolders;
    if (current.includes(folder)) {
      updateSettings({
        defaultExpandedFolders: current.filter((f) => f !== folder),
      });
    } else {
      updateSettings({
        defaultExpandedFolders: [...current, folder],
      });
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-3xl">
      {/* Back button */}
      <Button variant="ghost" size="sm" asChild className="mb-6">
        <Link href="/">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Link>
      </Button>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Paramètres</h1>
        <Button variant="outline" size="sm" onClick={resetSettings}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Réinitialiser
        </Button>
      </div>

      {/* Dashboard Settings */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5 text-primary" />
            Dashboard
          </CardTitle>
          <CardDescription>Personnalise l'affichage du dashboard</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Recent notes count */}
          <div className="space-y-2">
            <Label>Nombre de notes récentes</Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[settings.recentNotesCount]}
                onValueChange={([value]) =>
                  updateSettings({ recentNotesCount: value })
                }
                min={3}
                max={15}
                step={1}
                className="flex-1"
              />
              <span className="w-8 text-center font-mono">
                {settings.recentNotesCount}
              </span>
            </div>
          </div>

          {/* Show mini graph */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Afficher le mini graph</Label>
              <p className="text-sm text-muted-foreground">
                Aperçu du graph sur le dashboard
              </p>
            </div>
            <Switch
              checked={settings.showMiniGraph}
              onCheckedChange={(checked) =>
                updateSettings({ showMiniGraph: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Sidebar Settings */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PanelLeft className="h-5 w-5 text-primary" />
            Sidebar
          </CardTitle>
          <CardDescription>Configuration de la navigation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Default expanded folders */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <FolderTree className="h-4 w-4" />
              Dossiers dépliés par défaut
            </Label>
            <p className="text-sm text-muted-foreground mb-3">
              Dossiers racine à ouvrir automatiquement au chargement
            </p>
            {topLevelFolders.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                Chargez d'abord le vault pour voir les dossiers disponibles
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {topLevelFolders.map((folder) => (
                  <label
                    key={folder}
                    className={`
                      flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all
                      ${settings.defaultExpandedFolders.includes(folder)
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                      }
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={settings.defaultExpandedFolders.includes(folder)}
                      onChange={() => handleDefaultFolderChange(folder)}
                      className="accent-primary"
                    />
                    <span className="text-sm truncate">{folder}</span>
                  </label>
                ))}
              </div>
            )}
            {settings.defaultExpandedFolders.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                {settings.defaultExpandedFolders.length} dossier(s) sélectionné(s)
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lock Settings */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Sécurité & Verrouillage
          </CardTitle>
          <CardDescription>Paramètres des notes privées</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Lock timeout */}
          <div className="space-y-2">
            <Label>Verrouillage automatique</Label>
            <Select
              value={String(settings.lockTimeout)}
              onValueChange={(value) =>
                updateSettings({ lockTimeout: Number(value) })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Jamais</SelectItem>
                <SelectItem value="1">1 minute</SelectItem>
                <SelectItem value="5">5 minutes</SelectItem>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">1 heure</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Durée avant verrouillage automatique des notes privées
            </p>
          </div>

          {/* Require PIN on delete */}
          <div className="flex items-center justify-between">
            <div>
              <Label>PIN pour suppression</Label>
              <p className="text-sm text-muted-foreground">
                Demander le code PIN pour supprimer
              </p>
            </div>
            <Switch
              checked={settings.requirePinOnDelete}
              onCheckedChange={(checked) =>
                updateSettings({ requirePinOnDelete: checked })
              }
            />
          </div>

          {/* Require PIN for private folders */}
          <div className="flex items-center justify-between">
            <div>
              <Label>PIN pour dossiers privés</Label>
              <p className="text-sm text-muted-foreground">
                Demander le code pour accéder aux dossiers _private
              </p>
            </div>
            <Switch
              checked={settings.requirePinOnPrivateFolder}
              onCheckedChange={(checked) =>
                updateSettings({ requirePinOnPrivateFolder: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Graph Settings */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5 text-primary" />
            Graph View
          </CardTitle>
          <CardDescription>Configuration du graphe de liens</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Show orphan notes */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Afficher notes orphelines</Label>
              <p className="text-sm text-muted-foreground">
                Notes sans liens dans le graph
              </p>
            </div>
            <Switch
              checked={settings.showOrphanNotes}
              onCheckedChange={(checked) =>
                updateSettings({ showOrphanNotes: checked })
              }
            />
          </div>

          {/* Force strength */}
          <div className="space-y-2">
            <Label>Force de répulsion</Label>
            <p className="text-xs text-muted-foreground">
              Plus bas = nodes plus proches (boule compacte)
            </p>
            <div className="flex items-center gap-4">
              <Slider
                value={[Math.abs(settings.graphForceStrength)]}
                onValueChange={([value]) =>
                  updateSettings({ graphForceStrength: -value })
                }
                min={1}
                max={500}
                step={1}
                className="flex-1"
              />
              <span className="w-12 text-center font-mono text-sm">
                {Math.abs(settings.graphForceStrength)}
              </span>
            </div>
          </div>

          {/* Link distance */}
          <div className="space-y-2">
            <Label>Distance des liens</Label>
            <p className="text-xs text-muted-foreground">
              Distance cible entre nodes liés
            </p>
            <div className="flex items-center gap-4">
              <Slider
                value={[settings.graphLinkDistance]}
                onValueChange={([value]) =>
                  updateSettings({ graphLinkDistance: value })
                }
                min={5}
                max={200}
                step={5}
                className="flex-1"
              />
              <span className="w-12 text-center font-mono text-sm">
                {settings.graphLinkDistance}px
              </span>
            </div>
          </div>

          {/* Gravity strength */}
          <div className="space-y-2">
            <Label>Gravité (cohésion)</Label>
            <p className="text-xs text-muted-foreground">
              Force qui attire les nodes vers le centre
            </p>
            <div className="flex items-center gap-4">
              <Slider
                value={[(settings.graphGravityStrength ?? 0.05) * 100]}
                onValueChange={([value]) =>
                  updateSettings({ graphGravityStrength: value / 100 })
                }
                min={0}
                max={30}
                step={1}
                className="flex-1"
              />
              <span className="w-12 text-center font-mono text-sm">
                {(settings.graphGravityStrength ?? 0.05).toFixed(2)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Theme Settings */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Thème
          </CardTitle>
          <CardDescription>Personnalise l'apparence</CardDescription>
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
                  ${
                    theme === t.id
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
          <CardDescription>Notes sauvegardées localement</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
            <Badge variant="outline">1.1.0</Badge>
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

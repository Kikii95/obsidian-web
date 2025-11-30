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
  Type,
  X,
  ChevronUp,
  ChevronDown,
  Plus,
  GripVertical,
  Clock,
  Settings2,
} from "lucide-react";
import Link from "next/link";
import { useTheme, themes } from "@/hooks/use-theme";
import { getCacheStats, clearNotesCache } from "@/lib/note-cache";
import { useSettingsStore, type UserSettings, type ActivityPeriod, type DashboardLayout, type SidebarSortBy, type DateFormat } from "@/lib/settings-store";
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

          {/* Show activity heatmap */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Afficher le heatmap d'activité</Label>
              <p className="text-sm text-muted-foreground">
                Calendrier des commits style GitHub
              </p>
            </div>
            <Switch
              checked={settings.showActivityHeatmap ?? true}
              onCheckedChange={(checked) =>
                updateSettings({ showActivityHeatmap: checked })
              }
            />
          </div>

          {/* Activity heatmap default period */}
          <div className="space-y-2">
            <Label>Période activité par défaut</Label>
            <Select
              value={settings.activityDefaultPeriod ?? "90"}
              onValueChange={(value) =>
                updateSettings({ activityDefaultPeriod: value as ActivityPeriod })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 jours</SelectItem>
                <SelectItem value="90">3 mois</SelectItem>
                <SelectItem value="180">6 mois</SelectItem>
                <SelectItem value="365">1 an</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Période affichée au chargement du heatmap
            </p>
          </div>

          {/* Dashboard layout */}
          <div className="space-y-2">
            <Label>Layout du dashboard</Label>
            <Select
              value={settings.dashboardLayout ?? "spacious"}
              onValueChange={(value) =>
                updateSettings({ dashboardLayout: value as DashboardLayout })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">Compact — Moins d'espace</SelectItem>
                <SelectItem value="spacious">Spacieux — Layout par défaut</SelectItem>
                <SelectItem value="minimal">Minimal — Stats uniquement</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Compact réduit les marges, Minimal masque le graph et heatmap
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Editor Settings */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="h-5 w-5 text-primary" />
            Éditeur & Viewer
          </CardTitle>
          <CardDescription>Personnalise l'affichage des notes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Font size */}
          <div className="space-y-2">
            <Label>Taille de police</Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[settings.editorFontSize ?? 16]}
                onValueChange={([value]) =>
                  updateSettings({ editorFontSize: value })
                }
                min={12}
                max={24}
                step={1}
                className="flex-1"
              />
              <span className="w-12 text-center font-mono text-sm">
                {settings.editorFontSize ?? 16}px
              </span>
            </div>
          </div>

          {/* Line height */}
          <div className="space-y-2">
            <Label>Interligne</Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[(settings.editorLineHeight ?? 1.6) * 10]}
                onValueChange={([value]) =>
                  updateSettings({ editorLineHeight: value / 10 })
                }
                min={12}
                max={24}
                step={1}
                className="flex-1"
              />
              <span className="w-12 text-center font-mono text-sm">
                {(settings.editorLineHeight ?? 1.6).toFixed(1)}
              </span>
            </div>
          </div>

          {/* Max content width */}
          <div className="space-y-2">
            <Label>Largeur max du contenu</Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[settings.editorMaxWidth ?? 800]}
                onValueChange={([value]) =>
                  updateSettings({ editorMaxWidth: value })
                }
                min={500}
                max={1400}
                step={50}
                className="flex-1"
              />
              <span className="w-16 text-center font-mono text-sm">
                {settings.editorMaxWidth ?? 800}px
              </span>
            </div>
          </div>

          {/* Show frontmatter */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Afficher le frontmatter</Label>
              <p className="text-sm text-muted-foreground">
                Badges status et tags sous le titre
              </p>
            </div>
            <Switch
              checked={settings.showFrontmatter ?? true}
              onCheckedChange={(checked) =>
                updateSettings({ showFrontmatter: checked })
              }
            />
          </div>

          {/* Default edit mode */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Mode édition par défaut</Label>
              <p className="text-sm text-muted-foreground">
                Ouvrir les notes en mode édition
              </p>
            </div>
            <Switch
              checked={settings.defaultEditMode ?? false}
              onCheckedChange={(checked) =>
                updateSettings({ defaultEditMode: checked })
              }
            />
          </div>

          {/* Keyboard shortcuts */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Raccourcis clavier</Label>
              <p className="text-sm text-muted-foreground">
                Ctrl+S pour sauvegarder, Esc pour annuler
              </p>
            </div>
            <Switch
              checked={settings.enableKeyboardShortcuts ?? true}
              onCheckedChange={(checked) =>
                updateSettings({ enableKeyboardShortcuts: checked })
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

          {/* Sort by */}
          <div className="space-y-2">
            <Label>Tri des fichiers</Label>
            <Select
              value={settings.sidebarSortBy ?? "name"}
              onValueChange={(value) =>
                updateSettings({ sidebarSortBy: value as SidebarSortBy })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Alphabétique (A-Z)</SelectItem>
                <SelectItem value="type">Par type (md, canvas, images...)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Les dossiers sont toujours affichés en premier
            </p>
          </div>

          {/* Show file icons */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Icônes colorées par type</Label>
              <p className="text-sm text-muted-foreground">
                Icônes différenciées pour md, canvas, images, pdf
              </p>
            </div>
            <Switch
              checked={settings.showFileIcons ?? true}
              onCheckedChange={(checked) =>
                updateSettings({ showFileIcons: checked })
              }
            />
          </div>

          {/* Hide patterns */}
          <div className="space-y-2">
            <Label>Fichiers masqués</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Patterns de fichiers à masquer (supporte *.ext)
            </p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {(settings.hidePatterns ?? []).map((pattern) => (
                <Badge
                  key={pattern}
                  variant="secondary"
                  className="gap-1 cursor-pointer hover:bg-destructive/20"
                  onClick={() =>
                    updateSettings({
                      hidePatterns: settings.hidePatterns.filter((p) => p !== pattern),
                    })
                  }
                >
                  {pattern}
                  <X className="h-3 w-3" />
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Ex: .gitkeep, *.log, _temp"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const value = e.currentTarget.value.trim();
                    if (value && !settings.hidePatterns?.includes(value)) {
                      updateSettings({
                        hidePatterns: [...(settings.hidePatterns ?? []), value],
                      });
                      e.currentTarget.value = "";
                    }
                  }
                }}
                className="flex-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Appuie sur Entrée pour ajouter, clique sur un badge pour supprimer
            </p>
          </div>

          {/* Custom folder order */}
          <div className="space-y-2">
            <Label>Ordre des dossiers racine</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Définir un ordre personnalisé pour les dossiers principaux
            </p>
            {(settings.customFolderOrder ?? []).length > 0 && (
              <div className="space-y-1 mb-2">
                {settings.customFolderOrder.map((folder, index) => (
                  <div
                    key={folder}
                    className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-border"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 text-sm font-medium">{folder}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={index === 0}
                      onClick={() => {
                        const order = [...settings.customFolderOrder];
                        [order[index - 1], order[index]] = [order[index], order[index - 1]];
                        updateSettings({ customFolderOrder: order });
                      }}
                    >
                      <ChevronUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={index === settings.customFolderOrder.length - 1}
                      onClick={() => {
                        const order = [...settings.customFolderOrder];
                        [order[index], order[index + 1]] = [order[index + 1], order[index]];
                        updateSettings({ customFolderOrder: order });
                      }}
                    >
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:text-destructive"
                      onClick={() => {
                        updateSettings({
                          customFolderOrder: settings.customFolderOrder.filter((f) => f !== folder),
                        });
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {/* Add folders not in custom order */}
            {topLevelFolders.filter((f) => !(settings.customFolderOrder ?? []).includes(f)).length > 0 && (
              <div className="flex flex-wrap gap-1">
                {topLevelFolders
                  .filter((f) => !(settings.customFolderOrder ?? []).includes(f))
                  .map((folder) => (
                    <Button
                      key={folder}
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => {
                        updateSettings({
                          customFolderOrder: [...(settings.customFolderOrder ?? []), folder],
                        });
                      }}
                    >
                      <Plus className="h-3 w-3" />
                      {folder}
                    </Button>
                  ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Clique sur un dossier pour l'ajouter à l'ordre. Dossiers non listés apparaissent après (alphabétiquement).
            </p>
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

      {/* General Settings */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            Général
          </CardTitle>
          <CardDescription>Paramètres généraux de l'application</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Show date/time in header */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Afficher date et heure</Label>
              <p className="text-sm text-muted-foreground">
                Date et heure dans le header
              </p>
            </div>
            <Switch
              checked={settings.showDateTime ?? false}
              onCheckedChange={(checked) =>
                updateSettings({ showDateTime: checked })
              }
            />
          </div>

          {/* Date format */}
          <div className="space-y-2">
            <Label>Format de date</Label>
            <Select
              value={settings.dateFormat ?? "fr"}
              onValueChange={(value) =>
                updateSettings({ dateFormat: value as DateFormat })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fr">Français (sam. 30 nov.)</SelectItem>
                <SelectItem value="en">English (Sat, Nov 30)</SelectItem>
                <SelectItem value="iso">ISO (2025-11-30)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Auto-save delay */}
          <div className="space-y-2">
            <Label>Sauvegarde automatique</Label>
            <Select
              value={String(settings.autoSaveDelay ?? 0)}
              onValueChange={(value) =>
                updateSettings({ autoSaveDelay: Number(value) })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Désactivée</SelectItem>
                <SelectItem value="5">5 secondes</SelectItem>
                <SelectItem value="10">10 secondes</SelectItem>
                <SelectItem value="30">30 secondes</SelectItem>
                <SelectItem value="60">1 minute</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Délai après la dernière frappe avant sauvegarde auto
            </p>
          </div>

          {/* Daily Notes Folder */}
          <div className="space-y-2">
            <Label>Dossier des Daily Notes</Label>
            <Input
              value={settings.dailyNotesFolder ?? "Daily"}
              onChange={(e) =>
                updateSettings({ dailyNotesFolder: e.target.value })
              }
              placeholder="Daily"
            />
            <p className="text-sm text-muted-foreground">
              Chemin du dossier où créer les notes quotidiennes (ex: Daily, Journal/Daily)
            </p>
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

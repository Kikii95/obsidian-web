"use client";

import { useState, useEffect, useMemo } from "react";
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
  FolderRoot,
  RotateCcw,
  Type,
  X,
  Settings2,
  Save,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { useTheme } from "@/hooks/use-theme";
import { ThemeLogo } from "@/components/theme/theme-switcher";
import { getCacheStats, clearNotesCache } from "@/lib/note-cache";
import { useSettingsStore, type UserSettings, type ActivityPeriod, type DashboardLayout, type SidebarSortBy, type DateFormat } from "@/lib/settings-store";
import { useVaultStore } from "@/lib/store";
import { useLockStore } from "@/lib/lock-store";
import { PinDialog } from "@/components/lock/pin-dialog";
import type { VaultFile } from "@/types";

// Security settings keys that require PIN verification to change
const SECURITY_SETTINGS_KEYS: (keyof UserSettings)[] = [
  "lockTimeout",
  "requirePinOnDelete",
  "requirePinOnPrivateFolder",
];

// Get top-level folder names from tree (respecting vaultRootPath)
function getTopLevelFolders(files: VaultFile[], vaultRootPath: string = ""): string[] {
  // If vaultRootPath is set, find that subfolder first
  let targetFiles = files;

  if (vaultRootPath) {
    const pathParts = vaultRootPath.split("/").filter(Boolean);
    for (const part of pathParts) {
      const folder = targetFiles.find((f) => f.type === "dir" && f.name === part);
      if (folder?.children) {
        targetFiles = folder.children;
      } else {
        // Path not found, return empty
        return [];
      }
    }
  }

  return targetFiles
    .filter((f) => f.type === "dir")
    .map((f) => f.name)
    .sort();
}


// Deep compare two objects (for detecting changes)
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object" || a === null || b === null) return false;

  const keysA = Object.keys(a as Record<string, unknown>);
  const keysB = Object.keys(b as Record<string, unknown>);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) {
      return false;
    }
  }
  return true;
}

export default function SettingsPage() {
  const { theme, setTheme, mode, themesForCurrentMode } = useTheme();
  const { settings, updateSettings, resetSettings } = useSettingsStore();
  const { tree } = useVaultStore();
  const { hasPinConfigured, isUnlocked } = useLockStore();

  const [cacheStats, setCacheStats] = useState<{
    count: number;
    oldestDate: Date | null;
  }>({
    count: 0,
    oldestDate: null,
  });
  const [isClearing, setIsClearing] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [showChangePinDialog, setShowChangePinDialog] = useState(false);

  // Local draft state (all settings)
  const [draft, setDraft] = useState<UserSettings>(() => ({ ...settings }));

  // Sync draft when settings change externally (e.g., from another tab)
  useEffect(() => {
    setDraft({ ...settings });
  }, [settings]);

  // Check if there are unsaved changes
  const hasChanges = useMemo(() => {
    return !deepEqual(draft, settings);
  }, [draft, settings]);

  // Check if security settings have changed
  const hasSecurityChanges = useMemo(() => {
    return SECURITY_SETTINGS_KEYS.some(
      (key) => draft[key] !== settings[key]
    );
  }, [draft, settings]);

  // Update a single setting in draft
  const updateDraft = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  // Save all changes to store (with optional PIN verification for security settings)
  const handleSave = () => {
    // If security settings changed and PIN is configured but not unlocked, require PIN
    if (hasSecurityChanges && hasPinConfigured && !isUnlocked) {
      setShowPinDialog(true);
      return;
    }
    // No PIN needed or already unlocked, save directly
    updateSettings(draft);
  };

  // Called after successful PIN verification
  const handlePinSuccess = () => {
    setShowPinDialog(false);
    updateSettings(draft);
  };

  // Discard changes (revert to saved settings)
  const handleDiscard = () => {
    setDraft({ ...settings });
  };

  // Reset to defaults
  const handleReset = () => {
    resetSettings();
  };

  // Get top-level folders only (cleaner UI) - respecting vaultRootPath
  const topLevelFolders = useMemo(
    () => getTopLevelFolders(tree, draft.vaultRootPath),
    [tree, draft.vaultRootPath]
  );

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
    const current = draft.defaultExpandedFolders;
    if (current.includes(folder)) {
      updateDraft("defaultExpandedFolders", current.filter((f) => f !== folder));
    } else {
      updateDraft("defaultExpandedFolders", [...current, folder]);
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
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Paramètres</h1>
          {hasChanges && (
            <Badge variant="outline" className="gap-1 text-amber-500 border-amber-500">
              <AlertCircle className="h-3 w-3" />
              Non sauvegardé
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <>
              <Button variant="ghost" size="sm" onClick={handleDiscard}>
                Annuler
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Sauvegarder
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Défaut
          </Button>
        </div>
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
                value={[draft.recentNotesCount]}
                onValueChange={([value]) => updateDraft("recentNotesCount", value)}
                min={3}
                max={15}
                step={1}
                className="flex-1"
              />
              <span className="w-8 text-center font-mono">
                {draft.recentNotesCount}
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
              checked={draft.showMiniGraph}
              onCheckedChange={(checked) => updateDraft("showMiniGraph", checked)}
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
              checked={draft.showActivityHeatmap ?? true}
              onCheckedChange={(checked) => updateDraft("showActivityHeatmap", checked)}
            />
          </div>

          {/* Activity heatmap default period */}
          <div className="space-y-2">
            <Label>Période activité par défaut</Label>
            <Select
              value={draft.activityDefaultPeriod ?? "90"}
              onValueChange={(value) => updateDraft("activityDefaultPeriod", value as ActivityPeriod)}
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
              value={draft.dashboardLayout ?? "spacious"}
              onValueChange={(value) => updateDraft("dashboardLayout", value as DashboardLayout)}
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
                value={[draft.editorFontSize ?? 16]}
                onValueChange={([value]) => updateDraft("editorFontSize", value)}
                min={12}
                max={24}
                step={1}
                className="flex-1"
              />
              <span className="w-12 text-center font-mono text-sm">
                {draft.editorFontSize ?? 16}px
              </span>
            </div>
          </div>

          {/* Line height */}
          <div className="space-y-2">
            <Label>Interligne</Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[(draft.editorLineHeight ?? 1.6) * 10]}
                onValueChange={([value]) => updateDraft("editorLineHeight", value / 10)}
                min={12}
                max={24}
                step={1}
                className="flex-1"
              />
              <span className="w-12 text-center font-mono text-sm">
                {(draft.editorLineHeight ?? 1.6).toFixed(1)}
              </span>
            </div>
          </div>

          {/* Max content width */}
          <div className="space-y-2">
            <Label>Largeur max du contenu</Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[draft.editorMaxWidth ?? 800]}
                onValueChange={([value]) => updateDraft("editorMaxWidth", value)}
                min={500}
                max={1400}
                step={50}
                className="flex-1"
              />
              <span className="w-16 text-center font-mono text-sm">
                {draft.editorMaxWidth ?? 800}px
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
              checked={draft.showFrontmatter ?? true}
              onCheckedChange={(checked) => updateDraft("showFrontmatter", checked)}
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
              checked={draft.enableKeyboardShortcuts ?? true}
              onCheckedChange={(checked) => updateDraft("enableKeyboardShortcuts", checked)}
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
          {/* Vault Root Path */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <FolderRoot className="h-4 w-4" />
              Dossier racine du vault
            </Label>
            <p className="text-sm text-muted-foreground mb-3">
              Si votre vault est dans un sous-dossier du repo (ex: <code>MonVault/</code>)
            </p>
            <Select
              value={draft.vaultRootPath || "__repo_root__"}
              onValueChange={(value) =>
                updateDraft("vaultRootPath", value === "__repo_root__" ? "" : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Racine du repo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__repo_root__">/ (Racine du repo)</SelectItem>
                {tree
                  .filter((f) => f.type === "dir")
                  .map((folder) => (
                    <SelectItem key={folder.name} value={folder.name}>
                      {folder.name}/
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Default expanded folders */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <FolderTree className="h-4 w-4" />
              Dossiers dépliés par défaut
            </Label>
            <p className="text-sm text-muted-foreground mb-3">
              Dossiers à ouvrir automatiquement au chargement
              {draft.vaultRootPath && (
                <span className="text-primary"> (relatifs à {draft.vaultRootPath}/)</span>
              )}
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
                      ${draft.defaultExpandedFolders.includes(folder)
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                      }
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={draft.defaultExpandedFolders.includes(folder)}
                      onChange={() => handleDefaultFolderChange(folder)}
                      className="accent-primary"
                    />
                    <span className="text-sm truncate">{folder}</span>
                  </label>
                ))}
              </div>
            )}
            {draft.defaultExpandedFolders.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                {draft.defaultExpandedFolders.length} dossier(s) sélectionné(s)
              </p>
            )}
          </div>

          {/* Sort by */}
          <div className="space-y-2">
            <Label>Tri des fichiers</Label>
            <Select
              value={draft.sidebarSortBy ?? "name"}
              onValueChange={(value) => updateDraft("sidebarSortBy", value as SidebarSortBy)}
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
              checked={draft.showFileIcons ?? true}
              onCheckedChange={(checked) => updateDraft("showFileIcons", checked)}
            />
          </div>

          {/* Hide patterns */}
          <div className="space-y-2">
            <Label>Fichiers masqués</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Patterns de fichiers à masquer (supporte *.ext)
            </p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {(draft.hidePatterns ?? []).map((pattern) => (
                <Badge
                  key={pattern}
                  variant="secondary"
                  className="gap-1 cursor-pointer hover:bg-destructive/20"
                  onClick={() => updateDraft("hidePatterns", draft.hidePatterns.filter((p) => p !== pattern))}
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
                    if (value && !draft.hidePatterns?.includes(value)) {
                      updateDraft("hidePatterns", [...(draft.hidePatterns ?? []), value]);
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

        </CardContent>
      </Card>

      {/* Lock Settings */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Sécurité & Verrouillage
          </CardTitle>
          <CardDescription>
            Paramètres des notes privées
            {hasPinConfigured && (
              <span className="block mt-1 text-amber-500 text-xs">
                🔐 Modifier ces paramètres nécessitera votre code PIN
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Lock timeout */}
          <div className="space-y-2">
            <Label>Verrouillage automatique</Label>
            <Select
              value={String(draft.lockTimeout)}
              onValueChange={(value) => updateDraft("lockTimeout", Number(value))}
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
              checked={draft.requirePinOnDelete}
              onCheckedChange={(checked) => updateDraft("requirePinOnDelete", checked)}
            />
          </div>

          {/* Require PIN for private folders */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Cacher contenu _private</Label>
              <p className="text-sm text-muted-foreground">
                Masquer les enfants des dossiers _private jusqu&apos;au déverrouillage
              </p>
            </div>
            <Switch
              checked={draft.requirePinOnPrivateFolder}
              onCheckedChange={(checked) => updateDraft("requirePinOnPrivateFolder", checked)}
            />
          </div>

          {/* Change PIN button */}
          {hasPinConfigured && (
            <div className="pt-4 border-t">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowChangePinDialog(true)}
              >
                Modifier le code PIN
              </Button>
            </div>
          )}

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
              checked={draft.showOrphanNotes}
              onCheckedChange={(checked) => updateDraft("showOrphanNotes", checked)}
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
                value={[Math.abs(draft.graphForceStrength)]}
                onValueChange={([value]) => updateDraft("graphForceStrength", -value)}
                min={1}
                max={500}
                step={1}
                className="flex-1"
              />
              <span className="w-12 text-center font-mono text-sm">
                {Math.abs(draft.graphForceStrength)}
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
                value={[draft.graphLinkDistance]}
                onValueChange={([value]) => updateDraft("graphLinkDistance", value)}
                min={5}
                max={200}
                step={5}
                className="flex-1"
              />
              <span className="w-12 text-center font-mono text-sm">
                {draft.graphLinkDistance}px
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
                value={[(draft.graphGravityStrength ?? 0.05) * 100]}
                onValueChange={([value]) => updateDraft("graphGravityStrength", value / 100)}
                min={0}
                max={30}
                step={1}
                className="flex-1"
              />
              <span className="w-12 text-center font-mono text-sm">
                {(draft.graphGravityStrength ?? 0.05).toFixed(2)}
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
              checked={draft.showDateTime ?? false}
              onCheckedChange={(checked) => updateDraft("showDateTime", checked)}
            />
          </div>

          {/* Date format */}
          <div className="space-y-2">
            <Label>Format de date</Label>
            <Select
              value={draft.dateFormat ?? "fr"}
              onValueChange={(value) => updateDraft("dateFormat", value as DateFormat)}
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
              value={String(draft.autoSaveDelay ?? 0)}
              onValueChange={(value) => updateDraft("autoSaveDelay", Number(value))}
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
              value={draft.dailyNotesFolder ?? "Daily"}
              onChange={(e) => updateDraft("dailyNotesFolder", e.target.value)}
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
            <span className="ml-auto text-xs font-normal text-muted-foreground">
              {mode === "dark" ? "🌙 Mode sombre" : "☀️ Mode clair"}
            </span>
          </CardTitle>
          <CardDescription>Personnalise l'apparence (change le mode via le header)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {themesForCurrentMode.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`
                  flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all
                  hover:scale-105
                  ${
                    theme === t.id
                      ? "border-primary bg-primary/10"
                      : "border-transparent bg-muted/50 hover:border-muted-foreground/30"
                  }
                `}
              >
                <ThemeLogo themeOption={t} size="lg" />
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

      {/* PIN Dialog for security settings changes */}
      <PinDialog
        open={showPinDialog}
        onOpenChange={setShowPinDialog}
        onSuccess={handlePinSuccess}
        mode="verify"
      />

      {/* PIN Dialog for changing PIN */}
      <PinDialog
        open={showChangePinDialog}
        onOpenChange={setShowChangePinDialog}
        mode="change"
      />
    </div>
  );
}

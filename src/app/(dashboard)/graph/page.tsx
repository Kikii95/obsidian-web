"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { AlertCircle, RefreshCw, Network, ArrowLeft, Loader2, SlidersHorizontal, RotateCcw } from "lucide-react";
import Link from "next/link";
import { githubClient } from "@/services/github-client";
import { useSettingsStore } from "@/lib/settings-store";

// Lazy load ForceGraph component (D3.js is ~500kb)
const ForceGraph = dynamic(
  () => import("@/components/graph/force-graph").then((mod) => mod.ForceGraph),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Chargement du graphe...</p>
        </div>
      </div>
    ),
  }
);

interface GraphData {
  nodes: Array<{
    id: string;
    name: string;
    path: string;
    linkCount: number;
  }>;
  links: Array<{
    source: string;
    target: string;
  }>;
  totalNotes: number;
  connectedNotes: number;
}

export default function GraphPage() {
  const { settings, updateSettings } = useSettingsStore();
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);

  const fetchGraph = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await githubClient.getGraph(settings.showOrphanNotes);
      setGraphData(data as GraphData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setIsLoading(false);
    }
  }, [settings.showOrphanNotes]);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  if (isLoading) {
    return (
      <div className="flex flex-col h-[calc(100vh-3.5rem)]">
        <div className="p-4 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Network className="h-5 w-5 text-primary" />
            <span className="font-medium">Graph View</span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Skeleton className="h-8 w-48 mx-auto" />
            <Skeleton className="h-4 w-64 mx-auto" />
            <p className="text-sm text-muted-foreground animate-pulse">
              Analyse des liens en cours...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-[calc(100vh-3.5rem)]">
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Network className="h-5 w-5 text-primary" />
            <span className="font-medium">Graph View</span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold">Erreur</h2>
            <p className="text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={fetchGraph}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Réessayer
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!graphData || graphData.nodes.length === 0) {
    return (
      <div className="flex flex-col h-[calc(100vh-3.5rem)]">
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Network className="h-5 w-5 text-primary" />
            <span className="font-medium">Graph View</span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Network className="h-12 w-12 text-muted-foreground mx-auto" />
            <h2 className="text-xl font-semibold">Aucun lien trouvé</h2>
            <p className="text-muted-foreground">
              Ajoute des wikilinks [[note]] dans tes notes pour voir le graphe.
            </p>
            <Button variant="outline" asChild>
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour au vault
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Header */}
      <div className="p-4 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Vault
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Network className="h-5 w-5 text-primary" />
            <span className="font-medium">Graph View</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="hidden sm:inline">{graphData.connectedNotes} notes</span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline">{graphData.links.length} liens</span>

          {/* Settings Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" title="Réglages du graph">
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Réglages Graph</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => updateSettings({
                      graphForceStrength: -300,
                      graphLinkDistance: 80,
                      graphGravityStrength: 0.05,
                    })}
                    title="Réinitialiser"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                </div>

                {/* Orphan notes toggle */}
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Notes orphelines</Label>
                  <Switch
                    checked={settings.showOrphanNotes}
                    onCheckedChange={(checked) =>
                      updateSettings({ showOrphanNotes: checked })
                    }
                  />
                </div>

                {/* Force strength */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Répulsion</Label>
                    <span className="text-xs font-mono text-muted-foreground">
                      {Math.abs(settings.graphForceStrength)}
                    </span>
                  </div>
                  <Slider
                    value={[Math.abs(settings.graphForceStrength)]}
                    onValueChange={([value]) =>
                      updateSettings({ graphForceStrength: -value })
                    }
                    min={1}
                    max={500}
                    step={1}
                  />
                </div>

                {/* Link distance */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Distance liens</Label>
                    <span className="text-xs font-mono text-muted-foreground">
                      {settings.graphLinkDistance}px
                    </span>
                  </div>
                  <Slider
                    value={[settings.graphLinkDistance]}
                    onValueChange={([value]) =>
                      updateSettings({ graphLinkDistance: value })
                    }
                    min={5}
                    max={200}
                    step={5}
                  />
                </div>

                {/* Gravity */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Gravité</Label>
                    <span className="text-xs font-mono text-muted-foreground">
                      {settings.graphGravityStrength.toFixed(2)}
                    </span>
                  </div>
                  <Slider
                    value={[settings.graphGravityStrength * 100]}
                    onValueChange={([value]) =>
                      updateSettings({ graphGravityStrength: value / 100 })
                    }
                    min={0}
                    max={30}
                    step={1}
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Button variant="ghost" size="sm" onClick={fetchGraph} title="Rafraîchir">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Graph */}
      <div className="flex-1 overflow-hidden">
        <ForceGraph
          nodes={graphData.nodes}
          links={graphData.links}
          forceStrength={settings.graphForceStrength}
          linkDistance={settings.graphLinkDistance}
          gravityStrength={settings.graphGravityStrength}
        />
      </div>

      {/* Legend */}
      <div className="p-3 border-t border-border/50 bg-muted/20 text-xs text-muted-foreground flex items-center justify-center gap-6">
        <span>🖱️ Drag pour déplacer</span>
        <span>🔍 Scroll pour zoomer</span>
        <span>👆 Click pour ouvrir</span>
      </div>
    </div>
  );
}

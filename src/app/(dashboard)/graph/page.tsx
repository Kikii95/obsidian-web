"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Loader2,
  Network,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { githubClient } from "@/services/github-client";
import { isMobileDevice, useSettingsStore } from "@/lib/settings-store";
import { LOW_END_CORES, type GraphViewMode } from "@/lib/graph/constants";
import type { GraphData } from "@/lib/graph/types";
import { GraphSettingsPopover } from "@/components/graph/graph-settings-popover";

const LoadingFallback = () => (
  <div className="flex flex-1 items-center justify-center">
    <div className="space-y-4 text-center">
      <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Chargement du graphe...</p>
    </div>
  </div>
);

const ForceGraph = dynamic(
  () => import("@/components/graph/force-graph").then((mod) => mod.ForceGraph),
  { ssr: false, loading: LoadingFallback }
);

const Graph3D = dynamic(
  () => import("@/components/graph/graph-3d/graph-3d").then((mod) => mod.Graph3D),
  { ssr: false, loading: LoadingFallback }
);

const MODES: GraphViewMode[] = ["2d", "3d", "auto"];

function resolveRenderMode(mode: GraphViewMode, force2d: boolean): "2d" | "3d" {
  if (force2d || mode === "2d") return "2d";
  if (mode === "3d") return "3d";
  if (typeof navigator !== "undefined") {
    const cores = navigator.hardwareConcurrency ?? 8;
    if (isMobileDevice() || cores <= LOW_END_CORES) return "2d";
  }
  return "3d";
}

function GraphShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="flex items-center justify-between border-b border-border/50 p-4">
        <div className="flex items-center gap-2">
          <Network className="h-5 w-5 text-primary" />
          <span className="font-medium">Graph View</span>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center">{children}</div>
    </div>
  );
}

export default function GraphPage() {
  const { settings, updateSettings } = useSettingsStore();
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentZoom, setCurrentZoom] = useState(settings.graphDefaultZoom ?? 0.8);
  const [force2d, setForce2d] = useState(false);

  const fetchGraph = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await githubClient.getGraph(settings.showOrphanNotes, {
        clusterBy: settings.graph3dClusterBy,
        tagNodes: settings.graph3dShowTags,
        maxNodes: settings.graph3dNodeCap,
      });
      setGraphData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setIsLoading(false);
    }
  }, [
    settings.showOrphanNotes,
    settings.graph3dClusterBy,
    settings.graph3dShowTags,
    settings.graph3dNodeCap,
  ]);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  if (isLoading) {
    return (
      <GraphShell>
        <div className="space-y-4 text-center">
          <Skeleton className="mx-auto h-8 w-48" />
          <Skeleton className="mx-auto h-4 w-64" />
          <p className="animate-pulse text-sm text-muted-foreground">
            Analyse des liens en cours...
          </p>
        </div>
      </GraphShell>
    );
  }

  if (error) {
    return (
      <GraphShell>
        <div className="space-y-4 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
          <h2 className="text-xl font-semibold">Erreur</h2>
          <p className="text-muted-foreground">{error}</p>
          <Button variant="outline" onClick={fetchGraph}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Réessayer
          </Button>
        </div>
      </GraphShell>
    );
  }

  if (graphData?.needsIndex) {
    return (
      <GraphShell>
        <div className="max-w-md space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Network className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold">Indexation requise</h2>
          <p className="text-muted-foreground">
            Le graphe utilise un index PostgreSQL. Lance l&apos;indexation depuis les
            paramètres pour l&apos;activer.
          </p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" asChild>
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Vault
              </Link>
            </Button>
            <Button asChild>
              <Link href="/settings">Paramètres</Link>
            </Button>
          </div>
        </div>
      </GraphShell>
    );
  }

  if (!graphData || graphData.nodes.length === 0) {
    return (
      <GraphShell>
        <div className="space-y-4 text-center">
          <Network className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Aucun lien trouvé</h2>
          <p className="text-muted-foreground">
            Ajoute des wikilinks [[note]] dans tes notes pour voir le graphe.
          </p>
          <Button variant="outline" asChild>
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour au vault
            </Link>
          </Button>
        </div>
      </GraphShell>
    );
  }

  const renderMode = resolveRenderMode(settings.graphViewMode, force2d);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="flex items-center justify-between border-b border-border/50 p-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Vault
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Network className="h-5 w-5 text-primary" />
            <span className="font-medium">Graph View</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="hidden md:inline">
            {graphData.connectedNotes} / {graphData.totalNotes} notes
          </span>
          <div className="flex rounded-md border border-border p-0.5">
            {MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  updateSettings({ graphViewMode: mode });
                  setForce2d(false);
                }}
                className={cn(
                  "rounded px-2 py-1 text-xs font-medium uppercase transition-colors",
                  settings.graphViewMode === mode
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {mode}
              </button>
            ))}
          </div>
          <GraphSettingsPopover
            is3d={renderMode === "3d"}
            currentZoom={currentZoom}
            onSaveZoom={() => updateSettings({ graphDefaultZoom: currentZoom })}
          />
          <Button variant="ghost" size="sm" onClick={fetchGraph} title="Rafraîchir">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {renderMode === "3d" ? (
          <Graph3D
            data={graphData}
            reducedEffects={isMobileDevice()}
            onFallback={() => setForce2d(true)}
          />
        ) : (
          <ForceGraph
            nodes={graphData.nodes}
            links={graphData.links}
            forceStrength={settings.graphForceStrength}
            linkDistance={settings.graphLinkDistance}
            gravityStrength={settings.graphGravityStrength ?? 0.05}
            initialZoom={settings.graphDefaultZoom ?? 0.8}
            onZoomChange={setCurrentZoom}
          />
        )}
      </div>
    </div>
  );
}

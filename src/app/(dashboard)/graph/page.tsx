"use client";

import { useEffect, useState } from "react";
import { ForceGraph } from "@/components/graph/force-graph";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, RefreshCw, Network, ArrowLeft } from "lucide-react";
import Link from "next/link";

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
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGraph = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/github/graph");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors du chargement");
      }

      setGraphData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGraph();
  }, []);

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
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{graphData.connectedNotes} notes connectées</span>
          <span>•</span>
          <span>{graphData.links.length} liens</span>
          <Button variant="ghost" size="sm" onClick={fetchGraph}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Graph */}
      <div className="flex-1 overflow-hidden">
        <ForceGraph nodes={graphData.nodes} links={graphData.links} />
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

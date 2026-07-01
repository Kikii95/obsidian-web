"use client";

import { Camera, Clapperboard, Flame, History, Orbit, RotateCcw, Route, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FOCUS_DEPTH_MAX, SCREENSHOT_FILENAME } from "@/lib/graph/constants";
import type { TimeExtent } from "@/lib/graph/temporal";
import { useSettingsStore } from "@/lib/settings-store";
import type { ClusterBy } from "@/lib/graph/types";
import { useGraphViewStore } from "./graph-view-store";

interface GraphControlsProps {
  timeExtent: TimeExtent;
}

const CLUSTER_CYCLE: ClusterBy[] = ["folder", "tag", "community", "none"];
const CLUSTER_LABELS: Record<ClusterBy, string> = {
  folder: "dossier",
  tag: "tag",
  community: "groupes",
  none: "aucune",
};

/** Bottom-left toggle row: camera, colouring, navigation, effects, export. */
export function GraphControls({ timeExtent }: GraphControlsProps) {
  const { settings, updateSettings } = useSettingsStore();
  const clearFocus = useGraphViewStore((state) => state.clearFocus);
  const capture = useGraphViewStore((state) => state.capture);
  const pathMode = useGraphViewStore((state) => state.pathMode);
  const togglePathMode = useGraphViewStore((state) => state.togglePathMode);
  const focusDepth = settings.graph3dFocusDepth;
  const hasDates = timeExtent.dated >= 2;

  const cycleCluster = () => {
    const next = CLUSTER_CYCLE[(CLUSTER_CYCLE.indexOf(settings.graph3dClusterBy) + 1) % CLUSTER_CYCLE.length];
    updateSettings({ graph3dClusterBy: next });
  };

  const downloadScreenshot = () => {
    const url = capture?.();
    if (!url) return;
    const link = document.createElement("a");
    link.href = url;
    link.download = SCREENSHOT_FILENAME;
    link.click();
  };

  return (
    <div className="pointer-events-auto absolute bottom-4 left-4 z-10 flex flex-wrap items-center gap-1.5">
      <Button
        size="sm"
        variant={settings.graph3dAutoOrbit ? "default" : "secondary"}
        onClick={() => updateSettings({ graph3dAutoOrbit: !settings.graph3dAutoOrbit })}
      >
        <Orbit className="mr-1 h-3.5 w-3.5" />
        Orbite
      </Button>
      <Button
        size="sm"
        variant={settings.graph3dCinematic ? "default" : "secondary"}
        onClick={() => updateSettings({ graph3dCinematic: !settings.graph3dCinematic })}
        title="Visite guidée automatique des plus gros pôles quand tu ne touches à rien"
      >
        <Clapperboard className="mr-1 h-3.5 w-3.5" />
        Cinéma
      </Button>
      <Button size="sm" variant="secondary" onClick={cycleCluster}>
        Couleur : {CLUSTER_LABELS[settings.graph3dClusterBy]}
      </Button>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => updateSettings({ graph3dFocusDepth: (focusDepth % FOCUS_DEPTH_MAX) + 1 })}
        title="Au clic sur une note, éclaire ses voisins jusqu'à N liens de distance (1 = liens directs, 2 = voisins des voisins…)"
      >
        Voisins : {focusDepth}
      </Button>
      <Button size="sm" variant={pathMode ? "default" : "secondary"} onClick={togglePathMode}>
        <Route className="mr-1 h-3.5 w-3.5" />
        Chemin
      </Button>
      {hasDates && (
        <>
          <Button
            size="sm"
            variant={settings.graph3dHeat ? "default" : "secondary"}
            onClick={() => updateSettings({ graph3dHeat: !settings.graph3dHeat })}
            title="Colorer les notes par récence (récent = chaud)"
          >
            <Flame className="mr-1 h-3.5 w-3.5" />
            Chaleur
          </Button>
          <Button
            size="sm"
            variant={settings.graph3dTimeLapse ? "default" : "secondary"}
            onClick={() => updateSettings({ graph3dTimeLapse: !settings.graph3dTimeLapse })}
            title="Rejouer la croissance du vault dans le temps"
          >
            <History className="mr-1 h-3.5 w-3.5" />
            Temps
          </Button>
        </>
      )}
      <Button
        size="sm"
        variant={settings.graph3dReducedEffects ? "secondary" : "default"}
        onClick={() => updateSettings({ graph3dReducedEffects: !settings.graph3dReducedEffects })}
      >
        <Sparkles className="mr-1 h-3.5 w-3.5" />
        Néon
      </Button>
      <Button size="sm" variant="secondary" onClick={downloadScreenshot}>
        <Camera className="mr-1 h-3.5 w-3.5" />
        Capture
      </Button>
      <Button size="sm" variant="secondary" onClick={clearFocus}>
        <RotateCcw className="mr-1 h-3.5 w-3.5" />
        Reset
      </Button>
    </div>
  );
}

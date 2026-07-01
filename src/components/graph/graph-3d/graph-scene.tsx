"use client";

import { type MutableRefObject, useMemo } from "react";
import { CameraRig } from "./camera-rig";
import { EdgeLines } from "./edge-lines";
import { GraphLabels } from "./graph-labels";
import { GraphPostprocessing } from "./graph-postprocessing";
import { NodeInstances } from "./node-instances";
import { Starfield } from "./starfield";
import { useGraphViewStore } from "./graph-view-store";
import type { GraphLink, GraphNode } from "@/lib/graph/types";
import type { LabelDensity } from "@/lib/graph/constants";
import type { GraphPalette } from "@/hooks/use-theme-colors";

interface GraphSceneProps {
  nodes: GraphNode[];
  links: GraphLink[];
  indexOf: Map<string, number>;
  sizes: Float32Array;
  positions: MutableRefObject<Float32Array | null>;
  palette: GraphPalette;
  labelDensity: LabelDensity;
  autoOrbit: boolean;
  bloom: boolean;
  bloomIntensity: number;
}

function neighborsOf(id: string, links: GraphLink[]): Set<string> {
  const set = new Set<string>([id]);
  for (const link of links) {
    if (link.source === id) set.add(link.target);
    else if (link.target === id) set.add(link.source);
  }
  return set;
}

export function GraphScene({
  nodes,
  links,
  indexOf,
  sizes,
  positions,
  palette,
  labelDensity,
  autoOrbit,
  bloom,
  bloomIntensity,
}: GraphSceneProps) {
  const setHovered = useGraphViewStore((state) => state.setHovered);
  const select = useGraphViewStore((state) => state.select);
  const focusId = useGraphViewStore((state) => state.focusId);
  const neighborIds = useGraphViewStore((state) => state.neighborIds);

  const fogArgs = useMemo(
    () => [palette.background, 220, 900] as [string, number, number],
    [palette.background]
  );

  const handleSelect = (node: GraphNode) => select(node, neighborsOf(node.id, links));

  return (
    <>
      <color attach="background" args={[palette.background]} />
      <fog attach="fog" args={fogArgs} />
      <Starfield mode={palette.mode} />
      <NodeInstances
        nodes={nodes}
        positions={positions}
        sizes={sizes}
        palette={palette}
        focusId={focusId}
        neighborIds={neighborIds}
        onHover={setHovered}
        onSelect={handleSelect}
      />
      <EdgeLines links={links} indexOf={indexOf} positions={positions} palette={palette} />
      <GraphLabels
        nodes={nodes}
        sizes={sizes}
        positions={positions}
        density={labelDensity}
        color={palette.foreground}
      />
      <CameraRig autoOrbit={autoOrbit} />
      <GraphPostprocessing enabled={bloom} intensity={bloomIntensity} />
    </>
  );
}

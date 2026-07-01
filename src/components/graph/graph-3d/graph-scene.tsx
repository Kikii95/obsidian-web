"use client";

import { type MutableRefObject, useMemo } from "react";
import { GizmoHelper, GizmoViewport } from "@react-three/drei";
import { CameraRig } from "./camera-rig";
import { EdgeLines } from "./edge-lines";
import { GraphLabels } from "./graph-labels";
import { GraphPostprocessing } from "./graph-postprocessing";
import { NodeInstances } from "./node-instances";
import { SceneCapture } from "./scene-capture";
import { Starfield } from "./starfield";
import { useGraphViewStore } from "./graph-view-store";
import { GIZMO_MARGIN } from "@/lib/graph/constants";
import { neighborsOf } from "@/lib/graph/graph-model";
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
  edgeFlow: boolean;
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
  edgeFlow,
}: GraphSceneProps) {
  const setHovered = useGraphViewStore((state) => state.setHovered);
  const select = useGraphViewStore((state) => state.select);
  const focusId = useGraphViewStore((state) => state.focusId);
  const neighborIds = useGraphViewStore((state) => state.neighborIds);

  const fogArgs = useMemo(
    () => [palette.background, 220, 900] as [string, number, number],
    [palette.background]
  );

  const axisColors = useMemo<[string, string, string]>(
    () => [
      palette.clusters[0] ?? palette.primary,
      palette.clusters[1] ?? palette.accent,
      palette.clusters[2] ?? palette.foreground,
    ],
    [palette]
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
      <EdgeLines
        links={links}
        indexOf={indexOf}
        positions={positions}
        palette={palette}
        flow={edgeFlow}
      />
      <GraphLabels
        nodes={nodes}
        sizes={sizes}
        positions={positions}
        density={labelDensity}
        color={palette.foreground}
      />
      <CameraRig
        autoOrbit={autoOrbit}
        focusId={focusId}
        indexOf={indexOf}
        positions={positions}
      />
      <GizmoHelper alignment="bottom-right" margin={GIZMO_MARGIN}>
        <GizmoViewport axisColors={axisColors} labelColor={palette.background} />
      </GizmoHelper>
      <SceneCapture />
      <GraphPostprocessing enabled={bloom} intensity={bloomIntensity} />
    </>
  );
}

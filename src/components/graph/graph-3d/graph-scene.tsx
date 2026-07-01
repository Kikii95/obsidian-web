"use client";

import { type MutableRefObject, useMemo } from "react";
import { GizmoHelper, GizmoViewport } from "@react-three/drei";
import { CameraRig } from "./camera-rig";
import { EdgeLines } from "./edge-lines";
import { GraphLabels } from "./graph-labels";
import { GraphPostprocessing } from "./graph-postprocessing";
import { NodeInstances, type NodeDisplay } from "./node-instances";
import { SceneCapture } from "./scene-capture";
import { Starfield } from "./starfield";
import { useGraphViewStore } from "./graph-view-store";
import { GIZMO_MARGIN } from "@/lib/graph/constants";
import type { TimeExtent } from "@/lib/graph/temporal";
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
  heat: boolean;
  timeExtent: TimeExtent;
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
  heat,
  timeExtent,
}: GraphSceneProps) {
  const setHovered = useGraphViewStore((state) => state.setHovered);
  const pick = useGraphViewStore((state) => state.pick);
  const focusId = useGraphViewStore((state) => state.focusId);
  const neighborIds = useGraphViewStore((state) => state.neighborIds);
  const clusterFilter = useGraphViewStore((state) => state.clusterFilter);
  const pathIds = useGraphViewStore((state) => state.pathIds);
  const timeCursor = useGraphViewStore((state) => state.timeCursor);

  const hidden = useMemo(() => {
    if (timeCursor === null) return null;
    const gate = new Uint8Array(nodes.length);
    for (let i = 0; i < nodes.length; i += 1) {
      const date = nodes[i].date;
      gate[i] = date !== undefined && date > timeCursor ? 1 : 0;
    }
    return gate;
  }, [nodes, timeCursor]);

  const display = useMemo<NodeDisplay>(
    () => ({ focusId, neighborIds, clusterFilter, pathIds, hidden, heat, extent: timeExtent }),
    [focusId, neighborIds, clusterFilter, pathIds, hidden, heat, timeExtent]
  );

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

  const handleSelect = (node: GraphNode) => pick(node, links);

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
        display={display}
        onHover={setHovered}
        onSelect={handleSelect}
      />
      <EdgeLines
        links={links}
        indexOf={indexOf}
        positions={positions}
        palette={palette}
        flow={edgeFlow}
        hidden={hidden}
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

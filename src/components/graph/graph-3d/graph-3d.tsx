"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Canvas } from "@react-three/fiber";
import { GraphScene } from "./graph-scene";
import { GraphHud } from "./graph-hud";
import { NodeInfoCard } from "./node-info-card";
import { useGraphWorker } from "@/hooks/use-graph-worker";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { buildIndexMap, buildSizes } from "@/lib/graph/graph-model";
import {
  CAMERA_FOV,
  CAMERA_MAX_DISTANCE,
  DPR_MAX,
  DPR_MIN,
} from "@/lib/graph/constants";
import { encodePathSegments } from "@/lib/path-utils";
import { useSettingsStore } from "@/lib/settings-store";
import type { GraphData, GraphNode } from "@/lib/graph/types";

interface Graph3DProps {
  data: GraphData;
  reducedEffects: boolean;
  onFallback?: () => void;
}

export function Graph3D({ data, reducedEffects, onFallback }: Graph3DProps) {
  const router = useRouter();
  const { settings } = useSettingsStore();
  const palette = useThemeColors();

  const forces = useMemo(
    () => ({
      forceStrength: settings.graphForceStrength,
      linkDistance: settings.graphLinkDistance,
      gravityStrength: settings.graphGravityStrength,
    }),
    [settings.graphForceStrength, settings.graphLinkDistance, settings.graphGravityStrength]
  );

  const indexOf = useMemo(() => buildIndexMap(data.nodes), [data.nodes]);
  const sizes = useMemo(
    () => buildSizes(data.nodes, settings.graph3dNodeSize),
    [data.nodes, settings.graph3dNodeSize]
  );

  const { positions, failed } = useGraphWorker(data.nodes, data.links, forces);

  useEffect(() => {
    if (failed) onFallback?.();
  }, [failed, onFallback]);

  const openNote = (node: GraphNode) => {
    if (node.kind !== "note") return;
    router.push(`/note/${encodePathSegments(node.id)}`);
  };

  const premium = !reducedEffects && !settings.graph3dReducedEffects;
  const edgeFlow = premium && settings.graph3dEdgeFlow;

  return (
    <div className="relative h-full w-full" style={{ touchAction: "none" }}>
      <Canvas
        dpr={[DPR_MIN, DPR_MAX]}
        camera={{ position: [0, 0, 220], fov: CAMERA_FOV, near: 0.1, far: CAMERA_MAX_DISTANCE }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
          preserveDrawingBuffer: true,
        }}
      >
        <GraphScene
          nodes={data.nodes}
          links={data.links}
          indexOf={indexOf}
          sizes={sizes}
          positions={positions}
          palette={palette}
          labelDensity={settings.graph3dLabelDensity}
          autoOrbit={settings.graph3dAutoOrbit}
          bloom={premium}
          bloomIntensity={settings.graph3dBloomIntensity}
          edgeFlow={edgeFlow}
        />
      </Canvas>
      <GraphHud
        nodes={data.nodes}
        links={data.links}
        clusters={data.clusters}
        truncated={data.truncated}
      />
      <NodeInfoCard nodes={data.nodes} links={data.links} onOpen={openNote} />
    </div>
  );
}

export default Graph3D;

"use client";

import { type MutableRefObject, useEffect, useMemo, useRef } from "react";
import { type ThreeEvent, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { HEAT_COLD, HEAT_WARM } from "@/lib/graph/constants";
import { recency, type TimeExtent } from "@/lib/graph/temporal";
import type { GraphNode } from "@/lib/graph/types";
import type { GraphPalette } from "@/hooks/use-theme-colors";

/** Coarse view state shared by node rendering (focus, filters, time-lapse). */
export interface NodeDisplay {
  focusId: string | null;
  neighborIds: Set<string>;
  clusterFilter: number | null;
  pathIds: Set<string>;
  /** Time-lapse gate, by node index: 1 = not yet revealed (hidden). */
  hidden: Uint8Array | null;
  heat: boolean;
  extent: TimeExtent;
}

interface NodeInstancesProps {
  nodes: GraphNode[];
  positions: MutableRefObject<Float32Array | null>;
  sizes: Float32Array;
  palette: GraphPalette;
  display: NodeDisplay;
  onHover: (node: GraphNode | null) => void;
  onSelect: (node: GraphNode) => void;
}

const DIM_OPACITY = 0.12;

function isFaded(node: GraphNode, d: NodeDisplay): boolean {
  if (d.pathIds.size > 0) return !d.pathIds.has(node.id);
  if (d.clusterFilter !== null) return node.clusterIndex !== d.clusterFilter;
  if (d.focusId !== null) return node.id !== d.focusId && !d.neighborIds.has(node.id);
  return false;
}

function applyColor(
  target: THREE.Color,
  node: GraphNode,
  palette: GraphPalette,
  d: NodeDisplay,
  cold: THREE.Color,
  warm: THREE.Color
): void {
  if (d.heat) {
    if (node.date === undefined) target.set(palette.muted);
    else target.copy(cold).lerp(warm, recency(node.date, d.extent));
    return;
  }
  if (node.kind === "tag") target.set(palette.accent);
  else if (node.kind === "ghost" || node.isOrphan) target.set(palette.muted);
  else target.set(palette.clusters[node.clusterIndex % palette.clusters.length] ?? palette.primary);
}

export function NodeInstances({
  nodes,
  positions,
  sizes,
  palette,
  display,
  onHover,
  onSelect,
}: NodeInstancesProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);
  const cold = useMemo(() => new THREE.Color(HEAT_COLD), []);
  const warm = useMemo(() => new THREE.Color(HEAT_WARM), []);
  const count = nodes.length;
  const { hidden, heat, extent } = display;

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    for (let i = 0; i < count; i += 1) {
      applyColor(color, nodes[i], palette, display, cold, warm);
      mesh.setColorAt(i, color);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    // Re-tint on palette/heat/extent change; other display fields don't affect colour.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, palette, count, color, cold, warm, heat, extent]);

  useFrame(() => {
    const mesh = meshRef.current;
    const pos = positions.current;
    if (!mesh || !pos) return;
    for (let i = 0; i < count; i += 1) {
      if (hidden && hidden[i]) {
        dummy.scale.setScalar(0);
      } else {
        const faded = isFaded(nodes[i], display);
        dummy.scale.setScalar((sizes[i] || 1) * (faded ? DIM_OPACITY * 4 : 1));
      }
      dummy.position.set(pos[i * 3] || 0, pos[i * 3 + 1] || 0, pos[i * 3 + 2] || 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  const handleMove = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    if (event.instanceId != null) onHover(nodes[event.instanceId] ?? null);
  };

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (event.instanceId != null) {
      const node = nodes[event.instanceId];
      if (node) onSelect(node);
    }
  };

  return (
    <instancedMesh
      key={count}
      ref={meshRef}
      args={[undefined, undefined, count]}
      frustumCulled={false}
      onPointerMove={handleMove}
      onPointerOut={() => onHover(null)}
      onClick={handleClick}
    >
      <icosahedronGeometry args={[1, 2]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

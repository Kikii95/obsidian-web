"use client";

import { type MutableRefObject, useEffect, useMemo, useRef } from "react";
import { type ThreeEvent, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { GraphNode } from "@/lib/graph/types";
import type { GraphPalette } from "@/hooks/use-theme-colors";

interface NodeInstancesProps {
  nodes: GraphNode[];
  positions: MutableRefObject<Float32Array | null>;
  sizes: Float32Array;
  palette: GraphPalette;
  focusId: string | null;
  neighborIds: Set<string>;
  clusterFilter: number | null;
  pathIds: Set<string>;
  onHover: (node: GraphNode | null) => void;
  onSelect: (node: GraphNode) => void;
}

function isFaded(
  node: GraphNode,
  focusId: string | null,
  neighborIds: Set<string>,
  clusterFilter: number | null,
  pathIds: Set<string>
): boolean {
  if (pathIds.size > 0) return !pathIds.has(node.id);
  if (clusterFilter !== null) return node.clusterIndex !== clusterFilter;
  if (focusId !== null) return node.id !== focusId && !neighborIds.has(node.id);
  return false;
}

const DIM_OPACITY = 0.12;

function colorForNode(node: GraphNode, palette: GraphPalette): string {
  if (node.kind === "tag") return palette.accent;
  if (node.kind === "ghost" || node.isOrphan) return palette.muted;
  return palette.clusters[node.clusterIndex % palette.clusters.length] ?? palette.primary;
}

export function NodeInstances({
  nodes,
  positions,
  sizes,
  palette,
  focusId,
  neighborIds,
  clusterFilter,
  pathIds,
  onHover,
  onSelect,
}: NodeInstancesProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);
  const count = nodes.length;

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    for (let i = 0; i < count; i += 1) {
      color.set(colorForNode(nodes[i], palette));
      mesh.setColorAt(i, color);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [nodes, palette, count, color]);

  useFrame(() => {
    const mesh = meshRef.current;
    const pos = positions.current;
    if (!mesh || !pos) return;
    for (let i = 0; i < count; i += 1) {
      const node = nodes[i];
      const faded = isFaded(node, focusId, neighborIds, clusterFilter, pathIds);
      const scale = (sizes[i] || 1) * (faded ? DIM_OPACITY * 4 : 1);
      dummy.position.set(pos[i * 3] || 0, pos[i * 3 + 1] || 0, pos[i * 3 + 2] || 0);
      dummy.scale.setScalar(scale);
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

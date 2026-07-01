"use client";

import { type MutableRefObject, useMemo, useRef } from "react";
import { Billboard, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { GraphNode } from "@/lib/graph/types";
import type { LabelDensity } from "@/lib/graph/constants";

const DENSITY_TOP_K: Record<LabelDensity, number> = { low: 12, medium: 26, high: 48 };
const LABEL_CAMERA_CUTOFF = 300;
const LABEL_FONT_SIZE = 2.4;

interface LabelItemProps {
  index: number;
  offsetY: number;
  positions: MutableRefObject<Float32Array | null>;
  text: string;
  color: string;
}

function LabelItem({ index, offsetY, positions, text, color }: LabelItemProps) {
  const group = useRef<THREE.Group>(null);

  useFrame(({ camera }) => {
    const node = group.current;
    const pos = positions.current;
    if (!node || !pos) return;
    node.position.set(pos[index * 3] || 0, pos[index * 3 + 1] || 0, pos[index * 3 + 2] || 0);
    node.visible = camera.position.distanceTo(node.position) < LABEL_CAMERA_CUTOFF;
  });

  return (
    <group ref={group}>
      <Billboard position={[0, offsetY, 0]}>
        <Text
          fontSize={LABEL_FONT_SIZE}
          color={color}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.06}
          outlineColor="#000000"
          maxWidth={40}
        >
          {text}
        </Text>
      </Billboard>
    </group>
  );
}

interface GraphLabelsProps {
  nodes: GraphNode[];
  sizes: Float32Array;
  positions: MutableRefObject<Float32Array | null>;
  density: LabelDensity;
  color: string;
}

/** LOD labels: only the top-degree nodes, camera-distance culled per frame. */
export function GraphLabels({ nodes, sizes, positions, density, color }: GraphLabelsProps) {
  const top = useMemo(() => {
    const topK = DENSITY_TOP_K[density];
    return nodes
      .map((node, index) => ({ node, index }))
      .sort((a, b) => b.node.degree - a.node.degree)
      .slice(0, topK);
  }, [nodes, density]);

  return (
    <>
      {top.map(({ node, index }) => (
        <LabelItem
          key={node.id}
          index={index}
          offsetY={(sizes[index] || 1) + 1.4}
          positions={positions}
          text={node.name}
          color={color}
        />
      ))}
    </>
  );
}

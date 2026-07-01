"use client";

import { type MutableRefObject, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { GraphLink } from "@/lib/graph/types";
import type { GraphPalette } from "@/hooks/use-theme-colors";

interface EdgeLinesProps {
  links: GraphLink[];
  indexOf: Map<string, number>;
  positions: MutableRefObject<Float32Array | null>;
  palette: GraphPalette;
}

export function EdgeLines({ links, indexOf, positions, palette }: EdgeLinesProps) {
  const geometryRef = useRef<THREE.BufferGeometry>(null);

  const endpoints = useMemo(() => {
    const valid = links.filter(
      (link) => indexOf.has(link.source) && indexOf.has(link.target)
    );
    const array = new Uint32Array(valid.length * 2);
    valid.forEach((link, i) => {
      array[i * 2] = indexOf.get(link.source) ?? 0;
      array[i * 2 + 1] = indexOf.get(link.target) ?? 0;
    });
    return array;
  }, [links, indexOf]);

  const vertices = useMemo(
    () => new Float32Array(endpoints.length * 3),
    [endpoints]
  );

  useFrame(() => {
    const pos = positions.current;
    const geometry = geometryRef.current;
    if (!pos || !geometry) return;
    for (let i = 0; i < endpoints.length; i += 1) {
      const offset = endpoints[i] * 3;
      vertices[i * 3] = pos[offset] || 0;
      vertices[i * 3 + 1] = pos[offset + 1] || 0;
      vertices[i * 3 + 2] = pos[offset + 2] || 0;
    }
    const attribute = geometry.getAttribute("position");
    if (attribute) attribute.needsUpdate = true;
  });

  if (endpoints.length === 0) return null;

  return (
    <lineSegments frustumCulled={false}>
      <bufferGeometry ref={geometryRef}>
        <bufferAttribute attach="attributes-position" args={[vertices, 3]} />
      </bufferGeometry>
      <lineBasicMaterial
        color={palette.border}
        transparent
        opacity={0.28}
        toneMapped={false}
        depthWrite={false}
      />
    </lineSegments>
  );
}

"use client";

import { type MutableRefObject, useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { FLOW_DENSITY, FLOW_SPEED } from "@/lib/graph/constants";
import type { GraphLink } from "@/lib/graph/types";
import type { GraphPalette } from "@/hooks/use-theme-colors";

interface EdgeLinesProps {
  links: GraphLink[];
  indexOf: Map<string, number>;
  positions: MutableRefObject<Float32Array | null>;
  palette: GraphPalette;
  flow: boolean;
}

const EDGE_OPACITY = 0.26;

const VERTEX_SHADER = `
attribute float aProgress;
varying float vProgress;
void main() {
  vProgress = aProgress;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FRAGMENT_SHADER = `
uniform float uTime;
uniform float uSpeed;
uniform float uDensity;
uniform vec3 uBase;
uniform vec3 uFlow;
uniform float uOpacity;
varying float vProgress;
void main() {
  float pulse = fract(vProgress * uDensity - uTime * uSpeed);
  float glow = smoothstep(0.82, 1.0, pulse);
  vec3 color = mix(uBase, uFlow, glow);
  gl_FragColor = vec4(color, uOpacity + glow * 0.5);
}`;

export function EdgeLines({ links, indexOf, positions, palette, flow }: EdgeLinesProps) {
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

  const vertices = useMemo(() => new Float32Array(endpoints.length * 3), [endpoints]);
  const progress = useMemo(() => {
    const array = new Float32Array(endpoints.length);
    for (let i = 0; i < array.length; i += 1) array[i] = i % 2;
    return array;
  }, [endpoints]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSpeed: { value: FLOW_SPEED },
      uDensity: { value: FLOW_DENSITY },
      uBase: { value: new THREE.Color(palette.border) },
      uFlow: { value: new THREE.Color(palette.accent) },
      uOpacity: { value: EDGE_OPACITY },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    uniforms.uBase.value.set(palette.border);
    uniforms.uFlow.value.set(palette.accent);
    uniforms.uSpeed.value = flow ? FLOW_SPEED : 0;
  }, [palette, flow, uniforms]);

  useFrame((_, delta) => {
    uniforms.uTime.value += delta;
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
        <bufferAttribute attach="attributes-aProgress" args={[progress, 1]} />
      </bufferGeometry>
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={VERTEX_SHADER}
        fragmentShader={FRAGMENT_SHADER}
        transparent
        depthWrite={false}
      />
    </lineSegments>
  );
}

"use client";

import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";

interface GraphPostprocessingProps {
  enabled: boolean;
  intensity: number;
}

/**
 * Neon glow pass. Nodes use unlit toneMapped=false materials, so a luminance
 * bloom catches their bright cluster colours. Gated off on mobile/reduced.
 */
export function GraphPostprocessing({ enabled, intensity }: GraphPostprocessingProps) {
  if (!enabled) return null;
  return (
    <EffectComposer>
      <Bloom
        intensity={intensity}
        luminanceThreshold={0.2}
        luminanceSmoothing={0.9}
        mipmapBlur
      />
      <Vignette offset={0.15} darkness={0.55} eskil={false} />
    </EffectComposer>
  );
}

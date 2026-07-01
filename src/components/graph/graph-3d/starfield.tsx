"use client";

import { Stars } from "@react-three/drei";

interface StarfieldProps {
  mode: "dark" | "light";
}

/** Nebula/starfield backdrop. Dropped in light themes so it never looks like night. */
export function Starfield({ mode }: StarfieldProps) {
  if (mode === "light") return null;
  return (
    <Stars
      radius={320}
      depth={90}
      count={3200}
      factor={5}
      saturation={0}
      fade
      speed={0.4}
    />
  );
}

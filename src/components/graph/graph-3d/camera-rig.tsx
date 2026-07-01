"use client";

import { OrbitControls } from "@react-three/drei";
import { CAMERA_MAX_DISTANCE, CAMERA_MIN_DISTANCE } from "@/lib/graph/constants";

interface CameraRigProps {
  autoOrbit: boolean;
}

export function CameraRig({ autoOrbit }: CameraRigProps) {
  return (
    <OrbitControls
      makeDefault
      enableDamping
      dampingFactor={0.12}
      rotateSpeed={0.6}
      zoomSpeed={0.8}
      autoRotate={autoOrbit}
      autoRotateSpeed={0.4}
      minDistance={CAMERA_MIN_DISTANCE}
      maxDistance={CAMERA_MAX_DISTANCE}
    />
  );
}

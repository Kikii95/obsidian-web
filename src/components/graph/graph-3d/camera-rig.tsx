"use client";

import { type ComponentRef, type MutableRefObject, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import {
  CAMERA_MAX_DISTANCE,
  CAMERA_MIN_DISTANCE,
  FOCUS_ARRIVE_EPS,
  FOCUS_DISTANCE,
  FOCUS_LERP,
} from "@/lib/graph/constants";

interface CameraRigProps {
  autoOrbit: boolean;
  focusId: string | null;
  indexOf: Map<string, number>;
  positions: MutableRefObject<Float32Array | null>;
}

/**
 * OrbitControls plus a one-shot cinematic fly-to: when the focused node changes,
 * the camera eases toward it for a few frames, then hands control fully back to
 * the user (no permanent camera lock).
 */
export function CameraRig({ autoOrbit, focusId, indexOf, positions }: CameraRigProps) {
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null);
  const camera = useThree((state) => state.camera);
  const goal = useRef(new THREE.Vector3());
  const desired = useRef(new THREE.Vector3());
  const activeFocus = useRef<string | null>(null);
  const flying = useRef(false);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;
    if (focusId !== activeFocus.current) {
      activeFocus.current = focusId;
      flying.current = focusId !== null;
    }
    if (!flying.current || focusId === null) return;

    const index = indexOf.get(focusId);
    const pos = positions.current;
    if (index === undefined || !pos) return;

    goal.current.set(pos[index * 3], pos[index * 3 + 1], pos[index * 3 + 2]);
    const t = 1 - Math.pow(FOCUS_LERP, delta * 60);
    controls.target.lerp(goal.current, t);

    const offset = desired.current.copy(camera.position).sub(controls.target);
    if (offset.lengthSq() < 1e-6) offset.set(0, 0, FOCUS_DISTANCE);
    offset.setLength(FOCUS_DISTANCE).add(goal.current);
    camera.position.lerp(offset, t);
    controls.update();

    if (controls.target.distanceTo(goal.current) < FOCUS_ARRIVE_EPS) flying.current = false;
  });

  return (
    <OrbitControls
      ref={controlsRef}
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

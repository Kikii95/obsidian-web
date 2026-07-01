"use client";

import { type ComponentRef, type MutableRefObject, useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import {
  CAMERA_MAX_DISTANCE,
  CAMERA_MIN_DISTANCE,
  FOCUS_ARRIVE_EPS,
  FOCUS_DISTANCE,
  FOCUS_LERP,
  TOUR_DWELL_SECONDS,
  TOUR_IDLE_SECONDS,
  TOUR_LERP,
} from "@/lib/graph/constants";

type Controls = ComponentRef<typeof OrbitControls>;

interface CameraRigProps {
  autoOrbit: boolean;
  focusId: string | null;
  indexOf: Map<string, number>;
  positions: MutableRefObject<Float32Array | null>;
  cinematic: boolean;
  hubs: number[];
}

/** Ease the orbit target + camera toward a world point, keeping a fixed distance. */
function easeToward(
  controls: Controls,
  camera: THREE.Camera,
  goal: THREE.Vector3,
  offset: THREE.Vector3,
  t: number
): void {
  controls.target.lerp(goal, t);
  offset.copy(camera.position).sub(controls.target);
  if (offset.lengthSq() < 1e-6) offset.set(0, 0, FOCUS_DISTANCE);
  offset.setLength(FOCUS_DISTANCE).add(goal);
  camera.position.lerp(offset, t);
  controls.update();
}

/**
 * OrbitControls + a one-shot fly-to on focus change, plus an optional cinematic
 * idle tour that drifts between the biggest hubs once the user stops interacting.
 */
export function CameraRig({
  autoOrbit,
  focusId,
  indexOf,
  positions,
  cinematic,
  hubs,
}: CameraRigProps) {
  const controlsRef = useRef<Controls>(null);
  const camera = useThree((state) => state.camera);
  const goal = useRef(new THREE.Vector3());
  const desired = useRef(new THREE.Vector3());
  const activeFocus = useRef<string | null>(null);
  const flying = useRef(false);
  const idle = useRef(0);
  const dwell = useRef(0);
  const tourIndex = useRef(0);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const wake = () => {
      idle.current = 0;
    };
    controls.addEventListener("start", wake);
    return () => controls.removeEventListener("start", wake);
  }, []);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    const pos = positions.current;
    if (!controls || !pos) return;
    idle.current += delta;

    if (focusId !== activeFocus.current) {
      activeFocus.current = focusId;
      flying.current = focusId !== null;
    }

    if (flying.current && focusId !== null) {
      const index = indexOf.get(focusId);
      if (index === undefined) return;
      goal.current.set(pos[index * 3], pos[index * 3 + 1], pos[index * 3 + 2]);
      easeToward(controls, camera, goal.current, desired.current, 1 - Math.pow(FOCUS_LERP, delta * 60));
      if (controls.target.distanceTo(goal.current) < FOCUS_ARRIVE_EPS) flying.current = false;
      return;
    }

    if (!cinematic || focusId !== null || hubs.length === 0) return;
    if (idle.current < TOUR_IDLE_SECONDS) return;
    dwell.current += delta;
    const hub = hubs[tourIndex.current % hubs.length];
    goal.current.set(pos[hub * 3], pos[hub * 3 + 1], pos[hub * 3 + 2]);
    easeToward(controls, camera, goal.current, desired.current, 1 - Math.pow(TOUR_LERP, delta * 60));
    if (dwell.current > TOUR_DWELL_SECONDS) {
      dwell.current = 0;
      tourIndex.current += 1;
    }
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

"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { useGraphViewStore } from "./graph-view-store";

/**
 * Bridges the WebGL canvas out to the DOM HUD so the screenshot button can grab
 * the current composed frame. Requires `preserveDrawingBuffer` on the Canvas.
 */
export function SceneCapture() {
  const gl = useThree((state) => state.gl);
  const setCapture = useGraphViewStore((state) => state.setCapture);

  useEffect(() => {
    setCapture(() => gl.domElement.toDataURL("image/png"));
    return () => setCapture(null);
  }, [gl, setCapture]);

  return null;
}

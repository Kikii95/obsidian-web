"use client";

import { type MutableRefObject, useEffect, useRef, useState } from "react";
import { buildEdgeArrays, buildIndexMap } from "@/lib/graph/graph-model";
import { buildForceConfig, type ForceSettings } from "@/lib/graph/layout-config";
import type { GraphLink, GraphNode } from "@/lib/graph/types";

interface TickMessage {
  type: "tick";
  positions: ArrayBuffer;
  alpha: number;
}

interface EndMessage {
  type: "end";
}

type WorkerMessage = TickMessage | EndMessage;

export interface GraphWorkerHandle {
  positions: MutableRefObject<Float32Array | null>;
  settled: boolean;
  failed: boolean;
  reheat: (alpha?: number) => void;
  pin: (index: number, point: [number, number, number] | null) => void;
}

const DEFAULT_REHEAT = 0.5;

/**
 * Runs the d3-force-3d layout in a Web Worker and streams positions into a ref
 * (double-buffered, zero React re-render per tick). Falls back gracefully:
 * `failed` is set if the worker cannot be created (e.g. bundling issue).
 */
export function useGraphWorker(
  nodes: GraphNode[],
  links: GraphLink[],
  forces: ForceSettings
): GraphWorkerHandle {
  const positions = useRef<Float32Array | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const [settled, setSettled] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (nodes.length === 0) return;

    let worker: Worker;
    try {
      worker = new Worker(new URL("../lib/graph/worker/layout.worker.ts", import.meta.url), {
        type: "module",
      });
    } catch {
      setFailed(true);
      return;
    }
    workerRef.current = worker;
    setSettled(false);
    positions.current = new Float32Array(nodes.length * 3);

    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const message = event.data;
      if (message.type === "tick") {
        const previous = positions.current;
        positions.current = new Float32Array(message.positions);
        if (previous && previous.buffer.byteLength > 0) {
          worker.postMessage({ type: "return", positions: previous.buffer }, [previous.buffer]);
        }
      } else if (message.type === "end") {
        setSettled(true);
      }
    };
    worker.onerror = () => setFailed(true);

    const indexOf = buildIndexMap(nodes);
    const edges = buildEdgeArrays(links, indexOf);
    const config = buildForceConfig(forces);
    const clusterIndex = new Uint16Array(nodes.length);
    let clusterCount = 1;
    nodes.forEach((node, i) => {
      clusterIndex[i] = node.clusterIndex;
      clusterCount = Math.max(clusterCount, node.clusterIndex + 1);
    });
    worker.postMessage(
      {
        type: "init",
        nodeCount: nodes.length,
        edgeSource: edges.source,
        edgeTarget: edges.target,
        clusterIndex,
        clusterCount,
        constellation: true,
        charge: config.charge,
        linkDistance: config.linkDistance,
        gravity: config.gravity,
        collision: config.collision,
      },
      [edges.source.buffer, edges.target.buffer, clusterIndex.buffer]
    );

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
    // Re-init only when the graph identity or force config changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, links, forces.forceStrength, forces.linkDistance, forces.gravityStrength]);

  const reheat = (alpha: number = DEFAULT_REHEAT) => {
    workerRef.current?.postMessage({ type: "reheat", alpha });
  };

  const pin = (index: number, point: [number, number, number] | null) => {
    workerRef.current?.postMessage({
      type: "pin",
      index,
      x: point ? point[0] : null,
      y: point ? point[1] : null,
      z: point ? point[2] : null,
    });
  };

  return { positions, settled, failed, reheat, pin };
}

/// <reference lib="webworker" />
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type Force,
  type Simulation,
  type SimulationNode,
} from "d3-force-3d";
import {
  ALPHA_MIN,
  CLUSTER_FORCE_STRENGTH,
  CLUSTER_SPHERE_RADIUS,
  TICKS_PER_POST,
} from "@/lib/graph/constants";

interface SimNode extends SimulationNode {
  index: number;
}

interface InitMessage {
  type: "init";
  nodeCount: number;
  edgeSource: Uint32Array;
  edgeTarget: Uint32Array;
  clusterIndex: Uint16Array;
  clusterCount: number;
  constellation: boolean;
  charge: number;
  linkDistance: number;
  gravity: number;
  collision: number;
}

type Vec3 = [number, number, number];

/** Evenly spread cluster centers on a sphere (Fibonacci lattice). */
function clusterCenters(count: number): Vec3[] {
  if (count <= 1) return [[0, 0, 0]];
  const golden = Math.PI * (3 - Math.sqrt(5));
  const centers: Vec3[] = [];
  for (let i = 0; i < count; i += 1) {
    const y = 1 - (i / (count - 1)) * 2;
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    centers.push([
      Math.cos(theta) * radius * CLUSTER_SPHERE_RADIUS,
      y * CLUSTER_SPHERE_RADIUS,
      Math.sin(theta) * radius * CLUSTER_SPHERE_RADIUS,
    ]);
  }
  return centers;
}

/** Custom force pulling each node toward its cluster center → "galaxies". */
function clusterForce(clusterIndex: Uint16Array, centers: Vec3[]): Force {
  return (alpha: number) => {
    for (let i = 0; i < nodes.length; i += 1) {
      const center = centers[clusterIndex[i]];
      if (!center) continue;
      const node = nodes[i];
      const k = CLUSTER_FORCE_STRENGTH * alpha;
      node.vx = (node.vx ?? 0) + (center[0] - (node.x ?? 0)) * k;
      node.vy = (node.vy ?? 0) + (center[1] - (node.y ?? 0)) * k;
      node.vz = (node.vz ?? 0) + (center[2] - (node.z ?? 0)) * k;
    }
  };
}

interface ReturnMessage {
  type: "return";
  positions: ArrayBuffer;
}

interface ReheatMessage {
  type: "reheat";
  alpha: number;
}

interface PinMessage {
  type: "pin";
  index: number;
  x: number | null;
  y: number | null;
  z: number | null;
}

interface StopMessage {
  type: "stop";
}

type IncomingMessage =
  | InitMessage
  | ReturnMessage
  | ReheatMessage
  | PinMessage
  | StopMessage;

const ctx = self as unknown as DedicatedWorkerGlobalScope;
const LINK_STRENGTH = 0.6;

let simulation: Simulation<SimNode> | null = null;
let nodes: SimNode[] = [];
let running = false;
const bufferPool: Float32Array[] = [];

function takeBuffer(length: number): Float32Array {
  const pooled = bufferPool.pop();
  if (pooled && pooled.length === length) return pooled;
  return new Float32Array(length);
}

function postPositions(): void {
  if (!simulation) return;
  const buffer = takeBuffer(nodes.length * 3);
  for (let i = 0; i < nodes.length; i += 1) {
    buffer[i * 3] = nodes[i].x ?? 0;
    buffer[i * 3 + 1] = nodes[i].y ?? 0;
    buffer[i * 3 + 2] = nodes[i].z ?? 0;
  }
  ctx.postMessage({ type: "tick", positions: buffer.buffer, alpha: simulation.alpha() }, [
    buffer.buffer,
  ]);
}

function loop(): void {
  if (!simulation || !running) return;
  simulation.tick(TICKS_PER_POST);
  postPositions();
  if (simulation.alpha() < ALPHA_MIN) {
    running = false;
    simulation.stop();
    ctx.postMessage({ type: "end" });
    return;
  }
  setTimeout(loop, 0);
}

function init(message: InitMessage): void {
  nodes = Array.from({ length: message.nodeCount }, (_, index) => ({ index }));
  const links = Array.from({ length: message.edgeSource.length }, (_, i) => ({
    source: message.edgeSource[i],
    target: message.edgeTarget[i],
  }));

  simulation = forceSimulation<SimNode>(nodes, 3)
    .force(
      "link",
      forceLink<SimNode>(links)
        .id((node) => node.index)
        .distance(message.linkDistance)
        .strength(LINK_STRENGTH)
    )
    .force("charge", forceManyBody().strength(message.charge))
    .force("center", forceCenter(0, 0, 0).strength(message.gravity))
    .force("collide", forceCollide(message.collision))
    .alphaMin(ALPHA_MIN)
    .stop();

  if (message.constellation && message.clusterCount > 1) {
    simulation.force(
      "cluster",
      clusterForce(message.clusterIndex, clusterCenters(message.clusterCount))
    );
  }

  running = true;
  loop();
}

ctx.onmessage = (event: MessageEvent<IncomingMessage>) => {
  const message = event.data;
  switch (message.type) {
    case "init":
      init(message);
      break;
    case "return":
      if (message.positions.byteLength > 0) {
        bufferPool.push(new Float32Array(message.positions));
      }
      break;
    case "reheat":
      if (simulation) {
        simulation.alpha(message.alpha).restart();
        if (!running) {
          running = true;
          loop();
        }
      }
      break;
    case "pin": {
      const node = nodes[message.index];
      if (node) {
        node.fx = message.x;
        node.fy = message.y;
        node.fz = message.z;
      }
      if (simulation && !running) {
        running = true;
        simulation.alpha(0.3);
        loop();
      }
      break;
    }
    case "stop":
      running = false;
      simulation?.stop();
      break;
  }
};

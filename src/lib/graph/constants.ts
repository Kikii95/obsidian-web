import type { ClusterBy } from "./types";

export const MD_EXT = /\.md$/i;
export const TAG_NODE_PREFIX = "tag:";
export const GHOST_NODE_PREFIX = "ghost:";

// Server-side build
export const DEFAULT_MAX_NODES = 1500;
export const NODE_CAP_DESKTOP = 1500;
export const NODE_CAP_MOBILE = 600;
// The 3D InstancedMesh renders in a single draw call, so it can show far more
// than the 2D SVG — used when the orphan nebula is on so nothing is trimmed.
export const NODE_CAP_3D = 6000;
export const MIN_TAG_COUNT_FOR_NODE = 3;

// Palette (mapped to --chart-1..5 in the scene)
export const CLUSTER_PALETTE_SIZE = 5;

// Dedicated high-contrast cluster palette (theme-independent). Used when the
// color mode is "vivid" — more distinct hues than the 5 theme chart colours,
// which matters for community detection that can produce many groups.
export const VIVID_CLUSTER_PALETTE = [
  "#f43f5e", // rose
  "#f97316", // orange
  "#eab308", // amber
  "#22c55e", // green
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#d946ef", // fuchsia
  "#ec4899", // pink
  "#84cc16", // lime
  "#f59e0b", // gold
];

// Community detection (label propagation) — number of passes over the graph.
export const COMMUNITY_PASSES = 8;

// Node sizing from connectivity: clamp(BASE + K * sqrt(degree), MIN, MAX)
export const NODE_SIZE_MIN = 0.6;
export const NODE_SIZE_MAX = 4.5;
export const NODE_SIZE_BASE = 0.9;
export const NODE_SIZE_K = 0.4;

// Force layout / worker
export const ALPHA_MIN = 0.005;
export const TICKS_PER_POST = 2;
export const CLUSTER_SPHERE_RADIUS = 120;
export const CLUSTER_FORCE_STRENGTH = 0.16;
export const FORCE_CHARGE_MIN = -1200;
export const FORCE_CHARGE_MAX = -10;
export const LINK_DISTANCE_MIN = 10;
export const LINK_DISTANCE_MAX = 400;
export const GRAVITY_MIN = 0;
export const GRAVITY_MAX = 0.5;
export const COLLISION_FACTOR = 0.25;
export const COLLISION_MIN = 2;

// Labels / LOD
export const LABEL_TOP_K = 32;
export const LABEL_DISTANCE = 70;

// Camera
export const CAMERA_FOV = 60;
export const CAMERA_MIN_DISTANCE = 4;
export const CAMERA_MAX_DISTANCE = 4000;
export const DPR_MIN = 1;
export const DPR_MAX = 1.75;

// Fly-to focus (cinematic ease toward a selected node)
export const FOCUS_DISTANCE = 70;
export const FOCUS_LERP = 0.86;
export const FOCUS_ARRIVE_EPS = 2;

// Cinematic idle tour: auto-visit the biggest hubs when the user stops interacting
export const TOUR_LERP = 0.965; // gentler than focus fly-to
export const TOUR_IDLE_SECONDS = 3.5; // idle time before the tour starts
export const TOUR_DWELL_SECONDS = 4.5; // time spent easing toward each hub
export const TOUR_HUB_COUNT = 10; // number of top-degree hubs on the itinerary

// Compass gizmo + screenshot export
export const GIZMO_MARGIN: [number, number] = [72, 72];
export const SCREENSHOT_FILENAME = "knowledge-graph.png";

// Effects
export const BLOOM_INTENSITY = 1.1;
export const FLOW_SPEED = 0.6;
export const FLOW_DENSITY = 6;

// Recency heat gradient (cold = oldest note, warm = newest note)
export const HEAT_COLD = "#1e3a8a"; // deep blue
export const HEAT_WARM = "#f97316"; // hot orange

// Time-lapse playback: number of slider steps + ms between auto-advance frames
export const TIME_LAPSE_STEPS = 240;
export const TIME_LAPSE_INTERVAL_MS = 90;

// Low-end / auto-fallback thresholds
export const LOW_END_CORES = 4;
export const LOW_END_MEMORY_GB = 4;

export type LabelDensity = "low" | "medium" | "high";
export type GraphViewMode = "2d" | "3d" | "auto";
export type GraphColorMode = "theme" | "vivid";

export interface Graph3dDefaults {
  graphViewMode: GraphViewMode;
  graph3dBloomIntensity: number;
  graph3dNodeSize: number;
  graph3dClusterBy: ClusterBy;
  graph3dColorMode: GraphColorMode;
  graph3dAutoOrbit: boolean;
  graph3dLabelDensity: LabelDensity;
  graph3dNodeCap: number;
  graph3dReducedEffects: boolean;
  graph3dShowTags: boolean;
  graph3dEdgeFlow: boolean;
  graph3dOrphanNebula: boolean;
  graph3dHeat: boolean;
  graph3dCinematic: boolean;
}

export const GRAPH_3D_DEFAULTS: Graph3dDefaults = {
  graphViewMode: "auto",
  graph3dBloomIntensity: BLOOM_INTENSITY,
  graph3dNodeSize: 1,
  graph3dClusterBy: "folder",
  graph3dColorMode: "vivid",
  graph3dAutoOrbit: false,
  graph3dLabelDensity: "medium",
  graph3dNodeCap: NODE_CAP_DESKTOP,
  graph3dReducedEffects: false,
  graph3dShowTags: false,
  graph3dEdgeFlow: true,
  graph3dOrphanNebula: true,
  graph3dHeat: false,
  graph3dCinematic: false,
};

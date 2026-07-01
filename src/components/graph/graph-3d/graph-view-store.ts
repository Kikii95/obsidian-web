import { create } from "zustand";
import { neighborsAtDepth, shortestPath } from "@/lib/graph/graph-model";
import type { GraphLink, GraphNode } from "@/lib/graph/types";

interface GraphViewState {
  hovered: GraphNode | null;
  selected: GraphNode | null;
  focusId: string | null;
  neighborIds: Set<string>;
  query: string;
  capture: (() => string) | null;
  clusterFilter: number | null;
  focusDepth: number;
  pathMode: boolean;
  pathStart: GraphNode | null;
  pathIds: Set<string>;
  setHovered: (node: GraphNode | null) => void;
  pick: (node: GraphNode, links: GraphLink[]) => void;
  setQuery: (query: string) => void;
  clearFocus: () => void;
  setCapture: (capture: (() => string) | null) => void;
  setClusterFilter: (index: number | null) => void;
  setFocusDepth: (depth: number) => void;
  togglePathMode: () => void;
}

const EMPTY = new Set<string>();

export const useGraphViewStore = create<GraphViewState>((set, get) => ({
  hovered: null,
  selected: null,
  focusId: null,
  neighborIds: EMPTY,
  query: "",
  capture: null,
  clusterFilter: null,
  focusDepth: 1,
  pathMode: false,
  pathStart: null,
  pathIds: EMPTY,

  setHovered: (node) => set({ hovered: node }),

  pick: (node, links) => {
    const { pathMode, pathStart, focusDepth } = get();
    if (pathMode) {
      if (!pathStart) {
        set({ pathStart: node, pathIds: EMPTY, selected: node });
        return;
      }
      set({
        pathIds: new Set(shortestPath(pathStart.id, node.id, links)),
        selected: node,
        focusId: null,
        neighborIds: EMPTY,
      });
      return;
    }
    set({
      selected: node,
      focusId: node.id,
      neighborIds: neighborsAtDepth(node.id, links, focusDepth),
      pathIds: EMPTY,
      clusterFilter: null,
    });
  },

  setQuery: (query) => set({ query }),

  clearFocus: () =>
    set({
      selected: null,
      focusId: null,
      neighborIds: EMPTY,
      pathIds: EMPTY,
      pathStart: null,
      clusterFilter: null,
    }),

  setCapture: (capture) => set({ capture }),

  setClusterFilter: (index) =>
    set((state) => ({
      clusterFilter: state.clusterFilter === index ? null : index,
      focusId: null,
      neighborIds: EMPTY,
      pathIds: EMPTY,
    })),

  setFocusDepth: (depth) => set({ focusDepth: depth }),

  togglePathMode: () =>
    set((state) => ({ pathMode: !state.pathMode, pathStart: null, pathIds: EMPTY })),
}));

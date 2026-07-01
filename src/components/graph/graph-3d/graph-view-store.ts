import { create } from "zustand";
import type { GraphNode } from "@/lib/graph/types";

interface GraphViewState {
  hovered: GraphNode | null;
  selected: GraphNode | null;
  focusId: string | null;
  neighborIds: Set<string>;
  query: string;
  capture: (() => string) | null;
  setHovered: (node: GraphNode | null) => void;
  select: (node: GraphNode | null, neighborIds?: Set<string>) => void;
  setQuery: (query: string) => void;
  clearFocus: () => void;
  setCapture: (capture: (() => string) | null) => void;
}

const EMPTY = new Set<string>();

export const useGraphViewStore = create<GraphViewState>((set) => ({
  hovered: null,
  selected: null,
  focusId: null,
  neighborIds: EMPTY,
  query: "",
  capture: null,
  setHovered: (node) => set({ hovered: node }),
  select: (node, neighborIds) =>
    set({
      selected: node,
      focusId: node ? node.id : null,
      neighborIds: neighborIds ?? EMPTY,
    }),
  setQuery: (query) => set({ query }),
  clearFocus: () => set({ selected: null, focusId: null, neighborIds: EMPTY }),
  setCapture: (capture) => set({ capture }),
}));

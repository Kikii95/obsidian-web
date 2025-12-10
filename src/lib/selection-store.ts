import { create } from "zustand";

export interface SelectedItem {
  path: string;
  name: string;
  type: "file" | "dir";
}

interface SelectionState {
  // Selection mode
  isSelectionMode: boolean;
  enterSelectionMode: () => void;
  exitSelectionMode: () => void;
  toggleSelectionMode: () => void;

  // Selected items
  selectedItems: Map<string, SelectedItem>;
  selectItem: (item: SelectedItem) => void;
  deselectItem: (path: string) => void;
  toggleItem: (item: SelectedItem) => void;
  selectMultiple: (items: SelectedItem[]) => void;
  deselectAll: () => void;
  selectAll: (items: SelectedItem[]) => void;

  // Helpers
  isSelected: (path: string) => boolean;
  selectedCount: () => number;
  getSelectedPaths: () => string[];
  getSelectedItems: () => SelectedItem[];

  // For shift+click range selection
  lastSelectedPath: string | null;
  setLastSelectedPath: (path: string | null) => void;
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
  // Selection mode
  isSelectionMode: false,
  enterSelectionMode: () => set({ isSelectionMode: true }),
  exitSelectionMode: () => set({
    isSelectionMode: false,
    selectedItems: new Map(),
    lastSelectedPath: null,
  }),
  toggleSelectionMode: () => {
    const { isSelectionMode } = get();
    if (isSelectionMode) {
      get().exitSelectionMode();
    } else {
      get().enterSelectionMode();
    }
  },

  // Selected items
  selectedItems: new Map(),

  selectItem: (item) => set((state) => {
    const newMap = new Map(state.selectedItems);
    newMap.set(item.path, item);
    return { selectedItems: newMap, lastSelectedPath: item.path };
  }),

  deselectItem: (path) => set((state) => {
    const newMap = new Map(state.selectedItems);
    newMap.delete(path);
    return { selectedItems: newMap };
  }),

  toggleItem: (item) => {
    const { selectedItems, selectItem, deselectItem } = get();
    if (selectedItems.has(item.path)) {
      deselectItem(item.path);
    } else {
      selectItem(item);
    }
  },

  selectMultiple: (items) => set((state) => {
    const newMap = new Map(state.selectedItems);
    items.forEach((item) => newMap.set(item.path, item));
    return {
      selectedItems: newMap,
      lastSelectedPath: items.length > 0 ? items[items.length - 1].path : state.lastSelectedPath,
    };
  }),

  deselectAll: () => set({ selectedItems: new Map(), lastSelectedPath: null }),

  selectAll: (items) => set({
    selectedItems: new Map(items.map((item) => [item.path, item])),
    lastSelectedPath: items.length > 0 ? items[items.length - 1].path : null,
  }),

  // Helpers
  isSelected: (path) => get().selectedItems.has(path),
  selectedCount: () => get().selectedItems.size,
  getSelectedPaths: () => Array.from(get().selectedItems.keys()),
  getSelectedItems: () => Array.from(get().selectedItems.values()),

  // Range selection
  lastSelectedPath: null,
  setLastSelectedPath: (path) => set({ lastSelectedPath: path }),
}));

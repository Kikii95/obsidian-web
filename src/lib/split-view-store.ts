import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SplitViewState {
  isActive: boolean;
  leftPath: string | null;
  rightPath: string | null;
  splitRatio: number;
  setActive: (active: boolean) => void;
  setLeftPath: (path: string | null) => void;
  setRightPath: (path: string | null) => void;
  setSplitRatio: (ratio: number) => void;
  openInSplit: (path: string, side: "left" | "right") => void;
  closePane: (side: "left" | "right") => void;
  swapPanes: () => void;
  reset: () => void;
}

export const useSplitViewStore = create<SplitViewState>()(
  persist(
    (set, get) => ({
      isActive: false,
      leftPath: null,
      rightPath: null,
      splitRatio: 50,

      setActive: (active) => set({ isActive: active }),

      setLeftPath: (path) => set({ leftPath: path }),

      setRightPath: (path) => set({ rightPath: path }),

      setSplitRatio: (ratio) =>
        set({ splitRatio: Math.max(20, Math.min(80, ratio)) }),

      openInSplit: (path, side) => {
        const state = get();
        if (side === "left") {
          set({ leftPath: path, isActive: true });
        } else {
          set({ rightPath: path, isActive: true });
        }
        if (!state.leftPath && side === "right") {
          set({ leftPath: state.rightPath });
        }
        if (!state.rightPath && side === "left") {
          set({ rightPath: state.leftPath });
        }
      },

      closePane: (side) => {
        const state = get();
        if (side === "left") {
          set({ leftPath: state.rightPath, rightPath: null, isActive: false });
        } else {
          set({ rightPath: null, isActive: !!state.leftPath });
        }
      },

      swapPanes: () => {
        const state = get();
        set({ leftPath: state.rightPath, rightPath: state.leftPath });
      },

      reset: () =>
        set({
          isActive: false,
          leftPath: null,
          rightPath: null,
          splitRatio: 50,
        }),
    }),
    {
      name: "obsidian-web-split-view",
      partialize: (state) => ({
        splitRatio: state.splitRatio,
      }),
    }
  )
);

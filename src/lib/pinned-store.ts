import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PinnedItemType = "note" | "folder";

interface PinnedItem {
  path: string;
  name: string;
  type: PinnedItemType;
  pinnedAt: number;
}

// Legacy interface for backwards compatibility
interface PinnedNote {
  path: string;
  name: string;
  pinnedAt: number;
  type?: PinnedItemType;
}

interface PinnedState {
  pinnedNotes: PinnedItem[];
  // New unified API
  pinItem: (path: string, name: string, type: PinnedItemType) => void;
  unpinItem: (path: string) => void;
  isPinned: (path: string) => boolean;
  reorderPinned: (from: number, to: number) => void;
  // Legacy API (calls pinItem with type="note")
  pinNote: (path: string, name: string) => void;
  unpinNote: (path: string) => void;
}

export const usePinnedStore = create<PinnedState>()(
  persist(
    (set, get) => ({
      pinnedNotes: [],

      pinItem: (path, name, type) => {
        const { pinnedNotes } = get();
        if (pinnedNotes.some((n) => n.path === path)) return;

        set({
          pinnedNotes: [
            ...pinnedNotes,
            { path, name, type, pinnedAt: Date.now() },
          ],
        });
      },

      unpinItem: (path) => {
        set((state) => ({
          pinnedNotes: state.pinnedNotes.filter((n) => n.path !== path),
        }));
      },

      isPinned: (path) => {
        return get().pinnedNotes.some((n) => n.path === path);
      },

      reorderPinned: (from, to) => {
        set((state) => {
          const notes = [...state.pinnedNotes];
          const [moved] = notes.splice(from, 1);
          notes.splice(to, 0, moved);
          return { pinnedNotes: notes };
        });
      },

      // Legacy API
      pinNote: (path, name) => {
        get().pinItem(path, name, "note");
      },

      unpinNote: (path) => {
        get().unpinItem(path);
      },
    }),
    {
      name: "obsidian-web-pinned",
      // Migrate old data without type field
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as { pinnedNotes?: PinnedNote[] };
        if (state.pinnedNotes) {
          state.pinnedNotes = state.pinnedNotes.map((item) => ({
            ...item,
            type: item.type || "note" as PinnedItemType,
          }));
        }
        return state as PinnedState;
      },
      version: 1,
    }
  )
);

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PinnedNote {
  path: string;
  name: string;
  pinnedAt: number;
}

interface PinnedState {
  pinnedNotes: PinnedNote[];
  pinNote: (path: string, name: string) => void;
  unpinNote: (path: string) => void;
  isPinned: (path: string) => boolean;
  reorderPinned: (from: number, to: number) => void;
}

export const usePinnedStore = create<PinnedState>()(
  persist(
    (set, get) => ({
      pinnedNotes: [],

      pinNote: (path, name) => {
        const { pinnedNotes } = get();
        if (pinnedNotes.some((n) => n.path === path)) return;

        set({
          pinnedNotes: [
            ...pinnedNotes,
            { path, name, pinnedAt: Date.now() },
          ],
        });
      },

      unpinNote: (path) => {
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
    }),
    {
      name: "obsidian-web-pinned",
    }
  )
);

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PinnedItemType = "note" | "folder";

interface PinnedItem {
  path: string;
  name: string;
  type: PinnedItemType;
  pinnedAt?: number; // Optional for backwards compatibility
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
  isSyncing: boolean;
  lastSyncError: string | null;

  // Sync methods
  fetchFromServer: () => Promise<void>;
  syncToServer: () => Promise<void>;

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
      isSyncing: false,
      lastSyncError: null,

      // Fetch pins from server (called on login/mount)
      fetchFromServer: async () => {
        set({ isSyncing: true, lastSyncError: null });
        try {
          const res = await fetch("/api/pins");
          if (!res.ok) {
            // If 401, user not logged in - use local storage only
            if (res.status === 401) {
              set({ isSyncing: false });
              return;
            }
            throw new Error("Failed to fetch pins");
          }
          const data = await res.json();
          set({
            pinnedNotes: data.pins.map((p: { path: string; name: string; type: PinnedItemType }) => ({
              ...p,
              pinnedAt: Date.now(),
            })),
            isSyncing: false,
          });
        } catch (error) {
          console.error("Error fetching pins:", error);
          set({
            isSyncing: false,
            lastSyncError: error instanceof Error ? error.message : "Unknown error",
          });
        }
      },

      // Sync current pins to server (called after local changes)
      syncToServer: async () => {
        const { pinnedNotes } = get();
        set({ isSyncing: true, lastSyncError: null });
        try {
          const res = await fetch("/api/pins", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              pins: pinnedNotes.map((p) => ({
                path: p.path,
                name: p.name,
                type: p.type,
              })),
            }),
          });
          if (!res.ok) {
            // If 401, user not logged in - silently fail (local storage only)
            if (res.status === 401) {
              set({ isSyncing: false });
              return;
            }
            throw new Error("Failed to sync pins");
          }
          set({ isSyncing: false });
        } catch (error) {
          console.error("Error syncing pins:", error);
          set({
            isSyncing: false,
            lastSyncError: error instanceof Error ? error.message : "Unknown error",
          });
        }
      },

      pinItem: (path, name, type) => {
        const { pinnedNotes, syncToServer } = get();
        if (pinnedNotes.some((n) => n.path === path)) return;

        set({
          pinnedNotes: [
            ...pinnedNotes,
            { path, name, type, pinnedAt: Date.now() },
          ],
        });

        // Sync to server in background
        syncToServer();
      },

      unpinItem: (path) => {
        const { syncToServer } = get();
        set((state) => ({
          pinnedNotes: state.pinnedNotes.filter((n) => n.path !== path),
        }));

        // Sync to server in background
        syncToServer();
      },

      isPinned: (path) => {
        return get().pinnedNotes.some((n) => n.path === path);
      },

      reorderPinned: (from, to) => {
        const { syncToServer } = get();
        set((state) => {
          const notes = [...state.pinnedNotes];
          const [moved] = notes.splice(from, 1);
          notes.splice(to, 0, moved);
          return { pinnedNotes: notes };
        });

        // Sync to server in background
        syncToServer();
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
      // Only persist pinnedNotes, not sync state
      partialize: (state) => ({
        pinnedNotes: state.pinnedNotes,
      }),
      // Migrate old data without type field
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as { pinnedNotes?: PinnedNote[] };
        if (state.pinnedNotes) {
          state.pinnedNotes = state.pinnedNotes.map((item) => ({
            ...item,
            type: item.type || ("note" as PinnedItemType),
          }));
        }
        return state as PinnedState;
      },
      version: 1,
    }
  )
);

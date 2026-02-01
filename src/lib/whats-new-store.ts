import { create } from "zustand";
import { persist } from "zustand/middleware";
import { currentVersion } from "@/data/patch-notes";

interface WhatsNewState {
  lastSeenVersion: string | null;
  markAsSeen: () => void;
  hasNewVersion: () => boolean;
}

export const useWhatsNewStore = create<WhatsNewState>()(
  persist(
    (set, get) => ({
      lastSeenVersion: null,

      markAsSeen: () => {
        set({ lastSeenVersion: currentVersion });
      },

      hasNewVersion: () => {
        const { lastSeenVersion } = get();
        return lastSeenVersion === null || lastSeenVersion !== currentVersion;
      },
    }),
    {
      name: "obsidian-web-whats-new",
    }
  )
);
